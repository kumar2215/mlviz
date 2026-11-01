import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Exercise actual backend responses without requiring a running HTTP server.
const backend = fileURLToPath(new URL("../../../backend/", import.meta.url));
const python = process.env.PYTHON ?? fileURLToPath(new URL(process.platform === "win32" ? "../../../backend/.venv/Scripts/python.exe" : "../../../backend/.venv/bin/python", import.meta.url));
const replies = new Map<string, string>();
export function backendReply(lab: string, body: object = {}) {
    const key = JSON.stringify([lab, body]);
    if (replies.has(key)) return JSON.parse(replies.get(key)!);
    const script = `import sys,json
from models.neural_networks import PerceptronRequest,SingleLayerRequest,MlpRequest,TrainingRequest
from services.neural_network_service import run_lab
lab,body=json.load(sys.stdin)
models=dict(perceptron=PerceptronRequest,single_layer=SingleLayerRequest,mlp=MlpRequest,training=TrainingRequest)
print(json.dumps(run_lab(lab,models[lab].model_validate(body)),allow_nan=False))`;
    const result = spawnSync(python, ["-X", "utf8", "-c", script], { cwd: backend, input: key, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 30000 });
    if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr);
    replies.set(key, result.stdout);
    return JSON.parse(result.stdout);
}

export const backendFetch: typeof fetch = async (url, options) => {
    const lab = String(url).split("/").at(-1)!;
    return Response.json(backendReply(lab, JSON.parse(String(options?.body))));
};
