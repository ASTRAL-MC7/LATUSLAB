/* Latuslab — interactions */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!G && !reduce;
  root.classList.add("js");
  if (G && ST) G.registerPlugin(ST);

  /* ================= i18n ================= */
  const DICT = window.I18N || {};
  const LANGS = ["uz", "ru", "en"];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  let lang = store.get("latuslab-lang");
  if (!LANGS.includes(lang)) {
    const nav = (navigator.language || "uz").slice(0, 2).toLowerCase();
    lang = nav === "ru" ? "ru" : nav === "en" ? "en" : "uz";
  }
  const t = (k) => (DICT[lang] && DICT[lang][k]) ?? (DICT.en && DICT.en[k]) ?? k;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (s) => esc(s).replace(/\*(.+?)\*/g, '<em class="hl">$1</em>');

  // split into masked words; highlight markers kept
  function split(el, text) {
    const parts = [];
    text.split(/(\*[^*]+\*)/).forEach((seg) => {
      if (!seg) return;
      const hl = seg.startsWith("*") && seg.endsWith("*");
      const clean = hl ? seg.slice(1, -1) : seg;
      clean.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) parts.push(" ");
        else parts.push(`<span class="w"><span class="wi${hl ? " hl" : ""}">${esc(w)}</span></span>`);
      });
    });
    el.innerHTML = parts.join("");
    el.setAttribute("aria-label", text.replace(/\*/g, ""));
  }

  function translate(scope = document) {
    $$("[data-i18n]", scope).forEach((el) => {
      const v = t(el.dataset.i18n);
      if (el.hasAttribute("data-split")) {
        split(el, v);
        if (motion && !el.classList.contains("revealed")) G.set($$(".wi", el), { yPercent: 115 });
      } else {
        el.innerHTML = fmt(v);
      }
    });
  }

  function setLangUI() {
    root.lang = lang;
    $$(".lang button").forEach((b, i) => {
      const on = b.dataset.lang === lang;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) { const pill = $(".lang-pill"); if (pill) pill.style.transform = `translateX(${i * 38}px)`; }
    });
    const vt = $("#viewerTitle");
    if (vt && vt.dataset.key) vt.textContent = t(vt.dataset.key);
  }

  translate();
  setLangUI();

  function changeLang(next) {
    if (next === lang || !LANGS.includes(next)) return;
    const apply = () => {
      lang = next;
      store.set("latuslab-lang", lang);
      translate();
      setLangUI();
      // headlines already revealed → show immediately
      $$("[data-split].revealed").forEach((el) => motion && G.set($$(".wi", el), { yPercent: 0 }));
      if (ST) ST.refresh();
    };
    if (!motion) return apply();
    const wipe = $("#wipe"), wipeO = $("#wipeO");
    G.timeline()
      .set([wipeO, wipe], { yPercent: 100, visibility: "visible" })
      .to(wipeO, { yPercent: 0, duration: 0.4, ease: "power3.in" })
      .to(wipe, { yPercent: 0, duration: 0.45, ease: "power3.in" }, "-=0.3")
      .set(wipeO, { yPercent: 100 })
      .from(".wipe-mark", { scale: 0, rotate: -90, duration: 0.35, ease: "back.out(2)" }, "-=0.15")
      .add(apply)
      .to(wipe, { yPercent: -100, duration: 0.55, ease: "power3.out", delay: 0.1 })
      .set([wipe, wipeO], { visibility: "hidden" })
      .add(() => {
        $$("[data-split].revealed").forEach((el) => {
          if (el.getBoundingClientRect().top < innerHeight) G.from($$(".wi", el), { yPercent: 115, duration: 0.7, stagger: 0.02, ease: "power4.out" });
        });
      }, "-=0.35");
  }
  $$(".lang button").forEach((b) => b.addEventListener("click", () => changeLang(b.dataset.lang)));

  /* ================= smooth scroll ================= */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", () => ST && ST.update());
    G.ticker.add((time) => lenis.raf(time * 1000));
    G.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { offset: -60, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ================= nav state ================= */
  const nav = $("#nav");
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-solid", y > 40);
    nav.classList.toggle("is-hidden", y > 400 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ================= odometers ================= */
  function buildOdo(el) {
    const val = String(el.dataset.value);
    const suf = el.dataset.suffix || "";
    el.innerHTML = "";
    el.setAttribute("aria-label", val + suf);
    [...val].forEach((d) => {
      const box = document.createElement("span");
      box.className = "odo-d";
      box.setAttribute("aria-hidden", "true");
      const strip = document.createElement("span");
      strip.className = "odo-strip";
      for (let i = 0; i < 20; i++) { const s = document.createElement("span"); s.textContent = i % 10; strip.appendChild(s); }
      strip.dataset.target = 10 + Number(d);
      box.appendChild(strip);
      el.appendChild(box);
    });
    if (suf) { const s = document.createElement("span"); s.className = "odo-suf"; s.textContent = suf; s.setAttribute("aria-hidden", "true"); el.appendChild(s); }
    const strips = $$(".odo-strip", el);
    if (!motion) { strips.forEach((s) => (s.style.transform = `translateY(-${s.dataset.target * 5}%)`)); return; }
    G.set(strips, { yPercent: 0 });
    ST.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: () => strips.forEach((s, i) => G.to(s, { yPercent: -s.dataset.target * 5, duration: 2.2 + i * 0.25, ease: "power4.out", delay: 0.1 + i * 0.08 }))
    });
  }
  $$(".odo").forEach(buildOdo);

  /* ================= cursor: glow ================= */
  if (finePointer && motion) {
    document.body.classList.add("has-cursor");
    const glow = $(".cursor-glow"), dot = $(".cursor-dot");
    const dx = G.quickTo(dot, "x", { duration: 0.12, ease: "power3" }), dy = G.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
    const gx = G.quickTo(glow, "x", { duration: 0.9, ease: "power3" }), gy = G.quickTo(glow, "y", { duration: 0.9, ease: "power3" });
    const gs = G.quickTo(glow, "scale", { duration: 0.6, ease: "power3" }), ds = G.quickTo(dot, "scale", { duration: 0.4, ease: "power3" });
    window.addEventListener("mousemove", (e) => { dx(e.clientX); dy(e.clientY); gx(e.clientX); gy(e.clientY); }, { passive: true });
    let state = "";
    document.addEventListener("mouseover", (e) => {
      const hot = e.target.closest("[data-cursor='open'], .btn-lime, .reel-frame");
      const link = !hot && e.target.closest("a, button");
      const next = hot ? "hot" : link ? "link" : "";
      if (next === state) return;
      state = next;
      glow.classList.toggle("is-hot", !!hot);
      dot.classList.toggle("is-hot", !!hot);
      gs(hot ? 1.5 : link ? 1.2 : 1);
      ds(hot ? 2.4 : link ? 1.8 : 1);
    });
    window.addEventListener("mousedown", () => ds(0.6));
    window.addEventListener("mouseup", () => ds(state === "hot" ? 2.4 : state === "link" ? 1.8 : 1));
    document.addEventListener("mouseleave", () => G.to([dot, glow], { opacity: 0, duration: 0.3 }));
    document.addEventListener("mouseenter", () => G.to([dot, glow], { opacity: 1, duration: 0.3 }));
  }

  /* ================= magnetic ================= */
  function magnetize(scope = document) {
    if (!finePointer || !motion) return;
    $$(".magnetic", scope).forEach((el) => {
      if (el._mag) return; el._mag = true;
      const inner = $(".btn-in", el) || el;
      const ex = G.quickTo(el, "x", { duration: 0.5, ease: "power3" }), ey = G.quickTo(el, "y", { duration: 0.5, ease: "power3" });
      const ix = G.quickTo(inner, "x", { duration: 0.5, ease: "power3" }), iy = G.quickTo(inner, "y", { duration: 0.5, ease: "power3" });
      let r = null;
      el.addEventListener("mouseenter", () => { r = el.getBoundingClientRect(); });
      el.addEventListener("mousemove", (e) => {
        if (!r) r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        ex(x * 0.3); ey(y * 0.4); ix(x * 0.12); iy(y * 0.15);
      });
      el.addEventListener("mouseleave", () => {
        r = null;
        G.to([el, inner], { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .35)", overwrite: true });
      });
    });
  }
  magnetize();

  /* ================= tilt cards ================= */
  if (finePointer && motion) {
    $$(".tilt").forEach((card) => {
      G.set(card, { transformPerspective: 1000 });
      const ry = G.quickTo(card, "rotateY", { duration: 0.6, ease: "power3" }), rx = G.quickTo(card, "rotateX", { duration: 0.6, ease: "power3" });
      let r = null;
      card.addEventListener("mouseenter", () => { r = card.getBoundingClientRect(); });
      card.addEventListener("mousemove", (e) => {
        if (!r) r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", nx * 100 + "%");
        card.style.setProperty("--my", ny * 100 + "%");
        ry((nx - 0.5) * 12); rx((0.5 - ny) * 10);
      });
      card.addEventListener("mouseleave", () => { r = null; G.to(card, { rotateY: 0, rotateX: 0, duration: 1, ease: "elastic.out(1, .4)", overwrite: true }); });
    });
    // project covers: inner papercut parallax
    $$(".proj").forEach((card) => {
      const cover = $(".proj-cover", card);
      const parts = $$(".cv-par", card).map((p) => ({ p, d: +p.dataset.pd, x: G.quickTo(p, "x", { duration: 0.8, ease: "power3" }), y: G.quickTo(p, "y", { duration: 0.8, ease: "power3" }) }));
      let r = null;
      card.addEventListener("mouseenter", () => { r = cover.getBoundingClientRect(); });
      card.addEventListener("mousemove", (e) => {
        if (!r) r = cover.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        parts.forEach((o) => { o.x(nx * 40 * o.d); o.y(ny * 26 * o.d); });
      });
      card.addEventListener("mouseleave", () => { r = null; G.to(parts.map((o) => o.p), { x: 0, y: 0, duration: 1.2, ease: "elastic.out(1, .4)", overwrite: true }); });
    });
  }

  /* ================= marquee slow on hover ================= */
  const mq = $(".marquee");
  if (mq) {
    const track = $(".marquee-track", mq);
    const setRate = (r) => { const a = track.getAnimations && track.getAnimations()[0]; if (a && a.updatePlaybackRate) a.updatePlaybackRate(r); };
    mq.addEventListener("mouseenter", () => setRate(0.25));
    mq.addEventListener("mouseleave", () => setRate(1));
  }

  /* ================= hero: parallax + scroll unfold ================= */
  const layers = $$("#scene .layer");
  if (motion) {
    if (finePointer) {
      const movers = layers.map((l) => {
        const lp = $(".lp", l), d = +l.dataset.depth;
        return { d, x: G.quickTo(lp, "x", { duration: 1, ease: "power3" }), y: G.quickTo(lp, "y", { duration: 1, ease: "power3" }) };
      });
      let heroOn = true;
      if (ST) ST.create({ trigger: "#hero", start: "top bottom", end: "bottom top", onToggle: (s) => { heroOn = s.isActive; } });
      window.addEventListener("mousemove", (e) => {
        if (!heroOn) return;
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        movers.forEach((m) => { m.x(-nx * m.d * 70); m.y(-ny * m.d * 34); });
      }, { passive: true });
    }
    // idle plane flight
    G.to(".plane-float", { y: -14, rotation: -3, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "45% 25%" });
    G.to(".trail", { strokeDashoffset: -60, duration: 2, ease: "none", repeat: -1 });
    G.fromTo(".bub", { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.6, stagger: 0.5, ease: "back.out(2)", repeat: -1, repeatDelay: 2.5, delay: 2.4 });
  }

  function heroScrollUnfold() {
    G.to(layers, {
      y: (i) => (+layers[i].dataset.depth) * 260,
      ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.6 }
    });
    G.to("#scene", { scale: 1.08, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.6 } });
    G.to(".hero-copy", { y: -90, opacity: 0.15, ease: "none", scrollTrigger: { trigger: "#hero", start: "20% top", end: "bottom top", scrub: 0.6 } });
  }

  function heroIntro() {
    const title = $(".hero-title");
    title.classList.add("revealed");
    const tl = G.timeline({ defaults: { ease: "power4.out" } });
    tl.fromTo($$(".wi", title), { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.045 }, 0)
      .from(".hero-eyebrow", { y: 20, opacity: 0, duration: 0.8 }, 0.1)
      .from(".hero-sub", { y: 24, opacity: 0, duration: 0.9 }, 0.45)
      .from(".hero-ctas .btn", { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.55)
      .from(layers.map((l) => $$(".lp > svg", l)), { yPercent: 40, opacity: 0, duration: 1.5, stagger: 0.09, ease: "expo.out" }, 0.05)
      .from(".plane-fly", { x: -500, y: 160, rotation: 25, opacity: 0, duration: 1.8, ease: "expo.out", transformOrigin: "45% 25%" }, 0.5)
      .from(".nav-row > *", { y: -24, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.2)
      .from(".scroll-hint", { opacity: 0, duration: 0.6 }, 1.2)
      .add(heroScrollUnfold);
  }

  /* ================= scroll reveals ================= */
  function setupReveals() {
    $$("[data-split]").forEach((el) => {
      if (el.classList.contains("hero-title")) return;
      ST.create({
        trigger: el, start: "top 86%", once: true,
        onEnter: () => {
          el.classList.add("revealed");
          G.fromTo($$(".wi", el), { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.035, ease: "power4.out" });
        }
      });
    });
    $$("[data-fade]").forEach((el) => {
      G.from(el, { y: 50, opacity: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    // marquee drift on scroll
    G.fromTo(".marquee", { xPercent: 4 }, { xPercent: -4, ease: "none", scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true } });

    // process: horizontal pin on desktop
    const mm = G.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const track = $("#processTrack");
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = G.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: "#process", start: "top top", end: () => "+=" + dist(), pin: ".process-pin", scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      G.to("#plDraw", { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: "#process", start: "top top", end: () => "+=" + dist(), scrub: 0.8, invalidateOnRefresh: true } });
      $$(".step").forEach((s) => {
        G.from(s, { y: 60, opacity: 0.2, rotate: 2, duration: 1, ease: "power3.out", scrollTrigger: { trigger: s, containerAnimation: tween, start: "left 85%", toggleActions: "play none none reverse" } });
      });
    });
    mm.add("(max-width: 899px)", () => {
      $$(".step").forEach((s) => G.from(s, { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: s, start: "top 88%", once: true } }));
    });

    // contact paper plane flies across
    G.timeline({ scrollTrigger: { trigger: ".contact", start: "top bottom", end: "bottom 40%", scrub: 1 } })
      .fromTo(".contact-plane", { x: 0, y: 120, rotation: 10 }, { x: () => innerWidth * 0.75, y: -40, rotation: -14, ease: "none" })
      .to(".contact-plane", { x: () => innerWidth * 1.35, y: 60, rotation: 8, ease: "none" });

    // services stagger float
    G.utils.toArray(".svc-ico").forEach((ico, i) => G.to(ico, { y: -8, duration: 2 + i * 0.3, ease: "sine.inOut", yoyo: true, repeat: -1 }));
  }

  /* ================= loader ================= */
  const loader = $("#loader");
  const num = $("#loaderNum");
  function finishLoad() {
    root.classList.add("loaded");
    if (loader) loader.remove();
  }
  if (!motion) {
    finishLoad();
  } else {
    // hide intro targets until loader leaves
    const counter = { v: 0 };
    let ready = false;
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    const minTime = new Promise((r) => setTimeout(r, 1300));
    Promise.race([Promise.all([fontsReady, minTime]), new Promise((r) => setTimeout(r, 3200))]).then(() => { ready = true; });

    G.set(".hero-title .wi", { yPercent: 115 });
    const countTween = G.to(counter, {
      v: 92, duration: 1.3, ease: "power2.out",
      onUpdate: () => { num.textContent = Math.round(counter.v); }
    });
    const waitReady = () => new Promise((res) => { const tick = () => (ready ? res() : setTimeout(tick, 60)); tick(); });
    countTween.then(waitReady).then(() => {
      G.timeline({ onComplete: finishLoad })
        .to(counter, { v: 100, duration: 0.3, ease: "none", onUpdate: () => { num.textContent = Math.round(counter.v); } })
        .to(".loader-inner", { y: -30, opacity: 0, duration: 0.5, ease: "power3.in" }, "+=0.1")
        .to(".sheet-3", { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.1")
        .to(".sheet-2", { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.78")
        .to(".sheet-1", { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.78")
        .add(heroIntro, "-=0.75");
    });
    setupReveals();
  }

  /* ================= project viewer ================= */
  const viewer = $("#viewer"), panel = $("#viewerPanel"), body = $("#viewerBody"), vTitle = $("#viewerTitle");
  let activeCard = null, isOpen = false, busy = false;
  const clipFrom = (r) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 22px)`;

  function openCase(card) {
    if (busy || isOpen) return;
    const tpl = $("#case-" + card.dataset.case);
    if (!tpl) return;
    busy = true; activeCard = card;
    body.innerHTML = "";
    body.appendChild(tpl.content.cloneNode(true));
    const c = $(".case", body);
    if (c.dataset.titleKey) { vTitle.dataset.key = c.dataset.titleKey; vTitle.textContent = t(c.dataset.titleKey); }
    else { delete vTitle.dataset.key; vTitle.textContent = c.dataset.title || ""; }
    translate(body);
    translate($(".viewer-bar"));
    magnetize(viewer);
    viewer.hidden = false;
    panel.scrollTop = 0;
    if (lenis) lenis.stop();
    document.body.style.overflow = "hidden";
    isOpen = true;
    const items = $$("[data-v]", body);
    if (!motion) { busy = false; mountReel(); $("#viewerClose").focus(); return; }
    const r = card.getBoundingClientRect();
    G.timeline({ onComplete: () => { busy = false; mountReel(); $("#viewerClose").focus(); } })
      .fromTo(panel, { clipPath: clipFrom(r) }, { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.95, ease: "expo.inOut" })
      .from(".viewer-bar > *", { y: -20, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power3.out" }, "-=0.25")
      .from(items, { y: 46, opacity: 0, duration: 0.9, stagger: 0.05, ease: "power3.out" }, "-=0.45")
      .from($$(".score-bar i", body), { scaleX: 0, duration: 1, stagger: 0.12, ease: "power4.out" }, "-=0.6");
  }

  // the reel runs its own animation loop, so it only exists while the case is open
  function mountReel() {
    const frame = $("[data-reel]", body);
    if (!frame || $("iframe", frame)) return;
    const f = document.createElement("iframe");
    f.src = frame.dataset.reel;
    f.title = "AFRON AI";
    f.loading = "eager";
    f.setAttribute("allow", "fullscreen; autoplay");
    f.setAttribute("allowfullscreen", "");
    frame.appendChild(f);
    const fs = $(".reel-fs", body);
    if (fs) fs.addEventListener("click", () => {
      const go = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (go) { try { const p = go.call(frame); if (p && p.catch) p.catch(() => window.open(frame.dataset.reel, "_blank")); } catch (e) { window.open(frame.dataset.reel, "_blank"); } }
      else window.open(frame.dataset.reel, "_blank");
    });
  }

  function closeCase() {
    if (busy || !isOpen) return;
    busy = true;
    const done = () => {
      viewer.hidden = true; body.innerHTML = ""; isOpen = false; busy = false;
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      if (activeCard) activeCard.focus({ preventScroll: true });
    };
    if (!motion) return done();
    const r = activeCard.getBoundingClientRect();
    G.timeline({ onComplete: () => { G.set(panel, { clearProps: "clipPath" }); done(); } })
      .to($$("[data-v]", body), { opacity: 0, y: -20, duration: 0.3, stagger: 0.01, ease: "power2.in" })
      .to(panel, { clipPath: clipFrom(r), duration: 0.8, ease: "expo.inOut" }, "-=0.1");
  }

  $$(".proj").forEach((card) => card.addEventListener("click", () => openCase(card)));
  $("#viewerClose").addEventListener("click", closeCase);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCase(); });

  // keep scroll triggers accurate after fonts load / resize
  if (ST) {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => ST.refresh());
  }
})();
