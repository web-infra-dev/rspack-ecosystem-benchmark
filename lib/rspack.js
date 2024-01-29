import { resolve, join } from "path";
import { rm, rename, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { runCommand, dirExist } from "./utils.js";

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const rspackDir = resolve(rootDir, ".rspack");
const tempDir = resolve(rootDir, ".temp");
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

async function preserveAndRun(rspackDir, run) {
	const rspackTarget = join(rspackDir, 'target');
	const tempRspackTarget = join(tempDir, 'target');
	const exists = await dirExist(rspackTarget);
	if (exists) {
		if (!(await dirExist(tempDir))) {
			await mkdir(tempDir);
		}
		await rename(rspackTarget, tempRspackTarget);
		await rm(rspackDir, { recursive: true });
	}
	try {
		await run()
	} finally {
		if (exists) {
			await rename(tempRspackTarget, rspackTarget);
		}
	}
}

export async function buildRspack(remote, branch) {
	if (!(await dirExist(join(rspackDir, '.git')))) {
		await preserveAndRun(rspackDir, async () => {
			console.log(`git clone ${repoUrl} .rspack`);
			await runCommand("git", ["clone", repoUrl, ".rspack"]);
		});
	}
	process.chdir(rspackDir);

	console.log("== switch branch ==");
	console.log("use branch: ", remote, branch);
	await switchToBranch(remote, branch);

	console.log("== install deps ==");
	await runCommand("pnpm", ["--version"]);
	await runCommand("pnpm", ["install", "--no-frozen-lockfile"]);

	console.log("== build rspack ==");
	await runCommand("npm", ["run", "build:cli:release"]);
}
