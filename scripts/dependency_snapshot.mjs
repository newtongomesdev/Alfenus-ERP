import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function packageNameFromLocation(location) {
  const marker = "node_modules/";
  const index = location.lastIndexOf(marker);
  if (index < 0) return null;
  return location.slice(index + marker.length);
}

function packageUrl(name, version) {
  const encodedName = name.startsWith("@") ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${encodedName}@${version}`;
}

function resolvePackage(location, dependencyName, packages) {
  let current = location;
  while (current) {
    const candidate = current
      ? `${current}/node_modules/${dependencyName}`
      : `node_modules/${dependencyName}`;
    if (packages[candidate]) return candidate;
    const marker = "/node_modules/";
    const index = current.lastIndexOf(marker);
    current = index >= 0 ? current.slice(0, index) : "";
  }
  const rootCandidate = `node_modules/${dependencyName}`;
  return packages[rootCandidate] ? rootCandidate : null;
}

function directRoots(root, packageEntries) {
  const runtime = new Set([
    ...Object.keys(root.dependencies ?? {}),
    ...Object.keys(root.optionalDependencies ?? {}),
  ]);
  const development = new Set(Object.keys(root.devDependencies ?? {}));
  const roots = new Map();

  for (const [name, scope] of [...runtime].map((name) => [name, "runtime"])) {
    const location = resolvePackage("", name, packageEntries);
    if (location) roots.set(location, scope);
  }
  for (const name of development) {
    const location = resolvePackage("", name, packageEntries);
    if (location && !roots.has(location)) roots.set(location, "development");
  }
  return roots;
}

export function buildDependencySnapshot(lock, { sha, ref, runId, scanned = new Date().toISOString() }) {
  if (!sha || !ref || !runId) throw new Error("sha, ref, and runId are required");
  const packages = lock.packages ?? {};
  const packageEntries = Object.fromEntries(
    Object.entries(packages).filter(([location, entry]) => location && !entry.link && entry.version),
  );
  const roots = directRoots(lock.packages?.[""] ?? {}, packageEntries);
  const scopes = new Map();
  const queue = [...roots].map(([location, scope]) => [location, scope]);

  while (queue.length) {
    const [location, scope] = queue.shift();
    const previous = scopes.get(location);
    if (previous === "runtime" || previous === scope) continue;
    scopes.set(location, scope);
    const entry = packageEntries[location];
    const dependencies = new Set([
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
      ...Object.keys(entry.peerDependencies ?? {}),
    ]);
    for (const name of dependencies) {
      const child = resolvePackage(location, name, packageEntries);
      if (!child && !(entry.peerDependencies?.[name] && entry.peerDependenciesMeta?.[name]?.optional)) {
        throw new Error(`Dependency edge points to missing lockfile package: ${name} from ${location}`);
      }
      if (child) queue.push([child, scope]);
    }
  }

  const resolved = {};
  for (const [location, entry] of Object.entries(packageEntries)) {
    const name = packageNameFromLocation(location);
    if (!name) continue;
    const purl = packageUrl(name, entry.version);
    const current = resolved[purl] ?? {
      package_url: purl,
      relationship: roots.has(location) ? "direct" : "indirect",
      scope: scopes.get(location) ?? "development",
      dependencies: [],
    };
    if (roots.has(location)) current.relationship = "direct";
    if (scopes.get(location) === "runtime") current.scope = "runtime";

    const names = new Set([
      ...Object.keys(entry.dependencies ?? {}),
      ...Object.keys(entry.optionalDependencies ?? {}),
      ...Object.keys(entry.peerDependencies ?? {}),
    ]);
    const children = new Set(current.dependencies);
    for (const dependencyName of names) {
      const childLocation = resolvePackage(location, dependencyName, packageEntries);
      const child = childLocation && packageEntries[childLocation];
      const childName = childLocation && packageNameFromLocation(childLocation);
      if (!child && !(entry.peerDependencies?.[dependencyName] && entry.peerDependenciesMeta?.[dependencyName]?.optional)) {
        throw new Error(`Dependency edge points to missing lockfile package: ${dependencyName} from ${location}`);
      }
      if (child && childName) children.add(packageUrl(childName, child.version));
    }
    current.dependencies = [...children].sort();
    resolved[purl] = current;
  }

  const rootDependencies = [...roots.keys()].map((location) => {
    const entry = packageEntries[location];
    return packageUrl(packageNameFromLocation(location), entry.version);
  }).sort();
  const known = new Set(Object.keys(resolved));
  for (const dependency of Object.values(resolved)) {
    for (const child of dependency.dependencies) {
      if (!known.has(child)) throw new Error(`Dependency edge points to missing lockfile package: ${child}`);
    }
  }
  for (const dependency of rootDependencies) {
    if (!known.has(dependency)) throw new Error(`Root dependency is missing from snapshot: ${dependency}`);
  }

  return {
    version: 0,
    sha,
    ref,
    job: { correlator: "alfenus-npm-lockfile", id: runId },
    detector: {
      name: "Alfenus npm lockfile snapshot",
      version: "1.0.0",
      url: "https://github.com/newtongomesdev/Alfenus-ERP",
    },
    scanned,
    manifests: {
      "package-lock.json": {
        name: "package-lock.json",
        file: { source_location: "package-lock.json" },
        resolved,
      },
    },
  };
}

async function main() {
  const lockPath = path.resolve("package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const snapshot = buildDependencySnapshot(lock, {
    sha: process.env.GITHUB_SHA ?? "local-dry-run",
    ref: process.env.GITHUB_REF ?? "refs/heads/local",
    runId: process.env.GITHUB_RUN_ID ?? "local-dry-run",
  });

  if (process.argv.includes("--dry-run")) {
    const manifest = snapshot.manifests["package-lock.json"];
    console.log(JSON.stringify({
      validated: true,
      dependencies: Object.keys(manifest.resolved).length,
      rootDependencies: manifest.dependencies.length,
      danglingEdges: 0,
    }));
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
  const response = await fetch(`https://api.github.com/repos/${repository}/dependency-graph/snapshots`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  if (!response.ok) {
    throw new Error(`Dependency snapshot submission failed (${response.status}): ${await response.text()}`);
  }
  const result = await response.json();
  if (result.result !== "SUCCESS") throw new Error(`Dependency snapshot rejected: ${result.message}`);
  console.log(`Dependency snapshot submitted: ${Object.keys(snapshot.manifests["package-lock.json"].resolved).length} packages.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Dependency snapshot failed");
    process.exitCode = 1;
  });
}
