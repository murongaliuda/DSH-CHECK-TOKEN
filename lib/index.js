// DSH-check-token — host half.
//
// Three surfaces:
//  1. Account balance: resolves the stored DEEPSEEK_API_KEY credential and
//     serves the DeepSeek account balance as JSON under GET /api/account-balance.
//  2. Daily usage stats from the DeepSeek platform:
//     GET https://platform.deepseek.com/api/v0/usage/amount (Bearer API key),
//     parsed defensively for today's token usage; served under GET /api/account-stats.
//  3. Local usage accumulator: subscribes to the global `session/event` feed,
//     counts today's API requests (`request/header` events) and tokens (usage on
//     `assistant/message` events), persisted under $DSH_HOME/storages/check-token-daily.json.
//     The platform source is preferred for tokens; the local counter supplies
//     request counts (the platform API has no documented per-request count) and
//     acts as the fallback when the platform call fails or does not parse.
//
// Browser halves never see the API key and never hit CORS.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const name = "account-balance";
const inject = ["webServer", "credentials"];

/** Exact HTTP route the browser half polls for balance. */
const BALANCE_ENDPOINT = "/api/account-balance";
/** Exact HTTP route the browser half polls for today's usage. */
const STATS_ENDPOINT = "/api/account-stats";
/** Outbound request budget for the DeepSeek calls. */
const REQUEST_TIMEOUT_MS = 10000;
/** Daily-record filename inside the harness storages dir. */
const STATS_FILE = "check-token-daily.json";
/** Debounce window for persisting the daily record. */
const SAVE_DEBOUNCE_MS = 2000;
/** DeepSeek platform usage endpoint base (real console request, user-captured). */
const PLATFORM_USAGE_BASE = process.env.DEEPSEEK_PLATFORM_USAGE_URL ?? "https://platform.deepseek.com/api/v0/usage/by_api_key/amount";
/** Platform console client headers observed on the real request. */
const PLATFORM_CLIENT_HEADERS = {
	"x-client-bundle-id": "com.deepseek.chat",
	"x-client-locale": "zh_CN",
	"x-client-platform": "web",
	"x-client-version": "1.0.0"
};

/** Local timezone offset in seconds (e.g. UTC+8 → 28800). */
function tzOffsetSeconds() {
	return -new Date().getTimezoneOffset() * 60;
}

/** Local today's [start, end) as epoch seconds. */
function localTodayRange() {
	const d = new Date();
	const localMid = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
	const start = Math.floor(localMid.getTime() / 1000);
	return { start, end: start + 86400 };
}

/**
 * UTC-day-aligned window fully covering local today (the API rejects
 * non-aligned boundaries with INVALID_PARAM). For UTC+8 this spans two UTC
 * days: the day before (covers the local morning) through the next midnight.
 */
function platformRangeUtc() {
	const { start, end } = localTodayRange();
	const winStart = start - (start % 86400);
	const winEnd = end - (end % 86400) + 86400;
	return { start: String(winStart), end: String(winEnd) };
}

/** Resolve a config query value: "utcDay" expands to a UTC-aligned day window, "now" to the current time, else literal. */
function resolveQueryValue(value) {
	if (value === "utcDay") {
		const range = platformRangeUtc();
		return { start: range.start, end: range.end };
	}
	if (value === "now") return String(Math.floor(Date.now() / 1000));
	return String(value);
}

/** Resolve the harness home (env first, then ~/.dsh). */
function dshHome() {
	return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}

/** Absolute path of the daily usage record. */
function statsPath() {
	return join(dshHome(), "storages", STATS_FILE);
}

/** Local calendar date, e.g. "2026-08-22". */
function today() {
	const d = new Date();
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Read the persisted daily record; a missing/stale/corrupt file starts today at zero. */
function loadStats() {
	try {
		const raw = JSON.parse(readFileSync(statsPath(), "utf8"));
		if (raw !== null && typeof raw === "object" && raw.date === today() && typeof raw.requests === "number" && typeof raw.tokens === "number") {
			return { date: raw.date, requests: raw.requests, tokens: raw.tokens };
		}
	} catch {
		/* absent or unreadable — fresh record */
	}
	return { date: today(), requests: 0, tokens: 0 };
}

/** Roll a stale record to today's zeroed record. */
function rollToday(stats) {
	return stats.date === today() ? stats : { date: today(), requests: 0, tokens: 0 };
}

/**
 * Extract today's usage from the platform response.
 * Primary shape (user-captured, verified): data.data.biz_data with
 * `series[]` (per API key) of hourly `points` (bucket 3600); points carry
 * numeric token/request fields. Points are filtered to LOCAL today using the
 * timezone offset. Falls back to a generic walk for date-stamped records.
 * @param data - parsed JSON from the platform usage endpoint.
 * @returns {requests: number|null, tokens: number|null} or null when nothing usable.
 */
function parsePlatformUsage(data) {
	const TOKEN_KEY_RE = /token/i;
	const REQUEST_KEY_RE = /^(call_count|request_count|requests|total_requests|request)$/i;
	const todayStr = today();
	const tz = tzOffsetSeconds();

	const sumPoint = (node, acc) => {
		if (node === null || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const item of node) sumPoint(item, acc);
			return;
		}
		for (const [key, value] of Object.entries(node)) {
			if (TOKEN_KEY_RE.test(key) && typeof value === "number" && Number.isFinite(value)) {
				acc.tokens += value;
				acc.foundTokens = true;
			} else if (REQUEST_KEY_RE.test(key) && typeof value === "number" && Number.isFinite(value)) {
				acc.requests += value;
				acc.foundRequests = true;
			} else if (value !== null && typeof value === "object") {
				sumPoint(value, acc);
			}
		}
	};

	// Shape 1: by_api_key hourly series.
	const biz = data?.data?.biz_data;
	if (biz !== null && typeof biz === "object" && Array.isArray(biz.series)) {
		const acc = { tokens: 0, requests: 0, foundTokens: false, foundRequests: false };
		for (const series of biz.series) {
			if (series === null || typeof series !== "object") continue;
			const points = Array.isArray(series.buckets) ? series.buckets : Array.isArray(series.points) ? series.points
				: Array.isArray(series.data) ? series.data
					: Array.isArray(series.values) ? series.values
						: Array.isArray(series) ? series : [];
			let sawTime = false;
			for (const point of points) {
				if (point === null || typeof point !== "object") continue;
				const timeVal = point.time ?? point.timestamp ?? point.ts ?? point.start ?? point.bucket;
				if (typeof timeVal === "number") {
					sawTime = true;
					// local date of the bucket: epoch + tz, then take the UTC date of the shifted instant.
					const localDate = new Date((timeVal + tz) * 1000).toISOString().slice(0, 10);
					if (localDate !== todayStr) continue;
				}
				sumPoint(point, acc);
			}
			if (sawTime === false && points.length > 0) {
				// No time field: sum the whole series (window already covers local today).
				for (const point of points) if (point !== null && typeof point === "object") sumPoint(point, acc);
			}
		}
		if (acc.foundTokens || acc.foundRequests) {
			return {
				requests: acc.foundRequests ? acc.requests : null,
				tokens: acc.foundTokens ? acc.tokens : null
			};
		}
	}

	// Shape 2: generic date-stamped daily records.
	const records = [];
	const walk = (node, depth) => {
		if (node === null || node === void 0 || depth > 7) return;
		if (Array.isArray(node)) {
			for (const item of node) walk(item, depth + 1);
			return;
		}
		if (typeof node !== "object") return;
		const dateVal = node.date ?? node.date_str ?? node.dateStr ?? node["date"];
		if (typeof dateVal === "string" && dateVal.slice(0, 10) === todayStr) records.push(node);
		for (const value of Object.values(node)) walk(value, depth + 1);
	};
	walk(data, 0);
	if (records.length === 0) return null;

	const acc = { tokens: 0, requests: 0, foundTokens: false, foundRequests: false };
	for (const record of records) {
		const walkNum = (node, depth) => {
			if (node === null || typeof node !== "object" || depth > 5) return;
			if (Array.isArray(node)) {
				for (const item of node) walkNum(item, depth + 1);
				return;
			}
			for (const [key, value] of Object.entries(node)) {
				if (TOKEN_KEY_RE.test(key) && typeof value === "number" && Number.isFinite(value)) {
					acc.tokens += value;
					acc.foundTokens = true;
				} else if (REQUEST_KEY_RE.test(key) && typeof value === "number" && Number.isFinite(value)) {
					acc.requests += value;
					acc.foundRequests = true;
				} else if (value !== null && typeof value === "object") {
					walkNum(value, depth + 1);
				}
			}
		};
		walkNum(record, 0);
	}
	return {
		requests: acc.foundRequests ? acc.requests : records.length > 1 ? records.length : null,
		tokens: acc.foundTokens ? acc.tokens : null
	};
}

/**
 * Optional per-call platform request tuning, read fresh on every request so it
 * can be edited without restarting the server. File: $DSH_HOME/storages/check-token-platform.json
 * Shape: { "url"?, "method"?, "query"?: {k:v}, "body"?: any, "headers"?: {k:v} }
 * @returns the overrides, or null to use the built-in defaults.
 */
function readPlatformConfig() {
	try {
		const raw = JSON.parse(readFileSync(join(dshHome(), "storages", "check-token-platform.json"), "utf8"));
		if (raw !== null && typeof raw === "object") return raw;
	} catch {
		/* absent or unreadable — use defaults */
	}
	return null;
}

/**
 * Query the DeepSeek platform usage endpoints once.
 * Auth: a DEEPSEEK_PLATFORM_TOKEN credential (the console session token)
 * wins over the API key, which the platform console may reject.
 * Default request uses the grep.app-verified `month` query parameter; a
 * per-call config file overrides the request shape without a restart.
 * @param credentials - the `credentials` service.
 * @returns {parsed:{requests,tokens}} | {error:string, sample?:string}.
 */
async function fetchPlatformUsage(credentials) {
	const tokenResolved = await credentials.resolve("DEEPSEEK_PLATFORM_TOKEN");
	const keyResolved = await credentials.resolve("DEEPSEEK_API_KEY");
	const bearer = tokenResolved?.value ?? keyResolved?.value ?? process.env.DEEPSEEK_PLATFORM_TOKEN ?? process.env.DEEPSEEK_API_KEY;
	if (!bearer) return { error: "无可用凭据（DEEPSEEK_API_KEY / DEEPSEEK_PLATFORM_TOKEN）" };

	// Build the request variant to try.
	const config = readPlatformConfig();
	let variant;
	if (config !== null) {
		variant = {
			url: typeof config.url === "string" ? config.url : PLATFORM_USAGE_BASE,
			method: typeof config.method === "string" ? config.method : "GET",
			query: config.query && typeof config.query === "object" ? config.query : {},
			body: config.body,
			headers: config.headers && typeof config.headers === "object" ? config.headers : {}
		};
	} else {
		// The real console request (user-captured): by_api_key + epoch range + tz.
		variant = {
			url: PLATFORM_USAGE_BASE,
			method: "GET",
			query: {
				start: "utcDay",
				end: "utcDay",
				tz: String(tzOffsetSeconds())
			},
			body: void 0,
			headers: { ...PLATFORM_CLIENT_HEADERS }
		};
	}
	const variants = [variant];

	const errors = [];
	for (const variant of variants) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		const url = new URL(variant.url);
		for (const [key, value] of Object.entries(variant.query ?? {})) {
			const resolved = resolveQueryValue(value);
			if (resolved !== null && typeof resolved === "object") {
				for (const [subKey, subValue] of Object.entries(resolved)) url.searchParams.set(subKey, String(subValue));
			} else {
				url.searchParams.set(key, String(resolved));
			}
		}
		const path = url.pathname + (url.search ? url.search : "");
		try {
			const requestInit = {
				method: variant.method,
				headers: {
					Authorization: `Bearer ${bearer}`,
					Accept: "application/json",
					...variant.headers
				},
				signal: controller.signal
			};
			if (variant.body !== void 0) {
				requestInit.headers["content-type"] = "application/json";
				requestInit.body = typeof variant.body === "string" ? variant.body : JSON.stringify(variant.body);
			}
			const response = await fetch(url, requestInit);
			if (!response.ok) {
				errors.push(`${path} → HTTP ${response.status}`);
				continue;
			}
			const text = await response.text();
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				errors.push(`${path} → 非 JSON 响应`);
				continue;
			}
			const parsed = parsePlatformUsage(data);
			if (parsed !== null) return { parsed };
			errors.push(`${path} → 无今日可解析数据`);
			return { error: errors.join("; "), sample: text.slice(0, 3000) };
		} catch (error) {
			errors.push(`${path} → ${error?.name === "AbortError" ? "请求超时" : String(error?.message ?? error)}`);
		} finally {
			clearTimeout(timer);
		}
	}
	return { error: errors.join("; ") };
}

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
 * Host plugin body: mount the routes and the usage accumulator for the
 * lifetime of the fiber.
 * @param ctx - host plugin context with webServer and credentials.
 */
function apply(ctx) {
	// --- Daily usage accumulator (live feed, debounced persistence) ---
	let stats = loadStats();
	let saveTimer = null;
	const persist = () => {
		saveTimer = null;
		try {
			const dir = join(dshHome(), "storages");
			mkdirSync(dir, { recursive: true });
			const tmp = `${statsPath()}.tmp`;
			writeFileSync(tmp, JSON.stringify(stats), "utf8");
			renameSync(tmp, statsPath());
		} catch (error) {
			ctx.logger.warn("check-token: failed to persist daily stats");
			ctx.logger.warn(error);
		}
	};
	const schedulePersist = () => {
		if (saveTimer !== null) return;
		saveTimer = setTimeout(persist, SAVE_DEBOUNCE_MS);
		saveTimer.unref?.();
	};
	const onSessionEvent = (session, event) => {
		const current = rollToday(stats);
		if (event.type === "request/header") {
			stats = { ...current, requests: current.requests + 1 };
			schedulePersist();
			return;
		}
		if (event.type === "assistant/message" && event.data?.usage !== undefined) {
			const u = event.data.usage;
			const tokens = (u.inputTokens ?? 0) + (u.outputTokens ?? 0) + (u.cacheReadTokens ?? 0) + (u.cacheWriteTokens ?? 0);
			if (tokens > 0) {
				stats = { ...current, tokens: current.tokens + tokens };
				schedulePersist();
			}
		}
	};
	ctx.on("session/event", onSessionEvent);

	// --- Routes ---
	ctx.effect(() => {
		const disposeBalance = ctx.webServer.register({
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
		const disposeStats = ctx.webServer.register({
			kind: "exact",
			path: STATS_ENDPOINT,
			handler: async (req, res) => {
				if (req.method !== "GET" && req.method !== "HEAD") {
					res.writeHead(405);
					res.end();
					return;
				}
				const local = rollToday(stats);
				const platform = await fetchPlatformUsage(ctx.credentials);
				let requests = local.requests;
				let tokens = local.tokens;
				let source = "local";
				let platformError;
				if (platform.error !== void 0) {
					platformError = platform.error;
				} else if (platform.parsed !== void 0) {
					if (platform.parsed.tokens !== null) {
						tokens = platform.parsed.tokens;
						source = "platform";
					}
					if (platform.parsed.requests !== null) {
						requests = platform.parsed.requests;
						source = source === "platform" ? "platform" : "mixed";
					} else if (source === "platform") {
						source = "mixed";
					}
				}
				const payload = { ok: true, date: today(), requests, tokens, source };
				if (platformError !== void 0) payload.platformError = platformError;
				if (platform.sample !== void 0) payload.platformSample = platform.sample;
				const body = JSON.stringify(payload);
				res.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				res.end(body);
			}
		});
		return () => {
			disposeBalance();
			disposeStats();
		};
	}, "check-token: routes");

	// Flush any pending record when the fiber goes down.
	ctx.effect(() => {
		return () => {
			if (saveTimer !== null) {
				clearTimeout(saveTimer);
				saveTimer = null;
				try {
					writeFileSync(statsPath(), JSON.stringify(stats), "utf8");
				} catch {
					/* best-effort final flush */
				}
			}
		};
	}, "check-token: final flush");
}

export { BALANCE_ENDPOINT, PLATFORM_USAGE_BASE, STATS_ENDPOINT, apply, inject, name, parsePlatformUsage };
