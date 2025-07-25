import { stat } from "node:fs/promises";
import { join } from "path";

export async function getSize(rspackDir, wasm) {
	const size = { size: 0, wasmSize: 0 };

	const binaryPath = join(
		rspackDir,
		"crates/node_binding/rspack.linux-x64-gnu.node"
	);
	const binaryStat = await stat(binaryPath);
	size.size = binaryStat.size;

	if (wasm) {
		const wasmPath = join(
			rspackDir,
			"crates/node_binding/rspack.wasm32-wasi.wasm"
		);
		const wasmStat = await stat(wasmPath);
		size.wasmSize = wasmStat.size;
	}
	return size;
}
