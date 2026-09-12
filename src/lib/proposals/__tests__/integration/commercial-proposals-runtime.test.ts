import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const enabled = process.env.PROPOSALS_INTEGRATION_TESTS === "true";
describe.skipIf(!enabled)("commercial proposals runtime", () => {
  it("passes the real JWT/RLS/Data API runtime harness", () => {
    expect(() => execFileSync(process.execPath, ["scripts/test_commercial_proposals_runtime.mjs"], { stdio: "inherit", env: process.env })).not.toThrow();
  }, 180_000);
});
