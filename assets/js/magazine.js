/* OUSSAMA MED · visionneuse du magazine (pages en images, doubles pages sur grand écran) */
(function () {
  "use strict";

  var dlg = document.getElementById("mag-viewer");
  if (!dlg || typeof dlg.showModal !== "function") return;

  var TOTAL = Number(dlg.dataset.pages) || 93;
  var BASE = "assets/magazine/";
  var stage = dlg.querySelector(".mv-stage");
  var spreadEl = dlg.querySelector(".mv-spread");
  var count = dlg.querySelector(".mv-count");
  var thumbs = dlg.querySelector(".mv-thumbs");
  var chapters = dlg.querySelector(".mv-chapters");
  var zoomBtn = dlg.querySelector(".mv-zoom");
  var prevBtn = dlg.querySelector(".mv-nav.prev");
  var nextBtn = dlg.querySelector(".mv-nav.next");
  var current = 1;
  var thumbsBuilt = false;

  function pad(n) { return ("00" + n).slice(-3); }
  function pageSrc(n) { return BASE + "pages/p" + pad(n) + ".webp"; }

  /* Two-page spreads on wide screens, as printed: cover, page 2, then (3,4) … (91,92), back cover */
  function isWide() { return window.innerWidth >= 900 && window.innerWidth > window.innerHeight * 1.05; }
  function spreadOf(n) {
    if (!isWide() || n <= 2 || n >= TOTAL) return [n];
    var first = n % 2 === 1 ? n : n - 1;
    return first + 1 <= TOTAL - 1 ? [first, first + 1] : [first];
  }

  function render() {
    var pages = spreadOf(current);
    current = pages[0];
    spreadEl.innerHTML = "";
    spreadEl.classList.toggle("is-double", pages.length === 2);
    pages.forEach(function (n) {
      var img = new Image();
      img.src = pageSrc(n);
      img.alt = "Page " + n + " du magazine";
      img.width = 1132; img.height = 1600;
      img.decoding = "async";
      spreadEl.appendChild(img);
    });
    count.textContent = (pages.length === 2 ? pages[0] + "–" + pages[1] : pages[0]) + " / " + TOTAL;
    prevBtn.disabled = pages[0] <= 1;
    nextBtn.disabled = pages[pages.length - 1] >= TOTAL;

    /* preload the neighbours */
    [pages[pages.length - 1] + 1, pages[pages.length - 1] + 2, pages[0] - 1, pages[0] - 2].forEach(function (n) {
      if (n >= 1 && n <= TOTAL) { var p = new Image(); p.src = pageSrc(n); }
    });

    if (thumbsBuilt) {
      thumbs.querySelectorAll("button").forEach(function (b) {
        var on = pages.indexOf(Number(b.dataset.page)) !== -1;
        b.setAttribute("aria-current", on ? "true" : "false");
        if (on && pages.indexOf(Number(b.dataset.page)) === 0) b.scrollIntoView({ block: "nearest", inline: "center" });
      });
    }
    var opt = Array.prototype.slice.call(chapters.options).filter(function (o) { return Number(o.value) <= pages[0]; }).pop();
    if (opt) chapters.value = opt.value;
    if (history.replaceState) history.replaceState(null, "", "#magazine-p" + pages[0]);
  }

  function go(n) {
    current = Math.min(TOTAL, Math.max(1, n));
    setZoom(false);
    render();
  }
  function next() { var p = spreadOf(current); go(p[p.length - 1] + 1); }
  function prev() { go(spreadOf(current)[0] - 1); }

  function buildThumbs() {
    if (thumbsBuilt) return;
    var frag = document.createDocumentFragment();
    for (var n = 1; n <= TOTAL; n++) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.page = n;
      b.setAttribute("aria-label", "Aller à la page " + n);
      b.innerHTML = '<img src="' + BASE + "thumbs/t" + pad(n) + '.webp" alt="" loading="lazy" width="142" height="200"><span>' + n + "</span>";
      frag.appendChild(b);
    }
    thumbs.appendChild(frag);
    thumbs.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) go(Number(b.dataset.page));
    });
    thumbsBuilt = true;
  }

  function setZoom(on) {
    stage.classList.toggle("is-zoomed", on);
    zoomBtn.setAttribute("aria-pressed", String(on));
    zoomBtn.setAttribute("aria-label", on ? "Réduire" : "Agrandir");
    if (on) stage.scrollTop = 0;
  }

  function open(n) {
    buildThumbs();
    document.documentElement.style.overflow = "hidden";
    dlg.showModal();
    go(n || 1);
  }

  /* cleanup runs directly (not only on the "close" event, which some browsers deliver late) */
  function cleanup() {
    document.documentElement.style.overflow = "";
    setZoom(false);
    if (history.replaceState && /^#magazine-p/.test(location.hash)) history.replaceState(null, "", "#magazine");
  }
  function closeViewer() {
    if (dlg.open) dlg.close();
    cleanup();
  }
  dlg.addEventListener("close", cleanup);
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeViewer(); });

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  zoomBtn.addEventListener("click", function () { setZoom(!stage.classList.contains("is-zoomed")); });
  dlg.querySelector(".mv-close").addEventListener("click", closeViewer);
  chapters.addEventListener("change", function () { go(Number(chapters.value)); });
  spreadEl.addEventListener("dblclick", function () { setZoom(!stage.classList.contains("is-zoomed")); });

  dlg.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); closeViewer(); return; }
    if (e.target === chapters) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); go(1); }
    else if (e.key === "End") { e.preventDefault(); go(TOTAL); }
  });

  /* swipe on touch screens (ignored while zoomed, so the page can be panned) */
  var x0 = null, y0 = null;
  stage.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (x0 === null || stage.classList.contains("is-zoomed")) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { dx < 0 ? next() : prev(); }
    x0 = null;
  });

  var lastWide = isWide();
  window.addEventListener("resize", function () {
    if (dlg.open && isWide() !== lastWide) { lastWide = isWide(); render(); }
  });

  document.querySelectorAll("[data-mag-open]").forEach(function (el) {
    el.addEventListener("click", function () { open(Number(el.dataset.magOpen)); });
  });

  /* deep link: …/#magazine-p28 opens the viewer on page 28 */
  var m = /^#magazine-p(\d+)$/.exec(location.hash);
  if (m) open(Number(m[1]));
})();
