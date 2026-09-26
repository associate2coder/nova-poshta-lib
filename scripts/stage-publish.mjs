#!/usr/bin/env node
// @changesets/cli has no native `npm stage publish` support yet
// (https://github.com/changesets/changesets/issues/2025), so `changeset publish`'s own
// idempotency + publish step is replaced by this script, called via the "release" npm script.
// Requires npm >= 11.15.0 and a trusted-publisher (OIDC) config on the registry for this repo.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));

let liveVersion;
try {
  liveVersion = execSync(`npm view ${name}@${version} version`, {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  liveVersion = null;
}

if (liveVersion === version) {
  console.log(`${name}@${version} is already live on the registry — nothing to stage.`);
  process.exit(0);
}

console.log(`Staging ${name}@${version} for maintainer review (npm stage publish)...`);
execSync("npm stage publish", { stdio: "inherit" });
console.log(
  "Staged. Approve with 2FA via `npm stage approve <stage-id>` or the npmjs.com Staged " +
    "Packages tab, then run the Docs Deploy workflow manually to refresh the reference site.",
);
