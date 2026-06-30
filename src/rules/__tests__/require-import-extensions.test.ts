import path from "node:path"

import { FIXTURES, ruleTester } from "#/rules/__tests__/setup.ts"
import { requireImportExtensions } from "#/rules/require-import-extensions.ts"

const filename = path.join(FIXTURES, "src/foo.ts")

ruleTester.run("require-import-extensions", requireImportExtensions, {
  valid: [
    { code: `import { bar } from "./bar.ts"`, filename },
    { code: `import d from "./data.json"`, filename },
    { code: `import { helper } from "#utils/helper.ts"`, filename },
    { code: `import { fromDir } from "./dir-import"`, filename },
  ],
  invalid: [
    {
      code: `import { bar } from "./bar"`,
      filename,
      output: `import { bar } from "./bar.ts"`,
      errors: [{ messageId: "wrongExtension" }],
    },
    {
      code: `import { bar } from "./bar.js"`,
      filename,
      output: `import { bar } from "./bar.ts"`,
      errors: [{ messageId: "wrongExtension" }],
    },
    {
      code: `import { widget } from "./widget"`,
      filename,
      output: `import { widget } from "./widget.tsx"`,
      errors: [{ messageId: "wrongExtension" }],
    },
    {
      code: `import type { decls } from "./decls"`,
      filename,
      output: `import type { decls } from "./decls.d.ts"`,
      errors: [{ messageId: "wrongExtension" }],
    },
    {
      code: `import { helper } from "#utils/helper"`,
      filename,
      output: `import { helper } from "#utils/helper.ts"`,
      errors: [{ messageId: "wrongExtension" }],
    },
    {
      code: `const m = import("./bar")`,
      filename,
      output: `const m = import("./bar.ts")`,
      errors: [{ messageId: "wrongExtension" }],
    },
    {
      code: `import { missing } from "./missing"`,
      filename,
      errors: [{ messageId: "targetNotFound" }],
    },
  ],
})
