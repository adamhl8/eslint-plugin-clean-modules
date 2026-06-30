import path from "node:path"

import { AST_NODE_TYPES } from "@typescript-eslint/types"
import type { TSESLint, TSESTree } from "@typescript-eslint/utils"
import { describe, expect, it } from "vitest"

import { FIXTURES } from "#/rules/__tests__/setup.ts"
import { requireImportExtensions } from "#/rules/require-import-extensions.ts"
import { requireSubpathImports } from "#/rules/require-subpath-imports.ts"

const filename = path.join(FIXTURES, "src/foo.ts")

// Drive the fixer directly with a synthetic literal whose `raw` is empty, so `raw[0] ?? '"'`
// takes its fallback. RuleTester can't produce an empty `raw`, so the rule is invoked by hand.
const firstFixText = <M extends string, O extends readonly unknown[]>(
  rule: TSESLint.RuleModule<M, O>,
  specifier: string,
): string => {
  const reports: TSESLint.ReportDescriptor<M>[] = []
  const contextStub = {
    filename,
    options: [],
    report: (descriptor: TSESLint.ReportDescriptor<M>) => {
      reports.push(descriptor)
    },
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- stub exposes only what the fixer rules read
  const context = contextStub as unknown as Readonly<TSESLint.RuleContext<M, O>>

  const listener = rule.create(context)
  const handler = listener.ImportDeclaration
  if (!handler) throw new Error("rule should register an ImportDeclaration handler")
  const nodeStub = { source: { type: AST_NODE_TYPES.Literal, value: specifier, raw: "" } }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- handle() only reads node.source
  handler(nodeStub as unknown as TSESTree.ImportDeclaration)

  const [descriptor] = reports
  if (!descriptor) throw new Error("expected a report")
  const { fix } = descriptor
  if (!fix) throw new Error("expected a fixable report")

  const fixerStub = {
    replaceText: (...args: readonly [TSESTree.Node, string]): TSESLint.RuleFix => ({ range: [0, 0], text: args[1] }),
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fix() only calls replaceText
  const fixer = fixerStub as unknown as TSESLint.RuleFixer

  const result = fix(fixer)
  if (!result || Array.isArray(result) || !("text" in result)) throw new Error("expected a single replacement fix")
  return result.text
}

describe("quote fallback when source.raw is empty", () => {
  it("defaults require-subpath-imports to double quotes", () => {
    expect(firstFixText(requireSubpathImports, "./bar")).toBe(`"#bar"`)
  })

  it("defaults require-import-extensions to double quotes", () => {
    expect(firstFixText(requireImportExtensions, "./bar")).toBe(`"./bar.ts"`)
  })

  it("defaults require-import-extensions directory index to double quotes", () => {
    expect(firstFixText(requireImportExtensions, "./dir-import")).toBe(`"./dir-import/index.ts"`)
  })
})
