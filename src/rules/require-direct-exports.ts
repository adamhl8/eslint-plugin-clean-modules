import path from "node:path"

import type { TSESTree } from "@typescript-eslint/types"
import { AST_NODE_TYPES } from "@typescript-eslint/types"
import type { TSESLint } from "@typescript-eslint/utils"

type Options = readonly [{ allowEmpty?: boolean }?]
type MessageIds = "emptyExport" | "indirectExport" | "reexport"

interface DeclInfo {
  node: TSESTree.Node
  fixable: boolean
}

/** Map top-level binding names to the declaration that introduces them. */
const buildDeclMap = (program: TSESTree.Program): Map<string, DeclInfo> => {
  const map = new Map<string, DeclInfo>()
  // A name seen twice is ambiguous, so it can never be safely fixed.
  const add = (name: string, node: TSESTree.Node, fixable: boolean) => {
    map.set(name, map.has(name) ? { node, fixable: false } : { node, fixable })
  }

  // Only declaration-introducing statements matter; everything else is intentionally ignored.
  for (const stmt of program.body) {
    if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
      // `const a = 1, b = 2` can't be split, so prepending `export` would over-export siblings.
      const fixable = stmt.declarations.length === 1
      for (const declarator of stmt.declarations)
        if (declarator.id.type === AST_NODE_TYPES.Identifier) add(declarator.id.name, stmt, fixable)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.FunctionDeclaration) {
      add(stmt.id.name, stmt, true)
      continue
    }
    if (stmt.type === AST_NODE_TYPES.ClassDeclaration) {
      // A decorated class can't be fixed by prepending `export` (it would land before the decorator).
      add(stmt.id.name, stmt, stmt.decorators.length === 0)
      continue
    }
    if (
      stmt.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
      stmt.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
      stmt.type === AST_NODE_TYPES.TSEnumDeclaration ||
      stmt.type === AST_NODE_TYPES.TSModuleDeclaration
    ) {
      if (stmt.id.type === AST_NODE_TYPES.Identifier) add(stmt.id.name, stmt, true)
      continue
    }
    // Re-exporting an imported binding (`import { x } ...; export { x }`) must not prepend `export`.
    if (stmt.type === AST_NODE_TYPES.ImportDeclaration)
      for (const specifier of stmt.specifiers) add(specifier.local.name, stmt, false)
  }
  return map
}

export const requireDirectExports: TSESLint.RuleModule<MessageIds, Options> = {
  meta: {
    type: "suggestion",
    docs: { description: "Require exports to be declared directly on the declaration." },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: { allowEmpty: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    messages: {
      indirectExport: "Add `export` directly to the declaration instead of a separate `export { ... }` statement.",
      reexport: "Re-exports are not allowed here; export directly on the declaration in the defining module.",
      emptyExport: "Remove the empty `export {}` statement.",
    },
  },
  create(context) {
    // index files are barrel files where re-exports legitimately live.
    if (path.parse(context.filename).name === "index") return {}

    const allowEmpty = context.options[0]?.allowEmpty ?? false
    let declMap = new Map<string, DeclInfo>()

    return {
      Program: (node) => {
        declMap = buildDeclMap(node)
      },

      ExportAllDeclaration: (node) => {
        context.report({ node, messageId: "reexport" })
      },

      ExportNamedDeclaration: (node) => {
        if (node.declaration !== null) return // already a direct `export const/function/...`

        if (node.source !== null) {
          context.report({ node, messageId: "reexport" })
          return
        }

        if (node.specifiers.length === 0) {
          if (!allowEmpty) context.report({ node, messageId: "emptyExport" })
          return
        }

        const targets: DeclInfo[] = []
        let fixable = true
        for (const specifier of node.specifiers) {
          const renamed =
            specifier.exported.type !== AST_NODE_TYPES.Identifier || specifier.local.name !== specifier.exported.name
          const info = declMap.get(specifier.local.name)
          if (renamed || !info || !info.fixable) {
            fixable = false
            break
          }
          targets.push(info)
        }

        if (!fixable) {
          context.report({ node, messageId: "indirectExport" })
          return
        }

        context.report({
          node,
          messageId: "indirectExport",
          fix: (fixer) => [...targets.map((info) => fixer.insertTextBefore(info.node, "export ")), fixer.remove(node)],
        })
      },
    }
  },
}
