import { stat } from "node:fs/promises";
import { join } from "path"

export async function getBinarySize (rspackDir) {
	let binaryPath= join(rspackDir, 'crates/node_binding/rspack.linux-x64-gnu.node')
	let binaryStat = await stat(binaryPath)
	return binaryStat.size
}
