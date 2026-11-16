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

- **Woche:** Rezepte auf Wochentage legen, Personenzahl pro Tag anpassen, Woche per Link an die Familie schicken.
- **Heute:** oben auf der Startseite; `…/Kochbuch/#/heute` öffnet direkt das heutige Rezept (gut als Handy-Lesezeichen).
- **Einkauf:** Zutaten aller geplanten Rezepte zusammengerechnet zum Abhaken, eigene Einträge, Teilen als Text oder Übernahme in Bring!.

Der Plan wird nur im Browser des jeweiligen Geräts gespeichert (kein Konto, kein Server).
Lokal ansehen: `python3 werkzeuge/webseite.py _site && python3 -m http.server -d _site`
