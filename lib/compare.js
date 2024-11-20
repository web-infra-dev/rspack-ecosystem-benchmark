import { resolve, basename } from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";
import { formatDiffTable } from "../lib/index.js";
import {
	fetchBuildInfo,
	fetchIndex,
	fetchBenchmarkResult
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
			if (data.currentMean / data.baseMean < 1.05) {
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

// get the result by date
// `current` will get ../output data
// `latest` will get the latest data on the data branch
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

export async function compare(base, current, benchmarkDirectory) {
	const compareMetric = ["exec", "rss memory"];

	const index = await fetchIndex();
	if (base === "latest") {
		base = index[index.length - 1].date;
	}

	const [baseResults, currentResults, buildInfo] = await Promise.all([
		getResults(base, index, benchmarkDirectory),
		getResults(current, index, benchmarkDirectory),
		fetchBuildInfo()
	]);
	const baseData = {};
	const currentData = {};
	for (const metric of compareMetric) {
		for (const { name, result } of baseResults) {
			const tag = `${name} + ${metric}`;
			baseData[tag] = result[metric];
		}

		for (const { name, result } of currentResults) {
			const tag = `${name} + ${metric}`;
			currentData[tag] = result[metric];
		}
	}

	const diff = compareData(baseData, currentData);
	const formatedTable = formatDiffTable({
		diff,
		baseDate: base,
		baseCommitSHA: buildInfo[base]?.commitSHA
	});
	const overThresholdTags = getOverThresholdTags(diff);
	console.log(formatedTable);
	if (overThresholdTags.length > 0) {
		console.log("");
		console.log("Threshold exceeded: ", JSON.stringify(overThresholdTags));
	}
}
