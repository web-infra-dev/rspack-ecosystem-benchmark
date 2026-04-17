import { stat } from "node:fs/promises";
import { join } from "path";
import { platform, arch } from "node:process";

function getBinaryName() {
	if (platform === "darwin") {
		if (arch === "arm64") {
			return "rspack.darwin-arm64.node";
		}
	}
	return "rspack.linux-x64-gnu.node";
}

export async function getBinarySize(rspackDir, profile = "") {
	let binaryPath = profile
		? join(rspackDir, `crates/node_binding/${getBinaryName()}`)
		: join(rspackDir, `crates/node_binding/${profile}/${getBinaryName()}`);

	try {
		let binaryStat = await stat(binaryPath);
		return binaryStat.size;
	} catch (e) {
		return 0;
	}
}
