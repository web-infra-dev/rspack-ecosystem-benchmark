import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DETAIL_PAGE_BASE =
	"https://web-infra-dev.github.io/rspack-ecosystem-benchmark/detail";

/**
 * Build the detail page URL with current benchmark data from benchmarkDirectory.
 * Encoding matches the workflow (gzip + base64url of JSON object keyed by filename without .json).
 * @param {string} benchmarkDirectory - Path to output directory (e.g. output/)
 * @param {{ base?: string }} [options] - Optional. base for query (default "latest")
 * @returns {Promise<string>} Full detail page URL
 */
export async function getDetailPageUrl(benchmarkDirectory, options = {}) {
	const base = options.base ?? "latest";
	const files = (await readdir(benchmarkDirectory)).filter((f) =>
		f.endsWith(".json")
	);
	const data = {};
	for (const f of files) {
		const name = f.replace(/\.json$/, "");
		data[name] = JSON.parse(
			await readFile(join(benchmarkDirectory, f), "utf8")
		);
	}
	const encoded = gzipSync(JSON.stringify(data)).toString("base64url");
	return `${DETAIL_PAGE_BASE}?base=${base}#${encoded}`;
}
