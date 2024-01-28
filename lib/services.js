const fetchPrefix = "https://raw.githubusercontent.com/web-infra-dev/rspack-ecosystem-benchmark/data";

/**
 * Fetch the build information from a JSON file.
 *
 * @returns {Promise<Object.<string, {commitSHA: string}>>}
 */
export async function fetchBuildInfo() {
	return fetch(`${fetchPrefix}/build-info.json`).then(res => res.json())
}
