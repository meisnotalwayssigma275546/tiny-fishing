(function () {
  if (window.__fishGui) return console.log("GUI already loaded - refresh the page to reload");
  if (window.__goldSwarm || window.__origE9 || window.__swarmOn) return console.log("old patches are active - refresh the page first");
  if (typeof window._E9 !== "function" || typeof window._zp !== "function") return console.log("game functions not found in this frame");
  window.__fishGui = true;

  const S = (window.__S = { mult: 1, spoof: false, golden: false, pick: -1, jit: 1 });
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

  let busy = false;
  ["_w9", "_D9"].forEach((k) => {
    const orig = window[k];
    if (typeof orig !== "function") return console.log("missing " + k);
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

  // ================= UI =================
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:50px;left:12px;z-index:2147483647;";
  ["mousedown","mouseup","mousemove","click","dblclick","touchstart","touchmove","touchend","touchcancel",
   "pointerdown","pointermove","pointerup","pointercancel","wheel","contextmenu","keydown","keyup","keypress","input","change"]
    .forEach((ev) => host.addEventListener(ev, (e) => e.stopPropagation()));
  const root = host.attachShadow({ mode: "open" });

  const css = [
    ".p{width:300px;color:#fff;font:13px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;border-radius:26px;",
    "background:linear-gradient(135deg,rgba(255,255,255,.24),rgba(255,255,255,.08));",
    "backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);",
    "border:1px solid rgba(255,255,255,.38);",
    "box-shadow:0 14px 44px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -1px 0 rgba(255,255,255,.12);",
    "user-select:none;overflow:hidden}",
    ".h{padding:13px 16px 9px;display:flex;justify-content:space-between;align-items:center;cursor:grab;touch-action:none;font-weight:700;font-size:15px;letter-spacing:.2px;text-shadow:0 1px 6px rgba(0,0,0,.3)}",
    ".min{width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.18);color:#fff;font-size:15px;line-height:22px;text-align:center;cursor:pointer;padding:0}",
    ".b{padding:4px 14px 14px;display:flex;flex-direction:column;gap:10px}",
    ".b.hide{display:none}",
    ".card{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.24);border-radius:18px;padding:10px 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.32)}",
    ".row{display:flex;align-items:center;justify-content:space-between;gap:10px}",
    ".lbl{font-weight:600}",
    ".lbl small{display:block;opacity:.65;font-size:11px;font-weight:400;margin-top:1px}",
    ".step{display:flex;align-items:center;gap:2px;background:rgba(0,0,0,.24);border-radius:14px;padding:3px}",
    ".step button{width:28px;height:28px;border:0;border-radius:11px;background:rgba(255,255,255,.2);color:#fff;font-size:17px;line-height:26px;cursor:pointer;padding:0}",
    ".step input{width:44px;text-align:center;background:transparent;border:0;color:#fff;font:700 14px -apple-system,system-ui,sans-serif;outline:none;-moz-appearance:textfield;padding:0}",
    ".step input::-webkit-inner-spin-button,.step input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}",
    ".sw{width:48px;height:29px;border-radius:15px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.28);position:relative;cursor:pointer;transition:background .2s;flex:none}",
    ".sw i{position:absolute;top:2px;left:2px;width:23px;height:23px;border-radius:50%;background:#fff;box-shadow:0 2px 7px rgba(0,0,0,.4);transition:transform .2s}",
    ".sw.on{background:rgba(52,199,89,.88)}",
    ".sw.gold.on{background:rgba(255,196,0,.92)}",
    ".sw.on i{transform:translateX(19px)}",
    ".dim{opacity:.4;pointer-events:none}",
    ".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:216px;overflow-y:auto;padding:3px;margin-top:8px}",
    ".grid::-webkit-scrollbar{width:6px}.grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.3);border-radius:3px}",
    ".tile{position:relative;height:54px;border-radius:15px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.24);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .12s,box-shadow .12s;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}",
    ".tile:hover{transform:scale(1.07)}",
    ".tile.sel{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.95),0 0 18px rgba(120,200,255,.75)}",
    ".tile canvas{width:48px;height:36px;pointer-events:none}",
    ".tile b{font-size:20px;opacity:.9;pointer-events:none}",
    ".tile em{font-style:normal;font-size:10px;opacity:.75;pointer-events:none}",
    ".badge{position:absolute;top:5px;right:6px;width:7px;height:7px;border-radius:50%;pointer-events:none}",
    ".idx{position:absolute;bottom:2px;left:6px;font-size:9px;opacity:.55;pointer-events:none}",
    ".status{font:11px ui-monospace,Menlo,monospace;opacity:.85;min-height:13px;padding:0 4px;text-shadow:0 1px 4px rgba(0,0,0,.3)}"
  ].join("");

  const el = (tag, props, kids) => {
    const n = document.createElement(tag);
    if (props) Object.assign(n, props);
    (kids || []).forEach((k) => n.appendChild(k));
    return n;
  };

  const minBtn = el("button", { className: "min", textContent: "–" });
  const head = el("div", { className: "h" }, [el("span", { textContent: "Fish Spawn" }), minBtn]);

  // multiplier row
  const multIn = el("input", { type: "number", min: 1, max: 100, step: 1, value: 1 });
  const minus = el("button", { textContent: "−" });
  const plus = el("button", { textContent: "+" });
  const multRow = el("div", { className: "card" }, [
    el("div", { className: "row" }, [
      el("div", { className: "lbl" }, [document.createTextNode("Fish spawn multiplier"), el("small", { textContent: "extra fish per spawn" })]),
      el("div", { className: "step" }, [minus, multIn, plus])
    ])
  ]);

  // switches
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

  const status = el("div", { className: "status" });
  const body = el("div", { className: "b" }, [multRow, spoofRow, goldRow, status]);
  const panel = el("div", { className: "p" }, [head, body]);
  root.appendChild(el("style", { textContent: css }));
  root.appendChild(panel);
  document.body.appendChild(host);

  // drag
  let dx = 0, dy = 0, drag = false;
  head.addEventListener("pointerdown", (e) => {
    if (e.target === minBtn) return;
    drag = true; dx = e.clientX - host.offsetLeft; dy = e.clientY - host.offsetTop; head.setPointerCapture(e.pointerId);
  });
  head.addEventListener("pointermove", (e) => {
    if (!drag) return;
    host.style.left = Math.max(0, e.clientX - dx) + "px";
    host.style.top = Math.max(0, e.clientY - dy) + "px";
  });
  head.addEventListener("pointerup", () => { drag = false; });
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
  const setMult = (v) => {
    v = Math.floor(+v);
    if (!(v >= 1)) v = 1;
    if (v > 100) v = 100;
    S.mult = v; multIn.value = v;
    status.textContent = "multiplier " + v + "x (new fish only)";
  };
  multIn.onchange = () => setMult(multIn.value);
  minus.onclick = () => setMult(S.mult - 1);
  plus.onclick = () => setMult(S.mult + 1);
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

  sync();
  console.log("fish GUI loaded. Console: __S.mult, __S.spoof, __S.golden, __S.pick");
})();