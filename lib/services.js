import { ProxyAgent, setGlobalDispatcher } from "undici";

if (process.env.http_proxy) {
	const agent = new ProxyAgent(process.env.http_proxy);
	setGlobalDispatcher(agent);
}

const fetchPrefix = location.host === 'rspack-ecosystem-benchmark.rspack.dev'
	? "https://rspack-ecosystem-benchmark-data.rspack.dev"
	: 'https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data';

/**
 * Fetch the build information from a JSON file.
 *
 * @returns {Promise<Object.<string, {commitSHA: string}>>}
 */
export async function fetchBuildInfo() {
	return fetch(`${fetchPrefix}/build-info.json`).then(res => res.json());
}

/**
 * Fetch an index file and parses it to create a mapping of dates to file names.
 *
 * @returns {Promise<{date: string, files: string[]}[]>>} A promise that resolves to an object mapping dates to arrays of file names.
 */
export async function fetchIndex() {
	const index = await fetch(`${fetchPrefix}/index.txt`).then(res => res.text());
	const lines = index.split("\n").filter(Boolean);

	const result = [];
	const mappings = Object.create(null);
	for (const line of lines) {
		const [date, fileName] = line.split("/");
		if (!mappings[date]) {
			mappings[date] = [];
			result.push({
				date,
				files: mappings[date]
			});
		}
		mappings[date].push(fileName);
	}
	return result;
}

/**
 * Fetches benchmark result data from a specified date and file.
 *
 * @param {string} date - The specific date to fetch results for.
 * @param {string} file - The specific file to fetch data from.
 * @returns {Promise<{[key: string]: Object.<string, number>}>} A promise that resolves to the benchmark result data.
 */
export async function fetchBenchmarkResult(date, file) {
	const res = await fetch(`${fetchPrefix}/${date}/${file}`);
	return await res.json();
}
