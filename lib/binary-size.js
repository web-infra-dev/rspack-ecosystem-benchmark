import { stat } from "node:fs/promises";
import { join } from "path"
import { platform, arch } from "node:process";

function getBinaryName() {
  if (platform === 'darwin') {
	if (arch === 'arm64') {
		return 'rspack.darwin-arm64.node'
	}
  }
  return 'rspack.linux-x64-gnu.node';
}

export async function getBinarySize (rspackDir) {
	let binaryPath = join(rspackDir, `crates/node_binding/${getBinaryName()}`)
	let binaryStat = await stat(binaryPath)
	return binaryStat.size
}
