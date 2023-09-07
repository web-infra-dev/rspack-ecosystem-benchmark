import { getType } from "./utils.js";

const typeOrder = {
	time: 0,
	memory: 1,
	size: 2,
	"gzip size": 3
};
const f = (name, value) => {
	if (name.endsWith(" size")) return bytes(value);
	if (name.endsWith(" memory")) return bytes(value);
	if (name.endsWith(" cache")) return ratio(value);
	return ms(value);
};
const ratio = value => {
	return `${Number(value).toFixed(2)}%`;
};
const bytes = value => {
	if (value === 0) return `-`;
	if (value > 1024 * 102400) return `${Math.round(value / 1024 / 1024)} MiB`;
	if (value > 1024 * 10240)
		return `${Math.round(value / 1024 / 102.4) / 10} MiB`;
	if (value > 1024 * 1024)
		return `${Math.round(value / 1024 / 10.24) / 100} MiB`;
	if (value > 102400) return `${Math.round(value / 1024)} KiB`;
	if (value > 10240) return `${Math.round(value / 102.4) / 10} KiB`;
	if (value > 1024) return `${Math.round(value / 10.24) / 100} KiB`;
	return `${Math.round(value)} bytes`;
};
const ms = value => {
	if (value === 0) return `0 ms`;
	if (value > 100000) return `${Math.round(value / 1000)} s`;
	if (value > 10000) return `${Math.round(value / 100) / 10} s`;
	if (value > 1000) return `${Math.round(value / 10) / 100} s`;
	if (value > 10) return `${Math.round(value)} ms`;
	if (value > 1) return `${Math.round(value * 10) / 10} ms`;
	if (value > 0.1) return `${Math.round(value * 100) / 100} ms`;
	if (value > 0.01) return `${Math.round(value * 1000)} µs`;
	return `${Math.round(value * 10000) / 10} µs`;
};

function formatTable(entries, columns) {
	if (entries.length === 0) {
		return undefined;
	}
	const rows = entries.map(entry =>
		Object.keys(columns).map(key => String(columns[key](entry)) || "")
	);
	const header = Object.keys(columns);
	const columnSizes = header.map((key, i) =>
		Math.max(key.length, ...rows.map(row => row[i].length))
	);
	const getLine = l =>
		`| ${l
			.map((item, i) => `${item}${" ".repeat(columnSizes[i] - item.length)}`)
			.join(" | ")} |`;
	return [
		getLine(header),
		`| ${columnSizes.map(s => "-".repeat(s)).join(" | ")} |`,
		...rows.map(row => {
			return getLine(row);
		})
	].join("\n");
}

export function formatDiffTable(diff, { limit }) {
	let entries = Object.keys(diff).map(key => ({ name: key, ...diff[key] }));
	if (limit) {
		entries = entries.slice(0, limit);
	}
	if (entries.length === 0) return undefined;
	const columns = {
		name: l => l.name,
		base: l => `${f(l.name, l.baseMean)} ± ${f(l.name, l.baseConfidence)}`,
		current: l =>
			`${f(l.name, l.currentMean)} ± ${f(l.name, l.currentConfidence)}`,
		"%": l => {
			const percent = (
				((l.currentMean - l.baseMean) * 100) /
				l.baseMean
			).toFixed(2);
			if (percent > 0) {
				return `+${percent}%`;
			} else {
				return `${percent}%`;
			}
		}
	};
	return formatTable(entries, columns);
}

export function formatResultTable(result, { verbose, limit, threshold }) {
	let entries = Object.keys(result).map(key => ({
		name: key,
		...result[key]
	}));
	entries.sort((a, b) => {
		const aType = getType(a.name);
		const bType = getType(b.name);
		if (aType !== bType) {
			return typeOrder[aType] - typeOrder[bType];
		}
		return b.median - a.median;
	});
	if (threshold) {
		entries = entries.filter(e => e.relevance >= threshold);
	}
	if (limit) {
		entries = entries.slice(0, limit);
	}
	if (entries.length === 0) return undefined;

	const columns = {
		name: l => l.name,
		median: l => f(l.name, l.median),
		mean: l => f(l.name, l.mean),
		...(verbose
			? {
					stdDev: l => f(l.name, l.stdDev),
					min: l => f(l.name, l.min),
					max: l => f(l.name, l.max),
					low: l => f(l.name, l.low),
					high: l => f(l.name, l.high),
					con: l => f(l.name, l.confidence),
					con: l => f(l.name, l.confidence),
					n: l => `${l.count}`
			  }
			: undefined)
	};
	return formatTable(entries, columns);
}
