const { spawn, execFileSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const metroPort = 8081;
const projectRoot = path.join(__dirname, "..");
const reactNativeCli = path.join(__dirname, "..", "node_modules", "@react-native-community", "cli", "build", "bin.js");
const childEnv = {
  ...process.env,
  HOME: process.env.USERPROFILE || process.env.HOME,
  ANDROID_USER_HOME: process.env.ANDROID_USER_HOME || path.join(process.env.USERPROFILE || ".", ".android"),
};

function waitForPort(port, host = "127.0.0.1", timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const socket = net.createConnection({ port, host });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Metro did not start on port ${port} within ${timeoutMs / 1000} seconds.`));
        } else {
          setTimeout(check, 250);
        }
      });
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

waitForPort(metroPort, "127.0.0.1", 1000)
  .catch(() => {
    ownsMetro = true;
    // Rebuilding Metro's cache on every Android launch makes startup much
    // slower. Use the normal cache and keep reset-cache as an explicit script.
    metro = spawn(process.execPath, [reactNativeCli, "start", "--port", String(metroPort)], spawnOptions);
    metro.once("error", (error) => {
      console.error(`Metro failed to start: ${error.message}`);
    });
    return waitForPort(metroPort);
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
