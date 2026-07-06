import { knipConfig } from "@adamhl8/configs"

const config = knipConfig(
  {
    project: ["**.*", "!src/**/fixtures/**", "!src/test-setup.ts"],
    // These shared types/consts are used within their own file and surface in the unbundled dist
    // .d.ts files, so they must stay exported even though no other module imports them by name.
    ignoreExportsUsedInFile: true,
    ignoreDependencies: [""],
  },
  { arrays: "replace" },
)

export default config
