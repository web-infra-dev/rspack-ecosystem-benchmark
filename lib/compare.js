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
import { getDetailPageUrl } from "./detail-page-url.js";

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

// get the result by date
// `current` will get ../output data
// `latest` will get the latest data on the data branch
// `2023-08-08` will get the data from `2023-08-08` on the data branch
async function getResults(date, index, benchmarkDirectory) {
	if (date === "current") {
		const outputFiles = (await readdir(benchmarkDirectory)).filter(f => f.endsWith(".json"));
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
	let baseResults;
	let baseLabel;
	let baseCommitSHA;

	const isDateOrSpecial = base === "latest" || base === "current" || /^\d{4}-\d{2}-\d{2}$/.test(base);
	// index is needed when either base or current is resolved by date
	const needIndex = isDateOrSpecial || current !== "current";
	let index;

	if (!isDateOrSpecial) {
		// treat as a branch name, find the latest commit on that branch with data
		const [commitResult, fetchedIndex] = await Promise.all([
			findLatestCommitWithData(repository, base),
			needIndex ? fetchIndex() : Promise.resolve(undefined)
		]);
		index = fetchedIndex;
		const { sha, files } = commitResult;
		baseResults = await getResultsByCommit(sha, files);
		baseLabel = `${base}@${sha.slice(0, 8)}`;
		baseCommitSHA = sha;
	} else {
		const [fetchedIndex, buildInfo] = await Promise.all([fetchIndex(), fetchBuildInfo()]);
		index = fetchedIndex;
		if (base === "latest") {
			base = index[index.length - 1].date;
		}
		baseResults = await getResults(base, index, benchmarkDirectory);
		baseLabel = base;
		baseCommitSHA = buildInfo[base]?.commitSHA;
	}

	const currentResults = await getResults(current, index, benchmarkDirectory);

	const baseData = {};
	const currentData = {};
	for (const { name, result } of baseResults) {
		for (const metric of getCompareMetrics(name)) {
			const tag = `${name} + ${metric}`;
			baseData[tag] = result[metric];
		}
	}

	for (const { name, result } of currentResults) {
		for (const metric of getCompareMetrics(name)) {
			const tag = `${name} + ${metric}`;
			currentData[tag] = result[metric];
		}
	}

	const diff = compareData(baseData, currentData);
	const sortedDiff = sortDiff(diff);

	const formatedTable = formatDiffTable({
		diff: sortedDiff,
		baseDate: baseLabel,
		baseCommitSHA
	});
	const overThresholdTags = getOverThresholdTags(sortedDiff);
	console.log(formatedTable);
	if (overThresholdTags.length > 0) {
		console.log("");
		console.log("Threshold exceeded: ", JSON.stringify(overThresholdTags));
	}

	const benchmarkId = process.env.BENCHMARK_ID;
	const detailPageUrl = await getDetailPageUrl({
		base: baseParam,
		id: benchmarkId,
	});
	if (detailPageUrl) {
		console.log("Detail page:", detailPageUrl);
	} else {
		console.log(
			"Detail page: (upload benchmark to Cloudflare to get link)"
		);
	}
}
