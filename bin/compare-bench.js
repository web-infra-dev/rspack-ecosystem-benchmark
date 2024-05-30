import { resolve, basename } from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";
import { compare, formatDiffTable } from "../lib/index.js";
import { fetchBuildInfo, fetchIndex, fetchBenchmarkResult } from "../lib/services.js";

let [
	,
	,
	baseDate = "latest",
	currentDate = "current"
] = process.argv;

const compareMetric = ["exec"];
const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const outputDir = resolve(rootDir, "output");

const index = await fetchIndex();
if (baseDate === "latest") {
	baseDate = index[index.length - 1].date;
}

function getOverThresholdTags(diff) {
	return Object.entries(diff)
		.map(([tag, data]) => {
			if (!tag.endsWith(" memory") && !tag.endsWith(" size")) {
				// time type
				if (data.currentMean < 300) {
					return null;
				}
			}
			if (data.currentMean / data.baseMean < 1.05) {
				return null;
			}
			return tag;
		})
		.filter(item => !!item);
}

// get the result by date
// `current` will get ../output data
// `latest` will get the latest data on the data branch
// `2023-08-08` will get the data from `2023-08-08` on the data branch
async function getResults(date) {
	if (date === "current") {
		const outputFiles = await readdir(outputDir);
		return await Promise.all(
			outputFiles.map(async item => {
				return {
					name: basename(item, '.json'),
					result: JSON.parse(await readFile(resolve(outputDir, item)))
				};
			})
		);
	}

	return Promise.all(
		index
			.find(i => i.date === date)
			.files
			.map(async file => ({
				name: basename(file, '.json'),
				result: await fetchBenchmarkResult(date, file)
			}))
	);
}

(async () => {
	const [baseResults, currentResults, buildInfo] = await Promise.all([
		getResults(baseDate),
		getResults(currentDate),
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

	const diff = compare(baseData, currentData);
	const formatedTable = formatDiffTable({
		diff,
		baseDate,
		baseCommitSHA: buildInfo[baseDate]?.commitSHA,
	});
	const overThresholdTags = getOverThresholdTags(diff);
	console.log(formatedTable);
	if (overThresholdTags.length > 0) {
		console.log("");
		console.log("Threshold exceeded: ", JSON.stringify(overThresholdTags));
	}
})().catch(err => {
	process.exitCode = 1;
	console.error(err.stack);
});
