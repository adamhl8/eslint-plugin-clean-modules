import path from "node:path"

import type { TSESTree } from "@typescript-eslint/types"
import { AST_NODE_TYPES } from "@typescript-eslint/types"
import type { TSESLint } from "@typescript-eslint/utils"

import { absToSubpath, loadImportsMap } from "#/shared/imports-map.ts"
import { isRelativeSpecifier } from "#/shared/resolve.ts"

type Options = readonly [{ ignore?: string[] }?]
type MessageIds = "noSubpathMatch" | "relativeImport"

export const requireSubpathImports: TSESLint.RuleModule<MessageIds, Options> = {
  meta: {
    type: "problem",
    docs: { description: "Disallow relative imports; require Node.js subpath imports (`#...`)." },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: { ignore: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: {
      relativeImport: "Relative import '{{specifier}}' is not allowed; use the subpath import '{{subpath}}'.",
      noSubpathMatch:
        "Relative import '{{specifier}}' is not allowed, but no matching subpath import was found in package.json `imports`.",
    },
  },
  create(context) {
    const ignore = context.options[0]?.ignore ?? []

    const handle = (source: TSESTree.Node | null) => {
      if (!source || source.type !== AST_NODE_TYPES.Literal || typeof source.value !== "string") return
      const specifier = source.value
      if (!isRelativeSpecifier(specifier)) return
      if (ignore.some((entry) => specifier.includes(entry))) return

      const map = loadImportsMap(context.filename)
      const abs = path.resolve(path.dirname(context.filename), specifier)
      const subpath = map ? absToSubpath(abs, map) : undefined

      if (subpath === undefined) {
        context.report({ node: source, messageId: "noSubpathMatch", data: { specifier } })
        return
      }

      const quote = source.raw[0] ?? '"'
      context.report({
        node: source,
        messageId: "relativeImport",
        data: { specifier, subpath },
        fix: (fixer) => fixer.replaceText(source, `${quote}${subpath}${quote}`),
      })
    }

    return {
      ImportDeclaration: (node) => {
        handle(node.source)
      },
      ImportExpression: (node) => {
        handle(node.source)
      },
      ExportNamedDeclaration: (node) => {
        handle(node.source)
      },
      ExportAllDeclaration: (node) => {
        handle(node.source)
      },
    }
  },
}
