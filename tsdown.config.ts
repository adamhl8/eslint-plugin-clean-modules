import { tsdownConfig } from "@adamhl8/configs"
import { defineConfig } from "tsdown"

// Point tsgo at `typescript-next` because `typescript` stays on 6 for typescript-eslint.
const config = tsdownConfig({ platform: "node", dts: { tsgo: { moduleUrl: import.meta.resolve("typescript-next") } } })

export default defineConfig(config)
