import { afterAll, describe, it } from "bun:test"

import { RuleTester } from "@typescript-eslint/rule-tester"

// Wire bun:test's hooks onto RuleTester explicitly instead of relying on globals.
RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it
