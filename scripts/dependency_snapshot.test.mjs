import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDependencySnapshot } from "./dependency_snapshot.mjs";

describe("dependency graph snapshot", () => {
  it("includes direct and transitive lockfile packages with valid edges", () => {
    const snapshot = buildDependencySnapshot({
      name: "sample",
      packages: {
        "": { dependencies: { "@sample/app": "1.0.0" }, devDependencies: { vitest: "1.0.0" } },
        "node_modules/@sample/app": { version: "1.0.0", dependencies: { tiny: "1.0.0" } },
        "node_modules/tiny": { version: "1.0.0" },
        "node_modules/vitest": { version: "1.0.0" },
      },
    }, { sha: "abc", ref: "refs/heads/master", runId: "1", scanned: "2026-01-01T00:00:00Z" });

    const resolved = snapshot.manifests["package-lock.json"].resolved;
    expect(Object.keys(resolved)).toHaveLength(3);
    expect(resolved["pkg:npm/%40sample/app@1.0.0"].relationship).toBe("direct");
    expect(resolved["pkg:npm/%40sample/app@1.0.0"].scope).toBe("runtime");
    expect(resolved["pkg:npm/tiny@1.0.0"].relationship).toBe("indirect");
    expect(resolved["pkg:npm/vitest@1.0.0"].scope).toBe("development");
    expect(resolved["pkg:npm/%40sample/app@1.0.0"].dependencies).toEqual(["pkg:npm/tiny@1.0.0"]);
  });

  it("rejects a lockfile with unresolved dependency edges", () => {
    expect(() => buildDependencySnapshot({
      packages: { "node_modules/parent": { version: "1.0.0", dependencies: { absent: "1.0.0" } } },
    }, { sha: "abc", ref: "refs/heads/master", runId: "1" })).toThrow("missing lockfile package");
  });

  it("generates a complete snapshot from the project lockfile", () => {
    const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
    const snapshot = buildDependencySnapshot(lock, { sha: "abc", ref: "refs/heads/master", runId: "1" });
    const packages = Object.values(snapshot.manifests["package-lock.json"].resolved);
    expect(packages.length).toBeGreaterThan(700);
    expect(packages.filter(({ relationship }) => relationship === "direct").length).toBeGreaterThan(20);
  });
});
