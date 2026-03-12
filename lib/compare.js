import { resolve, basename } from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";
import { formatDiffTable } from "../lib/index.js";
import {
	fetchBuildInfo,
	fetchIndex,
	fetchBenchmarkResult,
	fetchCommitFiles,
	fetchCommitBenchmarkResult,
	fetchRspackBranchCommits
} from "../lib/services.js";

function getOverThresholdTags(diff) {
	return Object.entries(diff)
		.map(([tag, data]) => {
			if (!tag.endsWith(" memory") && !tag.endsWith(" size")) {
				// time type
				if (data.currentMean < 300) {
					return null;
				}
			}
			if (typeof data.baseMean !== 'number') {
				return null;
			}
			if (tag.endsWith("memory")) {
				if (data.currentMean / data.baseMean < 1.3) {
					// The memory usage is unstable (with fluctuations of approximately 20%) during Hot Module Replacement (HMR), so it won't be counted for now.
					return null;
				}
			} else if (data.currentMean / data.baseMean < 1.05) {
				return null;
			}
			return tag;
		})
		.filter(item => !!item);
}

function compareData(base, current) {
	const diff = {};
	for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
		const baseValue = base[key];
		const currentValue = current[key];

		if (currentValue === undefined) {
			continue;
		}

		diff[key] = {
			baseMean: baseValue?.mean ?? '-',
			baseConfidence: baseValue?.confidence ?? '-',
			currentMean: currentValue.mean,
			currentConfidence: currentValue.confidence
		};
	}
	return diff;
}

async function getResultsByCommit(commitSHA, files) {
	return Promise.all(
		files.map(async file => ({
			name: basename(file, ".json"),
			result: await fetchCommitBenchmarkResult(commitSHA, file)
		}))
	);
}

// Walks back through the given branch's commits until one has benchmark data.
async function findLatestCommitWithData(repository, branch) {
	const commits = await fetchRspackBranchCommits(repository, branch);
	for (const sha of commits) {
		const files = await fetchCommitFiles(sha);
		if (files && files.length > 0) {
			return { sha, files };
		}
		console.log(`No benchmark data for commit ${sha.slice(0, 8)}, trying parent...`);
	}
	throw new Error(`No benchmark data found in the last ${commits.length} commits of ${repository}#${branch}`);
}

const isDate = ref => /^\d{4}-\d{2}-\d{2}$/.test(ref);

// get the result by date
// `current` will get ../output data
// `2023-08-08` will get the data from `2023-08-08` on the data branch
async function getResults(date, index, benchmarkDirectory) {
	if (date === "current") {
		const outputFiles = await readdir(benchmarkDirectory);
		return await Promise.all(
			outputFiles.map(async item => {
				return {
					name: basename(item, ".json"),
					result: JSON.parse(await readFile(resolve(benchmarkDirectory, item)))
				};
			})
		);
	}

	return Promise.all(
		index
			.find(i => i.date === date)
			.files.map(async file => ({
				name: basename(file, ".json"),
				result: await fetchBenchmarkResult(date, file)
			}))
	);
}

// Resolves a ref to { results, label, commitSHA }.
// Supports: "current" (local files), "YYYY-MM-DD" (date), or a branch name / commit hash.
async function resolveRef(ref, repository, index, buildInfo, benchmarkDirectory) {
	if (ref === "current") {
		return {
			results: await getResults("current", undefined, benchmarkDirectory),
			label: "current",
			commitSHA: undefined
		};
	}
	if (isDate(ref)) {
		return {
			results: await getResults(ref, index, benchmarkDirectory),
			label: ref,
			commitSHA: buildInfo?.[ref]?.commitSHA
		};
	}
	// branch name or commit hash — walk back until a commit with data is found
	const { sha, files } = await findLatestCommitWithData(repository, ref);
	// commit hash refs are already fully represented by the link in the table header
	const isCommitHash = /^[0-9a-f]{7,40}$/i.test(ref);
	return {
		results: await getResultsByCommit(sha, files),
		label: isCommitHash ? null : ref,
		commitSHA: sha
	};
}

function getCompareMetrics(name) {
	if (name.includes("hmr")) {
		return ["stats", "rss memory"]
	}
	return ["exec", "rss memory"];
}

function sortDiff(diff) {
	const entries = Object.entries(diff);
	const sorted = [
		...entries.filter(([key]) => !key.includes('memory')),
		...entries.filter(([key]) => key.includes('memory'))
	];
	return Object.fromEntries(sorted);
}

export async function compare(base, current, benchmarkDirectory, repository = "web-infra-dev/rspack") {
	// index and buildInfo are only needed when resolving date-based refs
	const needsIndex = ref => ref === "latest" || isDate(ref);
	let index;
	let buildInfo;

	if (needsIndex(base) || needsIndex(current)) {
		[index, buildInfo] = await Promise.all([fetchIndex(), fetchBuildInfo()]);
		// resolve "latest" to the actual date string before passing to resolveRef
		const latestDate = index[index.length - 1].date;
		if (base === "latest") base = latestDate;
		if (current === "latest") current = latestDate;
	}

	const [baseResolved, currentResolved] = await Promise.all([
		resolveRef(base, repository, index, buildInfo, benchmarkDirectory),
		resolveRef(current, repository, index, buildInfo, benchmarkDirectory)
	]);

	const baseData = {};
	const currentData = {};
	for (const { name, result } of baseResolved.results) {
		for (const metric of getCompareMetrics(name)) {
			baseData[`${name} + ${metric}`] = result[metric];
		}
	}
	for (const { name, result } of currentResolved.results) {
		for (const metric of getCompareMetrics(name)) {
			currentData[`${name} + ${metric}`] = result[metric];
		}
	}

	const diff = compareData(baseData, currentData);
	const sortedDiff = sortDiff(diff);

	const formatedTable = formatDiffTable({
		diff: sortedDiff,
		baseDate: baseResolved.label,
		baseCommitSHA: baseResolved.commitSHA,
		currentDate: currentResolved.label,
		currentCommitSHA: currentResolved.commitSHA
	});
	const overThresholdTags = getOverThresholdTags(sortedDiff);
	console.log(formatedTable);
	if (overThresholdTags.length > 0) {
		console.log("");
		console.log("Threshold exceeded: ", JSON.stringify(overThresholdTags));
	}
}
