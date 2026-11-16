/* Familienkochbuch – Wochenplan.
   Jedes Rezept, dessen QR-Code im Buch gescannt wird, landet auf dem Wochenplan (Startseite).
   Dort teilt man es mit einem Tipp einem Wochentag zu; mit × wird es wieder gelöscht.

   Gemeinsamer Plan: Ist ein Online-Speicher eingetragen (data-speicher, siehe werkzeuge/speicher.txt),
   teilen sich alle Handys und PCs denselben Plan. Jede Änderung wird als kleiner Schritt gemerkt
   („hinzufügen“, „Tag setzen“, „löschen“), auf den neuesten Stand im Netz angewendet und zurückgeschrieben.
   Ohne Netz bleiben die Schritte im Browser liegen und werden beim nächsten Mal nachgeholt. */
(function () {
  "use strict";
  const KEY = "kochbuch.plan", KEY_OFFEN = "kochbuch.ausstehend", KEY_VERBUNDEN = "kochbuch.verbunden";
  const SPEICHER = document.body.dataset.speicher || "";

  // Liste: [{ id: "chili-con-carne", am: "2026-11-16", tag: 0–6 (Mo–So) oder null }, …] – neueste zuerst
  const lesen = (k, n) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? n : v; } catch (e) { return n; } };
  const schreiben = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const laden = () => { const l = lesen(KEY, []); return Array.isArray(l) ? l : []; };
  const speichern = (l) => schreiben(KEY, l);

  /* Ein Schritt auf eine Liste anwenden */
  function anwenden(l, s) {
    l = l.slice();
    if (s.art === "neu") { if (!l.some((x) => x.id === s.id)) l.unshift({ id: s.id, am: s.am, tag: null }); }
    else if (s.art === "tag") l = l.map((x) => (x.id === s.id ? Object.assign({}, x, { tag: s.tag }) : x));
    else if (s.art === "weg") l = l.filter((x) => x.id !== s.id);
    else if (s.art === "alle") l = [];
    else if (s.art === "setzen") l = s.liste;
    return l;
  }

  /* ---------- Abgleich mit dem Online-Speicher ---------- */
  let status = SPEICHER ? "lädt" : "lokal", lauf = null, beiAenderung = () => {};
  function aendern(s) {
    speichern(anwenden(laden(), s));
    if (SPEICHER) { const o = lesen(KEY_OFFEN, []); o.push(s); schreiben(KEY_OFFEN, o); }
    beiAenderung();
    return abgleichen();
  }
  function abgleichen() {
    if (!SPEICHER) return Promise.resolve();
    if (lauf) return lauf.then(() => (lesen(KEY_OFFEN, []).length ? abgleichen() : null));
    lauf = (async () => {
      // Beim allerersten Verbinden: was schon auf diesem Gerät stand, mit hochladen
      if (lesen(KEY_VERBUNDEN, "") !== SPEICHER) {
        const o = laden().slice().reverse().map((x) => [{ art: "neu", id: x.id, am: x.am }].concat(x.tag != null ? [{ art: "tag", id: x.id, tag: x.tag }] : [])).flat();
        schreiben(KEY_OFFEN, o.concat(lesen(KEY_OFFEN, [])));
        schreiben(KEY_VERBUNDEN, SPEICHER);
      }
      const r = await fetch(SPEICHER, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("Speicher " + r.status);
      const d = await r.json();
      let l = Array.isArray(d && d.liste) ? d.liste : [];
      const offen = lesen(KEY_OFFEN, []);
      if (offen.length) {
        offen.forEach((s) => (l = anwenden(l, s)));
        const p = await fetch(SPEICHER, { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ liste: l, geaendert: new Date().toISOString() }) });
        if (!p.ok) throw new Error("Speichern " + p.status);
        schreiben(KEY_OFFEN, lesen(KEY_OFFEN, []).slice(offen.length));   // nur die übertragenen Schritte streichen
        l = lesen(KEY_OFFEN, []).reduce(anwenden, l);
      }
      speichern(l);
      status = "ok";
    })().catch(() => { status = "offline"; }).finally(() => { lauf = null; beiAenderung(); });
    return lauf;
  }

  const pad = (n) => String(n).padStart(2, "0");
  const heute = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel) => document.querySelector(sel);

  let toastT;
  function toast(html) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 5000);
  }

  /* ---------- Rezeptseite: Aufruf über den QR-Code = auf den Wochenplan ---------- */
  function rezeptseite() {
    const id = document.body.dataset.id;
    if (!laden().some((x) => x.id === id)) aendern({ art: "neu", id: id, am: heute() });
    else abgleichen();
    document.querySelectorAll("ol.schritte li").forEach((li) => li.addEventListener("click", () => li.classList.toggle("done")));
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

  /* ---------- Startseite: der Wochenplan ---------- */
  function app() {
    const R = {};
    JSON.parse($("#daten").textContent).rezepte.forEach((r) => (R[r.id] = r));
    const el = $("#app");

    const WT = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
    const KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const hIdx = () => (new Date().getDay() + 6) % 7;

    const karte = (x) => {
      const r = R[x.id];
      return '<div class="karte"><div class="kz"><a href="' + r.id + '/">' + esc(r.titel) + "<small>" + esc([r.kapitel, r.zeit].filter(Boolean).join(" · ")) +
        '</small></a><button class="weg" data-weg="' + r.id + '" aria-label="' + esc(r.titel) + ' löschen">×</button></div>' +
        '<div class="tagwahl" role="group" aria-label="Tag für ' + esc(r.titel) + '">' + KURZ.map((k, i) =>
          '<button data-id="' + r.id + '" data-tag="' + i + '" aria-pressed="' + (x.tag === i) + '" aria-label="' + WT[i] + '"' + (i === hIdx() ? ' class="ht"' : "") + ">" + k + "</button>").join("") +
        "</div></div>";
    };

    const statusZeile = () => '<p class="sync">' + ({ lokal: "Nur auf diesem Gerät gespeichert", "lädt": "Wird abgeglichen …",
      ok: "✓ Gemeinsamer Plan – auf allen Geräten gleich", offline: "Gerade keine Verbindung – Änderungen werden später übertragen" }[status]) + "</p>";

    function zeichne() {
      const l = laden().filter((x) => R[x.id]);
      let html = '<p class="kap">Familienkochbuch</p><h1>Unser Wochenplan</h1>';
      if (!l.length) {
        el.innerHTML = html + '<div class="leer-plan"><p>' + (status === "lädt" ? "Plan wird geladen …" : "Noch nichts geplant.") +
          '</p><p class="small muted">Scanne im Buch den QR-Code neben einem Rezept – dann steht es hier.</p></div>' + statusZeile();
        return;
      }
      const h = l.filter((x) => x.tag === hIdx());
      html += '<section class="heute"><p class="kap">Heute · ' + WT[hIdx()] + "</p>" + (h.length
        ? h.map((x) => '<a class="titel" href="' + x.id + '/">' + esc(R[x.id].titel) + "</a>").join("") + '<a class="btn voll" href="' + h[0].id + '/">Rezept öffnen</a>'
        : '<p class="leer">Für heute ist noch nichts eingeteilt.</p>') + "</section>";
      const offen = l.filter((x) => x.tag == null);
      if (offen.length) html += '<section class="pool"><h2>Noch ohne Tag</h2><p class="small muted" style="margin:0 0 4px">Tippe auf einen Tag, um das Rezept einzuteilen.</p>' + offen.map(karte).join("") + "</section>";
      WT.forEach((name, i) => {
        const t = l.filter((x) => x.tag === i);
        if (t.length) html += '<section class="tagblock' + (i === hIdx() ? " ist-heute" : "") + '"><h2>' + name + "</h2>" + t.map(karte).join("") + "</section>";
      });
      if (l.length > 1) html += '<div class="unten"><button class="btn" data-alle>Alle löschen</button></div>';
      el.innerHTML = html + statusZeile();
    }

    el.addEventListener("click", (e) => {
      const d = e.target.closest("[data-tag]");
      if (d) {   // Tag antippen = einteilen, nochmal antippen = wieder „ohne Tag“
        const x = laden().find((y) => y.id === d.dataset.id), t = +d.dataset.tag;
        if (!x) return;
        const neu = x.tag === t ? null : t;
        aendern({ art: "tag", id: x.id, tag: neu });
        if (neu != null) toast(esc(R[x.id].titel) + " → " + WT[t]);
        return;
      }
      const b = e.target.closest("[data-weg],[data-alle]"); if (!b) return;
      const vorher = laden();
      const titel = b.dataset.weg ? R[b.dataset.weg].titel : "Alle Rezepte";
      aendern(b.dataset.weg ? { art: "weg", id: b.dataset.weg } : { art: "alle" });
      toast(esc(titel) + ' gelöscht · <a href="#" id="rueck">Rückgängig</a>');
      $("#rueck").addEventListener("click", (ev) => { ev.preventDefault(); aendern({ art: "setzen", liste: vorher }); $(".toast").hidden = true; });
    });
    // Neu laden: aus anderem Tab zurück, App wieder im Vordergrund, und alle 20 Sekunden (Änderungen der anderen)
    beiAenderung = zeichne;
    window.addEventListener("storage", (ev) => { if (ev.key === KEY) zeichne(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { zeichne(); abgleichen(); } });
    window.addEventListener("pageshow", () => { zeichne(); abgleichen(); });
    window.addEventListener("online", () => abgleichen());
    setInterval(() => { if (document.visibilityState === "visible") abgleichen(); }, 20000);
    zeichne();
  }

  document.body.dataset.seite === "rezept" ? rezeptseite() : app();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register(document.body.dataset.seite === "rezept" ? "../sw.js" : "sw.js").catch(() => {});
  }
})();
