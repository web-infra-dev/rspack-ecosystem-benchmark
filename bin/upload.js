import { readFile, writeFile, readdir, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { runCommand, dirExist, formatDate } from "../lib/utils.js";

const [, , token, sha] = process.argv;
const storeByDate = !sha;
const GITHUB_ACTOR = process.env.GITHUB_ACTOR;
const dataTag = storeByDate ? formatDate(+new Date()) : sha.slice(0, 8);
const relativePath = storeByDate
	? dataTag
	: join("commits", sha.slice(0, 2), sha.slice(2));
const repoUrl = `https://${GITHUB_ACTOR}:${token}@github.com/web-infra-dev/rspack-ecosystem-benchmark.git`;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const dataDir = resolve(rootDir, ".data");
const outputDir = resolve(rootDir, "output");
const rspackDir = process.env.RSPACK_DIR || resolve(rootDir, ".rspack");
const storeDir = resolve(dataDir, relativePath);

async function getCommitSHA() {
	let commitSHA;
	await runCommand("git", ["rev-parse", "HEAD"], {
		onData(stdout) {
			commitSHA = stdout.toString().trim();
		}
	});
	console.log("Current Commit SHA", commitSHA);
	return commitSHA;
}

async function appendRspackBuildInfo() {
	const commitSHA = await getCommitSHA();
	const buildInfoFile = join(dataDir, "build-info.json");
	const buildInfo = existsSync(buildInfoFile)
		? JSON.parse(await readFile(buildInfoFile, "utf-8"))
		: {};
	buildInfo[dataTag] = {
		commitSHA
	};
	await writeFile(buildInfoFile, JSON.stringify(buildInfo, null, 2));
}

(async () => {
	if (!(await dirExist(dataDir))) {
		await runCommand("git", [
			"clone",
			"--branch",
			"data",
			"--single-branch",
			"--depth",
			"1",
			repoUrl,
			".data"
		]);
	}

	process.chdir(dataDir);
	await runCommand("git", ["remote", "set-url", "origin", repoUrl]);
	await runCommand("git", ["reset", "--hard", "origin/data"]);
	await runCommand("git", ["pull", "--rebase"]);

	console.log("== copy output files ==");
	const indexFile = resolve(dataDir, "index.txt");
	const files = new Set((await readFile(indexFile, "utf-8")).split("\n"));
	files.delete("");

	if (!(await dirExist(storeDir))) {
		await mkdir(storeDir, { recursive: true });
	}
	const outputFiles = await readdir(outputDir);
	for (const item of outputFiles) {
		if (item.endsWith(".json")) {
			files.add(`${dataTag}/${item}`);
		}
		await copyFile(resolve(outputDir, item), resolve(storeDir, item));
	}

	if (storeByDate) {
		console.log("== update index.txt ==");
		await writeFile(
			indexFile,
			Array.from(files, f => `${f}\n`).join("") + "\n"
		);

		console.log("== update build-info.json ==");
		process.chdir(rspackDir);
		await appendRspackBuildInfo();
	}
	process.chdir(dataDir);

	console.log("== commit ==");
	await runCommand(
		"git",
		storeByDate
			? ["add", `${relativePath}/*.json`, "index.txt", "build-info.json"]
			: ["add", `${relativePath}/*.json`]
	);
	try {
		await runCommand("git", ["commit", "-m", `"add ${dataTag} results"`]);
	} catch {}

	console.log("== push ==");
	await runCommand("git", ["push"]);
})().catch(err => {
	process.exitCode = 1;
	console.error(err.stack);
});
