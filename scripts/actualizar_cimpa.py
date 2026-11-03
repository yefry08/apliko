"""
Trae de CIMPA (cimpa.info) las escuelas de investigación y fellowships en matemáticas con postulación abierta y
reescribe data/raw/cimpa.json. CIMPA organiza escuelas para estudiantes de maestría y doctorado sobre todo en países
en desarrollo, y ayuda a pagar la participación de quienes vienen de ellos. Solo librería estándar.

    python scripts/actualizar_cimpa.py          actualiza el archivo
    python scripts/actualizar_cimpa.py --seco   muestra qué encontró, sin guardar

Cómo lee el sitio: el mapa interactivo (/en/carte-interactive?year=…) trae cada evento del año con un enlace a su
página, y cada página tiene campos fijos (Pays, Dates, Deadline, Level…). Los códigos de año se leen del propio
filtro del mapa. Después corre `npm run data:import`.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "cimpa.json"
BASE = "https://www.cimpa.info"
UA = {"User-Agent": "Mozilla/5.0 (Apliko; catalogo de becas)"}
FIELDS = ("Pays", "Organizing institute", "Institute", "City", "Level of the audience/possible candidates", "Type", "Free cost event", "Dates", "Deadline", "Link")


def get(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")


def to_text(fragment: str) -> str:
    fragment = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", fragment, flags=re.I)
    fragment = re.sub(r"<br\s*/?>|</(p|li|h\d|div|tr|span|a|label)>", "\n", fragment, flags=re.I)
    fragment = html.unescape(re.sub(r"<[^>]+>", " ", fragment))
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in fragment.split("\n")]
    return "\n".join(line for line in lines if line)


def year_codes(page: str, years: list[int]) -> list[str]:
    select = re.search(r'<select[^>]*name="year"[^>]*>(.*?)</select>', page, re.S)
    options = re.findall(r'<option[^>]*value="(\d+)"[^>]*>\s*(\d{4})\s*<', select.group(1)) if select else []
    return [code for code, year in options if int(year) in years]


def school_links(page: str) -> list[str]:
    links = re.findall(r'class="node__title">\s*<a href="([^"]+)"', page)
    return sorted({link if link.startswith("http") else BASE + link for link in links})


def parse_date(s: str) -> date | None:
    for fmt in ("%d %B, %Y", "%d %B %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None


def read_school(url: str) -> dict | None:
    page = get(url)
    title = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
    name = to_text(title.group(1)) if title else ""
    text = to_text(page)
    values: dict[str, str] = {}
    lines = text.split("\n")
    for i, line in enumerate(lines[:-1]):
        if line in FIELDS and line not in values:
            values[line] = lines[i + 1]
    deadline = parse_date(values.get("Deadline", ""))
    if not name or not deadline:
        return None
    dates = values.get("Dates", "")
    start = parse_date(dates.split(" - ")[0]) if dates else None
    # The description is the text between the title and the first field.
    body = text.split("\n" + name + "\n", 1)[-1]
    first_field = min((body.find("\n" + f + "\n") for f in FIELDS if ("\n" + f + "\n") in body), default=-1)
    description = re.sub(r"\s+", " ", body[:first_field] if first_field > 0 else body[:600]).strip()
    return {
        "name": name,
        "url": url,
        "country": values.get("Pays", ""),
        "city": values.get("City", ""),
        "level": values.get("Level of the audience/possible candidates", ""),
        "type": values.get("Type", ""),
        "free": values.get("Free cost event", "").lower() == "yes",
        "dates": dates,
        "starts": start.isoformat() if start else None,
        "deadline": deadline.isoformat(),
        "description": description[:600].rsplit(" ", 1)[0] + "…" if len(description) > 600 else description,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seco", action="store_true", help="no guarda nada")
    args = parser.parse_args()

    today = date.today()
    first = get(f"{BASE}/en/carte-interactive")
    codes = year_codes(first, [today.year, today.year + 1])
    if not codes:
        print("No encontré el filtro de años del mapa de CIMPA: la página cambió.", file=sys.stderr)
        return 1
    links: list[str] = []
    for code in codes:
        links += school_links(get(f"{BASE}/en/carte-interactive?year={code}"))
    links = sorted(set(links))
    if len(links) < 5:
        print(f"Solo {len(links)} eventos en el mapa: no reescribo {OUT.name} por si la página cambió.", file=sys.stderr)
        return 1

    with ThreadPoolExecutor(6) as pool:
        schools = [s for s in pool.map(lambda u: _safe(read_school, u), links) if s]
    rows = sorted((s for s in schools if s["deadline"] >= today.isoformat()), key=lambda s: s["deadline"])

    print(f"{len(links)} eventos de CIMPA en {today.year}-{today.year + 1}, {len(rows)} con postulación abierta.")
    for r in rows:
        print(f"  {r['deadline']}  {r['name'][:60]}  ({r['country']})")
    if args.seco:
        return 0
    OUT.write_text("[\n" + ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n", encoding="utf-8", newline="\n")
    print(f"Guardado {OUT.relative_to(ROOT)}.")
    return 0


def _safe(fn, url):
    try:
        return fn(url)
    except Exception as error:  # one broken page must not stop the rest
        print(f"Sin datos de {url}: {error}", file=sys.stderr)
        return None


if __name__ == "__main__":
    sys.exit(main())
