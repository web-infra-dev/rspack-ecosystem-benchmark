import * as fs from "fs/promises";
import { resolve, join } from "path";

function rmdir(p) {
	if (fs.rm) {
		return fs.rm(p, {
			force: true,
			maxRetries: 10,
			recursive: true
		});
	} else {
		return fs.rmdir(p, {
			maxRetries: 10,
			recursive: true
		});
	}
}
export async function clearCaches(directory) {
	const paths = ["node_modules/.cache", ".cache", "dist"];
	await Promise.all(paths.map(p => rmdir(resolve(directory, p))));
}

export async function getDirSizes(dir) {
	let totalSize = 0;
	const dirContents = await fs.readdir(dir, { withFileTypes: true });
	for (const dirent of dirContents) {
		if (dirent.isDirectory()) {
			totalSize += await getDirSizes(join(dir, dirent.name));
		} else {
			const fileStats = await fs.stat(join(dir, dirent.name));
			totalSize += fileStats.size;
		}
	}
	return totalSize;
}

export async function getHmrConfig(filePath) {
	const config = (await import(filePath)).default;
	const originalFiles = {};
	await Promise.all(
		config.map(async item => {
			item.rebuildChangeFile = resolve(item.rebuildChangeFile);
			const content = await fs.readFile(item.rebuildChangeFile);
			originalFiles[item.rebuildChangeFile] = content;
		})
	);
	return {
		originalFiles,
		config
	};
}

const T_TABLE = [
	12.71, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
	2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074,
	2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042
];
const tDist95Two = n => {
	if (n <= 1) return 12.71;
	if (n <= 30) return T_TABLE[n - 1];
	if (n <= 40) return 2.021;
	if (n <= 50) return 2.009;
	if (n <= 60) return 2.0;
	if (n <= 80) return 1.99;
	if (n <= 100) return 1.984;
	if (n <= 120) return 1.98;
	return 1.96;
};
export function calcStatistics(data) {
	const stats = {};
	for (const key of Object.keys(data[0])) {
		const values = data.map(r => r[key] || 0);
		if (typeof values[0] === "object") {
			stats[key] = calcStatistics(values);
		} else {
			values.sort();
			const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
			const variance =
				values.reduce((sum, v) => sum + (mean - v) ** 2, 0) / values.length;
			const stdDev = Math.sqrt(variance);
			const confidence =
				(tDist95Two(values.length - 1) * stdDev) / Math.sqrt(values.length);
			const low = Math.max(0, mean - confidence);
			const high = mean + confidence;
			stats[key] = {
				min: Math.min(...values),
				max: Math.max(...values),
				mean,
				median:
					values.length % 2 === 0
						? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
						: values[(values.length - 1) / 2],
				variance,
				stdDev,
				confidence: high - low,
				low,
				high,
				count: values.length
			};
		}
	}
	return stats;
}
