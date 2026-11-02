"""
Trae de YouNoodle (apply.younoodle.com/showcase) las competencias, aceleradoras y premios para emprendedores
que siguen abiertos, y reescribe data/raw/younoodle.json. La página es Astro: los datos viajan en el atributo
`props` de cada <astro-island>, serializados como [tipo, valor]. Solo librería estándar.

    python scripts/actualizar_younoodle.py          actualiza el archivo
    python scripts/actualizar_younoodle.py --seco   muestra qué encontró, sin guardar

Las que ya están curadas a mano en data/raw/financiamiento.json (misma URL) no se duplican: lo hace
scripts/import-data.ts. Después corre `npm run data:import`.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "younoodle.json"
BASE = "https://apply.younoodle.com/showcase"
UA = {"User-Agent": "Mozilla/5.0 (Apliko; catalogo de becas)"}
PROPS = re.compile(r'<astro-island[^>]*?\sprops="([^"]*)"', re.S)


def get(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")


def decode(value):
    """Astro's island serialization: [0, plain value or object] and [1, array of encoded values]."""
    if not isinstance(value, list) or len(value) != 2:
        return value
    kind, inner = value
    if kind == 0:
        return {k: decode(v) for k, v in inner.items()} if isinstance(inner, dict) else inner
    if kind == 1:
        return [decode(v) for v in inner]
    return inner


def programs(page: str) -> list[dict]:
    found: dict[str, dict] = {}
    for raw in PROPS.findall(page):
        try:
            props = json.loads(html.unescape(raw))
        except json.JSONDecodeError:
            continue
        for p in decode(props.get("programs", [1, []])) or []:
            if isinstance(p, dict) and p.get("identifier"):
                found.setdefault(p["identifier"], p)
    return list(found.values())


def local_date(ms: int, tz: str | None) -> str:
    moment = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    if tz and ZoneInfo:
        try:
            moment = moment.astimezone(ZoneInfo(tz))
        except Exception:
            pass
    return moment.date().isoformat()


def details(identifier: str) -> tuple[bool, str]:
    """Whether the program's page says it is open, and the first lines of its description as plain text.
    YouNoodle marks some programs "Closed" before their listed deadline."""
    page = get(f"{BASE}/competition/{identifier}")
    page = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", page, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", " ", page))
    text = re.sub(r"\s+", " ", text).strip()
    start = text.find("Program details")
    if start < 0:
        start = text.find("Detalles del programa")
    header = text[:start] if start >= 0 else text[:300]
    is_open = re.search(r"\bClosed\b|\bCerrad[oa]\b", header) is None
    text = text[start:] if start >= 0 else text
    text = re.sub(r"^(Program details|Detalles del programa)\s*", "", text)
    return is_open, (text[:500].rsplit(" ", 1)[0] + "…" if len(text) > 500 else text)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seco", action="store_true", help="no guarda nada")
    args = parser.parse_args()

    listed = programs(get(BASE))
    # An empty listing means the page changed, not that YouNoodle has nothing: keep the old file.
    if len(listed) < 5:
        print(f"Solo {len(listed)} programas en YouNoodle: no reescribo {OUT.name} por si la página cambió.", file=sys.stderr)
        return 1

    now_ms = time.time() * 1000
    open_now = [p for p in listed if isinstance(p.get("deadline_at"), (int, float)) and p["deadline_at"] > now_ms]
    rows = []
    for p in sorted(open_now, key=lambda p: p["deadline_at"]):
        try:
            is_open, description = details(p["identifier"])
        except Exception as error:  # one broken page must not stop the rest
            print(f"Sin detalle para {p['identifier']}: {error}", file=sys.stderr)
            is_open, description = True, ""
        if not is_open:
            print(f"  (cerrada en YouNoodle aunque su fecha no pasó: {p['name']})")
            continue
        rows.append(
            {
                "name": str(p["name"]).strip(),
                "identifier": p["identifier"],
                "deadline": local_date(int(p["deadline_at"]), p.get("timezone")),
                "url": f"{BASE}/competition/{p['identifier']}",
                "description": description,
            }
        )

    print(f"{len(listed)} programas en YouNoodle, {len(rows)} abiertos con fecha.")
    for r in rows:
        print(f"  {r['deadline']}  {r['name']}")
    if args.seco:
        return 0
    OUT.write_text("[\n" + ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n", encoding="utf-8", newline="\n")
    print(f"Guardado {OUT.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
