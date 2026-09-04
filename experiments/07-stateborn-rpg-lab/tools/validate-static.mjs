import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlEntrypoints = {
  "dist/index.html": ["./styles.css", "./stateborn.bundle.js", "./curiosity.html", "./coexistence.html", "./capsules.html", "./language.html"],
  "dist/curiosity.html": ["./curiosity.css", "./curiosity.bundle.js", "./index.html", "./coexistence.html", "./capsules.html", "./language.html"],
  "dist/coexistence.html": ["./curiosity.css", "./coexistence.css", "./coexistence.bundle.js", "./index.html", "./curiosity.html", "./capsules.html", "./language.html"],
  "dist/capsules.html": ["./curiosity.css", "./capsule.css", "./capsule.bundle.js", "./coexistence.html", "./curiosity.html", "./language.html"],
  "dist/language.html": ["./curiosity.css", "./language.css", "./language.bundle.js", "./index.html", "./capsules.html"],
};
const javascriptFiles = ["dist/stateborn.bundle.js", "dist/app.js", "dist/engine.js", "dist/world.js", "dist/living-world.js", "dist/curiosity-world.js", "dist/curiosity-app.js", "dist/curiosity.bundle.js", "dist/coexistence-world.js", "dist/coexistence-app.js", "dist/coexistence.bundle.js", "dist/capsule-world.js", "dist/capsule-app.js", "dist/capsule.bundle.js", "dist/state-language.js", "dist/language-app.js", "dist/language.bundle.js"];
const required = [...Object.keys(htmlEntrypoints), "dist/styles.css", "dist/curiosity.css", "dist/coexistence.css", "dist/capsule.css", "dist/language.css", ...javascriptFiles, ".openai/hosting.json"];
const failures = [];

for (const relative of required) {
  if (!existsSync(resolve(root, relative))) failures.push(`missing:${relative}`);
}

for (const [entrypoint, assets] of Object.entries(htmlEntrypoints)) {
  const html = readFileSync(resolve(root, entrypoint), "utf8");
  for (const asset of assets) {
    if (!html.includes(asset)) failures.push(`entrypoint-reference:${entrypoint}:${asset}`);
    if (!existsSync(resolve(root, "dist", asset))) failures.push(`entrypoint-file:${entrypoint}:${asset}`);
  }
}

for (const relative of javascriptFiles) {
  const checked = spawnSync(process.execPath, ["--check", resolve(root, relative)], { encoding: "utf8" });
  if (checked.status !== 0) failures.push(`javascript-syntax:${relative}:${checked.stderr.trim()}`);
}

for (const relative of required.filter((path) => path.startsWith("dist/"))) {
  const contents = readFileSync(resolve(root, relative), "utf8");
  if (/https?:\/\//i.test(contents)) failures.push(`external-dependency:${relative}`);
}

const manifest = JSON.parse(readFileSync(resolve(root, ".openai/hosting.json"), "utf8"));
if (manifest.static?.directory !== "dist") failures.push("hosting-static-directory");

const result = {
  schema: "axm.stateborn.static-validation/v1",
  status: failures.length ? "FAIL" : "PASS",
  filesChecked: required.length,
  javascriptFilesChecked: javascriptFiles.length,
  externalDependencies: false,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
