const DETAIL_PAGE_BASE =
	"https://web-infra-dev.github.io/rspack-ecosystem-benchmark/detail";

/**
 * Build the detail page URL. Data is stored on Cloudflare; the page fetches by id.
 * @param {string} _benchmarkDirectory - Unused; kept for API compatibility.
 * @param {{ base?: string, id?: string }} [options] - base (default "latest"), id from Cloudflare upload
 * @returns {Promise<string>} Full detail page URL when id is set, otherwise empty string
 */
export async function getDetailPageUrl(options = {}) {
	const base = options.base ?? "latest";
	const id = options.id ?? process.env.BENCHMARK_ID ?? "";
	if (!id) return "";
	return `${DETAIL_PAGE_BASE}?base=${base}&id=${id}`;
}
