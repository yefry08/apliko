"""
Trae oportunidades nuevas de los feeds RSS y decide, con reglas propias, cuáles le sirven a un
estudiante dominicano o latino. Solo usa la librería estándar de Python: no cuesta nada.

    python scripts/ingest_rss.py               procesa lo nuevo y actualiza el catálogo
    python scripts/ingest_rss.py --seco        muestra qué haría, sin guardar nada
    python scripts/ingest_rss.py --revisar     no aprueba nada solo: todo queda pendiente

Cada entrada termina en data/rss/candidates.json con un estado:
    aprobada    las reglas están seguras: entra al catálogo con `npm run data:import`
    pendiente   parece útil pero falta algo (elegibilidad o fecha): revísala y cámbiala a "aprobada"
    descartada  no aplica, con el motivo
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "data" / "rss" / "candidates.json"

FEEDS = [
    ("Opportunities for Youth", "https://opportunitiesforyouth.org/feed/"),
    ("fundsforNGOs", "https://fundsforngos.org/feed/"),
]

CONTENT_NS = "{http://purl.org/rss/1.0/modules/content/}encoded"
USER_AGENT = "Apliko/1.0 (becas para estudiantes dominicanos)"

# --------------------------------------------------------------------------- texto


def to_text(fragment: str) -> str:
    fragment = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", fragment or "", flags=re.I)
    fragment = re.sub(r"<br\s*/?>|</(p|li|h\d|div|tr)>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    fragment = html.unescape(fragment)
    fragment = re.sub(r"[ \t ]+", " ", fragment)
    return re.sub(r" *\n\s*", "\n", fragment).strip()


def fold(s: str) -> str:
    """Minúsculas y sin tildes, para comparar."""
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", fold(s)).strip("-")[:80]


def has(text: str, *patterns: str) -> bool:
    return any(re.search(p, text) for p in patterns)


# --------------------------------------------------------------------------- feeds


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def parse_feed(xml: str, feed: str) -> list[dict]:
    items = []
    for it in ET.fromstring(xml).iter("item"):
        link = (it.findtext("link") or "").strip()
        body_html = it.findtext(CONTENT_NS) or it.findtext("description") or ""
        published = None
        if it.findtext("pubDate"):
            try:
                published = parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc).isoformat()
            except (TypeError, ValueError):
                pass
        items.append(
            {
                "guid": (it.findtext("guid") or link).strip(),
                "feed": feed,
                "link": link,
                "title": to_text(it.findtext("title") or ""),
                "publishedAt": published,
                "categories": [c.text.strip() for c in it.findall("category") if c.text],
                "html": body_html,
                "text": to_text(body_html),
            }
        )
    return items


# --------------------------------------------------------------------------- reglas

# Nombres en español iguales a los de lib/geo.ts, para que el globo los ubique.
PLACES = {
    "dominican republic": "República Dominicana",
    "united states": "Estados Unidos", "usa": "Estados Unidos", "u.s.": "Estados Unidos",
    "washington": "Estados Unidos", "new york": "Estados Unidos", "boston": "Estados Unidos",
    "san francisco": "Estados Unidos", "stanford": "Estados Unidos", "harvard": "Estados Unidos",
    "canada": "Canadá", "toronto": "Canadá", "montreal": "Canadá", "vancouver": "Canadá",
    "mexico": "México", "brazil": "Brasil", "argentina": "Argentina", "chile": "Chile",
    "colombia": "Colombia", "peru": "Perú", "panama": "Panamá", "costa rica": "Costa Rica",
    "spain": "España", "madrid": "España", "barcelona": "España",
    "portugal": "Portugal", "lisbon": "Portugal",
    "france": "Francia", "paris": "Francia",
    "germany": "Alemania", "berlin": "Alemania", "munich": "Alemania", "heidelberg": "Alemania",
    "united kingdom": "Reino Unido", "uk": "Reino Unido", "england": "Reino Unido", "scotland": "Reino Unido",
    "london": "Reino Unido", "oxford": "Reino Unido", "cambridge": "Reino Unido", "edinburgh": "Reino Unido",
    "shrivenham": "Reino Unido",
    "ireland": "Irlanda", "dublin": "Irlanda",
    "italy": "Italia", "rome": "Italia", "milan": "Italia",
    "switzerland": "Suiza", "geneva": "Suiza", "zurich": "Suiza", "lausanne": "Suiza",
    "austria": "Austria", "vienna": "Austria",
    "belgium": "Bélgica", "brussels": "Bélgica",
    "netherlands": "Países Bajos", "amsterdam": "Países Bajos", "the hague": "Países Bajos",
    "sweden": "Suecia", "denmark": "Dinamarca", "finland": "Finlandia", "norway": "Noruega",
    "hungary": "Hungría", "poland": "Polonia", "romania": "Rumania", "czech republic": "República Checa",
    "lithuania": "Lituania", "estonia": "Estonia", "greece": "Grecia", "bulgaria": "Bulgaria",
    "montenegro": "Montenegro", "turkey": "Turquía", "israel": "Israel", "russia": "Rusia",
    "saudi arabia": "Arabia Saudita", "qatar": "Qatar", "doha": "Qatar",
    "united arab emirates": "Emiratos Árabes Unidos", "uae": "Emiratos Árabes Unidos", "dubai": "Emiratos Árabes Unidos",
    "india": "India", "china": "China", "beijing": "China", "shanghai": "China", "hong kong": "Hong Kong",
    "taiwan": "Taiwán", "japan": "Japón", "tokyo": "Japón", "south korea": "Corea del Sur", "korea": "Corea del Sur",
    "seoul": "Corea del Sur", "singapore": "Singapur", "indonesia": "Indonesia", "kazakhstan": "Kazajistán",
    "australia": "Australia", "sydney": "Australia", "melbourne": "Australia", "new zealand": "Nueva Zelanda",
    "south africa": "Sudáfrica", "ghana": "Ghana", "accra": "Ghana", "kenya": "Kenia", "nairobi": "Kenia",
    "nigeria": "Nigeria", "egypt": "Egipto", "luxembourg": "Luxemburgo",
}
PLACE_RE = re.compile(r"(?<![\w.])(" + "|".join(sorted(map(re.escape, PLACES), key=len, reverse=True)) + r")(?![\w])")

TYPES = [
    ("Beca", r"\bscholarships?\b|\bbursar(y|ies)\b|\bbecas?\b"),
    ("Fellowship", r"\bfellowships?\b"),
    ("Internship", r"\binternships?\b|\bintern\b|\btraineeships?\b|\bpasant[ií]as?\b"),
    ("Programa de verano", r"\bsummer (school|program|programme|institute)\b"),
    ("Intercambio", r"\bexchange (program|programme)\b"),
    ("Premio", r"\b(award|prize|competition|contest|challenge)\b"),
    ("Conferencia", r"\b(conference|summit|forum)\b"),
    ("Investigación", r"\bresearch (grant|fellowship|program|programme)\b"),
]

STUDENT = (
    r"\bstudents?\b", r"\bundergraduates?\b", r"\bgraduates?\b", r"\bpostgraduates?\b", r"\bmaster'?s\b",
    r"\bph\.?d\b", r"\bdoctoral\b", r"\bbachelor'?s\b", r"\bearly[- ]career\b", r"\byoung (people|researchers|professionals|leaders)\b",
    r"\byouth\b", r"\brecent graduates?\b", r"\buniversity students\b", r"\bestudiantes?\b",
)
SENIOR = (r"\bmid[- ]career\b", r"\bexperienced (researchers|professionals|academics)\b", r"\bsenior (researchers|professionals|academics)\b", r"\bestablished (researchers|academics)\b")
JOB = (r"\bjobs?\b", r"\bvacanc(y|ies)\b", r"\b(analyst|officer|manager|coordinator|director|assistant)\b", r"\bper year\b", r"\bfull[- ]time\b", r"\bhiring\b")
FOR_ORGS = (
    r"\bfor (ngos|nonprofits|non-profits|organi[sz]ations|cso?s|civil society)\b", r"\bgrassroots organi[sz]ations\b",
    r"\bcall for proposals\b", r"\binvites? (research )?proposals\b", r"\bcfps?\b", r"\bcfas?\b",
    r"\bnominations?\b", r"\beligible organi[sz]ations\b", r"\bfunding for (ngos|organi[sz]ations|projects)\b",
)
DIGEST = (r"^\d+\+?\s", r"\bnewsletter\b", r"\bopportunities for (young people|youth)$", r"\bround[- ]?up\b")

MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}
MON = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+" + MON + r"[\s,-]+(\d{4})\b"),  # 25 September 2026 / 07-Jul-2027
    re.compile(r"\b" + MON + r"\s+(?:\d{1,2}\s*[–-]\s*)?(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b"),  # October 31, 2026 / Sept 14–18, 2026
    re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"),
]
DEADLINE_HINT = re.compile(r"deadline|closes?|closing date|due (date|by)|apply by|open until|applications? (close|end)|submit .{0,30} by", re.I)


def month_num(s: str) -> int:
    s = s.lower()
    return next(n for name, n in MONTHS.items() if name.startswith(s[:3]))


def parse_date(snippet: str) -> date | None:
    s = snippet.lower()
    for i, pat in enumerate(DATE_PATTERNS):
        m = pat.search(s)
        if not m:
            continue
        try:
            if i == 0:
                return date(int(m.group(3)), month_num(m.group(2)), int(m.group(1)))
            if i == 1:
                return date(int(m.group(3)), month_num(m.group(1)), int(m.group(2)))
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            continue
    return None


def find_deadline(text: str) -> tuple[str, date | None]:
    """('exacta', fecha) | ('continua', None) | ('por-confirmar', None)."""
    for m in DEADLINE_HINT.finditer(text):
        found = parse_date(text[m.start(): m.start() + 140])
        if found:
            return "exacta", found
    if re.search(r"rolling basis|no (fixed )?deadline|open year[- ]round", text, re.I):
        return "continua", None
    return "por-confirmar", None


def eligibility(text: str) -> tuple[str, str, str | None]:
    """(abierta a dominicanos: si|no|no-claro, regla de ciudadanía, fragmento que lo justifica)."""
    # Las preguntas de un FAQ ("Is it open worldwide?") no son afirmaciones: fuera.
    # "U.S." sin puntos, para que el punto no corte la frase.
    t = re.sub(r"\bu\.\s?s\.", "u.s", fold(text))
    t = " ".join(s for s in re.split(r"(?<=[.!?])\s+|\n+", t) if not s.rstrip().endswith("?"))

    def snippet(pattern: str) -> str | None:
        m = re.search(r"[^.\n]{0,80}" + pattern + r"[^.\n]{0,100}", t)
        return m.group(0).strip() if m else None

    def affirmed(pattern: str) -> bool:
        """El patrón aparece sin una negación justo después ("international students are not eligible")."""
        return any(
            not re.match(r"[^.\n]{0,40}\b(not eligible|ineligible|cannot|can not|are excluded|may not)\b", t[m.end():])
            for m in re.finditer(pattern, t)
        )

    if "dominican republic" in t or "republica dominicana" in t:
        return "si", "paises-elegibles", snippet("dominican republic|republica dominicana")
    # Una restricción concreta pesa más que una frase general como "international applicants".
    restricted = (
        r"(citizens?|nationals?|residents?) of (an? )?(eu|european union) member states?",
        r"(citizens?|nationals?|residents?) of (the )?(eu|european union|europe|eea)\b",
        r"\beuropean (citizens|nationals|professionals)\b", r"eligible (european|african|eu|commonwealth) countries",
        r"from across (europe|africa)\b",
        r"(citizens?|nationals?) of (ebrd|oecd|commonwealth|nato) (member )?(countries|states)",
        r"\bafrican (citizens|nationals|youth|researchers|students|countries)\b", r"\bafrica[- ]based\b",
        r"(citizens?|nationals?|residents?) of (india|nigeria|kenya|ghana|pakistan|bangladesh|canada|australia|the uk|the united kingdom|denmark|the netherlands)\b",
        r"must be (a )?(canadian|european|african|indian|australian|british|danish) ",
        r"(based|residing|living) in (the )?(eu|europe|africa|india|canada|denmark|australia|the uk)\b",
    )
    for p in restricted:
        if re.search(p, t):
            return "no", "paises-elegibles", snippet(p)
    global_open = (
        r"all nationalities", r"any nationality", r"regardless of (their )?nationality", r"all countries",
        r"(from|around) (all over )?the world", r"\bopen worldwide\b", r"international (students|applicants)",
        r"open to (applicants|candidates|students) from (any|all)", r"no (nationality|citizenship) restrictions?",
        r"globally open", r"open globally",
    )
    for p in global_open:
        if affirmed(p):
            return "si", "global", snippet(p)
    # Latinoamérica nombrada junto a otros continentes es una convocatoria global.
    continents = len(re.findall(r"\b(asia|africa|europe|north america|oceania|middle east)\b", t))
    latam = r"latin america|latinoamerica|caribbean|caribe|iberoameric"
    if affirmed(latam):
        return "si", "global" if continents >= 2 else "latam", snippet(latam)
    if re.search(r"daca", t) and re.search(r"u\.?s\.? citizens?", t):
        return "no", "eeuu-daca", snippet("daca")
    if re.search(r"(u\.?s\.?|united states) citizens? or (lawful )?permanent residents?", t):
        return "no", "eeuu-residente", snippet(r"permanent residents?")
    if re.search(r"(must be|only|open to) (a )?(u\.?s\.?|united states) citizens?|citizens of the united states", t):
        return "no", "solo-eeuu", snippet(r"u\.?s\.? citizens?|citizens of the united states")
    developing = r"developing countries|low-?\s*(and|&)\s*middle[- ]income|\blmics?\b|global south|oda[- ]eligible"
    if re.search(developing, t):
        return "no-claro", "paises-elegibles", snippet(developing)
    return "no-claro", "ver-notas", None


def detect_funding(t: str) -> str:
    if re.search(r"(no|without an?|free of) (application |registration )?fees?|free to apply", t):
        fee = False
    else:
        fee = bool(re.search(r"(application|registration|participation|program(me)?) fee", t))
    if re.search(r"fully[- ]funded|full scholarship|full funding|covers? (all|full) (costs|expenses)", t):
        return "completa"
    if fee:
        return "con-costo"
    if re.search(r"stipend|monthly allowance|\ballowance\b|\bpaid\b|salary", t):
        return "estipendio"
    if re.search(r"partial(ly)? funded|partial scholarship|tuition (waiver|discount)|up to (usd |us)?\$", t):
        return "parcial"
    return "varia"


def detect_levels(t: str) -> list[str]:
    rules = [
        ("secundaria", r"high school|secondary school"),
        ("pregrado", r"undergraduate|bachelor'?s|college students"),
        ("maestria", r"master'?s|postgraduate|graduate students"),
        ("doctorado", r"ph\.?d|doctoral|postdoc"),
        ("recien-graduado", r"recent graduates?|early[- ]career|young professionals"),
        ("profesional", r"mid[- ]career|years of (professional )?experience|professionals\b"),
    ]
    return [lvl for lvl, p in rules if re.search(p, t)]


AREAS = [
    ("Periodismo", r"journalis|reporting|storytell"),
    ("Salud", r"medic|health|clinical|nursing"),
    ("Ingeniería", r"engineering"),
    ("Tecnología", r"computer science|artificial intelligence|\bai\b|software|data science|technology"),
    ("Derecho", r"\blaw\b|legal"),
    ("Políticas públicas", r"public policy|policy|governance|diplomacy"),
    ("Economía", r"economics|economic|finance"),
    ("Negocios", r"business|entrepreneur|startup|corporate strategy"),
    ("Medio ambiente", r"climate|environment|sustainab|conservation"),
    ("Ciencias", r"\bscience\b|\bstem\b|physics|chemistry|biology|mathematics"),
    ("Educación", r"education|teaching"),
    ("Artes", r"\barts?\b|design|music|film|creative"),
    ("Seguridad", r"security|defen[cs]e"),
    ("Migración", r"migration|refugee"),
]


def detect_areas(t: str) -> list[str]:
    return [a for a, p in AREAS if re.search(p, t)][:4]


def detect_places(title: str, text: str) -> list[str]:
    found: list[str] = []
    for source in (fold(title), fold(text[:700])):
        for m in PLACE_RE.finditer(source):
            name = PLACES[m.group(1)]
            if name not in found:
                found.append(name)
        if found:
            break
    if re.search(r"\b(remote|online|virtual)\b", fold(title)):
        found.insert(0, "En línea")
    return found[:3] or ["Mundial"]


def clean_name(title: str) -> str:
    t = re.sub(r"[\U0001F1E6-\U0001F1FF\U0001F300-\U0001FAFF]", "", title).strip()
    t = re.sub(r"^(call for (applications|nominations|proposals)|cfas?|cfps?)\s*[:\-–]\s*", "", t, flags=re.I)
    t = re.sub(r"^[A-Z][\w ]{1,30}:\s+(?=Call for)", "", t)  # "India: Call for ..."
    head = re.split(r"\s*:\s+", t, maxsplit=1)[0]
    return (head if len(head) >= 12 else t).strip(" –-")


def detect_sponsor(text: str) -> str | None:
    head = text[:600]
    m = re.search(r"(?:^|\n|\. )(?:The )?([A-Z][\w&’'().,\- ]{2,90}?) (?:is|are|has) (?:now )?(?:inviting|accepting|calling|offering|launched|launching|opening)", head)
    if m:
        return m.group(1).strip()
    m = re.search(r"hosted by (?:the )?([A-Z][^,.\n]{2,80})", head)
    if m:
        return m.group(1).strip()
    m = re.search(r"(?:[Pp]rogram(?:me)?|[Ff]ellowship|[Ss]cholarship|[Ii]nternship) at (?:the )?([A-Z][\w&’'\- ]{2,60}?)(?: \([A-Z]{2,8}\))?\s*[,.(]", head)
    return m.group(1).strip() if m else None


def strip_tracking(url: str) -> str:
    p = urlparse(url)
    query = [(k, v) for k, v in parse_qsl(p.query) if not k.lower().startswith("utm_")]
    return urlunparse(p._replace(query=urlencode(query)))


def detect_apply_url(body_html: str, feed_link: str) -> str | None:
    feed_host = urlparse(feed_link).netloc
    for href, label in re.findall(r"<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", body_html or "", flags=re.S | re.I):
        label = fold(to_text(label))
        if urlparse(href).netloc in ("", feed_host) or not href.startswith("http"):
            continue
        if re.search(r"\bapply\b|application (portal|form|page)|official .{0,40}(page|site|website)|register", label):
            return strip_tracking(href)
    return None


def summarize(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.replace("\n", " "))
    out = ""
    for s in sentences:
        if len(out) + len(s) > 320:
            break
        out = f"{out} {s}".strip()
    return out or text[:320]


# --------------------------------------------------------------------------- decisión


def classify(item: dict, today: date, auto_approve: bool, fetched_at: str) -> dict:
    title, text = item["title"], item["text"]
    head = fold(f"{title}\n{' '.join(item['categories'])}")
    body = fold(text)

    # A quién va dirigida se decide con el título y el arranque del texto: los artículos largos
    # mencionan "students" o "university" de pasada aunque la convocatoria no sea para ellos.
    lead = fold(f"{title}\n{text[:1200]}")
    types = [name for name, p in TYPES if re.search(p, head)] or [name for name, p in TYPES if re.search(p, fold(text[:800]))]
    is_internship = "Internship" in types
    student = has(lead, *STUDENT) or is_internship
    senior = has(lead, *SENIOR) and not has(lead, r"\bearly[- ]career\b", r"\bstudents?\b", r"\bgraduates?\b")
    # "Early-career" también se usa para posdoctorados que ya investigan por su cuenta.
    postdoc = has(lead, r"research independence", r"independent research careers?", r"\bpostdoc(toral)?\b") and not has(
        lead, r"\bstudents?\b", r"\bgraduates?\b"
    )
    senior = senior or postdoc
    job = (has(head, *JOB) or "jobs" in head) and not is_internship
    for_orgs = has(head, *FOR_ORGS) or has(fold(text[:800]), *FOR_ORGS)
    digest = has(fold(title), *DIGEST) or "newsletter" in fold(" ".join(item["categories"]))

    open_rd, citizenship, citizenship_raw = eligibility(text)
    kind, deadline = find_deadline(text)

    reasons = []
    if digest:
        reasons.append("es un boletín o una lista de varias oportunidades")
    elif for_orgs:
        reasons.append("es para organizaciones, no para personas")
    elif job:
        reasons.append("es un empleo")
    elif not types:
        reasons.append("no parece una beca, fellowship ni programa")
    elif not student or senior:
        reasons.append("no está dirigida a estudiantes ni recién graduados")
    if open_rd == "no":
        reasons.append(f"no admite dominicanos ({citizenship_raw})" if citizenship_raw else "no admite dominicanos")
    if deadline and deadline < today:
        reasons.append(f"ya cerró ({deadline.isoformat()})")

    missing = []
    if open_rd == "no-claro":
        missing.append("confirmar si admite dominicanos")
    if kind != "exacta":
        missing.append("sin fecha de cierre exacta")

    if reasons:
        state, motive = "descartada", "; ".join(reasons).capitalize() + "."
    elif auto_approve and not missing:
        state, motive = "aprobada", f"Aprobada sola: {', '.join(types).lower()} abierta a dominicanos, cierra el {deadline.isoformat()}."
    else:
        state, motive = "pendiente", ("Revisar: " + "; ".join(missing) + ".") if missing else "Revisar antes de publicar."

    name = clean_name(title)
    slug = slugify(name)
    opportunity = {
        "id": f"rss-{slug}",
        "slug": slug,
        "name": name,
        "sponsor": detect_sponsor(text),
        "source": "rss",
        "sourceName": item["feed"],
        "types": types,
        "areas": detect_areas(fold(f"{title}\n{text[:2000]}")),
        "levels": detect_levels(body),
        "destinations": detect_places(title, text),
        "funding": detect_funding(body),
        # Si no está claro, que la ficha diga "revisa requisitos" en vez de "puedes postular".
        "citizenship": citizenship,
        "citizenshipRaw": citizenship_raw,
        "deadline": {"kind": kind, "date": deadline.isoformat()} if deadline else {"kind": kind},
        "notes": summarize(text),
        "url": item["link"],
        "applyUrl": detect_apply_url(item["html"], item["link"]),
        "updatedAt": fetched_at[:10],
    }
    return {
        "guid": item["guid"],
        "feed": item["feed"],
        "link": item["link"],
        "title": title,
        "publishedAt": item["publishedAt"],
        "fetchedAt": fetched_at,
        "estado": state,
        "motivo": motive,
        "oportunidad": {k: v for k, v in opportunity.items() if v not in (None, "")},
    }


# --------------------------------------------------------------------------- ejecución


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seco", action="store_true", help="no guarda nada")
    parser.add_argument("--revisar", action="store_true", help="no aprueba nada solo")
    parser.add_argument("--sin-importar", action="store_true", help="no corre npm run data:import al final")
    args = parser.parse_args()

    existing = json.loads(CANDIDATES.read_text(encoding="utf-8")) if CANDIDATES.exists() else []
    known = {c["guid"] for c in existing}
    now = datetime.now(timezone.utc)
    fetched_at = now.isoformat(timespec="seconds")
    today = now.astimezone().date()

    items = []
    for name, url in FEEDS:
        try:
            got = parse_feed(fetch(url), name)
            print(f"{name}: {len(got)} entradas")
            items.extend(got)
        except Exception as e:  # un feed caído no detiene al otro
            print(f"{name}: no se pudo leer ({e})")
    new = [it for it in items if it["guid"] and it["guid"] not in known]
    if not new:
        print("Nada nuevo.")
        return 0

    results = [classify(it, today, not args.revisar, fetched_at) for it in new]
    for c in results:
        print(f"  {c['estado']:<10} {c['title'][:70]}\n             {c['motivo'][:110]}")

    counts = {s: sum(c["estado"] == s for c in results) for s in ("aprobada", "pendiente", "descartada")}
    print(f"\n{len(results)} nuevas: {counts['aprobada']} aprobadas, {counts['pendiente']} pendientes, {counts['descartada']} descartadas.")
    if args.seco:
        print("Modo seco: no se guardó nada.")
        return 0

    CANDIDATES.parent.mkdir(parents=True, exist_ok=True)
    CANDIDATES.write_text(json.dumps(existing + results, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Guardado en {CANDIDATES.relative_to(ROOT)}.")

    if counts["aprobada"] and not args.sin_importar:
        print("Actualizando el catálogo…")
        return subprocess.call("npm run -s data:import", shell=True, cwd=ROOT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
