import path from "node:path"

import { RuleTester } from "@typescript-eslint/rule-tester"

export const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
})

export const FIXTURES = path.join(import.meta.dirname, "fixtures")
