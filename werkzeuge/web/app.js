/* Familienkochbuch – Wochenplan.
   Wer im Buch einen QR-Code scannt und auf „Zu Bring!“ tippt, kocht das Rezept diese Woche.
   Die Rezeptseite merkt es sich dann hier vor; auf der Startseite zieht man es auf einen Wochentag.
   Gespeichert wird nur im Browser (localStorage), es gibt keinen Server. */
(function () {
  "use strict";
  const KEY = "kochbuch.v2";
  const WT = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const WTK = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

  /* ---------- Speicher ----------
     S.woche["2026-11-16"] = { offen: [id, …], tage: { "2026-11-18": [id, …] } }   (Schlüssel = Montag der Woche) */
  function laden() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.woche) return s; } catch (e) {}
    return { woche: {} };
  }
  let S = laden();
  function speichern() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  window.addEventListener("storage", (ev) => { if (ev.key === KEY) { S = laden(); if (window.KB_neu) window.KB_neu(); } });

  /* ---------- Datum ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const vonIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const plusTage = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const montag = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return iso(plusTage(x, -((x.getDay() + 6) % 7))); };
  const heute = () => iso(new Date());
  const dieseWoche = () => montag(new Date());
  const wtIndex = (s) => (vonIso(s).getDay() + 6) % 7;
  const kurzDatum = (s) => { const d = vonIso(s); return d.getDate() + ". " + MON[d.getMonth()]; };
  function wochenTitel(ws) {
    const a = vonIso(ws), b = plusTage(a, 6);
    return a.getMonth() === b.getMonth() ? a.getDate() + ".–" + b.getDate() + ". " + MON[b.getMonth()]
      : a.getDate() + ". " + MON[a.getMonth()] + " – " + b.getDate() + ". " + MON[b.getMonth()];
  }
  const tageDerWoche = (ws) => [0, 1, 2, 3, 4, 5, 6].map((i) => iso(plusTage(vonIso(ws), i)));

  /* ---------- Plan ---------- */
  const woche = (ws) => (S.woche[ws] = S.woche[ws] || { offen: [], tage: {} });
  const istDrin = (w, id) => w.offen.includes(id) || Object.values(w.tage).some((l) => l.includes(id));
  function vormerken(id) {               // von der Rezeptseite: landet bei „Noch ohne Tag“
    const w = woche(dieseWoche());
    if (istDrin(w, id)) return false;
    w.offen.push(id); speichern(); return true;
  }
  function herausnehmen(w, id) {
    w.offen = w.offen.filter((x) => x !== id);
    Object.keys(w.tage).forEach((t) => { w.tage[t] = w.tage[t].filter((x) => x !== id); if (!w.tage[t].length) delete w.tage[t]; });
  }
  function verschieben(ws, id, ziel, vor) {   // ziel = "offen" oder ein Datum; vor = Rezept, vor dem eingefügt wird
    const w = woche(ws);
    herausnehmen(w, id);
    const l = ziel === "offen" ? w.offen : (w.tage[ziel] = w.tage[ziel] || []);
    const i = vor ? l.indexOf(vor) : -1;
    i < 0 ? l.push(id) : l.splice(i, 0, id);
    speichern();
  }
  function aufraeumen() {                // leere Wochen und alles älter als 8 Wochen entfernen
    const grenze = iso(plusTage(vonIso(dieseWoche()), -56));
    Object.keys(S.woche).forEach((ws) => {
      const w = S.woche[ws];
      if (ws < grenze || (!w.offen.length && !Object.keys(w.tage).length)) delete S.woche[ws];
    });
    speichern();
  }

  /* ---------- Helfer ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, el) => (el || document).querySelector(sel);
  let toastT;
  function toast(html) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 4000);
  }

  /* ---------- Rezeptseite (über den QR-Code im Buch) ---------- */
  function rezeptseite() {
    const id = document.body.dataset.id;
    document.querySelectorAll("ol.schritte li").forEach((li) => li.addEventListener("click", () => li.classList.toggle("done")));
    const knopf = $("#plan");
    const zeige = () => {
      const drin = istDrin(woche(dieseWoche()), id);
      knopf.textContent = drin ? "✓ Im Wochenplan" : "📅 In den Wochenplan";
      knopf.setAttribute("aria-pressed", drin);
    };
    zeige();
    // „Zu Bring!“ heißt: wird diese Woche gekocht – also gleich mit vormerken.
    $("#bring").addEventListener("click", () => vormerken(id));
    knopf.addEventListener("click", () => {
      if (vormerken(id)) toast('Vorgemerkt · <a href="../">Zum Wochenplan</a>');
      else location.href = "../";
      zeige();
    });
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
      if (document.visibilityState !== "visible") return;
      S = laden(); zeige();
      if (w.getAttribute("aria-pressed") === "true" && !lock) { try { lock = await navigator.wakeLock.request("screen"); } catch (e) {} }
    });
  }

  /* ---------- Startseite: Wochenplan ---------- */
  function app() {
    const D = JSON.parse($("#daten").textContent);
    const R = {}; D.rezepte.forEach((r) => (R[r.id] = r));
    const el = $("#app");
    let ws = dieseWoche();

    function route() {
      const h = location.hash.replace(/^#\/?/, "").split("/");
      if (h[0] === "heute") {
        const l = (woche(dieseWoche()).tage[heute()] || []).filter((id) => R[id]);
        if (l.length === 1) { location.replace(l[0] + "/"); return false; }
        history.replaceState(null, "", "#/");
      }
      ws = h[0] === "woche" && /^\d{4}-\d\d-\d\d$/.test(h[1] || "") ? montag(vonIso(h[1])) : dieseWoche();
      return true;
    }

    const karte = (id) => {
      const r = R[id]; if (!r) return "";
      return '<div class="karte" data-id="' + id + '"><span class="griff" aria-hidden="true" title="Ziehen">⠿</span>' +
        '<a href="' + id + '/">' + esc(r.titel) + "<small>" + esc([r.kapitel, r.zeit].filter(Boolean).join(" · ")) + "</small></a>" +
        '<button class="mehr" data-mehr="' + id + '" aria-label="' + esc(r.titel) + ': Tag wählen oder entfernen">⋯</button></div>';
    };

    function zeichne() {
      const w = S.woche[ws] || { offen: [], tage: {} }, h = heute(), diese = dieseWoche();
      let html = '<p class="kap">Familienkochbuch</p><h1>Unsere Woche</h1>';
      if (ws === diese) {
        const l = (w.tage[h] || []).filter((id) => R[id]);
        html += '<section class="heute"><p class="kap">Heute · ' + WT[wtIndex(h)] + ", " + kurzDatum(h) + "</p>";
        html += l.length ? l.map((id) => '<a class="titel" href="' + id + '/">' + esc(R[id].titel) + "</a>").join("") +
          '<a class="btn voll" href="' + l[0] + '/">Rezept öffnen</a>'
          : '<p class="leer">' + (w.offen.length ? "Noch nichts für heute – zieh ein Rezept auf „" + WT[wtIndex(h)] + "“." : "Für heute ist nichts geplant.") + "</p>";
        html += "</section>";
      }
      const name = ws === diese ? "Diese Woche" : ws === iso(plusTage(vonIso(diese), 7)) ? "Nächste Woche"
        : ws === iso(plusTage(vonIso(diese), -7)) ? "Letzte Woche" : wochenTitel(ws);
      html += '<div class="wnav"><a class="ico" href="#/woche/' + iso(plusTage(vonIso(ws), -7)) + '" aria-label="Vorige Woche">‹</a><b>' + name +
        '<br><span class="small muted">' + wochenTitel(ws) + '</span></b><a class="ico" href="#/woche/' + iso(plusTage(vonIso(ws), 7)) + '" aria-label="Nächste Woche">›</a></div>';
      if (ws !== diese) html += '<p style="text-align:center;margin:0 0 8px"><a class="heute-link" href="#/">Zurück zu dieser Woche</a></p>';

      html += '<section class="ziel pool" data-ziel="offen"><h2>Noch ohne Tag</h2>' + w.offen.map(karte).join("") +
        (w.offen.length ? '<p class="hinweis">Am Griff ⠿ festhalten und auf einen Tag ziehen – oder auf ⋯ tippen.</p>'
          : '<p class="leer-pool">' + (ws === diese ? "Rezept im Buch scannen und auf <b>„Zu Bring!“</b> tippen – dann taucht es hier auf." : "Hier liegt nichts.") + "</p>") + "</section>";

      tageDerWoche(ws).forEach((t, i) => {
        html += '<section class="ziel tag' + (t === h ? " ist-heute" : t < h ? " vorbei" : "") + '" data-ziel="' + t + '"><div class="th"><span class="wt">' + WT[i] +
          '</span><span class="dt">' + kurzDatum(t) + "</span></div>" + (w.tage[t] || []).map(karte).join("") + "</section>";
      });
      el.innerHTML = html;
    }
    window.KB_neu = zeichne;
    window.addEventListener("hashchange", () => { if (route()) { zeichne(); window.scrollTo(0, 0); } });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { S = laden(); zeichne(); } });

    /* Menü ⋯ : Tag wählen (statt Ziehen) oder entfernen */
    function menue(id) {
      const w = woche(ws), h = heute();
      const hg = document.createElement("div");
      hg.className = "blatt-hg";
      hg.innerHTML = '<div class="blatt" role="dialog" aria-modal="true" aria-label="Tag wählen"><h3>' + esc(R[id].titel) + "</h3>" +
        '<p class="small muted" style="margin:0">An welchem Tag gibt es das?</p><div class="tage" style="margin-top:12px">' +
        tageDerWoche(ws).map((t, i) => '<button data-tag="' + t + '" class="' + (t === h ? "ist-heute" : t < h ? "vorbei" : "") +
          ((w.tage[t] || []).includes(id) ? " gewaehlt" : "") + '"><b>' + WTK[i] + "</b><span>" + vonIso(t).getDate() + ".</span></button>").join("") +
        '</div><div class="unten"><button class="btn" data-tag="offen"' + (w.offen.includes(id) ? " disabled" : "") + ">Noch ohne Tag</button>" +
        '<button class="btn" data-loeschen>Aus der Woche nehmen</button></div><button class="btn zu">Abbrechen</button></div>';
      const zu = () => { hg.remove(); document.removeEventListener("keydown", tasten); };
      const tasten = (e) => { if (e.key === "Escape") zu(); };
      document.addEventListener("keydown", tasten);
      hg.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (e.target === hg || (b && b.classList.contains("zu"))) return zu();
        if (!b) return;
        if (b.dataset.tag) { verschieben(ws, id, b.dataset.tag); zu(); zeichne(); }
        else if ("loeschen" in b.dataset) {
          const vorher = JSON.stringify(w), wsV = ws;
          herausnehmen(w, id); speichern(); zu(); zeichne();
          toast(esc(R[id].titel) + ' entfernt · <a href="#" id="rueck">Rückgängig</a>');
          $("#rueck").addEventListener("click", (ev) => { ev.preventDefault(); S.woche[wsV] = JSON.parse(vorher); speichern(); zeichne(); $(".toast").hidden = true; });
        }
      });
      document.body.appendChild(hg);
      $(".tage button", hg).focus();
    }
    el.addEventListener("click", (e) => { const m = e.target.closest("[data-mehr]"); if (m) menue(m.dataset.mehr); });

    /* Ziehen & Ablegen – mit Finger und Maus (Pointer Events), am Griff ⠿ */
    let zug = null, scrollT = null;
    el.addEventListener("pointerdown", (e) => {
      const g = e.target.closest(".griff"); if (!g || e.button > 0) return;
      const k = g.closest(".karte"), r = k.getBoundingClientRect();
      e.preventDefault();
      const geist = k.cloneNode(true);
      geist.classList.add("geist");
      geist.style.width = r.width + "px";
      document.body.appendChild(geist);
      k.classList.add("weg-gezogen");
      zug = { id: k.dataset.id, geist: geist, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, ziel: null, vor: null };
      bewege();
      try { g.setPointerCapture(e.pointerId); } catch (x) {}
      scrollT = setInterval(() => {      // am Bildschirmrand mitscrollen
        if (!zug) return;
        const rand = 80;
        if (zug.y < rand) { window.scrollBy(0, -10); bewege(); } else if (zug.y > innerHeight - rand) { window.scrollBy(0, 10); bewege(); }
      }, 16);
    });
    function bewege() {
      zug.geist.style.transform = "translate(" + (zug.x - zug.dx) + "px," + (zug.y - zug.dy) + "px)";
      zug.geist.style.visibility = "hidden";
      const unter = document.elementFromPoint(zug.x, zug.y);
      zug.geist.style.visibility = "";
      const z = unter && unter.closest(".ziel");
      document.querySelectorAll(".ziel.drueber").forEach((x) => x !== z && x.classList.remove("drueber"));
      document.querySelectorAll(".karte.davor").forEach((x) => x.classList.remove("davor"));
      zug.ziel = z ? z.dataset.ziel : null; zug.vor = null;
      if (z) {
        z.classList.add("drueber");
        const k = [...z.querySelectorAll(".karte:not(.weg-gezogen)")].find((x) => { const b = x.getBoundingClientRect(); return zug.y < b.top + b.height / 2; });
        if (k) { k.classList.add("davor"); zug.vor = k.dataset.id; }
      }
    }
    document.addEventListener("pointermove", (e) => { if (zug) { e.preventDefault(); zug.x = e.clientX; zug.y = e.clientY; bewege(); } }, { passive: false });
    function ende(abbruch) {
      if (!zug) return;
      const z = zug; zug = null; clearInterval(scrollT);
      z.geist.remove();
      if (!abbruch && z.ziel) {
        verschieben(ws, z.id, z.ziel, z.vor);
        if (z.ziel !== "offen") toast(esc(R[z.id].titel) + " → " + WT[wtIndex(z.ziel)]);
      }
      zeichne();
    }
    document.addEventListener("pointerup", () => ende(false));
    document.addEventListener("pointercancel", () => ende(true));

    aufraeumen();
    if (route()) zeichne();
  }

  document.body.dataset.seite === "rezept" ? rezeptseite() : app();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register(document.body.dataset.seite === "rezept" ? "../sw.js" : "sw.js").catch(() => {});
  }
})();
