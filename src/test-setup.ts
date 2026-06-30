import { RuleTester } from "@typescript-eslint/rule-tester"
import { afterAll, describe, it } from "vitest"

// vitest doesn't expose these as globals, so give the rule tester the hooks it needs.
RuleTester.afterAll = afterAll
// oxlint-disable-next-line typescript/strict-void-return - vitest's `describe` returns a value where the hook setter expects a void return
RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only
