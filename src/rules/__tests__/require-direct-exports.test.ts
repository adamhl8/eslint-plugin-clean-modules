import { ruleTester } from "#/rules/__tests__/setup.ts"
import { requireDirectExports } from "#/rules/require-direct-exports.ts"

const filename = "file.ts"

ruleTester.run("require-direct-exports", requireDirectExports, {
  valid: [
    { code: "export const a = 1", filename },
    { code: "export function f() {}", filename },
    { code: "export default 1", filename },
    { code: "const a = 1", filename },
    // index files are exempt (barrel re-exports live there)
    { code: `export { a } from "./b"`, filename: "index.ts" },
    { code: "export {}", filename, options: [{ allowEmpty: true }] },
  ],
  invalid: [
    {
      code: "const a = 1\nexport { a }",
      filename,
      output: "export const a = 1\n",
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: "function f() {}\nexport { f }",
      filename,
      output: "export function f() {}\n",
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: "interface I {}\nexport type { I }",
      filename,
      output: "export interface I {}\n",
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: "const a = 1\nconst b = 2\nexport { a, b }",
      filename,
      output: "export const a = 1\nexport const b = 2\n",
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: "const a = 1\nexport { a as b }",
      filename,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: "const a = 1, b = 2\nexport { a }",
      filename,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: `import { z } from "./z"\nexport { z }`,
      filename,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: "class C {}\nexport { C }",
      filename,
      output: "export class C {}\n",
      errors: [{ messageId: "indirectExport" }],
    },
    {
      // A decorated class can't gain `export` by prepending (it would land before the decorator).
      code: "@dec\nclass C {}\nexport { C }",
      filename,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      // A name declared twice is ambiguous, so the export can't be safely inlined.
      code: "function f() {}\nfunction f() {}\nexport { f }",
      filename,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      // A destructured binding has no single declaration to attach `export` to.
      code: "const { a } = o\nexport { a }",
      filename,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      // A `module "..."` declaration has a string (not identifier) id, which is simply skipped.
      code: `declare module "foo" {}\nconst a = 1\nexport { a }`,
      filename,
      output: `declare module "foo" {}\nexport const a = 1\n`,
      errors: [{ messageId: "indirectExport" }],
    },
    {
      code: `export { a } from "./b"`,
      filename,
      errors: [{ messageId: "reexport" }],
    },
    {
      code: `export * from "./b"`,
      filename,
      errors: [{ messageId: "reexport" }],
    },
    {
      code: "export {}",
      filename,
      errors: [{ messageId: "emptyExport" }],
    },
  ],
})
