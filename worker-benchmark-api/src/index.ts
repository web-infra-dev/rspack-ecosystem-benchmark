export interface Env {
	BENCHMARK_STORE: KVNamespace;
	AUTH_SECRET?: string;
}

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...CORS_HEADERS },
	});
}

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext
	): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: CORS_HEADERS });
		}

		const url = new URL(request.url);
		const path = url.pathname;

		// POST /benchmark — body: { id?: string, data: object }, returns { id }
		if (request.method === "POST" && path === "/benchmark") {
			if (env.AUTH_SECRET) {
				const auth = request.headers.get("Authorization");
				if (auth !== `Bearer ${env.AUTH_SECRET}`) {
					return jsonResponse({ error: "Unauthorized" }, 401);
				}
			}
			let body: { id?: string; data: unknown };
			try {
				body = await request.json();
			} catch {
				return jsonResponse({ error: "Invalid JSON body" }, 400);
			}
			if (!body || typeof body.data === "undefined") {
				return jsonResponse({ error: "Missing field: data" }, 400);
			}
			const id = body.id ?? crypto.randomUUID();
			const key = `benchmark:${id}`;
			const value = JSON.stringify({
				data: body.data,
				createdAt: Date.now(),
			});
			await env.BENCHMARK_STORE.put(key, value, {
				expirationTtl: 60 * 60 * 24 * 7,
			});
			return jsonResponse({ id });
		}

		// GET /benchmark/:id — fetch by id
		if (request.method === "GET" && path.startsWith("/benchmark/")) {
			const id = path.slice("/benchmark/".length).trim();
			if (!id) return jsonResponse({ error: "Missing id" }, 400);
			const key = `benchmark:${id}`;
			const raw = await env.BENCHMARK_STORE.get(key);
			if (raw === null) return jsonResponse({ error: "Not found" }, 404);
			try {
				const parsed = JSON.parse(raw);
				return jsonResponse(parsed);
			} catch {
				return jsonResponse({ error: "Invalid stored data" }, 500);
			}
		}

		return jsonResponse({ error: "Not found" }, 404);
	},
};
