import { readFile, writeFile, readdir, mkdir, copyFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { runCommand, dirExist, formatDate } from "../lib/utils.js";

const [, , token] = process.argv;
const GITHUB_ACTOR = process.env.GITHUB_ACTOR;
const date = formatDate(+new Date());
const repoUrl = `https://${GITHUB_ACTOR}:${token}@github.com/web-infra-dev/rspack-ecosystem-benchmark.git`;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const dataDir = resolve(rootDir, ".data");
const outputDir = resolve(rootDir, "output");
const dateDir = resolve(dataDir, date);

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

	await runCommand("git", ["reset", "--hard", "origin/data"]);
	await runCommand("git", ["pull", "--rebase"]);

	console.log("== copy output files ==");
	const indexFile = resolve(dataDir, "index.txt");
	const files = new Set((await readFile(indexFile, "utf-8")).split("\n"));
	files.delete("");

	if (!(await dirExist(dateDir))) {
		await mkdir(dateDir);
	}
	const outputFiles = await readdir(outputDir);
	for (const item of outputFiles) {
		if (item.endsWith(".json")) {
			files.add(`${date}/${item}`);
		}
		await copyFile(resolve(outputDir, item), resolve(dateDir, item));
	}

	console.log("== update index.txt ==");
	await writeFile(indexFile, Array.from(files, f => `${f}\n`).join("") + "\n");

	console.log("== commit ==");
	await runCommand("git", ["add", `${date}/*.json`, "index.txt"]);
	try {
		await runCommand("git", ["commit", "-m", `"add ${date} results"`]);
	} catch {}

	console.log("== push ==");
	await runCommand("git", ["push"]);
})().catch(err => {
	process.exitCode = 1;
	console.error(err.stack);
});
