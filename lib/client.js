window.__ModuleLoader__.load({
	id: "DSH-check-token",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region styles
		const css = [
			".dsh-ct-root{position:fixed;right:16px;bottom:16px;z-index:40;font-size:calc(13px * var(--dsh-ct-scale,1));--dsh-ct-scale:1}",
			".dsh-ct-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:var(--dsw-specific-menu,#252a33);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.35));color:var(--dsw-alias-label-primary,#e8eaed);cursor:grab;user-select:none;white-space:nowrap;touch-action:none;transition:transform .12s ease,border-color .12s ease}",
			".dsh-ct-badge:hover{transform:translateY(-1px);border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.3))}",
			".dsh-ct-root[data-dragging] .dsh-ct-badge{cursor:grabbing;transform:none;transition:none}",
			".dsh-ct-dot{width:8px;height:8px;border-radius:50%;flex:none}",
			".dsh-ct-dot-ok{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}",
			".dsh-ct-dot-err{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.18)}",
			".dsh-ct-dot-warn{background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.18)}",
			".dsh-ct-label{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:.92em}",
			".dsh-ct-value{font-variant-numeric:tabular-nums;font-weight:600}",
			".dsh-ct-value-dim{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-weight:400}",
			".dsh-ct-refresh{color:var(--dsw-alias-label-tertiary,#9aa1ab);line-height:1;transition:transform .3s ease}",
			".dsh-ct-root[data-refreshing] .dsh-ct-refresh{transform:rotate(180deg);animation:dsh-ct-spin .8s linear infinite}",
			"@keyframes dsh-ct-spin{to{transform:rotate(540deg)}}",
			".dsh-ct-panel{position:absolute;right:0;width:280px;max-height:calc(100vh - 140px);overflow:auto;box-sizing:border-box;background:var(--dsw-specific-menu,#252a33);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.4));border-radius:12px;padding:12px;color:var(--dsw-alias-label-primary,#e8eaed);user-select:none;display:flex;flex-direction:column;gap:10px}",
			".dsh-ct-panel-above{bottom:calc(100% + 10px);top:auto}",
			".dsh-ct-panel-below{top:calc(100% + 10px);bottom:auto}",
			".dsh-ct-panel-title{font-size:1em;font-weight:600;display:flex;justify-content:space-between;align-items:center}",
			".dsh-ct-panel-date{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:.85em;font-weight:400}",
			".dsh-ct-stats{display:flex;gap:10px}",
			".dsh-ct-stat{flex:1;min-width:0;background:var(--dsw-alias-fill-l2,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:10px;padding:10px;text-align:center}",
			".dsh-ct-num{font-size:1.5em;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".dsh-ct-num-label{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:.85em;margin-top:4px}",
			".dsh-ct-balance-row{display:flex;justify-content:space-between;align-items:center;font-size:.95em}",
			".dsh-ct-balance-row .dsh-ct-value{font-weight:600}",
			".dsh-ct-font-row{display:flex;justify-content:space-between;align-items:center;gap:6px}",
			".dsh-ct-font-label{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:.92em}",
			".dsh-ct-font-btns{display:flex;gap:4px}",
			".dsh-ct-font-btn{min-width:26px;height:26px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--dsw-alias-label-secondary,#c3c8cf);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:6px;cursor:pointer;line-height:1;padding:0 4px}",
			".dsh-ct-font-btn[data-active]{background:var(--dsw-alias-fill-l3,rgba(255,255,255,.12));color:var(--dsw-alias-label-primary,#e8eaed);border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.3))}",
			".dsh-ct-foot{display:flex;justify-content:space-between;align-items:center;color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:.85em}",
			".dsh-ct-foot button{background:none;border:none;color:var(--dsw-alias-label-secondary,#c3c8cf);cursor:pointer;font-size:inherit;padding:0}",
			".dsh-ct-foot button:hover{color:var(--dsw-alias-label-primary,#e8eaed)}"
		].join("");
		const tagId = "DSH-check-token/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "DSH-check-token";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region widget
		const POLL_INTERVAL_MS = 60000;
		const BALANCE_ENDPOINT = "/api/account-balance";
		const STATS_ENDPOINT = "/api/account-stats";
		const VERSION = "v1.02";
		/** Five font-size levels (multipliers applied to the 13px base). */
		const FONT_LEVELS = [0.8, 0.9, 1, 1.15, 1.3];
		const POS_KEY = "dsh-check-token-pos";
		const FONT_KEY = "dsh-check-token-font";
		const EDGE = 8;
		const DRAG_THRESHOLD_PX = 4;

		function clamp(value, min, max) {
			return Math.min(max, Math.max(min, value));
		}

		/** Restore the persisted position, or null for the CSS default corner. */
		function loadPosition() {
			try {
				const saved = window.localStorage.getItem(POS_KEY);
				if (saved !== null) {
					const parsed = JSON.parse(saved);
					if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
				}
			} catch {
				/* fall back to the default corner */
			}
			return null;
		}

		/** Restore the persisted font level (0-4), defaulting to the middle. */
		function loadFontLevel() {
			try {
				const raw = Number(window.localStorage.getItem(FONT_KEY));
				if (Number.isInteger(raw) && raw >= 0 && raw < FONT_LEVELS.length) return raw;
			} catch {
				/* fall through to default */
			}
			return 2;
		}

		/** Thousands-separated plain number. */
		function formatNum(n) {
			return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
		}

		/** Primary balance value: every currency's total, joined. */
		function primaryValue(data) {
			const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
			if (infos.length === 0) return "—";
			return infos.map((info) => `${info.currency} ${info.total_balance}`).join("  ");
		}

		/** Balance tooltip detail. */
		function detailText(data) {
			const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
			const lines = infos.map((info) => {
				const bits = [`${info.currency} 总额 ${info.total_balance}`];
				if (info.topped_up_balance != null) bits.push(`充值 ${info.topped_up_balance}`);
				if (info.granted_balance != null) bits.push(`赠送 ${info.granted_balance}`);
				return bits.join(" · ");
			});
			if (data?.is_available === false) lines.push("账户当前不可用");
			return lines.join("\n");
		}

		/**
		 * Floating, draggable widget. Click toggles a detail panel showing today's
		 * API request count and tokens; font size is adjustable in five levels.
		 */
		function BalanceWidget() {
			const [balance, setBalance] = (0, react.useState)({ phase: "loading" });
			const [stats, setStats] = (0, react.useState)({ phase: "loading" });
			const [open, setOpen] = (0, react.useState)(false);
			const [pos, setPos] = (0, react.useState)(loadPosition);
			const [fontLevel, setFontLevel] = (0, react.useState)(loadFontLevel);
			const [dragging, setDragging] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const drag = (0, react.useRef)(null);
			const suppressClick = (0, react.useRef)(false);

			const refreshAll = (0, react.useCallback)(async () => {
				setBalance((prev) => ({ ...prev, refreshing: true }));
				setStats((prev) => ({ ...prev, refreshing: true }));
				const load = async (url, okMapper) => {
					try {
						const response = await fetch(url, { cache: "no-store" });
						const data = await response.json();
						if (data?.ok === true) return { phase: "ok", data };
						return { phase: "error", message: String(data?.error ?? "未知错误") };
					} catch (error) {
						return { phase: "error", message: String(error?.message ?? error) };
					}
				};
				const [b, s] = await Promise.all([
					load(BALANCE_ENDPOINT),
					load(STATS_ENDPOINT)
				]);
				setBalance({ ...b, refreshing: false });
				setStats({ ...s, refreshing: false });
			}, []);
			(0, react.useEffect)(() => {
				refreshAll();
				const timer = setInterval(refreshAll, POLL_INTERVAL_MS);
				return () => clearInterval(timer);
			}, [refreshAll]);
			// Refresh once when the panel opens so the numbers are fresh.
			(0, react.useEffect)(() => {
				if (open) refreshAll();
			}, [open, refreshAll]);

			// Close the panel on outside pointerdown.
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
				};
				document.addEventListener("pointerdown", closeOutside);
				return () => document.removeEventListener("pointerdown", closeOutside);
			}, [open]);

			// Re-clamp a dragged position into the viewport after resizes.
			(0, react.useEffect)(() => {
				const onResize = () => {
					setPos((current) => {
						if (current === null) return current;
						const el = rootRef.current;
						const w = el?.offsetWidth ?? 150;
						const h = el?.offsetHeight ?? 40;
						return {
							x: clamp(current.x, EDGE, Math.max(EDGE, window.innerWidth - w - EDGE)),
							y: clamp(current.y, EDGE, Math.max(EDGE, window.innerHeight - h - EDGE))
						};
					});
				};
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, []);

			const changeFont = (level) => {
				setFontLevel(level);
				try {
					window.localStorage.setItem(FONT_KEY, String(level));
				} catch {
					/* storage unavailable — level just is not persisted */
				}
			};

			const onPointerDown = (event) => {
				if (event.pointerType === "mouse" && event.button !== 0) return;
				const el = rootRef.current;
				if (el === null) return;
				const rect = el.getBoundingClientRect();
				drag.current = {
					startX: event.clientX,
					startY: event.clientY,
					baseX: pos === null ? rect.left : pos.x,
					baseY: pos === null ? rect.top : pos.y,
					moved: false
				};
				event.currentTarget.setPointerCapture(event.pointerId);
				setDragging(true);
			};

			const onPointerMove = (event) => {
				const d = drag.current;
				if (d === null) return;
				const dx = event.clientX - d.startX;
				const dy = event.clientY - d.startY;
				if (!d.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) d.moved = true;
				if (!d.moved) return;
				const el = rootRef.current;
				const w = el?.offsetWidth ?? 150;
				const h = el?.offsetHeight ?? 40;
				setPos({
					x: clamp(d.baseX + dx, EDGE, Math.max(EDGE, window.innerWidth - w - EDGE)),
					y: clamp(d.baseY + dy, EDGE, Math.max(EDGE, window.innerHeight - h - EDGE))
				});
			};

			const onPointerUp = (event) => {
				const d = drag.current;
				if (d !== null && d.moved) {
					suppressClick.current = true;
					try {
						const el = rootRef.current;
						const w = el?.offsetWidth ?? 150;
						const h = el?.offsetHeight ?? 40;
						window.localStorage.setItem(POS_KEY, JSON.stringify({
							x: clamp(d.baseX + (event.clientX - d.startX), EDGE, Math.max(EDGE, window.innerWidth - w - EDGE)),
							y: clamp(d.baseY + (event.clientY - d.startY), EDGE, Math.max(EDGE, window.innerHeight - h - EDGE))
						}));
					} catch {
						/* position just is not persisted */
					}
				}
				drag.current = null;
				setDragging(false);
			};

			const onClick = (event) => {
				if (suppressClick.current) {
					suppressClick.current = false;
					event.preventDefault();
					return;
				}
				setOpen((current) => !current);
			};

			const onKeyDown = (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					setOpen((current) => !current);
				}
			};

			let dot = "dsh-ct-dot-warn";
			let value = "…";
			let title = "账户余额加载中…";
			if (balance.phase === "ok") {
				const unavailable = balance.data?.is_available === false;
				dot = unavailable ? "dsh-ct-dot-warn" : "dsh-ct-dot-ok";
				value = primaryValue(balance.data);
				title = [detailText(balance.data), "单击查看今日用量 · 拖动调整位置"].join("\n");
			} else if (balance.phase === "error") {
				dot = "dsh-ct-dot-err";
				value = "余额 --";
				title = [balance.message, "单击查看今日用量 · 拖动调整位置"].join("\n");
			}

			const requests = stats.phase === "ok" ? stats.data.requests : null;
			const tokens = stats.phase === "ok" ? stats.data.tokens : null;
			const statsDate = stats.phase === "ok" ? String(stats.data.date ?? "") : "";
			const statsSource = stats.phase === "ok" ? String(stats.data.source ?? "local") : "local";
			const sourceLabel = statsSource === "platform" ? "平台" : statsSource === "mixed" ? "平台+本地" : "本地";
			const platformError = stats.phase === "ok" ? String(stats.data.platformError ?? "") : "";
			// Panel opens above when the widget sits in the lower half of the
			// window, below when it sits in the upper half.
			const panelAbove = pos === null || pos.y > window.innerHeight / 2;

			const baseStyle = pos === null
				? { right: 16, bottom: 16 }
				: { left: pos.x, top: pos.y, right: "auto", bottom: "auto" };

			return (0, react_jsx_runtime.jsx)("div", {
				ref: rootRef,
				className: "dsh-ct-root",
				style: { ...baseStyle, "--dsh-ct-scale": String(FONT_LEVELS[fontLevel] ?? 1) },
				"data-refreshing": balance.refreshing || stats.refreshing || void 0,
				"data-dragging": dragging || void 0,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ct-badge",
						role: "button",
						tabIndex: 0,
						title,
						"aria-label": `账号余额：${value}，单击查看今日用量`,
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onClick,
						onKeyDown,
						children: [
							(0, react_jsx_runtime.jsx)("span", { className: `dsh-ct-dot ${dot}` }),
							(0, react_jsx_runtime.jsx)("span", { className: "dsh-ct-label", children: "余额" }),
							(0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ct-value" + (balance.phase === "error" ? " dsh-ct-value-dim" : ""),
								children: value
							}),
							(0, react_jsx_runtime.jsx)("span", { className: "dsh-ct-refresh", "aria-hidden": true, children: "⟳" })
						]
					}),
					open ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ct-panel " + (panelAbove ? "dsh-ct-panel-above" : "dsh-ct-panel-below"),
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ct-panel-title",
								children: ["今日用量", (0, react_jsx_runtime.jsx)("span", { className: "dsh-ct-panel-date", title: platformError || void 0, children: (statsDate ? `${statsDate} · ` : "") + sourceLabel + (platformError ? " ⚠" : "") })]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ct-stats",
								children: [
									(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ct-stat",
										children: [
											(0, react_jsx_runtime.jsx)("div", { className: "dsh-ct-num", children: requests === null ? "…" : formatNum(requests) }),
											(0, react_jsx_runtime.jsx)("div", { className: "dsh-ct-num-label", children: "API 请求（次）" })
										]
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ct-stat",
										children: [
											(0, react_jsx_runtime.jsx)("div", { className: "dsh-ct-num", children: tokens === null ? "…" : formatNum(tokens) }),
											(0, react_jsx_runtime.jsx)("div", { className: "dsh-ct-num-label", children: "Tokens" })
										]
									})
								]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ct-balance-row",
								children: [
									(0, react_jsx_runtime.jsx)("span", { className: "dsh-ct-label", children: "账户余额" }),
									(0, react_jsx_runtime.jsx)("span", { className: "dsh-ct-value" + (balance.phase === "error" ? " dsh-ct-value-dim" : ""), children: value })
								]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ct-font-row",
								children: [
									(0, react_jsx_runtime.jsx)("span", { className: "dsh-ct-font-label", children: "字体大小" }),
									(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ct-font-btns",
										children: FONT_LEVELS.map((level, index) => (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ct-font-btn",
											"data-active": index === fontLevel || void 0,
											title: `字号 ${index + 1}/5`,
											"aria-label": `字体大小 ${index + 1}/5`,
											style: { fontSize: `${9 + index * 1.5}px` },
											onClick: (event) => {
												event.stopPropagation();
												changeFont(index);
											},
											children: "A"
										}, index))
									})
								]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ct-foot",
								children: [
									(0, react_jsx_runtime.jsx)("span", { children: VERSION }),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (event) => {
											event.stopPropagation();
											refreshAll();
										},
										children: "刷新"
									})
								]
							})
						]
					}) : null
				]
			});
		}
		//#endregion
		//#region plugin
		/** Required client services: the slot registry only. */
		const inject = ["slots"];
		/**
		 * Client plugin body: contribute the floating widget to the shell overlay.
		 * @param ctx - client root context with `slots`.
		 */
		function apply(ctx) {
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "account-balance",
				order: 10
			}, BalanceWidget));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
