import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadProfile() {
  const source = readFileSync(path.join(root, "data.js"), "utf8");
  return new Function(source + "\nreturn PROFILE;")();
}

function findChrome() {
  const candidates = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "msedge"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes("/") && !existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
    if (!probe.error) return candidate;
  }
  throw new Error("找不到 Chrome / Chromium，可通过环境变量 CHROME 指定路径");
}

function renderImage(chrome) {
  const page = pathToFileURL(path.join(root, "og.html")).href;
  const out = path.join(root, "og.png");
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=2",
      "--window-size=1200,630",
      "--virtual-time-budget=15000",
      "--screenshot=" + out,
      page
    ],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error("截图失败，退出码 " + result.status);
  }
  return out;
}

function updateMeta(profile) {
  const title = (profile.name || "无名玩家") + " #" + (profile.tag || "0000");
  const rank = profile.peakRank && profile.peakRank.name ? "最高段位 " + profile.peakRank.name + " · " : "";
  const time = profile.playTime ? profile.playTime + " · " : "";
  const description = rank + time + "无畏契约个人名片";

  const file = path.join(root, "index.html");
  let html = readFileSync(file, "utf8");

  function setMeta(source, key, value) {
    var pattern = new RegExp('<meta\\b[^>]*\\bdata-og="' + key + '"[^>]*>', "g");
    return source.replace(pattern, function (tag) {
      return tag.replace(/content="[^"]*"/, 'content="' + value + '"');
    });
  }

  html = setMeta(html, "title", title);
  html = setMeta(html, "description", description);
  writeFileSync(file, html);

  console.log("标题:", title);
  console.log("描述:", description);
}

function main() {
  const profile = loadProfile();
  const chrome = findChrome();
  const out = renderImage(chrome);
  updateMeta(profile);
  console.log("已生成:", path.relative(root, out));
}

main();
