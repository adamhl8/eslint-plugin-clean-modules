import { knipConfig } from "@adamhl8/configs"

const config = knipConfig(
  {
    project: ["**/*", "!src/**/fixtures/**"],
    // Shared consts are used only within their own file but stay exported as part of the package surface.
    ignoreExportsUsedInFile: true,
    ignoreDependencies: ["@typescript/native-preview"],
  },
  { arrays: "replace" },
)

export default config
