import { requireDirectExports } from "#/rules/require-direct-exports.ts"
import { requireImportExtensions } from "#/rules/require-import-extensions.ts"
import { requireSubpathImports } from "#/rules/require-subpath-imports.ts"

const plugin = {
  // `meta.name` is the prefix users type in config, e.g. `clean-modules/require-subpath-imports`.
  meta: { name: "clean-modules" },
  rules: {
    "require-subpath-imports": requireSubpathImports,
    "require-direct-exports": requireDirectExports,
    "require-import-extensions": requireImportExtensions,
  },
}

// oxlint-disable-next-line import/no-default-export
export default plugin
