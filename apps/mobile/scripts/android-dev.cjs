const { spawn, execFileSync } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const metroPort = 8081;
const projectRoot = path.join(__dirname, "..");
const reactNativeCli = path.join(__dirname, "..", "node_modules", "@react-native-community", "cli", "build", "bin.js");
const childEnv = {
  ...process.env,
  HOME: process.env.USERPROFILE || process.env.HOME,
  ANDROID_USER_HOME: process.env.ANDROID_USER_HOME || path.join(process.env.USERPROFILE || ".", ".android"),
};

// A raw TCP connect only proves *something* is listening on the port — a
// stale/crashed Metro process (or an unrelated process) can leave the port
// open without actually serving bundles, which makes this script think
// Metro is ready and skip spawning it, so the app launches and is stuck at
// "Loading from localhost..." forever. Metro's /status endpoint is the real
// readiness signal: a healthy instance always responds
// "packager-status:running".
function waitForMetroHealthy(port, host = "127.0.0.1", timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Metro did not report healthy on port ${port} within ${timeoutMs / 1000} seconds.`));
      } else {
        setTimeout(check, 250);
      }
    };
    const check = () => {
      const request = http.get({ host, port, path: "/status", timeout: 2000 }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if (res.statusCode === 200 && body.trim() === "packager-status:running") resolve();
          else retry();
        });
      });
      request.on("timeout", () => request.destroy());
      request.on("error", retry);
    };
    check();
  });
}

const spawnOptions = { stdio: "inherit", cwd: projectRoot, env: childEnv };
let metro;
let ownsMetro = false;
let android;
let shuttingDown = false;

function stopMetro() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (android && !android.killed) android.kill();
  if (ownsMetro && metro && !metro.killed) metro.kill();
}

process.on("SIGINT", stopMetro);
process.on("SIGTERM", stopMetro);

waitForMetroHealthy(metroPort, "127.0.0.1", 1500)
  .then(() => console.log(`A healthy Metro is already running on port ${metroPort}; reusing it.`))
  .catch(() => {
    ownsMetro = true;
    // Rebuilding Metro's cache on every Android launch makes startup much
    // slower. Use the normal cache and keep reset-cache as an explicit script.
    metro = spawn(process.execPath, [reactNativeCli, "start", "--port", String(metroPort)], spawnOptions);
    // Race the health check against Metro dying outright (e.g. the port is
    // held by a process that won't yield it) so a doomed launch fails fast
    // instead of polling for the full 120s timeout.
    const failedEarly = new Promise((_resolve, reject) => {
      metro.once("error", (error) => reject(new Error(`Metro failed to start: ${error.message}`)));
      metro.once("exit", (code, signal) => {
        if (!shuttingDown) reject(new Error(`Metro exited before becoming healthy${code === null ? ` (${signal})` : ` (code ${code})`}.`));
      });
    });
    // If Metro starts fine and only crashes later (after this race is
    // already won by the health check), that later rejection would
    // otherwise be an unhandled rejection — swallow it here; the running
    // Metro process's own stdio (inherited) already surfaces the crash.
    failedEarly.catch(() => {});
    return Promise.race([waitForMetroHealthy(metroPort), failedEarly]);
  })
  .then(() => {
    try {
      execFileSync("adb", ["reverse", "tcp:8081", "tcp:8081"], { stdio: "inherit", env: childEnv });
    } catch {
      console.warn("adb reverse was not available; continuing without USB Metro reverse.");
    }

    android = spawn(process.execPath, [reactNativeCli, "run-android", "--no-packager", "--active-arch-only", "--port", String(metroPort)], spawnOptions);
    android.once("exit", (code, signal) => {
      if (code !== 0 || signal) {
        console.error(`Android launch failed${code === null ? ` (${signal})` : ` with exit code ${code}`}. Metro remains available on port ${metroPort}.`);
      } else {
        console.log(`Android app launched. Metro remains available on port ${metroPort}. Press Ctrl+C to stop both.`);
      }
    });
  })
  .catch((error) => {
    console.error(error.message);
    stopMetro();
    process.exitCode = 1;
  });
