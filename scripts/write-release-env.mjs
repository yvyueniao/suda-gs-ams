// scripts/write-release-env.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const version = pkg.version ?? "0.0.0";

let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD").toString().trim();
} catch {}

const release = `suda-gs-ams@${version}+${commit}`;

fs.writeFileSync(
  ".env.production.local",
  `VITE_APP_RELEASE=${release}\n`,
  "utf-8",
);
console.log("[release] wrote .env.production.local:", release);
