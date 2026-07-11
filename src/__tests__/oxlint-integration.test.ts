import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import os from "node:os"
import path from "node:path"

import { $ } from "bun"

const ROOT = path.resolve(import.meta.dir, "../..")
const FIXTURE = path.join(import.meta.dir, "fixtures")
const PLUGIN = path.join(ROOT, "dist/index.js")
const TMP = path.join(os.tmpdir(), "eslint-plugin-clean-modules-oxlint-fixture")
const OXLINT_BIN = path.join(ROOT, "node_modules/.bin/oxlint")
const TSDOWN_BIN = path.join(ROOT, "node_modules/.bin/tsdown")

// oxlint exits non-zero when it finds problems; read its combined output regardless of exit code.
const runOxlint = (fix: boolean): string => {
  const result = Bun.spawnSync([OXLINT_BIN, ...(fix ? ["--fix"] : [])], { cwd: TMP })
  return result.stdout.toString() + result.stderr.toString()
}

describe("oxlint integration", () => {
  beforeAll(async () => {
    // oxlint loads the built JS plugin, so build before linting.
    const build = Bun.spawnSync([TSDOWN_BIN], { cwd: ROOT })
    if (!build.success) throw new Error(`tsdown build failed:\n${build.stderr.toString()}`)
    await $`rm -rf ${TMP}`.quiet()
    await $`cp -R ${FIXTURE} ${TMP}`.quiet()
    // Point oxlint at the freshly built plugin by absolute path.
    const config = {
      jsPlugins: [PLUGIN],
      rules: {
        "clean-modules/require-subpath-imports": "error",
        "clean-modules/require-direct-exports": "error",
        "clean-modules/require-import-extensions": "error",
      },
    }
    await Bun.write(path.join(TMP, ".oxlintrc.json"), JSON.stringify(config, undefined, 2))
  })

  afterAll(async () => {
    await $`rm -rf ${TMP}`.quiet()
  })

  it("reports all three rules", () => {
    const out = runOxlint(false)
    expect(out).toContain("require-subpath-imports")
    expect(out).toContain("require-import-extensions")
    expect(out).toContain("require-direct-exports")
  })

  it("fixes relative imports to subpath imports with the correct extension, and inlines exports", async () => {
    // oxlint applies non-overlapping fixes per pass without re-linting to convergence, so the
    // `./helper` -> `#helper` -> `#helper.ts` chain (same source node) needs repeated --fix runs.
    // Two passes converge here; a third is cheap insurance.
    runOxlint(true)
    runOxlint(true)
    runOxlint(true)

    const main = await Bun.file(path.join(TMP, "src/main.ts")).text()
    const helper = await Bun.file(path.join(TMP, "src/helper.ts")).text()

    expect(main).toContain('from "#helper.ts"')
    expect(helper).toContain("export const value = 1")
    expect(helper).not.toContain("export { value }")
    expect(runOxlint(false)).not.toContain("error clean-modules")
  })
})
