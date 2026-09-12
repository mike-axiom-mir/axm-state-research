import { verifyTransportCheckpoint } from "../dist/state-transport-checkpoint.js";

const MAX_INPUT_BYTES = 1024 * 1024;

async function readBoundedStdin() {
  const chunks = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    total += chunk.length;
    if (total > MAX_INPUT_BYTES) throw new Error("checkpoint verifier input exceeds 1 MiB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total);
}

try {
  const raw = await readBoundedStdin();
  const text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  const request = JSON.parse(text);
  const receipt = verifyTransportCheckpoint(request?.fixtureId, request?.checkpoint);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  if (receipt.status !== "PASS") process.exitCode = 2;
} catch (error) {
  process.stderr.write(`checkpoint-verifier-input:${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
