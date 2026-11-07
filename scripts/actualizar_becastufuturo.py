"""
Trae de Beca tu Futuro (becas.gob.do), la plataforma oficial de becas del MESCyT, las convocatorias abiertas o por
abrir y reescribe data/raw/becas-tu-futuro.json. Ahí salen las becas nacionales e internacionales del MESCyT y las de
cooperación (Corea, Chile, universidades…), todas para dominicanos. Solo librería estándar.

    python scripts/actualizar_becastufuturo.py          actualiza el archivo
    python scripts/actualizar_becastufuturo.py --seco   muestra qué encontró, sin guardar

Cómo lee el sitio: la lista /convocatorias se pinta con JavaScript, pero cada /convocatorias/{id} trae sus datos en
__NEXT_DATA__ (nombre, fechas en UTC, requisitos, tipo y a quién va dirigida). Los id son correlativos, así que se
revisan desde un poco antes del último id conocido hasta encontrar varios vacíos seguidos. Después corre
`npm run data:import`.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "becas-tu-futuro.json"
BASE = "https://becas.gob.do/convocatorias"
UA = {"User-Agent": "Mozilla/5.0 (Apliko; catalogo de becas)"}
RD = timezone(timedelta(hours=-4))  # República Dominicana, sin horario de verano
LOOK_BACK = 12  # convocatorias viejas que pueden seguir abiertas
EMPTY_STOP = 6  # id vacíos seguidos tras el último encontrado
FIRST_KNOWN = 50  # Generación STEAM 2.0, noviembre de 2026


def to_text(fragment: str | None) -> str:
    if not fragment:
        return ""
    fragment = re.sub(r"<br\s*/?>|</(p|li|h\d|div)>", "\n", fragment, flags=re.I)
    text = html.unescape(re.sub(r"<[^>]+>", " ", fragment))
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


def short(text: str, limit: int) -> str:
    text = re.sub(r"\s*\n\s*", " ", text).strip()
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def read(cid: int) -> dict | None:
    """The call's data, or None when the id has no convocatoria."""
    req = urllib.request.Request(f"{BASE}/{cid}", headers=UA)
    page = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")
    found = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page, re.S)
    if not found:
        raise ValueError("la página no trae __NEXT_DATA__")
    queries = json.loads(found.group(1))["props"]["pageProps"]["dehydratedState"]["queries"]
    by_key: dict[str, dict] = {}
    for q in queries:
        data = q.get("state", {}).get("data") or {}
        data = data.get("data", data) if isinstance(data, dict) else {}
        by_key[str(q.get("queryKey", [""])[0])] = data
    main = next((v for k, v in by_key.items() if re.search(r"convocatoria/\d+/show", k)), None)
    if not main or not main.get("nombre"):
        return None
    tipo = next((v.get("nombre") for k, v in by_key.items() if "tipo-convocatoria" in k), "") or ""
    dirigido = next((v.get("nombre") for k, v in by_key.items() if "datos-dirigido" in k), "") or ""
    return {"id": cid, **main, "tipo": tipo, "dirigido": dirigido}


def utc(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def row(c: dict) -> dict:
    opens, closes = utc(c.get("fecha_inicio")), utc(c["fecha_fin"])
    return {
        "id": c["id"],
        "name": re.sub(r"\s+", " ", c["nombre"]).strip(),
        "tipo": c["tipo"],
        "dirigido": c["dirigido"],
        "offers": c.get("cantidad_ofertas") or 0,
        "opens": opens.astimezone(RD).date().isoformat() if opens else None,
        "deadline": closes.astimezone(RD).date().isoformat(),
        "general": short(to_text(c.get("requisitos_generales")), 500),
        "academic": short(to_text(c.get("requisitos_academicos")), 900),
        "url": f"{BASE}/{c['id']}",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seco", action="store_true", help="no guarda nada")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    last_known = FIRST_KNOWN
    if OUT.exists():
        last_known = max(last_known, json.loads(OUT.read_text(encoding="utf-8")).get("ultimo_id", 0))

    now = datetime.now(timezone.utc)
    calls: list[dict] = []
    highest, empty, cid = 0, 0, max(1, last_known - LOOK_BACK)
    errors = 0
    while empty < EMPTY_STOP or cid <= last_known:
        try:
            c = read(cid)
        except Exception as error:  # one broken page must not stop the rest
            print(f"Sin datos de la convocatoria {cid}: {error}", file=sys.stderr)
            c, errors = None, errors + 1
        if c:
            calls.append(c)
            highest, empty = cid, 0
        else:
            empty += 1
        cid += 1
        time.sleep(0.5)

    if not calls:
        print(f"No leí ninguna convocatoria ({errors} errores): no reescribo {OUT.name} por si el sitio cambió.", file=sys.stderr)
        return 1

    rows = sorted((row(c) for c in calls if utc(c.get("fecha_fin")) and utc(c["fecha_fin"]) > now), key=lambda r: r["deadline"])
    print(f"{len(calls)} convocatorias leídas (hasta el id {highest}), {len(rows)} abiertas o por abrir.")
    for r in rows:
        print(f"  {r['deadline']}  #{r['id']} {r['name'][:70]}  ({r['tipo']}, {r['offers']} ofertas)")
    if args.seco:
        return 0
    body = {"ultimo_id": max(highest, last_known), "convocatorias": rows}
    OUT.write_text(json.dumps(body, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"Guardado {OUT.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
