(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Header: transparant → solide, mobiel menu */
  var header = $(".site-header");
  var burger = $(".burger");
  function onScroll() { header.classList.toggle("solid", window.scrollY > 30); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  burger.addEventListener("click", function () {
    var open = header.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  $$(".menu a").forEach(function (a) { a.addEventListener("click", function () { header.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }); });

  /* Reveal bij scrollen */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  $$(".reveal").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });

  /* Programma */
  var MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  var SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  var DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function label(ev) {
    var d = parse(ev.date), t = d.getDate() + " " + MONTHS[d.getMonth()];
    if (ev.end) { var e = parse(ev.end); t = d.getDate() + "-" + e.getDate() + " " + MONTHS[e.getMonth()]; }
    return t;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var events = (window.PROGRAMMA || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var nextIdx = events.findIndex(function (e) { return parse(e.end || e.date) >= today; });

  var cards = $("[data-events]");
  if (cards) {
    var limit = +cards.getAttribute("data-events") || events.length;
    var start = nextIdx < 0 ? 0 : nextIdx;
    var list = limit < events.length ? events.slice(start, start + limit) : events;
    cards.innerHTML = list.map(function (ev, i) {
      var idx = events.indexOf(ev);
      var past = nextIdx >= 0 ? idx < nextIdx : false;
      return '<article class="event reveal' + (past ? " past" : "") + '">' +
        '<img src="assets/img/' + esc(ev.img) + '" alt="' + esc(ev.title) + '" loading="lazy"' + (ev.pos ? ' style="--pos:' + esc(ev.pos) + '"' : "") + '>' +
        (idx === nextIdx ? '<span class="badge-next">Eerstvolgende</span>' : "") +
        '<div class="info"><span class="date">' + esc(label(ev)) + "</span>" +
        "<h3>" + esc(ev.title) + "</h3>" + '<div class="loc"' + (ev.place ? "" : ' aria-hidden="true"') + ">" + (ev.place ? esc(ev.place) : "&nbsp;") + "</div>" + "</div></article>";
    }).join("");
    $$(".reveal", cards).forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });
  }

  var cal = $("[data-calendar]");
  if (cal) {
    cal.innerHTML = events.map(function (ev, i) {
      var d = parse(ev.date);
      var day = ev.day || (ev.end ? "" : DAYS[d.getDay()]);
      var meta = [ev.end ? "Twee dagen" : day, ev.place].filter(Boolean).join(" · ");
      var dd = ev.end ? d.getDate() + "–" + parse(ev.end).getDate() : d.getDate();
      return '<article class="cal-item reveal"><div class="cal-date"><span class="d">' + dd + '</span><span class="m">' + SHORT[d.getMonth()] + "</span></div>" +
        "<div><h3>" + esc(ev.title) + "</h3>" + (meta ? '<p class="meta">' + esc(meta.charAt(0).toUpperCase() + meta.slice(1)) + "</p>" : "") + "</div>" +
        '<img src="assets/img/' + esc(ev.img) + '" alt="' + esc(ev.title) + '" loading="lazy"></article>';
    }).join("");
    $$(".reveal", cal).forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });
  }

  /* Lightbox */
  var lb = $("dialog.lightbox");
  if (lb) {
    var lbImg = $("img", lb);
    $$(".gallery button").forEach(function (b) {
      b.addEventListener("click", function () { lbImg.src = b.getAttribute("data-full"); lbImg.alt = $("img", b).alt; lb.showModal(); });
    });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "BUTTON") lb.close(); });
  }

  /* Contactformulier */
  var form = $("#contact-form");
  if (form) {
    var status = $(".form-status", form);
    var rules = {
      naam: function (v) { return v.trim().length >= 2 || "Vul je naam in."; },
      telefoon: function (v) { return /^[+()\d\s\-]{8,20}$/.test(v.trim()) || "Vul een geldig telefoonnummer in."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Vul een geldig e-mailadres in."; },
      opmerking: function (v) { return v.trim().length >= 3 || "Schrijf een opmerking."; }
    };
    function check(name) {
      var input = form.elements[name], field = input.closest(".field");
      var r = rules[name](input.value);
      field.classList.toggle("invalid", r !== true);
      if (r !== true) $(".err", field).textContent = r;
      return r === true;
    }
    Object.keys(rules).forEach(function (n) { form.elements[n].addEventListener("blur", function () { check(n); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      var ok = Object.keys(rules).map(check).every(Boolean);
      if (!ok) { var bad = $(".invalid input, .invalid textarea", form); if (bad) bad.focus(); return; }
      var btn = $("button[type=submit]", form);
      btn.disabled = true; btn.textContent = "Versturen…";
      var data = {};
      Object.keys(rules).concat(["website"]).forEach(function (n) { data[n] = form.elements[n].value; });
      fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Fout"); return j; }); })
        .then(function () {
          status.className = "form-status ok";
          status.textContent = "Bedankt! Je bericht is succesvol verzonden naar de FerrariOwnersClubNL.";
          form.reset();
        })
        .catch(function () {
          status.className = "form-status fail";
          status.textContent = "Het versturen is niet gelukt. Stuur je bericht anders per e-mail naar info@ferrariownersclubnl.nl.";
        })
        .then(function () { btn.disabled = false; btn.textContent = "Verstuur bericht"; });
    });
  }
})();
