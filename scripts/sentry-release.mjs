// scripts/sentry-release.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(cmd, opts = {}) {
  console.log(`[sentry] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const text = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;

    const idx = s.indexOf("=");
    if (idx === -1) continue;

    const key = s.slice(0, idx).trim();
    let val = s.slice(idx + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    env[key] = val;
  }
  return env;
}

function mustEnv(k) {
  const v = process.env[k];
  if (!v) throw new Error(`[sentry] missing env: ${k} (check .env.sentry)`);
  return v;
}

// 1) 读取 .env.sentry
const envFile = path.resolve(process.cwd(), ".env.sentry");
Object.assign(process.env, loadDotEnv(envFile));

// 2) 必要参数
const SENTRY_AUTH_TOKEN = mustEnv("SENTRY_AUTH_TOKEN");
const SENTRY_ORG = mustEnv("SENTRY_ORG");
const SENTRY_PROJECT = mustEnv("SENTRY_PROJECT");

// 3) 生成 release：pkg version + git hash
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const gitSha = execSync("git rev-parse --short HEAD").toString().trim();
const release = `${pkg.name}@${pkg.version}+${gitSha}`;

console.log(`\n[sentry] release: ${release}\n`);

// 4) 给 sentry-cli 用的环境变量
process.env.SENTRY_AUTH_TOKEN = SENTRY_AUTH_TOKEN;

// ✅ 关键修复：不要用全局 --org/--project，改用子命令参数（-o/-p）
// 5) 创建 release
run(
  `npx sentry-cli releases -o ${SENTRY_ORG} -p ${SENTRY_PROJECT} new ${release}`,
);

// 6) 上传 sourcemaps（Vite 输出在 dist）
run(
  `npx sentry-cli sourcemaps -o ${SENTRY_ORG} -p ${SENTRY_PROJECT} upload dist ` +
    `--release ${release} --url-prefix "~/" --rewrite --validate`,
);

console.log("\n[sentry] done.\n");
