#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import meow from "meow";
import { $, cd } from "zx";
import actionsCore from "@actions/core";
import { run, formatResultTable } from "../lib/index.js";
import { isGitHubActions, dirExist } from "../lib/utils.js";
import { compare } from "../lib/compare.js";

$.verbose = true;

const cli = meow({
	importMeta: import.meta,
	flags: {
		// Rspack repository name.
		repository: {
			type: "string",
			default: "web-infra-dev/rspack"
		},
		// The branch, tag or SHA to checkout. When checking out the repository that
		// triggered a workflow, this defaults to the reference or SHA for that event.
		// Otherwise, uses the default branch.
		ref: {
			type: "string",
			default: "main"
		},

		binding: {
			type: "boolean",
			default: true
		},
		js: {
			type: "boolean",
			default: true
		},

		shard: {
			type: "string",
			default: "1/1"
		},

		base: {
			type: "string",
			default: "latest"
		},
		current: {
			type: "string",
			default: "current"
		}
	}
});

const command = cli.input.at(0);

const {
	repository,
	ref,

	binding,
	js,

	shard,

	base,
	current
} = cli.flags;

const cwd = process.cwd();

const configPath = join(process.cwd(), "bench.config.js");
const config = (await import(configPath)).default;

const jobs = config.jobs ?? [];
const rspackDirectory = config.rspackDirectory ?? join(cwd, ".rspack");
const benchmarkDirectory = config.benchmarkDirectory ?? join(cwd, "output");

if (!command || command === "build") {
	const fetchUrl = `https://github.com/${repository}`;
	if (!(await dirExist(rspackDirectory))) {
		await $`git clone ${fetchUrl} ${rspackDirectory}`;
	}

	cd(rspackDirectory);

	await $`git reset --hard`;
	const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`)
		.toString()
		.trim();
	await $`git fetch ${fetchUrl} ${ref} --prune`;
	await $`git checkout -b ${Date.now()} FETCH_HEAD`;
	if (currentBranch) {
		await $`git branch -D ${currentBranch}`;
	}

	await $`git log -1`;

	await $`pnpm --version`;
	await $`pnpm install --prefer-frozen-lockfile --prefer-offline`;

	if (binding) {
		await $`pnpm run build:binding:release`;
	}

	if (js) {
		await $`pnpm run build:js`;
	}

	cd(cwd);
}

if (!command || command === "bench") {
	const shardPair = shard.split("/").map(t => parseInt(t, 10));
	const [currentIndex, totalShards] = shardPair;

	const shardSize = Math.ceil(jobs.length / totalShards);
	const shardJobs = jobs.slice(
		shardSize * (currentIndex - 1),
		shardSize * currentIndex
	);

	await mkdir(benchmarkDirectory, { recursive: true });

	if (shardJobs.length) {
		console.log(
			[
				`Running jobs for shard ${currentIndex}/${totalShards}:`,
				...shardJobs
			].join("\n  * ")
		);

		for (const job of shardJobs) {
			const start = Date.now();
			const result = await run(job.name, job.runs);
			const message = `${job.name} was run ${job.runs} times, with the following results:`;
			if (isGitHubActions) {
				actionsCore.startGroup(message);
			} else {
				console.log(message);
			}

			console.log(formatResultTable(result, { verbose: true }));

			if (isGitHubActions) {
				actionsCore.endGroup();
				const cost = Math.ceil((Date.now() - start) / 1000);
				console.log(`Cost for \`${job.name}\`: ${cost} s`);
			}

			await writeFile(
				join(benchmarkDirectory, `${job.name}.json`),
				JSON.stringify(result, null, 2)
			);
		}
	} else {
		console.log(`No jobs to run for shard ${currentIndex}/${totalShards}.`);
	}
}

if (!command || command === "compare") {
	compare(base, current, benchmarkDirectory);
}
