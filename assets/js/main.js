/* OUSSAMA MED Civil Engineering · interactions */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");

  /* Header: solid background once the hero is scrolled past */
  function onScroll() {
    header.classList.toggle("is-solid", window.scrollY > 40);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu */
  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }
  toggle.addEventListener("click", function () {
    setMenu(!document.body.classList.contains("nav-open"));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("nav-open")) setMenu(false);
  });

  /* Active section in the nav */
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });

    /* Reveal on scroll */
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          reveal.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) { reveal.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Dialog helpers (click on backdrop or ✕, or Escape, closes).
     Cleanup runs directly: some browsers deliver the "close" event late. */
  function closeDialog(dlg) {
    if (dlg.open) dlg.close();
    document.documentElement.style.overflow = "";
  }
  function wireDialog(dlg) {
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest(".pd-close")) closeDialog(dlg);
    });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeDialog(dlg); });
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); closeDialog(dlg); } });
    dlg.addEventListener("close", function () { document.documentElement.style.overflow = ""; });
  }
  function openDialog(dlg) {
    if (typeof dlg.showModal !== "function") return false;
    document.documentElement.style.overflow = "hidden";
    dlg.showModal();
    return true;
  }

  var ICON = function (id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; };

  /* Project dialogs with image gallery */
  function buildGallery(container) {
    if (container.dataset.ready) return container._api;
    var items = JSON.parse(container.dataset.gallery);
    var stage = document.createElement("figure");
    stage.className = "pd-stage";
    stage.innerHTML = '<img alt=""><figcaption></figcaption>';
    container.appendChild(stage);
    var img = stage.querySelector("img");
    var cap = stage.querySelector("figcaption");
    var thumbs = null;
    var i = 0;

    function show(n) {
      i = (n + items.length) % items.length;
      img.src = "assets/img/" + items[i][0] + ".webp";
      img.alt = items[i][1];
      cap.textContent = items[i][1] + (items.length > 1 ? "  ·  " + (i + 1) + " / " + items.length : "");
      if (thumbs) {
        thumbs.querySelectorAll("button").forEach(function (b, k) {
          b.setAttribute("aria-current", String(k === i));
        });
      }
    }

    if (items.length > 1) {
      ["prev", "next"].forEach(function (dir) {
        var b = document.createElement("button");
        b.className = "pd-nav " + dir;
        b.type = "button";
        b.setAttribute("aria-label", dir === "prev" ? "Image précédente" : "Image suivante");
        b.innerHTML = ICON(dir === "prev" ? "i-left" : "i-right");
        b.addEventListener("click", function () { show(i + (dir === "prev" ? -1 : 1)); });
        stage.appendChild(b);
      });
      thumbs = document.createElement("div");
      thumbs.className = "pd-thumbs";
      items.forEach(function (it, k) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", it[1]);
        b.innerHTML = '<img src="assets/img/' + it[0] + '.webp" alt="" loading="lazy">';
        b.addEventListener("click", function () { show(k); });
        thumbs.appendChild(b);
      });
      container.appendChild(thumbs);
    }
    show(0);
    container.dataset.ready = "1";
    container._api = { show: show, get index() { return i; }, count: items.length };
    return container._api;
  }

  document.querySelectorAll("dialog.project-dialog").forEach(function (dlg) {
    wireDialog(dlg);
    dlg.addEventListener("keydown", function (e) {
      var g = dlg.querySelector(".pd-gallery")._api;
      if (!g || g.count < 2) return;
      if (e.key === "ArrowLeft") g.show(g.index - 1);
      if (e.key === "ArrowRight") g.show(g.index + 1);
    });
  });

  document.querySelectorAll("[data-project]").forEach(function (card) {
    card.addEventListener("click", function () {
      var dlg = document.getElementById("dlg-" + card.dataset.project);
      if (!dlg) return;
      buildGallery(dlg.querySelector(".pd-gallery"));
      if (openDialog(dlg)) dlg.querySelector(".pd-body").scrollTop = 0;
    });
  });

  /* Lightbox for awards */
  var lb = document.getElementById("lightbox");
  if (lb) {
    wireDialog(lb);
    document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var im = lb.querySelector("img");
        im.src = "assets/img/" + btn.dataset.lightbox + ".webp";
        im.alt = btn.querySelector("img").alt;
        lb.querySelector("p").textContent = btn.dataset.caption || "";
        openDialog(lb);
      });
    });
  }

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
