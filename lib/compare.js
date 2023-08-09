import { getType } from "./utils.js";

function compareStatistics(
	base,
	current,
	totals = {
		time: current.stats.mean,
		size: Object.keys(current)
			.filter(n => getType(n) === "size")
			.reduce((sum, key) => sum + current[key].mean, 0),
		"gzip size": Object.keys(current)
			.filter(n => getType(n) === "gzip size")
			.reduce((sum, key) => sum + current[key].mean, 0),
		memory: Object.keys(current)
			.filter(n => getType(n) === "memory")
			.reduce((sum, key) => sum + current[key].mean, 0)
	}
) {
	const diff = {};
	for (const key of new Set([...Object.keys(base), ...Object.keys(current)])) {
		const baseValue = base[key];
		const currentValue = current[key];
		if (baseValue === undefined || currentValue === undefined) continue;
		if ("mean" in baseValue) {
			const type = getType(key);
			diff[key] = {
				type,
				relevance: currentValue.mean / totals[type]
			};
			for (const k of Object.keys(baseValue)) {
				diff[key][k] =
					baseValue[k] === 0 && currentValue[k] === 0
						? 1
						: currentValue[k] / baseValue[k];
			}
			diff[key].lowHigh = currentValue.high / baseValue.low;
			diff[key].highLow = currentValue.low / baseValue.high;
			diff[key].baseStdDev = baseValue.stdDev / baseValue.mean;
			diff[key].currentStdDev = currentValue.stdDev / currentValue.mean;
			diff[key].baseConfidence = baseValue.confidence / baseValue.mean;
			diff[key].currentConfidence = currentValue.confidence / currentValue.mean;
		} else {
			diff[key] = compareStatistics(baseValue, currentValue, totals);
		}
	}
	return diff;
}

export function getResult(benchmarkName, date) {
	// TODO use fetch to get data
}

export function compare(baselineResult, currentResult) {
	return {
		diff: compareStatistics(baselineResult, currentResult),
		result: currentResult,
		baseResult: baselineResult
	};
}
