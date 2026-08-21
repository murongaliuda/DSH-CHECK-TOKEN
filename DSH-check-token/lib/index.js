// dsh-plugin-balance — host half.
//
// Resolves the stored DEEPSEEK_API_KEY credential (dsh-credentials-local,
// with environment fallback) and serves the DeepSeek account balance as JSON
// under GET /api/account-balance so the browser half never sees the key and
// never hits CORS.
//
// Endpoint contract (all responses are application/json):
//   { ok: true,  is_available, balance_infos: [{currency, total_balance,
//                                               granted_balance, topped_up_balance}] }
//   { ok: false, error, detail? }

const name = "account-balance";
const inject = ["webServer", "credentials"];

/** Exact HTTP route the browser half polls. */
const BALANCE_ENDPOINT = "/api/account-balance";
/** Outbound request budget for the DeepSeek balance call. */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Query the DeepSeek balance endpoint once.
 * @param credentials - the `credentials` service (resolve(ref) -> {value, source} | undefined).
 * @returns the endpoint payload described above.
 */
async function fetchBalance(credentials) {
	const resolved = await credentials.resolve("DEEPSEEK_API_KEY");
	const apiKey = resolved?.value ?? process.env.DEEPSEEK_API_KEY;
	if (!apiKey) {
		return { ok: false, error: "DEEPSEEK_API_KEY 未配置（请在设置中填写 DeepSeek API Key）" };
	}
	const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "");
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(`${baseUrl}/user/balance`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: "application/json"
			},
			signal: controller.signal
		});
		if (!response.ok) {
			let detail = "";
			try {
				detail = (await response.text()).slice(0, 300);
			} catch {
				/* non-text body */
			}
			return { ok: false, error: `DeepSeek API 返回 ${response.status}`, detail };
		}
		const data = await response.json();
		return { ok: true, ...data };
	} catch (error) {
		return {
			ok: false,
			error: error?.name === "AbortError" ? "请求超时" : String(error?.message ?? error)
		};
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Host plugin body: mount the balance route for the lifetime of the fiber.
 * @param ctx - host plugin context with webServer and credentials.
 */
function apply(ctx) {
	ctx.effect(() => {
		const dispose = ctx.webServer.register({
			kind: "exact",
			path: BALANCE_ENDPOINT,
			handler: async (req, res) => {
				if (req.method !== "GET" && req.method !== "HEAD") {
					res.writeHead(405);
					res.end();
					return;
				}
				const body = JSON.stringify(await fetchBalance(ctx.credentials));
				res.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				res.end(body);
			}
		});
		return dispose;
	}, "account-balance: balance route");
}

export { BALANCE_ENDPOINT, apply, inject, name };
