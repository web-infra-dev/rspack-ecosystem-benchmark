#!/usr/bin/env node
import meow from 'meow';
import { $, cd } from 'zx';
import { dirExist } from '../lib/utils.js';

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

    bench
} = cli.flags;

if (checkout) {
    if (!(await dirExist(path))) {
		await $`git clone ${repository} ${path}`;
	}
    cd(path);
    await $`git reset --hard`;
    const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`).toString().trim();
    const fetchUrl = `https://github.com/${repository}`;
	await $`git fetch ${fetchUrl} ${ref} --prune`;
    await $`git checkout -b ${Date.now()} FETCH_HEAD`;
	if (currentBranch) {
		await $`git branch -D ${currentBranch}`;
	}
}

if (build) {
    await `pnpm --version`;
	await `pnpm install --no-frozen-lockfile`;

    if (binding) {
        await `pnpm run build:binding:release`;
    }

    if (js) {
        await `pnpm run build:binding:js`;
    }
}

if (bench) {
    // todo
}
