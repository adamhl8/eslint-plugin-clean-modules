# @adamhl8/eslint-plugin-clean-modules

An [oxlint](https://oxc.rs/docs/guide/usage/linter) (ESLint-compatible) plugin with three rules for keeping module imports and exports clean in TypeScript projects:

- [`require-subpath-imports`](#require-subpath-imports) -> ban relative imports in favor of native [Node.js subpath imports](https://nodejs.org/api/packages.html#subpath-imports)
- [`require-direct-exports`](#require-direct-exports) -> require `export` on the declaration instead of a separate `export { ... }`
- [`require-import-extensions`](#require-import-extensions) -> require the correct explicit file extension on local imports

All three rules are auto-fixable.

---

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [Rules](#rules)
  - [`require-subpath-imports`](#require-subpath-imports)
  - [`require-direct-exports`](#require-direct-exports)
  - [`require-import-extensions`](#require-import-extensions)

<!-- tocstop -->

## Installation

```bash
bun add -D @adamhl8/eslint-plugin-clean-modules
```

This plugin targets [oxlint's JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins) (currently in alpha). It's authored against the ESLint v9 plugin API, so it also works as a regular ESLint plugin.

## Usage

Add the plugin to `jsPlugins` and enable the rules in your `.oxlintrc.json`. The rule prefix is `clean-modules`:

```json
{
  "jsPlugins": ["@adamhl8/eslint-plugin-clean-modules"],
  "rules": {
    "clean-modules/require-subpath-imports": "error",
    "clean-modules/require-direct-exports": "error",
    "clean-modules/require-import-extensions": "error"
  }
}
```

Run `oxlint --fix` to apply fixes. Because `require-subpath-imports` and `require-import-extensions` can both rewrite the same import (`./foo` -> `#foo` -> `#foo.ts`), full convergence may take more than one `--fix` pass.

## Rules

### `require-subpath-imports`

Relative imports (`./`, `../`) are banned. Imports of modules within the same package should use a native Node.js subpath import, defined by the `imports` field in `package.json`.

The fix resolves the relative import to the matching `#` subpath. If no subpath entry matches, the import is reported without a fix.

```jsonc
// package.json
{ "imports": { "#*": "./src/*" } }
```

```ts
import { foo } from "./foo" // error
import { foo } from "#foo" // autofixed
```

Applies to `import`, dynamic `import()`, `export ... from`, and `export *`.

#### Options

- `ignore: string[]` - skip any import whose specifier contains one of these substrings (useful for cross-package relative imports that legitimately can't map to a subpath).

```json
{ "clean-modules/require-subpath-imports": ["error", { "ignore": ["@generated"] }] }
```

### `require-direct-exports`

Exports should be declared directly on the declaration. Indirect exports (`export { foo }`, `export { foo as bar }`) and re-exports (`export { x } from "..."`, `export * from "..."`) are banned. This is the inverse of [`import/no-named-export`](https://github.com/oxc-project/oxc/blob/main/crates/oxc_linter/src/rules/import/no_named_export.rs).

`index.*` files are exempt, since barrel re-exports legitimately live there.

The fix only handles the safe case: a local, non-renamed `export { foo }` where `foo` is a top-level declaration in the same file. It prepends `export` to the declaration and removes the statement. Renamed exports, re-exports, and multi-declarator cases are reported without a fix.

```ts
const foo = 1
export { foo } // error

export const foo = 1 // autofixed
```

#### Options

- `allowEmpty: boolean` (default `false`) - allow the empty `export {}` module marker.

### `require-import-extensions`

Local imports (relative and `#` subpath) must use the correct file extension as it exists on disk (`.ts`, `.tsx`, or `.d.ts`). Extensions are resolved by checking the filesystem, following [TypeScript's extension substitution](https://www.typescriptlang.org/docs/handbook/modules/reference.html#file-extension-substitution). Non-TypeScript extensions (`.json`, `.css`, ...) pass through unchanged. If the target file can't be found, the import is reported without a fix.

```ts
import { foo } from "./foo" // error (foo.ts on disk)
import { foo } from "./foo.ts" // autofixed
```
