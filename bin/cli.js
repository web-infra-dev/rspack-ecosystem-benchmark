#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from 'node:path';
import meow from 'meow';
import { $, cd } from 'zx';
import actionsCore from "@actions/core";
import { run, formatResultTable } from "../lib/index.js";
import { isGitHubActions, dirExist } from "../lib/utils.js";

$.verbose = true

const cli = meow({
	importMeta: import.meta,
	flags: {
        checkout: {
			type: 'boolean',
            default: true
		},
        // Rspack repository name.
        repository: {
            type: 'string',
            default: 'web-infra-dev/rspack'
        },
        // The branch, tag or SHA to checkout. When checking out the repository that
        // triggered a workflow, this defaults to the reference or SHA for that event.
        // Otherwise, uses the default branch.
        ref: {
            type: 'string',
            default: 'main'
        },
        // Place the Rspack repository.
        path: {
            type: 'string',
            default: `${process.cwd()}/.rspack`
        },
		build: {
			type: 'boolean',
            default: true
		},
        binding: {
			type: 'boolean',
            default: true
		},
        js: {
			type: 'boolean',
            default: true
		},
        bench: {
			type: 'boolean',
            default: true
		},
        shard: {
            type: 'string',
            default: '1/1'
        }
	}
});

const {
    checkout,
    repository,
    ref,
    path,

    build,
    binding,
    js,

    bench,
    shard
} = cli.flags;

const cwd = process.cwd();

if (checkout) {
    const fetchUrl = `https://github.com/${repository}`;
    if (!(await dirExist(path))) {
		await $`git clone ${fetchUrl} ${path}`;
	}

    cd(path);

    await $`git reset --hard`;
    const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`).toString().trim();
	await $`git fetch ${fetchUrl} ${ref} --prune`;
    await $`git checkout -b ${Date.now()} FETCH_HEAD`;
    await $`git log -1`;
	if (currentBranch) {
		await $`git branch -D ${currentBranch}`;
	}

    cd(cwd);
}

if (build) {
    cd(path);

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

if (bench) {
    const shardPair = shard.split('/').map(t => parseInt(t, 10));
    const [currentIndex, totalShards] = shardPair;
    const configPath = join(process.cwd(), 'bench.config.js');
    const { jobs } = (await import(configPath)).default;

    const shardSize = Math.ceil(jobs.length / totalShards);
    const shardJobs = jobs.slice(shardSize * (currentIndex - 1), shardSize * currentIndex);

    const outputDirectory = join(process.cwd(), 'output');
    await mkdir(outputDirectory, { recursive: true });

    if (shardJobs.length) {
        console.log([`Running jobs for shard ${currentIndex}/${totalShards}:`, ...shardJobs].join('\n  * '));

        for (const job of shardJobs) {
            const start = Date.now();
            const result = await run(job);
            if (isGitHubActions) {
                actionsCore.startGroup(`${job} result is`);
            } else {
                console.log(`${job} result is`);
            }

            console.log(formatResultTable(result, { verbose: true }));

            if (isGitHubActions) {
                actionsCore.endGroup()
                const cost = Math.ceil((Date.now() - start) / 1000)
                console.log(`Cost for \`${job}\`: ${cost} s`)
            }
    
            await writeFile(
                join(outputDirectory, `${job}.json`),
                JSON.stringify(result, null, 2)
            );
        }
    } else {
        console.log(`No jobs to run for shard ${currentIndex}/${totalShards}.`);
    }
}
