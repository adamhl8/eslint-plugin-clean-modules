import { describe, expect, it, mock } from "bun:test"
import path from "node:path"

import { absToSubpath, loadImportsMap, subpathToAbs } from "#shared/imports-map.ts"

// Force the non-POSIX `path.sep` so toPosix/fromPosix take their Windows branch. The path
// functions don't read the `sep` property, so resolve/join/dirname keep working as POSIX here.
const actualPath = { ...path }
void mock.module("node:path", () => ({ ...actualPath, sep: "\\", default: { ...actualPath, sep: "\\" } }))

const richDir = path.join(import.meta.dir, "fixtures", "rich")
const map = loadImportsMap(path.join(richDir, "src/foo.ts"))
if (!map) throw new Error("expected the rich fixture to produce an imports map")

// Single-segment mids so the separator swap is observable without corrupting the result.
describe("separator handling", () => {
  it("applies the mocked separator", () => {
    expect(path.sep).toBe("\\")
  })

  it("normalizes a matched path to its specifier (toPosix)", () => {
    expect(absToSubpath(path.join(richDir, "src/foo.ts"), map)).toBe("#foo.ts")
  })

  it("denormalizes a specifier back to its path (fromPosix)", () => {
    expect(subpathToAbs("#foo.ts", map)).toBe(path.join(richDir, "src/foo.ts"))
  })
})
