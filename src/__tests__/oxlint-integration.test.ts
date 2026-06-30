import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

const ROOT = path.resolve(import.meta.dirname, "../..")
const FIXTURE = path.join(import.meta.dirname, "fixtures")
const PLUGIN = path.join(ROOT, "dist/index.js")
const TMP = path.join(os.tmpdir(), "eslint-plugin-clean-modules-oxlint-fixture")
const OXLINT_BIN = path.join(ROOT, "node_modules/.bin/oxlint")
const TSDOWN_BIN = path.join(ROOT, "node_modules/.bin/tsdown")

/** Combined stdout+stderr of a finished or failed child process, read without unsafe assertions. */
const collectOutput = (value: unknown): string => {
  if (value === null || typeof value !== "object") return ""
  const stdout = "stdout" in value && typeof value.stdout === "string" ? value.stdout : ""
  const stderr = "stderr" in value && typeof value.stderr === "string" ? value.stderr : ""
  return stdout + stderr
}

// oxlint exits non-zero when it finds problems, which rejects the promise; read its output either way.
const runOxlint = (fix: boolean): string => {
  try {
    return collectOutput(execFileSync(OXLINT_BIN, fix ? ["--fix"] : [], { cwd: TMP, encoding: "utf8" }))
  } catch (error) {
    return collectOutput(error)
  }
}

describe("oxlint integration", () => {
  beforeAll(async () => {
    // oxlint loads the built JS plugin, so build before linting.
    execFileSync(TSDOWN_BIN, [], { cwd: ROOT })
    await fs.rm(TMP, { recursive: true, force: true })
    await fs.cp(FIXTURE, TMP, { recursive: true })
    // Point oxlint at the freshly built plugin by absolute path.
    const config = {
      jsPlugins: [PLUGIN],
      rules: {
        "clean-modules/require-subpath-imports": "error",
        "clean-modules/require-direct-exports": "error",
        "clean-modules/require-import-extensions": "error",
      },
    }
    await fs.writeFile(path.join(TMP, ".oxlintrc.json"), JSON.stringify(config, undefined, 2))
  })

  afterAll(async () => {
    await fs.rm(TMP, { recursive: true, force: true })
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

    const main = await fs.readFile(path.join(TMP, "src/main.ts"), "utf8")
    const helper = await fs.readFile(path.join(TMP, "src/helper.ts"), "utf8")

    expect(main).toContain('from "#helper.ts"')
    expect(helper).toContain("export const value = 1")
    expect(helper).not.toContain("export { value }")
    expect(runOxlint(false)).not.toContain("error clean-modules")
  })
})
