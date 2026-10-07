(function () {
  // Wait until the game has loaded, then start the mod
  const wait = setInterval(function () {
    try {
      if (typeof window._E9 !== "function" || typeof window._zp !== "function") return;
      if (typeof global === "undefined" || !global._Dw) return;
      if (!(_zp(null, null, global._Dw)._dF > 0)) return;
    } catch (e) { return; }
    clearInterval(wait);
    start();
  }, 500);

  function start() {
    if (window.__fishGui) return;
    window.__fishGui = true;

    // ================= saved settings =================
    const KEY = "fishmod_v4";
    const loadSaved = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const saved = loadSaved();

    const S = (window.__S = {
      mult: 1, vmult: 1, spoof: false, golden: false, pick: -1, jit: 1, tab: 0,
      lvl: { depth: 1, fish: 1, income: 1 } // mirrors the real game levels (the game saves these itself)
    });
    ["mult", "vmult", "spoof", "golden", "pick", "jit", "tab"].forEach((k) => { if (saved[k] !== undefined) S[k] = saved[k]; });

    const G = () => _zp(null, null, global._Dw);
    const globalObj = () => (typeof global !== "undefined" ? global : window.global);

    // ================= game patches =================
    const origE9 = window._E9;
    window._E9 = function (a, b, depthPx) {
      if (!S.spoof) return origE9(a, b, depthPx);
      const g = _zp(a, b, global._Dw);

      if (S.golden) {
        const d = depthPx / g._lE;
        const inRange = []; let best = null, bd = 1e9;
        for (let i = 0; i < g._dF; i++) {
          const m = g._eF[i];
          if (_Ou(m, "type") !== 3) continue;
          const lo = _Ou(m, "minDepth"), hi = _Ou(m, "maxDepth");
          if (d >= lo && d <= hi) inRange.push(m);
          const dist = d < lo ? lo - d : d > hi ? d - hi : 0;
          if (dist < bd) { bd = dist; best = m; }
        }
        if (inRange.length) return inRange[Math.floor(Math.random() * inRange.length)];
        if (best) return best;
        return origE9(a, b, depthPx);
      }

      if (S.pick >= 0 && S.pick < g._dF) return g._eF[S.pick];

      const pool = [];
      for (let i = 0; i < g._dF; i++) if (_Ou(g._eF[i], "type") !== 4) pool.push(g._eF[i]);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : origE9(a, b, depthPx);
    };

    const ORIG = {}; // untouched originals (used when we call the game's own functions)
    let busy = false;
    ["_w9", "_D9"].forEach((k) => {
      const orig = window[k];
      if (typeof orig !== "function") return console.log("missing " + k);
      ORIG[k] = orig;
      window[k] = function (a, b, depthPx) {
        if (busy) return orig.apply(this, arguments);
        busy = true;
        try {
          const ppm = _zp(a, b, global._Dw)._lE;
          const r = orig.apply(this, arguments);
          for (let i = 1; i < S.mult; i++) {
            orig.call(this, a, b, depthPx + (Math.random() * 2 - 1) * S.jit * ppm);
          }
          return r;
        } finally { busy = false; }
      };
    });
    const origDist = G()._KE;
    setInterval(() => { try { G()._KE = S.mult > 1 ? 0 : origDist; } catch (e) {} }, 1000);

    // ================= fish value multiplier =================
    // multiplies the "price" field of every fish type (originals are remembered so x1 restores them)
    const origPrice = new WeakMap();
    let vActive = false;
    const applyValue = () => {
      if (typeof _Iu !== "function") return;
      if (S.vmult === 1 && !vActive) return;
      vActive = S.vmult !== 1;
      const g = G();
      for (let i = 0; i < g._dF; i++) {
        const m = g._eF[i];
        if (!m || typeof m !== "object") continue;
        if (!origPrice.has(m)) {
          const p = _Ou(m, "price");
          if (typeof p !== "number") continue;
          origPrice.set(m, p);
        }
        _Iu(m, "price", origPrice.get(m) * S.vmult);
      }
    };
    setInterval(() => { try { applyValue(); } catch (e) {} }, 2000);

    // ================= real game levels =================
    // _CG = max depth level, _BG = max fishes level, _EG = income ($/min, offline earnings) level
    const readLvl = () => { const g = G(); return { depth: g._CG, fish: g._BG, income: g._EG }; };
    const applyLevels = () => {
      const g = G();
      g._CG = S.lvl.depth; g._BG = S.lvl.fish; g._EG = S.lvl.income;
      _ra(null, null);                                   // recalculate max depth / fishes / income from levels
      g._7F = (ORIG._D9 || window._D9)(null, null);      // expected dive earnings (same as buying an upgrade)
      _0a(null, null); _A9(null, null); _Ab(null, null); // refresh UI, unlock fish, save into the game's own save
    };
    const derived = {
      depth: (l) => "max depth " + (3 + l),
      fish: (l) => "max fishes " + (3 + l),
      income: (l) => { let v = 5 * Math.pow(1.5, l); v -= v % 5; return "$" + Math.floor(v) + "/min"; }
    };
    let pending = null;
    const scheduleApply = () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        try { applyLevels(); status.textContent = "levels applied"; }
        catch (e) { status.textContent = "apply ERR: " + e; }
      }, 400);
    };

    // ================= UI =================
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;top:50px;left:12px;z-index:2147483647;";
    ["mousedown","mouseup","mousemove","click","dblclick","touchstart","touchmove","touchend","touchcancel",
     "pointerdown","pointermove","pointerup","pointercancel","wheel","contextmenu","keydown","keyup","keypress","input","change"]
      .forEach((ev) => host.addEventListener(ev, (e) => e.stopPropagation()));
    const root = host.attachShadow({ mode: "open" });

    const spring = "cubic-bezier(.34,1.56,.64,1)";
    const MONO = "ui-monospace,Menlo,Consolas,monospace";
    const css = [
      // ---- liquid glass panel ----
      ".p{position:relative;width:300px;color:#000;font:13px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;border-radius:34px;",
      "background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04));",
      "-webkit-backdrop-filter:blur(14px) saturate(190%) brightness(1.08);",
      "backdrop-filter:blur(14px) saturate(190%) brightness(1.08);",
      "backdrop-filter:url(#lgfilter) blur(6px) saturate(190%) brightness(1.08);",
      "box-shadow:0 18px 50px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.2),inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 1px rgba(255,255,255,.55),inset 0 -10px 22px rgba(255,255,255,.07);",
      "transition:transform .6s " + spring + ",width .5s " + spring + ";user-select:none;overflow:hidden;will-change:transform}",
      ".p.wide{width:390px}",
      ".p::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;z-index:3;",
      "background:linear-gradient(140deg,rgba(255,255,255,.95),rgba(255,255,255,.08) 28%,rgba(255,255,255,.04) 62%,rgba(255,255,255,.7));",
      "-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}",
      ".p::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;",
      "background:radial-gradient(230px circle at var(--mx,30%) var(--my,0%),rgba(255,255,255,.26),rgba(255,255,255,0) 62%)}",
      ".h,.b{position:relative;z-index:1}",
      ".h{padding:15px 18px 9px;display:flex;justify-content:space-between;align-items:center;cursor:grab;touch-action:none;font-weight:700;font-size:15px;letter-spacing:.2px;text-shadow:0 1px 6px rgba(0,0,0,.1)}",
      ".dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34c759;margin-left:8px;opacity:0;transition:opacity .6s;vertical-align:middle;box-shadow:0 0 8px #34c759}",
      ".dot.on{opacity:1;transition:none}",
      ".min{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:linear-gradient(160deg,rgba(255,255,255,.35),rgba(255,255,255,.1));box-shadow:inset 0 1px 1px rgba(255,255,255,.6);color:#000;font-size:15px;line-height:24px;text-align:center;cursor:pointer;padding:0;transition:transform .4s " + spring + "}",
      ".b{padding:2px 14px 16px;display:flex;flex-direction:column;gap:10px}",
      ".b.hide{display:none}",
      // ---- tabs ----
      ".tabs{position:relative;display:flex;padding:3px;border-radius:18px;background:rgba(0,0,0,.22);box-shadow:inset 0 1px 3px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.2)}",
      ".tab{flex:1;text-align:center;padding:8px 0;font-weight:600;font-size:12px;cursor:pointer;position:relative;z-index:1;opacity:.7;transition:opacity .25s,transform .4s " + spring + "}",
      ".tab.on{opacity:1}",
      ".tab:active{transform:scale(.94)}",
      ".ind{position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / 3);border-radius:15px;background:linear-gradient(160deg,rgba(255,255,255,.42),rgba(255,255,255,.14));box-shadow:inset 0 1px 1px rgba(255,255,255,.7),0 2px 8px rgba(0,0,0,.2);transition:transform .55s " + spring + "}",
      ".tabs.t1 .ind{transform:translateX(100%)}",
      ".tabs.t2 .ind{transform:translateX(200%)}",
      ".pg{display:flex;flex-direction:column;gap:10px;animation:pgin .45s " + spring + "}",
      ".pg.hide{display:none}",
      "@keyframes pgin{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}",
      // ---- cards & controls ----
      ".card{background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06));border-radius:24px;padding:11px 13px;box-shadow:inset 0 1px 1px rgba(255,255,255,.5),inset 0 0 0 1px rgba(255,255,255,.12),0 4px 14px rgba(0,0,0,.12)}",
      ".row{display:flex;align-items:center;justify-content:space-between;gap:10px}",
      ".lbl{font-weight:600}",
      ".lbl small{display:block;opacity:.7;font-size:11px;font-weight:400;margin-top:1px}",
      ".step{display:flex;align-items:center;gap:2px;background:rgba(0,0,0,.22);border-radius:16px;padding:3px;box-shadow:inset 0 1px 3px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.2)}",
      ".step button{width:28px;height:28px;border:0;border-radius:13px;background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(255,255,255,.12));box-shadow:inset 0 1px 1px rgba(255,255,255,.6);color:#000;font-size:17px;line-height:26px;cursor:pointer;padding:0;transition:transform .4s " + spring + "}",
      ".step input{width:44px;text-align:center;background:transparent;border:0;color:#000;font:700 14px -apple-system,system-ui,sans-serif;outline:none;-moz-appearance:textfield;padding:0}",
      ".step.wide input{width:58px}",
      ".step input::-webkit-inner-spin-button,.step input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}",
      "input{user-select:text;-webkit-user-select:text}",
      ".min:active,.step button:active{transform:scale(.82)}",
      ".sw{width:50px;height:30px;border-radius:15px;background:rgba(255,255,255,.2);box-shadow:inset 0 1px 3px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.25);position:relative;cursor:pointer;transition:background .3s;flex:none}",
      ".sw i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.4),inset 0 -2px 3px rgba(0,0,0,.08);transition:transform .45s " + spring + ",width .3s " + spring + ",background .2s}",
      ".sw.on{background:rgba(52,199,89,.9)}",
      ".sw.gold.on{background:rgba(255,196,0,.95)}",
      ".sw.on i{transform:translateX(20px)}",
      ".sw:active i{width:32px;background:rgba(255,255,255,.8)}",
      ".sw.on:active i{transform:translateX(12px)}",
      ".dim{opacity:.4;pointer-events:none}",
      ".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:216px;overflow-y:auto;padding:3px;margin-top:8px}",
      ".grid::-webkit-scrollbar{width:6px}.grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.3);border-radius:3px}",
      ".tile{position:relative;height:54px;border-radius:17px;background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06));box-shadow:inset 0 1px 1px rgba(255,255,255,.5),inset 0 0 0 1px rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .4s " + spring + ",box-shadow .2s}",
      ".tile:hover{transform:scale(1.08)}",
      ".tile:active{transform:scale(.92)}",
      ".tile.sel{box-shadow:0 0 0 2px rgba(255,255,255,.95),0 0 20px rgba(120,200,255,.8),inset 0 1px 1px rgba(255,255,255,.6)}",
      ".tile canvas{width:48px;height:36px;pointer-events:none}",
      ".tile b{font-size:20px;opacity:.9;pointer-events:none}",
      ".tile em{font-style:normal;font-size:10px;opacity:.75;pointer-events:none}",
      ".badge{position:absolute;top:5px;right:6px;width:7px;height:7px;border-radius:50%;pointer-events:none}",
      ".idx{position:absolute;bottom:2px;left:6px;font-size:9px;opacity:.55;pointer-events:none}",
      ".status{font:11px " + MONO + ";opacity:.85;min-height:13px;padding:0 6px}",
      // ---- advanced tab (variable table) ----
      ".srch{display:flex;gap:8px;align-items:center}",
      ".srch input{flex:1;min-width:0;box-sizing:border-box;height:32px;background:rgba(0,0,0,.22);border:0;border-radius:16px;padding:0 13px;color:#000;font:12.5px -apple-system,system-ui,sans-serif;outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.2)}",
      ".srch input::placeholder{color:rgba(0,0,0,.55)}",
      ".rbtn{border:0;border-radius:16px;padding:0 13px;height:32px;background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(255,255,255,.12));box-shadow:inset 0 1px 1px rgba(255,255,255,.6);color:#000;font:600 12px -apple-system,system-ui,sans-serif;cursor:pointer;flex:none;transition:transform .4s " + spring + "}",
      ".rbtn:active{transform:scale(.9)}",
      ".chips{display:flex;gap:6px;flex-wrap:wrap}",
      ".chip{height:26px;line-height:26px;padding:0 12px;border-radius:13px;background:rgba(0,0,0,.2);box-shadow:inset 0 1px 3px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.2);font-weight:600;font-size:11.5px;cursor:pointer;opacity:.7;transition:opacity .2s,transform .4s " + spring + "}",
      ".chip.on{opacity:1;background:linear-gradient(160deg,rgba(255,255,255,.42),rgba(255,255,255,.14));box-shadow:inset 0 1px 1px rgba(255,255,255,.7),0 2px 8px rgba(0,0,0,.2)}",
      ".chip:active{transform:scale(.92)}",
      ".thd{display:flex;justify-content:space-between;padding:0 12px;font-size:10.5px;font-weight:600;letter-spacing:.5px;opacity:.65}",
      ".tbl{position:relative;height:250px;overflow-y:auto;border-radius:20px;background:rgba(0,0,0,.2);box-shadow:inset 0 1px 3px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.2)}",
      ".tbl::-webkit-scrollbar{width:6px}.tbl::-webkit-scrollbar-thumb{background:rgba(255,255,255,.3);border-radius:3px}",
      ".spc{position:relative;width:100%}",
      ".vw{position:absolute;left:0;right:0;top:0}",
      ".tr{height:30px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 10px;border-bottom:1px solid rgba(255,255,255,.07)}",
      ".sw8{width:13px;height:13px;border-radius:4px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.3)}",
      ".nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:11px " + MONO + "}",
      ".nm i{font-style:normal;color:#000000;margin-left:7px;font-family:-apple-system,system-ui,sans-serif;font-size:10.5px}",
      ".tr input{width:112px;flex:none;box-sizing:border-box;background:rgba(255,255,255,.12);border:0;border-radius:9px;padding:4px 8px;color:#000;font:600 11.5px " + MONO + ";outline:none;text-align:right;box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}",
      ".tr input:focus{background:rgba(255,255,255,.26)}",
      ".tr input.ro{opacity:.55}",
      ".empty{padding:22px;text-align:center;opacity:.6;font-size:12px}"
    ].join("");
    const el = (tag, props, kids) => {
      const n = document.createElement(tag);
      if (props) Object.assign(n, props);
      (kids || []).forEach((k) => n.appendChild(k));
      return n;
    };

    // ---- SVG refraction filter (bends the background at the glass edges) ----
    const svgs = [];
    const mkSvg = () => {
      const d = document.createElement("div");
      d.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;pointer-events:none">' +
        '<defs><filter id="lgfilter" filterUnits="userSpaceOnUse" x="0" y="0" width="300" height="400" color-interpolation-filters="sRGB">' +
        '<feImage x="0" y="0" width="300" height="400" preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="36" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter></defs></svg>';
      const s = d.firstChild; svgs.push(s); return s;
    };
    const makeMap = (w, h, r, bezel) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d"), img = ctx.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const px = x + 0.5 - w / 2, py = y + 0.5 - h / 2;
          const qx = Math.abs(px) - (w / 2 - r), qy = Math.abs(py) - (h / 2 - r);
          const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
          const inside = Math.min(Math.max(qx, qy), 0);
          const dist = -(outside + inside - r);
          let dx = 0, dy = 0;
          if (dist >= 0 && dist < bezel) {
            const t = 1 - dist / bezel, mag = t * t;
            let nx, ny;
            if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); nx = Math.sign(px) * qx / l; ny = Math.sign(py) * qy / l; }
            else if (qx > qy) { nx = Math.sign(px); ny = 0; }
            else { nx = 0; ny = Math.sign(py); }
            dx = -nx * mag; dy = -ny * mag;
          }
          const i = (y * w + x) * 4;
          d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return c.toDataURL();
    };

    const minBtn = el("button", { className: "min", textContent: "–" });
    const dot = el("span", { className: "dot" });
    const head = el("div", { className: "h" }, [el("span", { textContent: "Mod Menu" }, [dot]), minBtn]);
    const status = el("div", { className: "status" });

    // ---- reusable number stepper ----
    const stepper = (init, min, max, wide, onSet) => {
      const input = el("input", { type: "number", min: min, max: max, step: 1, value: init });
      const minus = el("button", { textContent: "−" });
      const plus = el("button", { textContent: "+" });
      const wrap = el("div", { className: "step" + (wide ? " wide" : "") }, [minus, input, plus]);
      const set = (v, user) => {
        v = Math.floor(+v);
        if (!(v >= min)) v = min;
        if (v > max) v = max;
        input.value = v;
        onSet(v, user);
      };
      input.onchange = () => set(input.value, true);
      minus.onclick = () => set(+input.value - 1, true);
      plus.onclick = () => set(+input.value + 1, true);
      return { wrap, input, set };
    };

    // ===== TAB 1: fish spoofing =====
    const mult = stepper(1, 1, 100, false, (v, user) => {
      S.mult = v;
      if (user) status.textContent = "multiplier " + v + "x (new fish only)";
    });
    const multRow = el("div", { className: "card" }, [
      el("div", { className: "row" }, [
        el("div", { className: "lbl" }, [document.createTextNode("Fish spawn multiplier"), el("small", { textContent: "extra fish per spawn" })]),
        mult.wrap
      ])
    ]);

    const vmult = stepper(1, 1, 1000000, true, (v, user) => {
      S.vmult = v;
      if (user) {
        try { applyValue(); status.textContent = "fish value x" + v; }
        catch (e) { status.textContent = "value ERR: " + e; }
      }
    });
    const vmultRow = el("div", { className: "card" }, [
      el("div", { className: "row" }, [
        el("div", { className: "lbl" }, [document.createTextNode("Fish value multiplier"), el("small", { textContent: "price of every fish" })]),
        vmult.wrap
      ])
    ]);

    const mkSwitch = (extra) => el("div", { className: "sw" + (extra ? " " + extra : "") }, [el("i")]);
    const spoofSw = mkSwitch();
    const goldSw = mkSwitch("gold");
    const spoofRow = el("div", { className: "card" }, [
      el("div", { className: "row" }, [
        el("div", { className: "lbl" }, [document.createTextNode("Fish spawn spoof"), el("small", { textContent: "replace every spawn" })]),
        spoofSw
      ])
    ]);
    const grid = el("div", { className: "grid" });
    spoofRow.appendChild(grid);

    const goldRow = el("div", { className: "card" }, [
      el("div", { className: "row" }, [
        el("div", { className: "lbl" }, [document.createTextNode("All fish golden"), el("small", { textContent: "needs spoof ON" })]),
        goldSw
      ])
    ]);
    const page0 = el("div", { className: "pg" }, [multRow, vmultRow, spoofRow, goldRow]);

    // ===== TAB 2: levels =====
    const levelRows = {};
    const mkLevelRow = (k, title, max) => {
      const sub = el("small", { textContent: "" });
      const s = stepper(S.lvl[k], 1, max, true, (v, user) => {
        S.lvl[k] = v;
        sub.textContent = derived[k](v);
        if (user) { status.textContent = "applying " + title.toLowerCase() + " " + v + "..."; scheduleApply(); }
      });
      const card = el("div", { className: "card" }, [
        el("div", { className: "row" }, [
          el("div", { className: "lbl" }, [document.createTextNode(title), sub]),
          s.wrap
        ])
      ]);
      levelRows[k] = { card, input: s.input, set: s.set };
      return card;
    };
    const page1 = el("div", { className: "pg hide" }, [
      mkLevelRow("depth", "Max depth", 9999),
      mkLevelRow("fish", "Max fishes", 9999),
      mkLevelRow("income", "Offline earning", 1000)
    ]);

    // ===== TAB 3: advanced (EVERYTHING: numbers, text, colors, flags, objects) =====
    // Variables we decoded from the game code get a readable label and float to the top.
    const KNOWN = {
      "G._CG": "max depth level", "G._cF": "max depth", "G._BG": "max fishes level", "G._2F": "max fishes",
      "G._EG": "income level", "G._DG": "income $/min", "G._FG": "money", "G._lE": "px per meter",
      "G._KE": "min fish gap", "G._oF": "max fish gap", "G._dF": "fish types", "G._7F": "expected dive earnings"
    };
    const DERIVED = { "G._cF": 1, "G._2F": 1, "G._DG": 1 };
    const ROW = 30;
    const COLOR_KEY = /colou?r|blend|tint|^c_|bgcol|fgcol|shadow|glow/i;
    let allRows = [], rows = [], rendered = [];
    let kindFilter = "all";

    // "ds" = the game's data-structure storage (ds_maps live here: fish types, texts, settings...)
    const rootOf = (n) => (n === "G" ? G() : n === "ds" ? window._Bc1 : globalObj());
    const resolveRow = (r) => {
      let o = rootOf(r.root);
      for (let i = 0; i < r.keys.length - 1; i++) { o = o[r.keys[i]]; if (o == null) return null; }
      return [o, r.keys[r.keys.length - 1]];
    };
    const isLong = (o) => o && typeof o === "object" && "_Jc1" in o && "_8d1" in o;
    const readRow = (r) => {
      try {
        const p = resolveRow(r);
        if (!p) return undefined;
        const v = p[0][p[1]];
        if (r.type === "long") return isLong(v) ? v._8d1 * 4294967296 + (v._Jc1 >>> 0) : undefined;
        if (r.type === "object" || r.type === "array") {
          if (v == null || typeof v !== "object") return undefined;
          return Array.isArray(v) ? "[" + v.length + " items]" : "{" + Object.keys(v).length + " keys}";
        }
        return v;
      } catch (e) { return undefined; }
    };
    const swatchColor = (r, v) => {
      if (typeof v === "number") return "rgb(" + (v & 255) + "," + ((v >> 8) & 255) + "," + ((v >> 16) & 255) + ")"; // GameMaker colors are BGR
      if (typeof v === "string") return v;
      return "transparent";
    };

    const scanAll = () => {
      const out = [], seen = new WeakSet();
      let n = 0;
      const LIMIT = 150000;
      const add = (row) => { out.push(row); n++; };
      const walk = (o, rootName, keys, pathStr, depth) => {
        if (depth > 6 || n >= LIMIT) return;
        let ks; try { ks = Object.keys(o); } catch (e) { return; }
        const isArr = Array.isArray(o);
        if (isArr && ks.length > 500) ks = ks.slice(0, 500);
        for (const k of ks) {
          if (n >= LIMIT) break;
          let v; try { v = o[k]; } catch (e) { continue; }
          const p = isArr ? pathStr + "[" + k + "]" : pathStr + "." + k;
          const t = typeof v;
          const base = { root: rootName, keys: keys.concat(k), path: p, label: KNOWN[p] || "" };
          if (t === "number") {
            const isCol = COLOR_KEY.test(String(k)) && Number.isInteger(v) && v >= 0 && v <= 16777215;
            add(Object.assign(base, { type: "number", kind: isCol ? "color" : "num" }));
          } else if (t === "boolean") {
            add(Object.assign(base, { type: "boolean", kind: "other" }));
          } else if (t === "string") {
            const isCol = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v) || /^rgba?\(/i.test(v);
            add(Object.assign(base, { type: "string", kind: isCol ? "color" : "text" }));
          } else if (v === null || t === "undefined") {
            add(Object.assign(base, { type: "null", kind: "other" }));
          } else if (t === "object") {
            const tag = Object.prototype.toString.call(v);
            if ((tag === "[object Object]" || tag === "[object Array]") && !seen.has(v)) {
              seen.add(v);
              if (isLong(v)) {
                add(Object.assign(base, { type: "long", kind: "num" }));
              } else {
                add(Object.assign(base, { type: Array.isArray(v) ? "array" : "object", kind: "other" }));
                walk(v, rootName, keys.concat(k), p, depth + 1);
              }
            }
          }
        }
      };
      const roots = [["G", G()], ["ds", window._Bc1], ["global", globalObj()]];
      roots.forEach(([name, obj]) => {
        if (!obj || typeof obj !== "object") return;
        seen.add(obj);
        walk(obj, name, [], name, 0);
      });
      // decoded variables first
      const known = out.filter((r) => r.label), rest = out.filter((r) => !r.label);
      return known.concat(rest);
    };

    const searchIn = el("input", { type: "text", placeholder: "Search name, text or exact value..." });
    const rescanBtn = el("button", { className: "rbtn", textContent: "Rescan" });
    const chipDefs = [["all", "All"], ["text", "Text"], ["num", "Numbers"], ["color", "Colors"], ["other", "Other"]];
    const chipEls = chipDefs.map((d) => {
      const c = el("div", { className: "chip" + (d[0] === "all" ? " on" : ""), textContent: d[1] });
      c.onclick = () => {
        kindFilter = d[0];
        chipEls.forEach((x, i) => x.classList.toggle("on", chipDefs[i][0] === kindFilter));
        applyFilter();
      };
      return c;
    });
    const chips = el("div", { className: "chips" }, chipEls);
    const countLbl = el("div", { className: "thd" }, [el("span", { textContent: "VARIABLE" }), el("span", { textContent: "VALUE" })]);
    const scroller = el("div", { className: "tbl" });
    const spacer = el("div", { className: "spc" });
    const view = el("div", { className: "vw" });
    spacer.appendChild(view);
    scroller.appendChild(spacer);

    const commit = (r, input) => {
      if (r.type === "object" || r.type === "array") { const c = readRow(r); input.value = c === undefined ? "" : String(c); return; }
      const txt = input.value;
      let v;
      if (r.type === "number" || r.type === "long") {
        const s = txt.trim();
        if (/^#[0-9a-f]{6}$/i.test(s)) {
          v = parseInt(s.slice(1, 3), 16) | (parseInt(s.slice(3, 5), 16) << 8) | (parseInt(s.slice(5, 7), 16) << 16); // hex -> GameMaker BGR
        } else {
          v = Number(s);
          if (s === "" || !isFinite(v)) { const c = readRow(r); input.value = String(c); status.textContent = "not a number"; return; }
        }
      } else if (r.type === "boolean") {
        const s = txt.trim().toLowerCase();
        if (s === "true" || s === "1") v = true;
        else if (s === "false" || s === "0") v = false;
        else { input.value = String(readRow(r)); status.textContent = "use true / false"; return; }
      } else if (r.type === "null") {
        const s = txt.trim();
        if (s === "true") v = true;
        else if (s === "false") v = false;
        else if (s !== "" && isFinite(Number(s))) v = Number(s);
        else v = txt;
      } else v = txt;
      try {
        const p = resolveRow(r);
        if (r.type === "long") {
          const o = p[0][p[1]];
          const hi = Math.floor(v / 4294967296), lo = v - hi * 4294967296;
          o._Jc1 = lo | 0; o._8d1 = hi;
        } else p[0][p[1]] = v;
        input.value = String(v);
        status.textContent = "set " + r.path + " = " + v + (DERIVED[r.path] ? " (game recalcs this from the level)" : "");
      } catch (e) { status.textContent = "set ERR: " + e; }
    };

    const renderTable = () => {
      const top = scroller.scrollTop, vh = scroller.clientHeight || 250;
      const start = Math.max(0, Math.floor(top / ROW) - 4);
      const end = Math.min(rows.length, Math.ceil((top + vh) / ROW) + 4);
      spacer.style.height = rows.length * ROW + "px";
      view.style.transform = "translateY(" + start * ROW + "px)";
      view.innerHTML = "";
      rendered = [];
      if (!rows.length) { view.appendChild(el("div", { className: "empty", textContent: allRows.length ? "no matches" : "nothing scanned yet" })); return; }
      for (let i = start; i < end; i++) {
        const r = rows[i];
        const cur = readRow(r);
        const nm = el("div", { className: "nm", title: r.path + "  (" + r.type + ")" }, [document.createTextNode(r.path)]);
        if (r.label) nm.appendChild(el("i", { textContent: r.label }));
        const input = el("input", { type: "text", value: cur === undefined ? "" : String(cur), spellcheck: false });
        if (r.type === "object" || r.type === "array") { input.readOnly = true; input.className = "ro"; }
        else {
          input.onchange = () => commit(r, input);
          input.onkeydown = (e) => { if (e.key === "Enter") input.blur(); };
        }
        input.title = cur === undefined ? "" : String(cur);
        const kids = [];
        if (r.kind === "color") { const sw = el("span", { className: "sw8" }); sw.style.background = swatchColor(r, cur); kids.push(sw); }
        kids.push(nm, input);
        view.appendChild(el("div", { className: "tr" }, kids));
        rendered.push({ r, input });
      }
    };
    let rafPending = false;
    scroller.addEventListener("scroll", () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => { rafPending = false; renderTable(); });
    });

    const applyFilter = () => {
      const q = searchIn.value.trim().toLowerCase();
      rows = allRows.filter((r) => {
        if (kindFilter !== "all" && r.kind !== kindFilter) return false;
        if (!q) return true;
        if (r.path.toLowerCase().indexOf(q) >= 0 || (r.label && r.label.toLowerCase().indexOf(q) >= 0)) return true;
        const v = readRow(r);
        if (v === undefined || v === null) return false;
        const s = String(v).toLowerCase();
        return r.type === "string" ? s.indexOf(q) >= 0 : s === q;
      });
      scroller.scrollTop = 0;
      renderTable();
      status.textContent = rows.length + " of " + allRows.length + " variables";
    };
    let ft;
    searchIn.addEventListener("input", () => { clearTimeout(ft); ft = setTimeout(applyFilter, 200); });

    const doScan = () => {
      status.textContent = "scanning...";
      setTimeout(() => {
        try { allRows = scanAll(); applyFilter(); }
        catch (e) { status.textContent = "scan ERR: " + e; }
      }, 30);
    };
    rescanBtn.onclick = doScan;

    // live values for the rows you can see (skips the one you're typing in)
    setInterval(() => {
      if (S.tab !== 2 || body.classList.contains("hide")) return;
      rendered.forEach(({ r, input }) => {
        if (root.activeElement === input) return;
        const cur = readRow(r);
        const s = cur === undefined ? "" : String(cur);
        if (input.value !== s) input.value = s;
      });
    }, 800);

    const page2 = el("div", { className: "pg hide" }, [
      el("div", { className: "srch" }, [searchIn, rescanBtn]),
      chips,
      countLbl,
      scroller
    ]);

    // ===== tab bar =====
    const tabA = el("div", { className: "tab on", textContent: "Fish spoofing" });
    const tabB = el("div", { className: "tab", textContent: "Levels" });
    const tabC = el("div", { className: "tab", textContent: "Advanced" });
    const tabs = el("div", { className: "tabs" }, [el("div", { className: "ind" }), tabA, tabB, tabC]);
    let scanned = false;
    const setTab = (i) => {
      S.tab = i;
      tabs.classList.toggle("t1", i === 1);
      tabs.classList.toggle("t2", i === 2);
      [tabA, tabB, tabC].forEach((t, j) => t.classList.toggle("on", j === i));
      [page0, page1, page2].forEach((p, j) => p.classList.toggle("hide", j !== i));
      panel.classList.toggle("wide", i === 2);
      setTimeout(() => reclamp(true), 560); // keep the wider panel on screen
      if (i === 2) {
        if (!scanned) { scanned = true; doScan(); }
        else requestAnimationFrame(renderTable);
      }
    };
    tabA.onclick = () => setTab(0);
    tabB.onclick = () => setTab(1);
    tabC.onclick = () => setTab(2);

    const body = el("div", { className: "b" }, [tabs, page0, page1, page2, status]);
    const panel = el("div", { className: "p" }, [head, body]);
    root.appendChild(el("style", { textContent: css }));
    root.appendChild(mkSvg());
    root.appendChild(panel);
    document.body.appendChild(mkSvg());
    document.body.appendChild(host);

    // keep the glass refraction map matched to the panel size
    let lastW = 0, lastH = 0, tm;
    const updateMap = () => {
      const w = panel.offsetWidth, h = panel.offsetHeight;
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      let url; try { url = makeMap(w, h, 34, 28); } catch (e) { return; }
      svgs.forEach((s) => {
        const f = s.querySelector("filter"), im = s.querySelector("feImage");
        f.setAttribute("width", w); f.setAttribute("height", h);
        im.setAttribute("width", w); im.setAttribute("height", h);
        im.setAttribute("href", url);
        im.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
      });
    };
    updateMap();
    if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(updateMap, 90); }).observe(panel);

    // light follows the pointer
    panel.addEventListener("pointermove", (e) => {
      const r = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", (e.clientX - r.left) + "px");
      panel.style.setProperty("--my", (e.clientY - r.top) + "px");
    });

    // ---- position, edge clamping ----
    const bounds = () => ({
      maxL: Math.max(0, innerWidth - host.offsetWidth),
      maxT: Math.max(0, innerHeight - host.offsetHeight)
    });
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const reclamp = (animated) => {
      const b = bounds();
      const cl = clamp(host.offsetLeft, 0, b.maxL), ct = clamp(host.offsetTop, 0, b.maxT);
      if (cl === host.offsetLeft && ct === host.offsetTop) return;
      if (animated) {
        host.style.transition = "left .55s " + spring + ",top .55s " + spring;
        setTimeout(() => { host.style.transition = ""; }, 600);
      }
      host.style.left = cl + "px"; host.style.top = ct + "px";
    };
    if (saved.pos) { host.style.left = saved.pos.l + "px"; host.style.top = saved.pos.t + "px"; }
    if (saved.min) body.classList.add("hide");
    reclamp(false);
    addEventListener("resize", () => reclamp(false));

    // ---- drag with iOS-style edge warp ----
    // Near a screen edge the glass squashes against it and bulges sideways; pushing past the edge
    // rubber-bands, and letting go springs it back.
    const rubber = (o) => o === 0 ? 0 : Math.sign(o) * 36 * (1 - Math.exp(-Math.abs(o) / 80));
    const ZONE = 70;
    let dx = 0, dy = 0, drag = false, originTimer;
    head.addEventListener("pointerdown", (e) => {
      if (e.target === minBtn) return;
      drag = true;
      clearTimeout(originTimer);
      host.style.transition = "";
      dx = e.clientX - host.offsetLeft; dy = e.clientY - host.offsetTop;
      head.setPointerCapture(e.pointerId);
      panel.style.transition = "transform .15s ease-out, width .5s " + spring;
      panel.style.transform = "scale(1.03)";
    });
    head.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const w = host.offsetWidth, h = host.offsetHeight, b = bounds();
      const l = e.clientX - dx, t = e.clientY - dy;
      const ol = l < 0 ? l : l > b.maxL ? l - b.maxL : 0;
      const ot = t < 0 ? t : t > b.maxT ? t - b.maxT : 0;
      const vl = clamp(l, 0, b.maxL) + rubber(ol);
      const vt = clamp(t, 0, b.maxT) + rubber(ot);
      host.style.left = vl + "px"; host.style.top = vt + "px";

      // how hard we're pressing into each edge (0 = far away, >1 = pushed past it)
      const press = (dist) => Math.min(1.6, Math.max(0, (ZONE - dist) / ZONE));
      const pL = press(vl), pR = press(innerWidth - (vl + w));
      const pT = press(vt), pB = press(innerHeight - (vt + h));
      const px = Math.max(pL, pR), py = Math.max(pT, pB);
      const sx = (1 - 0.14 * px) * (1 + 0.05 * py);
      const sy = (1 - 0.14 * py) * (1 + 0.05 * px);
      const ex = pL >= pR ? 0 : w, ey = pT >= pB ? 0 : h;
      const ox = w / 2 + (ex - w / 2) * Math.min(1, px * 1.5);
      const oy = h / 2 + (ey - h / 2) * Math.min(1, py * 1.5);
      const tilt = clamp(-(e.movementX || 0) * 0.6, -8, 8);
      panel.style.transformOrigin = ox + "px " + oy + "px";
      panel.style.transform = "scale(" + (1.03 * sx) + "," + (1.03 * sy) + ") skewX(" + tilt + "deg)";
    });
    const endDrag = () => {
      if (!drag) return;
      drag = false;
      panel.style.transition = "";   // springy transition again
      panel.style.transform = "";
      // reclamp(true);
      originTimer = setTimeout(() => { if (!drag) panel.style.transformOrigin = ""; }, 700);
    };
    head.addEventListener("pointerup", endDrag);
    head.addEventListener("pointercancel", endDrag);
    minBtn.onclick = () => body.classList.toggle("hide");

    // ---- fish thumbnails cut from the game's texture atlas ----
    const drawThumb = (cv, i) => {
      try {
        const m = G()._eF[i];
        const sp = window._j11._44[_Ou(m, "sprite_index")];
        const f = sp._yK1[0], img = f._731;
        if (!img || !img.complete || !img.naturalWidth) return false;
        const W = cv.width, H = cv.height, s = Math.min(W / f._ac, H / f._bc);
        const dw = f._ac * s, dh = f._bc * s;
        const ctx = cv.getContext("2d");
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, f.x, f.y, f._ac, f._bc, (W - dw) / 2, (H - dh) / 2, dw, dh);
        return true;
      } catch (e) { return false; }
    };

    const BADGE = { 2: "#ff453a", 3: "#ffd60a", 4: "#8e8e93" };
    let lastCount = -1, retries = 0;
    const buildGrid = () => {
      try {
        const g = G();
        grid.innerHTML = "";
        const mk = (idx, content, title) => {
          const t = el("div", { className: "tile" + (S.pick === idx ? " sel" : ""), title: title });
          t.dataset.i = String(idx);
          content.forEach((c) => t.appendChild(c));
          t.onclick = () => {
            S.pick = idx;
            grid.querySelectorAll(".tile").forEach((x) => x.classList.toggle("sel", x.dataset.i === String(idx)));
            status.textContent = idx < 0 ? "spoofing: random fish" : "spoofing fish #" + idx;
          };
          grid.appendChild(t);
        };
        mk(-1, [el("b", { textContent: "?" }), el("em", { textContent: "" })], "Random (any fish)");

        let failed = 0;
        for (let i = 0; i < g._dF; i++) {
          const m = g._eF[i], type = _Ou(m, "type");
          const cv = el("canvas", { width: 96, height: 72 });
          const kids = [cv, el("span", { className: "idx", textContent: String(i) })];
          if (BADGE[type]) { const d = el("span", { className: "badge" }); d.style.background = BADGE[type]; kids.push(d); }
          mk(i, kids, "#" + i + "  type " + type + "  " + _Ou(m, "minDepth") + "-" + _Ou(m, "maxDepth") + "m");
          if (!drawThumb(cv, i)) { failed++; kids.splice(0, 1, el("b", { textContent: String(i) })); grid.lastChild.replaceChild(kids[0], cv); }
        }
        lastCount = g._dF;
        if (failed && retries < 6) { retries++; setTimeout(buildGrid, 1500); }
        else if (failed) status.textContent = failed + " fish images failed to load";
      } catch (e) { status.textContent = "list ERR: " + e; }
    };
    buildGrid();
    setInterval(() => { try { if (G()._dF !== lastCount) { retries = 0; buildGrid(); } } catch (e) {} }, 3000);

    // ---- state sync ----
    const sync = () => {
      spoofSw.classList.toggle("on", S.spoof);
      goldSw.classList.toggle("on", S.golden);
      goldRow.classList.toggle("dim", !S.spoof);
      grid.classList.toggle("dim", S.golden);
    };
    spoofSw.onclick = () => {
      S.spoof = !S.spoof;
      if (!S.spoof) S.golden = false;
      sync();
      status.textContent = S.spoof ? "spoof on - start a new dive" : "spoof off";
    };
    goldSw.onclick = () => {
      if (!S.spoof) { status.textContent = "turn Fish spawn spoof ON first"; return; }
      S.golden = !S.golden;
      sync();
      status.textContent = S.golden ? "golden on - random gold fish" : "golden off";
    };

    // keep the level boxes in step with the real game (e.g. after you buy an upgrade)
    const pullLevels = () => {
      if (pending !== null) return;
      try {
        const r = readLvl();
        ["depth", "fish", "income"].forEach((k) => {
          const row = levelRows[k];
          if (Number.isFinite(r[k]) && String(r[k]) !== row.input.value && root.activeElement !== row.input) row.set(r[k], false);
        });
      } catch (e) {}
    };
    pullLevels();
    setInterval(pullLevels, 1000);

    // load saved values into the controls
    mult.set(S.mult, false);
    vmult.set(S.vmult, false);
    ["depth", "fish", "income"].forEach((k) => levelRows[k].set(S.lvl[k], false));
    pullLevels();
    setTab(S.tab === 1 || S.tab === 2 ? S.tab : 0);
    sync();
    try { applyValue(); } catch (e) {}

    // ================= autosave every 2 seconds =================
    let lastJson = JSON.stringify(saved);
    setInterval(() => {
      try {
        const data = {
          mult: S.mult, vmult: S.vmult, spoof: S.spoof, golden: S.golden, pick: S.pick, jit: S.jit, tab: S.tab,
          pos: { l: host.offsetLeft, t: host.offsetTop },
          min: body.classList.contains("hide")
        };
        const json = JSON.stringify(data);
        if (json === lastJson) return;
        localStorage.setItem(KEY, json);
        lastJson = json;
        dot.classList.add("on");
        setTimeout(() => dot.classList.remove("on"), 350);
      } catch (e) {}
    }, 2000);

    console.log("fish GUI loaded. Console: __S.mult, __S.vmult, __S.spoof, __S.golden, __S.pick, __S.lvl");
  }
})();