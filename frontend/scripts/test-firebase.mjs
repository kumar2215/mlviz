import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env };
if (process.platform === "win32" && !env.JAVA_TOOL_OPTIONS?.includes("jdk.net.unixdomain.tmpdir")) {
    // Some Windows/MSIX hosts cannot connect Java's internal Unix-domain pipe.
    // A nonexistent socket directory makes OpenJDK fall back to TCP loopback.
    // Keep this workaround local to the emulator process; do not create the directory.
    const socketDirectory = path.join(tmpdir(), `mlviz-no-unix-sockets-${randomUUID()}`);
    env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ""} "-Djdk.net.unixdomain.tmpdir=${socketDirectory}"`.trim();
}

const result = spawnSync(process.execPath, [
    path.join(root, "node_modules/firebase-tools/lib/bin/firebase.js"),
    "emulators:exec", "--project", "demo-mlviz-auth", "--config", path.join(root, "firebase.json"),
    "--only", "auth,firestore", "node --experimental-strip-types --test tests/firebase.integration.test.ts",
], { cwd: root, stdio: "inherit", env });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
