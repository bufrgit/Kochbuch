/* Familienkochbuch – Wochenplan, Heute, Einkaufsliste.
   Alles wird nur im Browser gespeichert (localStorage), es gibt keinen Server. */
(function () {
  "use strict";
  const KEY = "kochbuch.v1";
  const WT = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const WTK = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

  /* ---------- Speicher ---------- */
  function laden() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.plan) return Object.assign({ haken: {}, eigen: {} }, s); } catch (e) {}
    return { plan: {}, haken: {}, eigen: {} };
  }
  let S = laden();
  function speichern() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  window.addEventListener("storage", (ev) => { if (ev.key === KEY) { S = laden(); if (window.KB_neu) window.KB_neu(); } });

  /* ---------- Datum ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const vonIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const plusTage = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const montag = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return plusTage(x, -((x.getDay() + 6) % 7)); };
  const heute = () => iso(new Date());
  const wochentag = (s) => (vonIso(s).getDay() + 6) % 7;
  const kurzDatum = (s) => { const d = vonIso(s); return d.getDate() + ". " + MON[d.getMonth()]; };
  function wochenTitel(ws) {
    const a = vonIso(ws), b = plusTage(a, 6);
    return a.getMonth() === b.getMonth() ? a.getDate() + ".–" + b.getDate() + ". " + MON[b.getMonth()]
      : a.getDate() + ". " + MON[a.getMonth()] + " – " + b.getDate() + ". " + MON[b.getMonth()];
  }
  const tageDerWoche = (ws) => [0, 1, 2, 3, 4, 5, 6].map((i) => iso(plusTage(vonIso(ws), i)));

  /* ---------- Plan ---------- */
  function eintragen(tag, id, portionen) {
    (S.plan[tag] = S.plan[tag] || []).push({ id: id, p: portionen });
    speichern();
  }
  function entfernen(tag, i) {
    S.plan[tag].splice(i, 1);
    if (!S.plan[tag].length) delete S.plan[tag];
    speichern();
  }
  const anzahlAm = (tag) => (S.plan[tag] || []).length;

  /* ---------- kleine Helfer ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, el) => (el || document).querySelector(sel);

  let toastT;
  function toast(html) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3500);
  }

  /* Blatt „An welchem Tag?“ – auf Start- und Rezeptseite */
  function tagWaehlen(titel, fertig) {
    const t0 = $(".toast"); if (t0) t0.hidden = true;
    const hg = document.createElement("div");
    hg.className = "blatt-hg";
    const h = heute();
    const woche = (ws, name) => '<p class="kap">' + name + " · " + wochenTitel(ws) + '</p><div class="tage">' +
      tageDerWoche(ws).map((t, i) => {
        const n = anzahlAm(t);
        return '<button data-tag="' + t + '" class="' + (t === h ? "ist-heute" : t < h ? "vorbei" : "") + '"><b>' + WTK[i] +
          "</b><span>" + vonIso(t).getDate() + ".</span><i>" + (n ? "●".repeat(Math.min(n, 3)) : "") + "</i></button>";
      }).join("") + "</div>";
    const ws = iso(montag(new Date()));
    hg.innerHTML = '<div class="blatt" role="dialog" aria-modal="true" aria-label="Tag wählen"><h3>' + esc(titel) +
      '</h3><p class="small muted" style="margin:0">An welchem Tag soll es das geben?</p>' +
      woche(ws, "Diese Woche") + woche(iso(plusTage(vonIso(ws), 7)), "Nächste Woche") +
      '<button class="btn zu">Abbrechen</button></div>';
    const zu = () => { hg.remove(); document.removeEventListener("keydown", esc_); };
    const esc_ = (e) => { if (e.key === "Escape") zu(); };
    document.addEventListener("keydown", esc_);
    hg.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-tag]");
      if (b) { zu(); fertig(b.dataset.tag); } else if (e.target === hg || e.target.closest(".zu")) zu();
    });
    document.body.appendChild(hg);
    $("button.ist-heute", hg)?.focus();
  }

  /* ---------- Rezeptseite (über QR-Code im Buch) ---------- */
  function rezeptseite() {
    const b = document.body;
    document.querySelectorAll("ol.schritte li").forEach((li) => li.addEventListener("click", () => li.classList.toggle("done")));
    const plan = $("#plan");
    plan.addEventListener("click", () => tagWaehlen(b.dataset.titel, (tag) => {
      eintragen(tag, b.dataset.id, +b.dataset.portionen);
      toast("Für " + WT[wochentag(tag)] + " eingeplant · <a href=\"../#/woche/" + iso(montag(vonIso(tag))) + "\">Wochenplan</a>");
    }));
    const w = $("#wach"); let lock = null;
    if (!("wakeLock" in navigator)) w.hidden = true;
    w.addEventListener("click", async () => {
      try {
        if (lock) { await lock.release(); lock = null; }
        else { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; w.setAttribute("aria-pressed", "false"); }); }
        w.setAttribute("aria-pressed", lock ? "true" : "false");
      } catch (e) {}
    });
    document.addEventListener("visibilitychange", async () => {
      if (w.getAttribute("aria-pressed") === "true" && !lock && document.visibilityState === "visible") { try { lock = await navigator.wakeLock.request("screen"); } catch (e) {} }
    });
  }

  /* ---------- Mengen zusammenrechnen ---------- */
  const BRUCH = { "½": .5, "¼": .25, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": .125 };
  const EINHEIT = { "kg": ["g", 1000], "l": ["ml", 1000], "Pck.": ["Päckchen", 1], "Pck": ["Päckchen", 1], "Dosen": ["Dose", 1], "Packungen": ["Packung", 1],
    "Tüten": ["Tüte", 1], "Flaschen": ["Flasche", 1], "Prisen": ["Prise", 1], "Becher": ["Becher", 1], "Gläser": ["Glas", 1], "Stangen": ["Stange", 1],
    "Zehen": ["Zehe", 1], "Pakete": ["Paket", 1], "Rollen": ["Rolle", 1], "Kugeln": ["Kugel", 1], "Bund": ["Bund", 1], "Tassen": ["Tasse", 1], "Zweige": ["Zweig", 1] };
  const MEHRZAHL = { "Dose": "Dosen", "Packung": "Packungen", "Tüte": "Tüten", "Flasche": "Flaschen", "Prise": "Prisen", "Glas": "Gläser", "Stange": "Stangen",
    "Zehe": "Zehen", "Paket": "Pakete", "Rolle": "Rollen", "Kugel": "Kugeln", "Tasse": "Tassen", "Zweig": "Zweige", "Würfel": "Würfel" };
  const VORRAT_EINHEIT = ["Prise", "Msp.", "Spritzer", "Schuss"];

  function zerlege(menge) {
    const m = String(menge || "").trim();
    const r = /^(\d+(?:[.,]\d+)?)?\s*(?:([½¼¾⅓⅔⅛])|\/(\d+))?\s*(.*)$/.exec(m);
    let n = null;
    if (r[1] && r[3]) n = parseFloat(r[1]) / parseFloat(r[3]);
    else if (r[1] || r[2]) n = (r[1] ? parseFloat(r[1].replace(",", ".")) : 0) + (r[2] ? BRUCH[r[2]] : 0);
    let rest = r[4].trim();
    if (n == null || /^[-–]|^bis\b/.test(rest)) return { n: null, e: m };
    let f = 1;
    if (EINHEIT[rest]) { f = EINHEIT[rest][1]; rest = EINHEIT[rest][0]; }
    return { n: n * f, e: rest };
  }
  function zahl(n) {
    const g = Math.floor(n + 1e-9), r = n - g;
    const t = [[0, ""], [.25, "¼"], [1 / 3, "⅓"], [.5, "½"], [2 / 3, "⅔"], [.75, "¾"], [1, ""]];
    let best = t[0];
    t.forEach((x) => { if (Math.abs(r - x[0]) < Math.abs(r - best[0])) best = x; });
    if (Math.abs(r - best[0]) > .06) return String(Math.round(n * 10) / 10).replace(".", ",");
    const ganz = g + (best[0] === 1 ? 1 : 0);
    return (ganz ? String(ganz) : best[1] ? "" : "0") + best[1];
  }
  function menge(n, e) {
    if (e === "g" && n >= 1000) return zahl(Math.round(n / 100) / 10) + " kg";
    if (e === "ml" && n >= 1000) return zahl(Math.round(n / 100) / 10) + " l";
    if (e === "g" || e === "ml") return Math.round(n) + " " + e;
    if (!["EL", "TL", "cm"].includes(e)) n = n <= .5 ? .5 : Math.ceil(n - .05); // Stückzahlen und Packungen aufrunden
    const einheit = n > 1 && MEHRZAHL[e] ? MEHRZAHL[e] : e;
    return (zahl(n) + " " + einheit).trim();
  }
  const istGruppe = (z) => !z.menge && /:\s*$/.test(z.zutat);
  const schluessel = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/\s*\(.*?\)\s*/g, " ").trim();

  /* ---------- Startseite (App) ---------- */
  function app() {
    const D = JSON.parse($("#daten").textContent);
    const R = {}; D.rezepte.forEach((r) => (R[r.id] = r));
    const BASE = D.basis;
    const el = $("#app");
    let suche = "", filter = "alle";

    function bringLink(r, p) {
      return "https://api.getbring.com/rest/bringrecipes/deeplink?url=" + encodeURIComponent(BASE + r.id + "/") +
        "&source=web&baseQuantity=" + r.portionen + "&requestedQuantity=" + p;
    }

    /* Navigation über #/… */
    function route() {
      const h = location.hash.replace(/^#\/?/, "").split("/");
      return { seite: h[0] || "woche", arg: decodeURIComponent(h[1] || "") };
    }
    function gehe(pfad) { location.hash = "#/" + pfad; }

    function zeichne() {
      const { seite, arg } = route();
      if (seite === "heute") {
        const e = S.plan[heute()] || [];
        if (e.length === 1 && R[e[0].id]) { location.replace(e[0].id + "/"); return; }
        history.replaceState(null, "", "#/woche"); return zeichne();
      }
      document.querySelectorAll("nav.tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === (seite === "teilen" ? "woche" : seite) ? "page" : "false"));
      const offen = einkaufszahl(iso(montag(new Date())));
      const badge = $('nav.tabs a[data-tab=einkauf] .zahl');
      badge.textContent = offen; badge.hidden = !offen;
      if (seite === "rezepte") rezepte(arg);
      else if (seite === "einkauf") einkauf(arg || iso(montag(new Date())));
      else if (seite === "teilen") teilenAnsicht(arg);
      else woche(arg || iso(montag(new Date())));
    }
    window.KB_neu = zeichne;
    window.addEventListener("hashchange", () => { zeichne(); window.scrollTo(0, 0); });

    /* Woche */
    function woche(ws) {
      ws = iso(montag(vonIso(ws)));
      const h = heute();
      const heuteListe = (S.plan[h] || []).filter((x) => R[x.id]);
      let html = '<div class="kopf"><div><p class="kap">Familienkochbuch</p><h1>Was kochen wir?</h1></div></div>';
      html += '<section class="heute"><p class="kap">Heute · ' + WT[wochentag(h)] + ", " + kurzDatum(h) + "</p>";
      if (heuteListe.length) {
        heuteListe.forEach((x) => {
          const r = R[x.id];
          html += '<a class="titel" href="' + r.id + '/">' + esc(r.titel) + '</a>';
        });
        html += '<div class="reihe"><a class="btn voll" href="' + heuteListe[0].id + '/">Rezept öffnen</a></div>';
      } else {
        html += '<p class="leer">Für heute ist noch nichts geplant.</p><div class="reihe"><button class="btn voll" data-plus="' + h +
          '">Rezept für heute aussuchen</button><button class="btn" data-zufall="' + h + '">Überrasch mich</button></div>';
      }
      html += "</section>";
      const vor = iso(plusTage(vonIso(ws), -7)), nach = iso(plusTage(vonIso(ws), 7));
      const diese = iso(montag(new Date()));
      html += '<div class="wnav"><a class="ico" href="#/woche/' + vor + '" aria-label="Vorige Woche">‹</a><b>' +
        (ws === diese ? "Diese Woche" : ws === iso(plusTage(vonIso(diese), 7)) ? "Nächste Woche" : wochenTitel(ws)) +
        '<br><span class="small muted">' + wochenTitel(ws) + "</span></b>" +
        '<a class="ico" href="#/woche/' + nach + '" aria-label="Nächste Woche">›</a></div>';
      if (ws !== diese) html += '<p style="text-align:center;margin:0"><a class="wnav heute-link" href="#/woche/' + diese + '">Zurück zu dieser Woche</a></p>';
      html += '<section class="card-w">';
      tageDerWoche(ws).forEach((t, i) => {
        const liste = S.plan[t] || [];
        html += '<div class="tag' + (t === h ? " ist-heute" : t < h ? " vorbei" : "") + '"><div class="th"><span class="wt">' + WT[i] +
          '</span><span class="dt">' + kurzDatum(t) + "</span></div>";
        liste.forEach((x, j) => {
          const r = R[x.id];
          if (!r) return;
          html += '<div class="eintrag"><a href="' + r.id + '/">' + esc(r.titel) + "<small>" + esc(r.zeit || "") + "</small></a>" +
            '<span class="port"><button data-p="-1" data-t="' + t + '" data-i="' + j + '" aria-label="Weniger Personen">−</button><span>' + x.p +
            ' P.</span><button data-p="1" data-t="' + t + '" data-i="' + j + '" aria-label="Mehr Personen">+</button></span>' +
            '<button class="weg" data-weg="' + t + '" data-i="' + j + '" aria-label="' + esc(r.titel) + ' entfernen">×</button></div>';
        });
        html += '<button class="addtag" data-plus="' + t + '">+ Rezept</button></div>';
      });
      html += "</section>";
      const n = tageDerWoche(ws).reduce((s, t) => s + anzahlAm(t), 0);
      html += '<div class="unten">' + (n ? '<a class="btn voll" href="#/einkauf/' + ws + '">🧺 Einkaufsliste (' + n + (n === 1 ? " Rezept" : " Rezepte") + ")</a>" +
        '<button class="btn" data-teilen="' + ws + '">Woche teilen</button>' : "") + "</div>";
      el.innerHTML = html;
    }

    function zufall(tag) {
      const geplant = new Set(Object.values(S.plan).flat().map((x) => x.id));
      const pool = D.rezepte.filter((r) => r.oberkapitel === "Herzhaftes" && !geplant.has(r.id));
      const r = pool[Math.floor(Math.random() * pool.length)] || D.rezepte[0];
      eintragen(tag, r.id, r.portionen);
      zeichne();
      toast(esc(r.titel) + ' eingeplant · <a href="#" data-rueck="' + tag + '">Rückgängig</a>');
    }

    /* Rezepte */
    function rezepte(fuerTag) {
      const filterListe = [["alle", "Alle"]].concat(D.ober.map((o) => [o.name, o.name]), [["vegetarisch", "Vegetarisch"], ["geplant", "Eingeplant"]]);
      let html = '<p class="kap">Familienkochbuch</p><h1>Unsere Rezepte</h1>';
      if (fuerTag) html += '<div class="wahl"><span>Rezept für <b>' + WT[wochentag(fuerTag)] + ", " + kurzDatum(fuerTag) +
        "</b> antippen</span><a class=\"btn klein\" href=\"#/woche/" + iso(montag(vonIso(fuerTag))) + '">Fertig</a></div>';
      html += '<div class="suche"><input type="search" id="q" placeholder="Rezept oder Zutat suchen …" autocomplete="off" enterkeyhint="search" value="' + esc(suche) + '">' +
        '<div class="chips">' + filterListe.map((f) => '<button class="chip" data-filter="' + esc(f[0]) + '" aria-pressed="' + (filter === f[0]) + '">' + esc(f[1]) + "</button>").join("") +
        '</div></div><div id="liste"></div>';
      el.innerHTML = html;
      liste(fuerTag);
      const q = $("#q");
      q.addEventListener("input", () => { suche = q.value; liste(fuerTag); });
    }
    function liste(fuerTag) {
      const geplant = new Set(Object.values(S.plan).flat().map((x) => x.id));
      const w = schluessel(suche).split(" ").filter(Boolean);
      const treffer = D.rezepte.filter((r) => {
        if (filter === "vegetarisch" && !r.merkmale.includes("vegetarisch")) return false;
        if (filter === "geplant" && !geplant.has(r.id)) return false;
        if (D.ober.some((o) => o.name === filter) && r.oberkapitel !== filter) return false;
        return w.every((x) => r._s.includes(x));
      });
      let html = "";
      D.ober.forEach((o) => o.kapitel.forEach((k) => {
        const l = treffer.filter((r) => r.kapitel === k.name);
        if (!l.length) return;
        html += '<section class="gruppe" style="--k:' + k.farbe + '"><h3>' + esc(k.name) + "</h3>" + l.map((r) => {
          const drin = geplant.has(r.id);
          return '<div class="zeile"><a href="' + r.id + '/">' + esc(r.titel) + "<span>" + esc([r.zeit, r.portionen + " Portionen"].concat(r.merkmale).filter(Boolean).join(" · ")) +
            '</span></a><button class="ico plus' + (drin && !fuerTag ? " drin" : "") + '" data-neu="' + r.id + '" aria-label="' + esc(r.titel) + ' einplanen">' + (drin && !fuerTag ? "✓" : "+") + "</button></div>";
        }).join("") + "</section>";
      }));
      $("#liste").innerHTML = html || '<p class="nix">Nichts gefunden.</p>';
    }

    /* Einkaufsliste */
    function sammle(ws) {
      const posten = {}, vorrat = {}, rezepteDerWoche = [];
      tageDerWoche(ws).forEach((t) => (S.plan[t] || []).forEach((x) => {
        const r = R[x.id]; if (!r) return;
        rezepteDerWoche.push({ r: r, p: x.p, t: t });
        const f = x.p / r.portionen;
        r.zutaten.forEach((z) => {
          if (istGruppe(z)) return;
          const k = schluessel(z.zutat), m = zerlege(z.menge);
          if (m.n == null || VORRAT_EINHEIT.includes(m.e)) {
            const v = vorrat[k] = vorrat[k] || { name: z.zutat, woher: new Set(), mengen: new Set() };
            v.woher.add(r.titel); if (z.menge) v.mengen.add(z.menge);
            return;
          }
          const p = posten[k] = posten[k] || { name: z.zutat.replace(/\s*\([^)]*\)\s*$/, ""), woher: new Set(), mengen: {} };
          p.woher.add(r.titel);
          p.mengen[m.e] = (p.mengen[m.e] || 0) + m.n * f;
        });
      }));
      Object.keys(vorrat).forEach((k) => { if (posten[k]) { delete vorrat[k]; } });
      const sortiert = (o) => Object.keys(o).sort((a, b) => a.localeCompare(b, "de")).map((k) => Object.assign({ k: k }, o[k]));
      return {
        posten: sortiert(posten).map((p) => Object.assign(p, { text: Object.keys(p.mengen).map((e) => menge(p.mengen[e], e)).join(" + ") })),
        vorrat: sortiert(vorrat).map((v) => Object.assign(v, { k: "v:" + v.k, text: [...v.mengen].join(", ") })),
        rezepte: rezepteDerWoche,
      };
    }
    function einkaufszahl(ws) {
      const l = sammle(ws), h = S.haken[ws] || {};
      return l.posten.filter((p) => !h[p.k]).length + (S.eigen[ws] || []).filter((x) => !h["e:" + x]).length;
    }
    function einkauf(ws) {
      ws = iso(montag(vonIso(ws)));
      const l = sammle(ws), h = S.haken[ws] || {}, eigen = S.eigen[ws] || [];
      const zeile = (k, mengeTxt, name, woher, wegKnopf) => '<li><label class="ek' + (h[k] ? " erledigt" : "") + '"><input type="checkbox" data-haken="' + esc(k) + '"' +
        (h[k] ? " checked" : "") + '><span class="txt">' + (mengeTxt ? '<span class="menge">' + esc(mengeTxt) + "</span>" : "") + '<span class="name">' + esc(name) +
        "</span>" + (woher ? '<span class="woher">' + esc(woher) + "</span>" : "") + "</span>" + (wegKnopf || "") + "</label></li>";
      const offenZuerst = (a) => a.slice().sort((x, y) => (!!h[x.k]) - (!!h[y.k]));
      let html = '<p class="kap">Einkaufsliste · ' + wochenTitel(ws) + "</p><h1>Was wir brauchen</h1>";
      const diese = iso(montag(new Date()));
      html += '<div class="wnav"><a class="ico" href="#/einkauf/' + iso(plusTage(vonIso(ws), -7)) + '" aria-label="Vorige Woche">‹</a><b>' +
        (ws === diese ? "Diese Woche" : wochenTitel(ws)) + '</b><a class="ico" href="#/einkauf/' + iso(plusTage(vonIso(ws), 7)) + '" aria-label="Nächste Woche">›</a></div>';
      if (!l.rezepte.length && !eigen.length) {
        html += '<p class="nix">Für diese Woche ist noch nichts geplant.</p><p style="text-align:center"><a class="btn voll" href="#/woche/' + ws + '">Zum Wochenplan</a></p>';
      } else {
        const alle = l.posten.length + eigen.length, erledigt = l.posten.filter((p) => h[p.k]).length + eigen.filter((x) => h["e:" + x]).length;
        html += '<p class="small muted">' + l.rezepte.length + (l.rezepte.length === 1 ? " Rezept" : " Rezepte") + " · " + (alle - erledigt) + " von " + alle + " Sachen offen</p>";
        html += '<section class="einkauf"><ul>' + offenZuerst(l.posten).map((p) => zeile(p.k, p.text, p.name, [...p.woher].join(", "))).join("") +
          eigen.map((x) => ({ k: "e:" + x, x: x })).sort((a, b) => (!!h[a.k]) - (!!h[b.k]))
            .map((o) => zeile(o.k, "", o.x, "eigener Eintrag", '<button class="weg" data-eigenweg="' + esc(o.x) + '" aria-label="Löschen">×</button>')).join("") + "</ul>" +
          '<form class="eigen" id="eigen"><input name="x" placeholder="Etwas dazuschreiben, z. B. Milch" autocomplete="off" enterkeyhint="done"><button class="btn">Dazu</button></form>';
        if (l.vorrat.length) html += '<h2>Vorrat prüfen</h2><p class="small muted" style="margin:0 0 4px">Gewürze und Kleinigkeiten ohne genaue Menge – haben wir das da?</p><ul>' +
          offenZuerst(l.vorrat).map((v) => zeile(v.k, v.text, v.name, [...v.woher].join(", "))).join("") + "</ul>";
        html += "</section>";
        html += '<div class="unten"><button class="btn voll" data-kopieren="' + ws + '">Liste teilen / kopieren</button>' +
          (Object.keys(h).length ? '<button class="btn" data-zurueck="' + ws + '">Häkchen zurücksetzen</button>' : "") + "</div>";
        if (l.rezepte.length) html += '<h2>Lieber in Bring!?</h2><p class="small muted" style="margin:0 0 10px">Jedes Rezept einzeln übernehmen, schon auf die geplanten Personen umgerechnet:</p><div class="bringliste">' +
          l.rezepte.map((x) => '<a class="btn bring" href="' + esc(bringLink(x.r, x.p)) + '"><span>' + esc(x.r.titel) + '</span><span class="small">' + WTK[wochentag(x.t)] + " · " + x.p + " P.</span></a>").join("") + "</div>";
      }
      el.innerHTML = html;
      const f = $("#eigen");
      if (f) f.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = f.x.value.trim(); if (!v) return;
        const l2 = S.eigen[ws] = S.eigen[ws] || [];
        if (!l2.includes(v)) l2.push(v);
        speichern(); zeichne(); $("#eigen input")?.focus();
      });
    }
    function listeAlsText(ws) {
      const l = sammle(ws), h = S.haken[ws] || {};
      const z = l.posten.filter((p) => !h[p.k]).map((p) => "• " + p.text + " " + p.name)
        .concat((S.eigen[ws] || []).filter((x) => !h["e:" + x]).map((x) => "• " + x));
      const v = l.vorrat.filter((p) => !h[p.k]).map((p) => "• " + p.name);
      return "Einkaufsliste " + wochenTitel(ws) + "\n\n" + z.join("\n") + (v.length ? "\n\nVorrat prüfen:\n" + v.join("\n") : "");
    }
    async function teilen(titel, text, url) {
      if (navigator.share) { try { await navigator.share({ title: titel, text: text, url: url }); return; } catch (e) { if (e.name === "AbortError") return; } }
      try { await navigator.clipboard.writeText(text + (url ? "\n" + url : "")); toast("In die Zwischenablage kopiert"); }
      catch (e) { window.prompt("Zum Kopieren:", url || text); }
    }

    /* Woche teilen: der Plan steckt im Link */
    function wocheAlsLink(ws) {
      const p = {};
      tageDerWoche(ws).forEach((t, i) => { if (S.plan[t]) p[i] = S.plan[t].map((x) => [x.id, x.p]); });
      const code = btoa(JSON.stringify({ w: ws, p: p })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return BASE + "#/teilen/" + code;
    }
    function teilenAnsicht(code) {
      let d;
      try { d = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/"))); } catch (e) { gehe("woche"); return; }
      const tage = tageDerWoche(d.w);
      let html = '<p class="kap">Geteilter Wochenplan</p><h1>' + wochenTitel(d.w) + '</h1><div class="zettel">Jemand hat dir diesen Plan geschickt.</div>';
      tage.forEach((t, i) => (d.p[i] || []).forEach((x) => {
        if (R[x[0]]) html += '<div class="eintrag"><span class="wt" style="font:700 22px var(--hand);color:var(--acc);min-width:44px">' + WTK[i] + '</span><a href="' + x[0] + '/">' + esc(R[x[0]].titel) + "<small>" + x[1] + " Personen</small></a></div>";
      }));
      const vorhanden = tage.some((t) => anzahlAm(t));
      html += '<div class="unten"><button class="btn voll" data-uebernehmen="' + esc(code) + '">' + (vorhanden ? "Meinen Plan dieser Woche ersetzen" : "In meinen Wochenplan übernehmen") +
        '</button><a class="btn" href="#/woche">Abbrechen</a></div>';
      el.innerHTML = html;
    }

    /* Klicks */
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-plus],[data-zufall],[data-weg],[data-p],[data-neu],[data-filter],[data-kopieren],[data-zurueck],[data-teilen],[data-uebernehmen],[data-eigenweg],[data-rueck]");
      if (!t || !el.contains(t) && !t.closest(".toast")) return;
      const d = t.dataset;
      if (d.plus) gehe("rezepte/" + d.plus);
      else if (d.zufall) zufall(d.zufall);
      else if (d.rueck) { e.preventDefault(); const l = S.plan[d.rueck]; if (l) entfernen(d.rueck, l.length - 1); zeichne(); $(".toast").hidden = true; }
      else if (d.weg) { entfernen(d.weg, +d.i); zeichne(); }
      else if (d.p) { const x = S.plan[d.t][+d.i]; x.p = Math.max(1, Math.min(30, x.p + +d.p)); speichern(); zeichne(); }
      else if (d.filter) { filter = d.filter; document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === t)); liste(route().arg); }
      else if (d.neu) {
        const r = R[d.neu], fuer = route().seite === "rezepte" && route().arg;
        if (fuer) { eintragen(fuer, r.id, r.portionen); gehe("woche/" + iso(montag(vonIso(fuer)))); toast(esc(r.titel) + " · " + WT[wochentag(fuer)]); }
        else tagWaehlen(r.titel, (tag) => {
          eintragen(tag, r.id, r.portionen); liste("");
          toast("Für " + WT[wochentag(tag)] + ' eingeplant · <a href="#/woche/' + iso(montag(vonIso(tag))) + '">Wochenplan</a>');
        });
      }
      else if (d.kopieren) teilen("Einkaufsliste", listeAlsText(d.kopieren));
      else if (d.zurueck) { delete S.haken[d.zurueck]; speichern(); zeichne(); }
      else if (d.teilen) teilen("Wochenplan " + wochenTitel(d.teilen), "Unser Wochenplan (" + wochenTitel(d.teilen) + ")", wocheAlsLink(d.teilen));
      else if (d.eigenweg) { e.preventDefault(); const ws = route().arg || iso(montag(new Date())); S.eigen[ws] = (S.eigen[ws] || []).filter((x) => x !== d.eigenweg); speichern(); zeichne(); }
      else if (d.uebernehmen) {
        const x = JSON.parse(atob(d.uebernehmen.replace(/-/g, "+").replace(/_/g, "/")));
        tageDerWoche(x.w).forEach((tag, i) => { if (x.p[i]) S.plan[tag] = x.p[i].map((y) => ({ id: y[0], p: y[1] })); else delete S.plan[tag]; });
        speichern(); gehe("woche/" + x.w); toast("Wochenplan übernommen");
      }
    });
    document.addEventListener("change", (e) => {
      const c = e.target.closest("[data-haken]"); if (!c) return;
      const ws = iso(montag(vonIso(route().arg || heute())));
      const h = S.haken[ws] = S.haken[ws] || {};
      if (c.checked) h[c.dataset.haken] = 1; else delete h[c.dataset.haken];
      if (!Object.keys(h).length) delete S.haken[ws];
      speichern();
      setTimeout(zeichne, 250); // kurz sichtbar abhaken, dann nach unten sortieren
    });

    D.rezepte.forEach((r) => (r._s = schluessel([r.titel, r.untertitel, r.kapitel].concat(r.merkmale, r.zutaten.map((z) => z.zutat)).join(" "))));
    zeichne();
  }

  document.body.dataset.seite === "rezept" ? rezeptseite() : app();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register(document.body.dataset.seite === "rezept" ? "../sw.js" : "sw.js").catch(() => {});
  }
})();
