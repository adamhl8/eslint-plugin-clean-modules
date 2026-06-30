import path from "node:path"

import { FIXTURES, ruleTester } from "#/rules/__tests__/setup.ts"
import { requireSubpathImports } from "#/rules/require-subpath-imports.ts"

const filename = path.join(FIXTURES, "src/foo.ts")

ruleTester.run("require-subpath-imports", requireSubpathImports, {
  valid: [
    { code: `import { bar } from "#bar"`, filename },
    { code: `import fs from "node:fs"`, filename },
    { code: `import { x } from "some-pkg"`, filename },
    { code: `import { bar } from "./bar"`, filename, options: [{ ignore: ["bar"] }] },
  ],
  invalid: [
    {
      code: `import { bar } from "./bar"`,
      filename,
      output: `import { bar } from "#bar"`,
      errors: [{ messageId: "relativeImport" }],
    },
    {
      code: `import { helper } from "./utils/helper"`,
      filename,
      output: `import { helper } from "#utils/helper"`,
      errors: [{ messageId: "relativeImport" }],
    },
    {
      code: `const m = import("./bar")`,
      filename,
      output: `const m = import("#bar")`,
      errors: [{ messageId: "relativeImport" }],
    },
    {
      code: `export { bar } from "./bar"`,
      filename,
      output: `export { bar } from "#bar"`,
      errors: [{ messageId: "relativeImport" }],
    },
    {
      code: `export * from "./bar"`,
      filename,
      output: `export * from "#bar"`,
      errors: [{ messageId: "relativeImport" }],
    },
    {
      code: `import { outside } from "../../outside"`,
      filename,
      errors: [{ messageId: "noSubpathMatch" }],
    },
  ],
})
