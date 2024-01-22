import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { mkdir, writeFile } from "fs/promises";
import { $ } from "zx";
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

async function getCommitSHA() {
	const stdout = await $`git rev-parse HEAD`;
	const commitSHA = stdout.trim();
	console.log("Current Commit SHA", commitSHA);
	callback(null, commitSHA);
}

async function getShortCommitSHA() {
	const stdout = await $`git rev-parse --short HEAD`;
	const shortCommitSHA = stdout.trim();
	console.log("Current Short Commit SHA:", shortCommitSHA);
	return shortCommitSHA;
}

async function recordRspackBuildInfo() {
	const [commitSHA, shortCommitSHA] = await Promise.all([getCommitSHA(), getShortCommitSHA()]);
	const outputDir = resolve(rootDir, "output");
	await mkdir(outputDir, { recursive: true });

	const buildInfoFile = join(outputDir, "build-info.json");
	const buildInfo = {
		commitSHA,
		shortCommitSHA,
	};
	await writeFile(buildInfoFile, JSON.stringify(buildInfo, null, 2));
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
	await runCommand("pnpm", ["--version"]);
	await runCommand("pnpm", ["install", "--no-frozen-lockfile"]);

	console.log("== build rspack ==");
	await runCommand("npm", ["run", "build:cli:release"]);

	console.log("== recording rspack build info ==");
	await recordRspackBuildInfo();
}
