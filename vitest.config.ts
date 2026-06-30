import { vitestConfig } from "@adamhl8/configs"
import { defineConfig } from "vitest/config"

const config = vitestConfig({
  test: {
    // RuleTester drives its assertions through node:assert, not vitest's expect.
    expect: { requireAssertions: false },
    setupFiles: ["src/test-setup.ts"],
  },
})

export default defineConfig(config)
