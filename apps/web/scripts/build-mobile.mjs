import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultMobileApiBaseUrl = "https://app-plantoes.onrender.com/api";
const mobileApiBaseUrl = process.env.VITE_API_BASE_URL || defaultMobileApiBaseUrl;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const webRoot = resolve(scriptDir, "..");
const tscBin = resolve(repoRoot, "node_modules/typescript/bin/tsc");
const viteBin = resolve(repoRoot, "node_modules/vite/bin/vite.js");

try {
  const parsedMobileApiBaseUrl = new URL(mobileApiBaseUrl);
  if (parsedMobileApiBaseUrl.protocol !== "https:") {
    throw new Error("Mobile API URL must use HTTPS.");
  }
} catch {
  console.error("VITE_API_BASE_URL must be an absolute HTTPS URL for mobile builds.");
  process.exit(1);
}

process.env.VITE_API_BASE_URL = mobileApiBaseUrl;

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: webRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run([tscBin, "--noEmit"]);
run([viteBin, "build", "--base", "./"]);
