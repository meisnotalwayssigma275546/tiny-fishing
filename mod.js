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
    const KEY = "fishmod_v3";
    const loadSaved = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const saved = loadSaved();

    const S = (window.__S = {
      mult: 1, spoof: false, golden: false, pick: -1, jit: 1, tab: 0,
      lvl: { depth: 1, fish: 1, income: 1 } // mirrors the real game levels (the game saves these itself)
    });
    ["mult", "spoof", "golden", "pick", "jit", "tab"].forEach((k) => { if (saved[k] !== undefined) S[k] = saved[k]; });

    const G = () => _zp(null, null, global._Dw);

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
    const css = [
      // ---- liquid glass panel ----
      ".p{position:relative;width:300px;color:#fff;font:13px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;border-radius:34px;",
      "background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04));",
      "-webkit-backdrop-filter:blur(14px) saturate(190%) brightness(1.08);",
      "backdrop-filter:blur(14px) saturate(190%) brightness(1.08);",
      "backdrop-filter:url(#lgfilter) blur(6px) saturate(190%) brightness(1.08);",
      "box-shadow:0 18px 50px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.2),inset 0 0 0 1px rgba(255,255,255,.1),inset 0 1px 1px rgba(255,255,255,.55),inset 0 -10px 22px rgba(255,255,255,.07);",
      "transition:transform .6s " + spring + ";user-select:none;overflow:hidden;will-change:transform}",
      ".p::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;z-index:3;",
      "background:linear-gradient(140deg,rgba(255,255,255,.95),rgba(255,255,255,.08) 28%,rgba(255,255,255,.04) 62%,rgba(255,255,255,.7));",
      "-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}",
      ".p::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;",
      "background:radial-gradient(230px circle at var(--mx,30%) var(--my,0%),rgba(255,255,255,.26),rgba(255,255,255,0) 62%)}",
      ".h,.b{position:relative;z-index:1}",
      ".h{padding:15px 18px 9px;display:flex;justify-content:space-between;align-items:center;cursor:grab;touch-action:none;font-weight:700;font-size:15px;letter-spacing:.2px;text-shadow:0 1px 6px rgba(0,0,0,.3)}",
      ".dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34c759;margin-left:8px;opacity:0;transition:opacity .6s;vertical-align:middle;box-shadow:0 0 8px #34c759}",
      ".dot.on{opacity:1;transition:none}",
      ".min{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:linear-gradient(160deg,rgba(255,255,255,.35),rgba(255,255,255,.1));box-shadow:inset 0 1px 1px rgba(255,255,255,.6);color:#fff;font-size:15px;line-height:24px;text-align:center;cursor:pointer;padding:0;transition:transform .4s " + spring + "}",
      ".b{padding:2px 14px 16px;display:flex;flex-direction:column;gap:10px}",
      ".b.hide{display:none}",
      // ---- tabs ----
      ".tabs{position:relative;display:flex;padding:3px;border-radius:18px;background:rgba(0,0,0,.22);box-shadow:inset 0 1px 3px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.2)}",
      ".tab{flex:1;text-align:center;padding:8px 0;font-weight:600;font-size:12.5px;cursor:pointer;position:relative;z-index:1;opacity:.7;transition:opacity .25s,transform .4s " + spring + "}",
      ".tab.on{opacity:1}",
      ".tab:active{transform:scale(.94)}",
      ".ind{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:15px;background:linear-gradient(160deg,rgba(255,255,255,.42),rgba(255,255,255,.14));box-shadow:inset 0 1px 1px rgba(255,255,255,.7),0 2px 8px rgba(0,0,0,.2);transition:transform .55s " + spring + "}",
      ".tabs.t1 .ind{transform:translateX(100%)}",
      ".pg{display:flex;flex-direction:column;gap:10px;animation:pgin .45s " + spring + "}",
      ".pg.hide{display:none}",
      "@keyframes pgin{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}",
      // ---- cards & controls ----
      ".card{background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06));border-radius:24px;padding:11px 13px;box-shadow:inset 0 1px 1px rgba(255,255,255,.5),inset 0 0 0 1px rgba(255,255,255,.12),0 4px 14px rgba(0,0,0,.12)}",
      ".row{display:flex;align-items:center;justify-content:space-between;gap:10px}",
      ".lbl{font-weight:600}",
      ".lbl small{display:block;opacity:.7;font-size:11px;font-weight:400;margin-top:1px}",
      ".step{display:flex;align-items:center;gap:2px;background:rgba(0,0,0,.22);border-radius:16px;padding:3px;box-shadow:inset 0 1px 3px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.2)}",
      ".step button{width:28px;height:28px;border:0;border-radius:13px;background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(255,255,255,.12));box-shadow:inset 0 1px 1px rgba(255,255,255,.6);color:#fff;font-size:17px;line-height:26px;cursor:pointer;padding:0;transition:transform .4s " + spring + "}",
      ".step input{width:44px;text-align:center;background:transparent;border:0;color:#fff;font:700 14px -apple-system,system-ui,sans-serif;outline:none;-moz-appearance:textfield;padding:0}",
      ".step.wide input{width:58px}",
      ".step input::-webkit-inner-spin-button,.step input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}",
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
      ".status{font:11px ui-monospace,Menlo,monospace;opacity:.85;min-height:13px;padding:0 6px;text-shadow:0 1px 4px rgba(0,0,0,.3)}"
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
    const head = el("div", { className: "h" }, [el("span", { textContent: "Fish Spawn" }, [dot]), minBtn]);
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
    const page0 = el("div", { className: "pg" }, [multRow, spoofRow, goldRow]);

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

    // ===== tab bar =====
    const tabA = el("div", { className: "tab on", textContent: "Fish spoofing" });
    const tabB = el("div", { className: "tab", textContent: "Levels" });
    const tabs = el("div", { className: "tabs" }, [el("div", { className: "ind" }), tabA, tabB]);
    const setTab = (i) => {
      S.tab = i;
      tabs.classList.toggle("t1", i === 1);
      tabA.classList.toggle("on", i === 0);
      tabB.classList.toggle("on", i === 1);
      page0.classList.toggle("hide", i !== 0);
      page1.classList.toggle("hide", i !== 1);
    };
    tabA.onclick = () => setTab(0);
    tabB.onclick = () => setTab(1);

    const body = el("div", { className: "b" }, [tabs, page0, page1, status]);
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
    if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(updateMap, 60); }).observe(panel);

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
    if (saved.pos) { host.style.left = saved.pos.l + "px"; host.style.top = saved.pos.t + "px"; }
    if (saved.min) body.classList.add("hide");
    {
      const b = bounds();
      host.style.left = clamp(host.offsetLeft, 0, b.maxL) + "px";
      host.style.top = clamp(host.offsetTop, 0, b.maxT) + "px";
    }
    addEventListener("resize", () => {
      const b = bounds();
      host.style.left = clamp(host.offsetLeft, 0, b.maxL) + "px";
      host.style.top = clamp(host.offsetTop, 0, b.maxT) + "px";
    });

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
      panel.style.transition = "transform .15s ease-out";
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
      const b = bounds();
      const cl = clamp(host.offsetLeft, 0, b.maxL), ct = clamp(host.offsetTop, 0, b.maxT);
      if (cl !== host.offsetLeft || ct !== host.offsetTop) {
        host.style.transition = "left .55s " + spring + ",top .55s " + spring;
        host.style.left = cl + "px"; host.style.top = ct + "px";
        setTimeout(() => { host.style.transition = ""; }, 600);
      }
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
    ["depth", "fish", "income"].forEach((k) => levelRows[k].set(S.lvl[k], false));
    pullLevels();
    setTab(S.tab === 1 ? 1 : 0);
    sync();

    // ================= autosave every 2 seconds =================
    let lastJson = JSON.stringify(saved);
    setInterval(() => {
      try {
        const data = {
          mult: S.mult, spoof: S.spoof, golden: S.golden, pick: S.pick, jit: S.jit, tab: S.tab,
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

    console.log("fish GUI loaded. Console: __S.mult, __S.spoof, __S.golden, __S.pick, __S.lvl");
  }
})();