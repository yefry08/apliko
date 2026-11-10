"""
Trae el directorio de oportunidades de The Possibilists (thepossibilists.org/directory), una base global de
fellowships, fondos, premios, competencias y pasantías para jóvenes que cambian su comunidad, y reescribe
data/raw/possibilists.json. Solo librería estándar.

    python scripts/actualizar_possibilists.py          actualiza el archivo
    python scripts/actualizar_possibilists.py --seco   muestra qué encontró, sin guardar

Cómo lee el sitio: la página del directorio pide su lista a /wp-json/proxy/v1/opportunities, que devuelve JSON con
nombre, organización, tipo, financiamiento, países, edades, fecha y hora de cierre con su zona horaria y el enlace
para postular. Solo se guardan esos datos: las descripciones son textos del sitio, así que se usan para clasificar
el área y no se copian. La fecha de cierre se pasa a la hora de RD. Después corre `npm run data:import`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "possibilists.json"
API = "https://thepossibilists.org/wp-json/proxy/v1/opportunities"
UA = {"User-Agent": "Mozilla/5.0 (Apliko; catalogo de becas)"}
RD = timezone(timedelta(hours=-4))

# Area labels in Spanish (the site's text itself is never stored). Broad words such as "data", "media" or
# "learning" appear in most descriptions, so those areas come from the opportunity's name only; the description is
# read only for specific themes (True in the third column).
AREAS = [
    ("Inteligencia artificial", r"\b(ai|artificial intelligence|machine learning)\b", False),
    ("Tecnología", r"\b(tech|technology|digital|software|coding|data|cyber)\w*", False),
    ("Clima", r"\b(climate|carbon|net[- ]zero)\b", True),
    ("Medio ambiente", r"\b(environment\w*|biodiversity|conservation|ocean|forest|wildlife)\b", True),
    ("Agricultura", r"\b(food systems?|agricultur\w*|farmers?|hunger)\b", True),
    ("Salud", r"\b(health|medical|medicine|mental health|disease)\b", True),
    ("Educación", r"\b(education|teachers?|teaching|school|literacy)\b", False),
    ("Periodismo", r"\b(journalis\w*|media|reporting|storytell\w*|film\w*|documentar\w*)\b", False),
    ("Arte y cultura", r"\b(arts?|artists?|music|culture|creative|writ\w+|poetry)\b", False),
    ("Derechos humanos", r"\b(human rights|justice|democracy|civic|peace|refugees?)\b", False),
    ("Género", r"\b(women|girls|gender|feminis\w*|femtech)\b", True),
    ("Emprendimiento", r"\b(entrepreneur\w*|startups?|ventures?|business|enterprise|founders?)\b", False),
    ("Ciencia", r"\b(science|scientists?|research\w*|stem)\b", False),
    ("Liderazgo", r"\b(leaders?|leadership|changemakers?)\b", False),
]


def areas_of(name: str, description: str) -> list[str]:
    found = [
        label
        for label, pattern, in_description in AREAS
        if re.search(pattern, name, re.I) or (in_description and re.search(pattern, description, re.I))
    ]
    return found[:4] or ["Impacto social"]


def rd_date(item: dict) -> str | None:
    """Closing date in Dominican time, from the date, time and time zone the site gives."""
    if item.get("noDeadline") or not item.get("deadline"):
        return None
    day = item["deadline"][:10]
    clock = (item.get("deadlineTime") or "23:59:00")[:8]
    try:
        local = datetime.fromisoformat(f"{day}T{clock}").replace(tzinfo=ZoneInfo(item.get("deadlineTimezone") or "UTC"))
        return local.astimezone(RD).date().isoformat()
    except Exception:  # unknown zone name: keep the date as published
        return day


def row(item: dict) -> dict:
    return {
        "id": item["id"],
        "slug": item.get("slug") or "",
        "name": re.sub(r"\s+", " ", item["name"]).strip(),
        "organization": (item.get("organization") or "").strip(),
        "type": item.get("type") or "Other",
        "fundingType": item.get("fundingType") or "",
        "isGlobal": bool(item.get("isGlobal")),
        "countries": item.get("countries") or [],
        "continents": item.get("continents") or [],
        "ageMin": item.get("ageMin"),
        "ageMax": item.get("ageMax"),
        "deadline": rd_date(item),
        "deadlineTime": (item.get("deadlineTime") or "")[:5],
        "deadlineTimezone": item.get("deadlineTimezone") or "",
        "areas": areas_of(item.get("name") or "", item.get("description") or ""),
        "url": item.get("applicationLink") or "",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seco", action="store_true", help="no guarda nada")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    req = urllib.request.Request(API, headers=UA)
    data = json.loads(urllib.request.urlopen(req, timeout=90).read().decode("utf-8"))
    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list) or len(items) < 50:
        print(f"La API devolvió {len(items) if isinstance(items, list) else 0} oportunidades: no reescribo {OUT.name}.", file=sys.stderr)
        return 1

    today = date.today().isoformat()
    rows = [
        row(i)
        for i in items
        if i.get("status", "active") == "active" and i.get("applicationLink") and i.get("name")
    ]
    rows = [r for r in rows if r["deadline"] is None or r["deadline"] >= today]
    rows.sort(key=lambda r: (r["deadline"] is None, r["deadline"] or "", r["name"]))

    print(f"{len(items)} oportunidades en The Possibilists, {len(rows)} abiertas.")
    for r in rows[:12]:
        print(f"  {r['deadline'] or 'continua':10}  {r['name'][:70]}")
    if args.seco:
        return 0
    OUT.write_text("[\n" + ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n", encoding="utf-8", newline="\n")
    print(f"Guardado {OUT.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
