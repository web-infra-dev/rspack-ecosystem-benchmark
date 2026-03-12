import { ProxyAgent, setGlobalDispatcher } from "undici";

if (process.env.http_proxy) {
	const agent = new ProxyAgent(process.env.http_proxy);
	setGlobalDispatcher(agent);
}

const fetchPrefix = 'https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data';

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

const githubApiPrefix = 'https://api.github.com';
const githubApiHeaders = {
	Accept: 'application/vnd.github.v3+json',
	...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` })
};

function getCommitDataPath(sha) {
	return `commits/${sha.slice(0, 2)}/${sha.slice(2)}`;
}

/**
 * Lists benchmark result files for a given commit SHA.
 * Returns null if no data exists yet for that commit.
 *
 * @param {string} commitSHA
 * @returns {Promise<string[] | null>}
 */
export async function fetchCommitFiles(commitSHA) {
	const path = getCommitDataPath(commitSHA);
	const res = await fetch(
		`${githubApiPrefix}/repos/web-infra-dev/rspack-ecosystem-benchmark/contents/${path}?ref=data`,
		{ headers: githubApiHeaders }
	);
	if (!res.ok) return null;
	const items = await res.json();
	return Array.isArray(items) ? items.map(f => f.name).filter(f => f.endsWith('.json')) : null;
}

/**
 * @param {string} commitSHA
 * @param {string} file
 * @returns {Promise<{[key: string]: Object.<string, number>}>}
 */
export async function fetchCommitBenchmarkResult(commitSHA, file) {
	const path = getCommitDataPath(commitSHA);
	const res = await fetch(`${fetchPrefix}/${path}/${file}`);
	return res.json();
}

/**
 * Fetches recent commits from a branch of the rspack repository.
 *
 * @param {string} repository - e.g. "web-infra-dev/rspack"
 * @param {string} branch - branch name, e.g. "main", "v1.x"
 * @param {number} perPage
 * @returns {Promise<string[]>} commit SHAs from newest to oldest
 */
export async function fetchRspackBranchCommits(repository, branch, perPage = 30) {
	const res = await fetch(
		`${githubApiPrefix}/repos/${repository}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`,
		{ headers: githubApiHeaders }
	);
	const data = await res.json();
	return data.map(c => c.sha);
}
