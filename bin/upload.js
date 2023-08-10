import { readFile, writeFile, readdir, mkdir, copyFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { runCommand, dirExist } from "../lib/utils.js";

const [, , token] = process.argv;
const now = new Date();
const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
const repoUrl = `https://${GITHUB_ACTOR}:${token}@github.com/web-infra-dev/rspack-ecosystem-benchmark.git`;

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const pagesDir = resolve(rootDir, ".gh-pages");
const outputDir = resolve(rootDir, "output");
const resultsDir = resolve(pagesDir, "results");
const dataDir = resolve(resultsDir, date);

(async () => {
	if (!(await dirExist(pagesDir))) {
		await runCommand("git", [
			"clone",
			"--branch",
			"gh-pages",
			"--single-branch",
			"--depth",
			"1",
			repoUrl,
			".gh-pages"
		]);
	}
	process.chdir(pagesDir);

	await runCommand("git", ["reset", "--hard", "origin/gh-pages"]);
	await runCommand("git", ["pull", "--rebase"]);

	console.log("== copy output files ==");
	const indexFile = resolve(resultsDir, "index.txt");
	const files = new Set((await readFile(indexFile, "utf-8")).split("\n"));
	files.delete("");

	if (!(await dirExist(dataDir))) {
		await mkdir(dataDir);
	}
	const outputFiles = await readdir(outputDir);
	for (const item of outputFiles) {
		if (item.endsWith(".json")) {
			files.add(`${date}/${item}`);
		}
		await copyFile(resolve(outputDir, item), resolve(dataDir, item));
	}

	console.log("== update index.txt ==");
	await writeFile(indexFile, Array.from(files, f => `${f}\n`).join("") + "\n");

	console.log("== commit ==");
	await runCommand("git", [
		"add",
		`results/${date}/*.json`,
		"results/index.txt"
	]);
	try {
		await runCommand("git", ["commit", "-m", `"add ${date} results"`]);
	} catch {}

	console.log("== push ==");
	await runCommand("git", ["push"]);
})().catch(err => {
	process.exitCode = 1;
	console.error(err.stack);
});
