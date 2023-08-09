import { getType } from "./utils.js";

const typeOrder = {
	time: 0,
	memory: 1,
	size: 2,
	"gzip size": 3
};

function formatTable(entries, columns, { postRow }) {
	if (entries.length === 0) {
		return undefined;
	}
	const rows = entries.map(entry =>
		Object.keys(columns).map(key => columns[key](entry) || "")
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
			const line = getLine(row);
			return postRow(line, row);
		})
	].join("\n");
}

export function formatDiffTable(diff, { colors, verbose, limit, threshold }) {
	let entries = Object.keys(diff).map(key => ({ name: key, ...diff[key] }));
	entries.sort((a, b) => {
		if (a.type !== b.type) {
			return typeOrder[a.type] - typeOrder[b.type];
		}
		return b.relevance - a.relevance;
	});
	if (!verbose) {
		entries = entries.filter(e => e.lowHigh < 1 || e.highLow > 1);
	}
	if (threshold) {
		entries = entries.filter(e => e.relevance >= threshold);
	}
	if (limit) {
		entries = entries.slice(0, limit);
	}
	if (entries.length === 0) return undefined;
	const offset = factor => {
		if (factor > 10) return `${Math.round(factor * 10) / 10}x`;
		if (factor > 1.1) return `+${Math.round(factor * 100 - 100)}%`;
		if (factor > 1) return `+${Math.round(factor * 1000 - 1000) / 10}%`;
		if (factor === 1) return `=`;
		if (factor > 0.9) return `-${Math.round(1000 - factor * 1000) / 10}%`;
		return `-${Math.round(100 - factor * 100)}%`;
	};
	const percentage = value => {
		if (value > 10) return `${Math.round(value * 10) / 10}x`;
		if (value > 0.1) return `${Math.round(value * 100)}%`;
		if (value > -0.1) return `${Math.round(value * 1000) / 10}%`;
		return `${Math.round(value * 100)}%`;
	};
	const columns = {
		rel: l => `${Math.round(l.relevance * 10000) / 100}%`,
		diff: l =>
			l.lowHigh && l.lowHigh < 1
				? offset(l.lowHigh)
				: l.highLow && l.highLow > 1
				? offset(l.highLow)
				: "unclear",
		name: l => l.name,
		mean: l => offset(l.mean),
		...(verbose
			? {
					med: l => offset(l.median),
					min: l => offset(l.min),
					max: l => offset(l.max),
					std: l => offset(l.stdDev),
					con: l => offset(l.confidence)
			  }
			: undefined),
		baseCon: l => percentage(l.baseConfidence),
		curCon: l => percentage(l.currentConfidence)
	};
	return formatTable(entries, columns, {
		postRow: (line, row) => {
			if (colors) {
				if (row[1].startsWith("+") || row[1].endsWith("x"))
					return `\u001b[1m\u001b[31m${line}\u001b[39m\u001b[22m`;
				if (row[1].startsWith("-"))
					return `\u001b[1m\u001b[32m${line}\u001b[39m\u001b[22m`;
			}
			return line;
		}
	});
}

export function formatResultTable(
	result,
	{ colors, verbose, limit, threshold }
) {
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
	const f = (name, value) => {
		if (name.endsWith(" size")) return bytes(value);
		if (name.endsWith(" memory")) return bytes(value);
		return ms(value);
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
	return formatTable(entries, columns, {
		postRow: (line, row) => {
			if (colors) {
				if (row[1].startsWith("+") || row[1].endsWith("x"))
					return `\u001b[1m\u001b[31m${line}\u001b[39m\u001b[22m`;
				if (row[1].startsWith("-"))
					return `\u001b[1m\u001b[32m${line}\u001b[39m\u001b[22m`;
			}
			return line;
		}
	});
}
