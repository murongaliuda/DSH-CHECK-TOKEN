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
			".dsh-bal-widget{position:fixed;right:16px;bottom:16px;z-index:40;display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:var(--dsw-specific-menu,#252a33);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.35));color:var(--dsw-alias-label-primary,#e8eaed);font:13px/1.4 -apple-system,'Segoe UI',system-ui,sans-serif;cursor:grab;user-select:none;white-space:nowrap;touch-action:none;transition:transform .12s ease,border-color .12s ease}",
			".dsh-bal-widget:hover{transform:translateY(-1px);border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.3))}",
			".dsh-bal-widget[data-dragging]{cursor:grabbing;transform:none;transition:none}",
			".dsh-bal-dot{width:8px;height:8px;border-radius:50%;flex:none}",
			".dsh-bal-dot-ok{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}",
			".dsh-bal-dot-err{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.18)}",
			".dsh-bal-dot-warn{background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.18)}",
			".dsh-bal-label{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:12px}",
			".dsh-bal-value{font-variant-numeric:tabular-nums;font-weight:600}",
			".dsh-bal-value-dim{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-weight:400}",
			".dsh-bal-refresh{color:var(--dsw-alias-label-tertiary,#9aa1ab);font-size:12px;line-height:1;transition:transform .3s ease}",
			".dsh-bal-widget[data-refreshing] .dsh-bal-refresh{transform:rotate(180deg);animation:dsh-bal-spin .8s linear infinite}",
			"@keyframes dsh-bal-spin{to{transform:rotate(540deg)}}"
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
		/** localStorage key persisting the dragged position. */
		const POS_KEY = "dsh-balance-pos";
		/** Minimum distance to the viewport edge while dragging / clamping. */
		const EDGE = 8;
		/** Pointer travel before a press counts as a drag instead of a click. */
		const DRAG_THRESHOLD_PX = 4;

		/** Clamp a coordinate into [min, max]. */
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
				/* unreadable storage — fall back to the default corner */
			}
			return null;
		}

		/**
		 * Primary display value: every currency's total balance, joined.
		 * @param data - the ok payload from the host route.
		 */
		function primaryValue(data) {
			const infos = Array.isArray(data?.balance_infos) ? data.balance_infos : [];
			if (infos.length === 0) return "—";
			return infos.map((info) => `${info.currency} ${info.total_balance}`).join("  ");
		}

		/**
		 * Tooltip detail: per-currency breakdown plus availability.
		 */
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
		 * Floating, draggable balance badge. Polls the host route, refreshes on
		 * click, drags anywhere with the pointer, and remembers its position in
		 * localStorage across reloads.
		 */
		function BalanceWidget() {
			const [state, setState] = (0, react.useState)({ phase: "loading" });
			const [pos, setPos] = (0, react.useState)(loadPosition);
			const [dragging, setDragging] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const drag = (0, react.useRef)(null);
			const suppressClick = (0, react.useRef)(false);

			const refresh = (0, react.useCallback)(async () => {
				setState((prev) => ({ ...prev, refreshing: true }));
				try {
					const response = await fetch(BALANCE_ENDPOINT, { cache: "no-store" });
					const data = await response.json();
					if (data?.ok === true) {
						setState({ phase: "ok", data, refreshing: false });
					} else {
						setState({
							phase: "error",
							message: String(data?.error ?? "未知错误"),
							detail: data?.detail ? String(data.detail) : void 0,
							refreshing: false
						});
					}
				} catch (error) {
					setState({ phase: "error", message: String(error?.message ?? error), refreshing: false });
				}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
				const timer = setInterval(refresh, POLL_INTERVAL_MS);
				return () => clearInterval(timer);
			}, [refresh]);

			// Re-clamp a dragged position into the viewport after resizes.
			(0, react.useEffect)(() => {
				const onResize = () => {
					setPos((current) => {
						if (current === null) return current;
						const el = rootRef.current;
						const w = el?.offsetWidth ?? 120;
						const h = el?.offsetHeight ?? 34;
						return {
							x: clamp(current.x, EDGE, Math.max(EDGE, window.innerWidth - w - EDGE)),
							y: clamp(current.y, EDGE, Math.max(EDGE, window.innerHeight - h - EDGE))
						};
					});
				};
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, []);

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
				const w = el?.offsetWidth ?? 120;
				const h = el?.offsetHeight ?? 34;
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
						const w = el?.offsetWidth ?? 120;
						const h = el?.offsetHeight ?? 34;
						window.localStorage.setItem(POS_KEY, JSON.stringify({
							x: clamp(d.baseX + (event.clientX - d.startX), EDGE, Math.max(EDGE, window.innerWidth - w - EDGE)),
							y: clamp(d.baseY + (event.clientY - d.startY), EDGE, Math.max(EDGE, window.innerHeight - h - EDGE))
						}));
					} catch {
						/* storage unavailable — position just is not persisted */
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
				refresh();
			};

			const onKeyDown = (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					refresh();
				}
			};

			let dot = "dsh-bal-dot-warn";
			let value = "…";
			let title = "账户余额加载中…";
			if (state.phase === "ok") {
				const unavailable = state.data?.is_available === false;
				dot = unavailable ? "dsh-bal-dot-warn" : "dsh-bal-dot-ok";
				value = primaryValue(state.data);
				title = [detailText(state.data), `更新于 ${new Date(state.at ?? Date.now()).toLocaleTimeString()}`, "点击刷新 · 拖动调整位置"].join("\n");
			} else if (state.phase === "error") {
				dot = "dsh-bal-dot-err";
				value = "余额 --";
				title = [state.message, state.detail, "点击重试 · 拖动调整位置"].filter(Boolean).join("\n");
			}

			const baseStyle = pos === null
				? { right: 16, bottom: 16 }
				: { left: pos.x, top: pos.y, right: "auto", bottom: "auto" };

			return (0, react_jsx_runtime.jsx)("div", {
				ref: rootRef,
				className: "dsh-bal-widget",
				role: "button",
				tabIndex: 0,
				title,
				"aria-label": `账号余额：${value}`,
				"data-refreshing": state.refreshing || void 0,
				"data-dragging": dragging || void 0,
				style: baseStyle,
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onClick,
				onKeyDown,
				children: [
					(0, react_jsx_runtime.jsx)("span", { className: `dsh-bal-dot ${dot}` }),
					(0, react_jsx_runtime.jsx)("span", { className: "dsh-bal-label", children: "余额" }),
					(0, react_jsx_runtime.jsx)("span", {
						className: "dsh-bal-value" + (state.phase === "error" ? " dsh-bal-value-dim" : ""),
						children: value
					}),
					(0, react_jsx_runtime.jsx)("span", { className: "dsh-bal-refresh", "aria-hidden": true, children: "⟳" })
				]
			});
		}
		//#endregion
		//#region plugin
		/** Required client services: the slot registry only. */
		const inject = ["slots"];
		/**
		 * Client plugin body: contribute the floating badge to the shell overlay.
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
