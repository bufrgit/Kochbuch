# Unser Familienkochbuch

Digitale Rezeptseiten zum gedruckten Familienkochbuch. Die QR-Codes im Buch führen hierher.
Jede Seite enthält die Zutaten (inkl. Übernahme in die Bring!-Einkaufsliste) und eine Kochansicht.

## Aufbau

- `rezepte/` – ein Rezept pro JSON-Datei (Titel, Zutaten, Schritte, Notiz, Quellfoto). Das ist die einzige Datenquelle.
- `werkzeuge/webseite.py` – erzeugt aus den Rezepten die Webseiten (Startseite + eine Seite pro Rezept).
- `werkzeuge/buch.py` – erzeugt das druckfertige PDF (A5) mit QR-Codes: `python3 werkzeuge/buch.py kochbuch.pdf`

Design-Änderungen passieren nur in den Werkzeugen; die Rezepte müssen dafür nicht neu eingelesen werden.
