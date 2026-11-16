# Unser Familienkochbuch

Digitale Rezeptseiten zum gedruckten Familienkochbuch. Die QR-Codes im Buch führen hierher.
Jede Seite enthält die Zutaten (inkl. Übernahme in die Bring!-Einkaufsliste) und eine Kochansicht.

## Aufbau

- `rezepte/` – ein Rezept pro JSON-Datei (Titel, Zutaten, Schritte, Notiz, Quellfoto). Das ist die einzige Datenquelle.
- `werkzeuge/webseite.py` – erzeugt aus den Rezepten die Webseite: Startseite mit Wochenplan, „Heute kochen“, Rezeptsuche und Einkaufsliste, dazu eine Kochansicht pro Rezept. Das Aussehen steckt in `werkzeuge/web/` (app.css, app.js).
- `werkzeuge/buch.py` – erzeugt das druckfertige PDF (A5) mit QR-Codes: `python3 werkzeuge/buch.py kochbuch.pdf`

Design-Änderungen passieren nur in den Werkzeugen; die Rezepte müssen dafür nicht neu eingelesen werden.

## Webseite & Wochenplan (GitHub Pages)

Bei jedem Push auf `main` baut `.github/workflows/pages.yml` die Seite neu und veröffentlicht sie unter
https://bufrgit.github.io/Kochbuch/ – geänderte Rezepte sind also automatisch online.

- **QR-Code neben einem Rezept scannen:** Kochansicht mit Bring!-Knopf; das Rezept steht damit auch auf dem Wochenplan.
- **QR-Code auf Seite 2 (bzw. die Startseite):** der Wochenplan mit allen gescannten Rezepten. Per Tipp auf Mo–So einem Tag zuordnen, mit × löschen. Oben steht, was es heute gibt.

Der Plan liegt in einem kostenlosen Online-Speicher bei jsonblob.com (ohne Konto) und ist dadurch auf allen Handys und PCs gleich.
Die Adresse steht in `werkzeuge/speicher.txt` und wird beim ersten Veröffentlichen automatisch angelegt. Wer die Adresse kennt,
kann den Plan lesen und ändern – drin stehen aber nur Rezeptnamen und Wochentage. Ohne Verbindung merkt sich jedes Gerät
die Änderungen und überträgt sie später. Zeigt der Plan dauerhaft „keine Verbindung“ (z. B. weil jsonblob einen lange unbenutzten Speicher gelöscht hat):
`werkzeuge/speicher.txt` löschen – beim nächsten Veröffentlichen wird ein neuer, leerer Speicher angelegt.
Lokal ansehen: `python3 werkzeuge/webseite.py _site && python3 -m http.server -d _site`
