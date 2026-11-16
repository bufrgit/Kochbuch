/* Familienkochbuch – Wochenplan.
   Jedes Rezept, dessen QR-Code im Buch gescannt wird, landet auf dem Wochenplan (Startseite).
   Dort teilt man es mit einem Tipp einem Wochentag zu; mit × wird es wieder gelöscht.
   Gespeichert wird nur im Browser (localStorage), es gibt keinen Server. */
(function () {
  "use strict";
  const KEY = "kochbuch.plan";

  // Liste: [{ id: "chili-con-carne", am: "2026-11-16", tag: 0–6 (Mo–So) oder null }, …] – neueste zuerst
  function laden() { try { const l = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(l)) return l; } catch (e) {} return []; }
  function speichern(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }

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
    const id = document.body.dataset.id, l = laden();
    if (!l.some((x) => x.id === id)) { l.unshift({ id: id, am: heute(), tag: null }); speichern(l); }
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

    function zeichne() {
      const l = laden().filter((x) => R[x.id]);
      let html = '<p class="kap">Familienkochbuch</p><h1>Unser Wochenplan</h1>';
      if (!l.length) {
        el.innerHTML = html + '<div class="leer-plan"><p>Noch nichts geplant.</p><p class="small muted">Scanne im Buch den QR-Code neben einem Rezept – dann steht es hier.</p></div>';
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
      el.innerHTML = html;
    }

    el.addEventListener("click", (e) => {
      const d = e.target.closest("[data-tag]");
      if (d) {   // Tag antippen = einteilen, nochmal antippen = wieder „ohne Tag“
        const l = laden(), x = l.find((y) => y.id === d.dataset.id), t = +d.dataset.tag;
        x.tag = x.tag === t ? null : t;
        speichern(l); zeichne();
        if (x.tag != null) toast(esc(R[x.id].titel) + " → " + WT[t]);
        return;
      }
      const b = e.target.closest("[data-weg],[data-alle]"); if (!b) return;
      const vorher = laden();
      const titel = b.dataset.weg ? R[b.dataset.weg].titel : "Alle Rezepte";
      speichern(b.dataset.weg ? vorher.filter((x) => x.id !== b.dataset.weg) : []);
      zeichne();
      toast(esc(titel) + ' gelöscht · <a href="#" id="rueck">Rückgängig</a>');
      $("#rueck").addEventListener("click", (ev) => { ev.preventDefault(); speichern(vorher); zeichne(); $(".toast").hidden = true; });
    });
    // Neu laden, wenn man aus einem anderen Tab (frisch gescanntes Rezept) zurückkommt
    window.addEventListener("storage", (ev) => { if (ev.key === KEY) zeichne(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") zeichne(); });
    window.addEventListener("pageshow", zeichne);
    zeichne();
  }

  document.body.dataset.seite === "rezept" ? rezeptseite() : app();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register(document.body.dataset.seite === "rezept" ? "../sw.js" : "sw.js").catch(() => {});
  }
})();
