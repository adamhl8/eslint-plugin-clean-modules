import path from "node:path"

import type { TSESTree } from "@typescript-eslint/types"
import { AST_NODE_TYPES } from "@typescript-eslint/types"
import type { TSESLint } from "@typescript-eslint/utils"

import { loadImportsMap, subpathToAbs } from "#/shared/imports-map.ts"
import {
  findDirectoryIndex,
  findOnDiskExtension,
  isExistingDirectory,
  isRelativeSpecifier,
  isSubpathSpecifier,
  resolveRelative,
  TS_EXTENSION_SLOTS,
} from "#/shared/resolve.ts"

type MessageIds = "directoryIndex" | "targetNotFound" | "wrongExtension"

export const requireImportExtensions: TSESLint.RuleModule<MessageIds> = {
  meta: {
    type: "suggestion",
    docs: { description: "Require local imports to use the correct explicit file extension." },
    fixable: "code",
    schema: [],
    messages: {
      wrongExtension: "Import '{{specifier}}' should use the file extension '{{expected}}'.",
      targetNotFound: "Import '{{specifier}}' could not be resolved on disk (looked for '{{lookup}}').",
      directoryIndex: "Import '{{specifier}}' resolves to a directory; import its index file '{{index}}' explicitly.",
    },
  },
  create(context) {
    const resolveSpecifier = (specifier: string): string | undefined => {
      if (isRelativeSpecifier(specifier)) return resolveRelative(context.filename, specifier)
      const map = loadImportsMap(context.filename)
      return map ? subpathToAbs(specifier, map) : undefined
    }

    const handle = (source: TSESTree.Node | null) => {
      if (!source || source.type !== AST_NODE_TYPES.Literal || typeof source.value !== "string") return
      const specifier = source.value
      if (!(isRelativeSpecifier(specifier) || isSubpathSpecifier(specifier))) return

      const abs = resolveSpecifier(specifier)
      if (abs === undefined) return // unresolvable subpath: require-subpath-imports governs the mapping

      const currentExt = path.parse(specifier).ext
      if (!TS_EXTENSION_SLOTS.includes(currentExt)) return // non-TS extension (.json, .css, ...) passes through

      const newExt = findOnDiskExtension(abs)
      if (newExt === undefined) {
        const indexAbs = findDirectoryIndex(abs)
        if (indexAbs !== undefined) {
          const sep = specifier.endsWith("/") ? "" : "/"
          const newSpecifier = `${specifier}${sep}${path.basename(indexAbs)}`
          const quote = source.raw[0] ?? '"'
          context.report({
            node: source,
            messageId: "directoryIndex",
            data: { specifier, index: newSpecifier },
            fix: (fixer) => fixer.replaceText(source, `${quote}${newSpecifier}${quote}`),
          })
          return
        }
        if (isExistingDirectory(abs)) return // directory without an index file, out of scope
        const parsed = path.parse(abs)
        context.report({
          node: source,
          messageId: "targetNotFound",
          data: { specifier, lookup: `${path.join(parsed.dir, parsed.name)}.{ts,tsx,d.ts}` },
        })
        return
      }
      if (newExt === currentExt) return // already correct

      const base = currentExt === "" ? specifier : specifier.slice(0, specifier.length - currentExt.length)
      const newSpecifier = base + newExt
      const quote = source.raw[0] ?? '"'
      context.report({
        node: source,
        messageId: "wrongExtension",
        data: { specifier, expected: newExt },
        fix: (fixer) => fixer.replaceText(source, `${quote}${newSpecifier}${quote}`),
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
