import fs from "node:fs"
import path from "node:path"

// https://www.typescriptlang.org/docs/handbook/modules/reference.html#file-extension-substitution
// An import with any of these extensions (or none) can resolve to a real TS file.
export const TS_EXTENSION_SLOTS = ["", ".js", ".jsx", ".ts", ".tsx"]
export const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".d.ts"]

export const isRelativeSpecifier = (specifier: string): boolean =>
  specifier.startsWith("./") || specifier.startsWith("../")

export const isSubpathSpecifier = (specifier: string): boolean => specifier.startsWith("#")

export const resolveRelative = (filename: string, specifier: string): string =>
  path.resolve(path.dirname(filename), specifier)

/** The real TS extension for `absPath` on disk (ignoring its current extension), or undefined. */
export const findOnDiskExtension = (absPath: string): string | undefined => {
  const parsed = path.parse(absPath)
  for (const ext of ALLOWED_EXTENSIONS) {
    // Omit `base` so path.format honors `ext` over the parsed base.
    const candidate = path.format({ dir: parsed.dir, name: parsed.name, ext })
    if (fs.existsSync(candidate)) return ext
  }
  return undefined
}

export const isExistingDirectory = (absPath: string): boolean => {
  try {
    return fs.statSync(absPath).isDirectory()
  } catch {
    return false
  }
}
