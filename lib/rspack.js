import { resolve } from "path";
import { fileURLToPath } from "url";
import { runCommand, dirExist } from "./utils.js";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const rspackDir = resolve(rootDir, ".rspack");
const repoUrl = `https://github.com/web-infra-dev/rspack.git`;

async function switchToBranch(remote, branch) {
	await runCommand("git", ["reset", "--hard"]);

	let currentBranch = "";
	await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
		onData: function (name) {
			currentBranch = name;
		}
	});

	await runCommand("git", ["fetch", remote, branch, "--prune"]);
	await runCommand("git", [
		"checkout",
		"-b",
		String(new Date().valueOf()),
		"FETCH_HEAD"
	]);
	if (currentBranch) {
		await runCommand("git", ["branch", "-D", currentBranch]);
	}
}

export async function buildRspack(remote, branch) {
	if (!(await dirExist(rspackDir))) {
		await runCommand("git", ["clone", repoUrl, ".rspack"]);
	}
	process.chdir(rspackDir);

	console.log("== switch branch ==");
	console.log("use branch: ", remote, branch);
	await switchToBranch(remote, branch);

	console.log("== install deps ==");
	await runCommand("pnpm", ["install"]);

	console.log("== build rspack ==");
	await runCommand("npm", ["run", "build:cli:release"]);
}
