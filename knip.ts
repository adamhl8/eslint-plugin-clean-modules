import { knipConfig } from "@adamhl8/configs"

const config = knipConfig(
  {
    // Shared consts are used only within their own file but stay exported as part of the package surface.
    ignoreExportsUsedInFile: true,
  },
  {
    project: ["**/*", "!src/**/fixtures/**"],
    ignoreDependencies: ["@typescript/native-preview"],
  },
)

export default config
