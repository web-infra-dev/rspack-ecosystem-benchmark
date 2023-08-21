import { resolve } from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";
import { compare, formatDiffTable } from "../lib/index.js";

const [, , baseDate, currentDate] = process.argv;
const compareMetric = ["stats"];
const rootDir = resolve(fileURLToPath(import.meta.url), "../..");
const outputDir = resolve(rootDir, "output");
const fetchPrefix =
	"https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data";

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
					// remove .json
					name: item.slice(0, -5),
					result: JSON.parse(await readFile(resolve(outputDir, item)))
				};
			})
		);
	}

	const indexFile = await (await fetch(`${fetchPrefix}/index.txt`)).text();
	const dataPaths = indexFile.split("\n").filter(item => !!item);
	if (date === "latest") {
		date = dataPaths[dataPaths.length - 1].split("/")[0];
	}
	return await Promise.all(
		dataPaths
			.filter(item => item.startsWith(date))
			.map(async item => {
				return {
					name: item.split("/")[1].slice(0, -5),
					result: await (await fetch(`${fetchPrefix}/${item}`)).json()
				};
			})
	);
}

(async () => {
	const baseResults = await getResults(baseDate);
	const currentResults = await getResults(currentDate);
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
	const formatedTable = formatDiffTable(diff, { verbose: 1 });
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
