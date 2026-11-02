#!/usr/bin/env python3
"""Actualiza data/noticias.js y data/noticias.json a partir de feeds RSS/Atom.

- Solo usa la biblioteca estándar de Python.
- Tolera feeds caídos: si ninguno responde no sobrescribe los datos existentes.
- Pensado para correr en GitHub Actions a las 08:00 y 23:00 (hora de Lima).
"""
import datetime as dt
import email.utils
import hashlib
import html
import json
import os
import re
import sys
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlsplit, urlunsplit

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "data")
ARCHIVO_JS = os.path.join(DATOS, "noticias.js")
ARCHIVO_JSON = os.path.join(DATOS, "noticias.json")

MAX_POR_SECTOR = 24
MAX_POR_SECTOR_ESPECIAL = {"ia": 40}  # IA cubre Perú y mundo
MAX_POR_FEED = 15
DIAS_MAXIMOS = 30
TIMEOUT = 20
MAX_BYTES = 3 * 1024 * 1024
MAX_BYTES_HTML = 250 * 1024
MAX_IMAGENES_POR_EJECUCION = 40
UA = "PeruEnClaroBot/1.0 (+https://github.com/Willy4903/demo-taller-ia)"

# nombre, [urls alternativas], tipo, sector por defecto (None = clasificar por palabras clave)
FEEDS = [
    # Independientes / sin fines de lucro
    ("IDL-Reporteros", ["https://www.idl-reporteros.pe/feed/"], "independiente", "investigacion"),
    ("OjoPúblico", ["https://ojo-publico.com/rss.xml", "https://ojo-publico.com/feed"], "independiente", "investigacion"),
    ("Convoca", ["https://convoca.pe/feed"], "independiente", "investigacion"),
    ("Hildebrandt en sus trece", ["https://www.hildebrandtensustrece.com/feed/"], "independiente", None),
    ("Wayka", ["https://wayka.pe/feed/"], "independiente", None),
    ("La Mula", ["https://www.lamula.pe/feed/"], "independiente", None),
    ("Salud con Lupa", ["https://saludconlupa.com/feed/"], "independiente", "salud"),
    ("Mongabay Latam", ["https://es.mongabay.com/feed/"], "independiente", "coyuntura"),
    ("Caretas", ["https://caretas.pe/feed/"], "comercial", None),
    # Comerciales
    ("El Comercio", ["https://elcomercio.pe/arc/outboundfeeds/rss/?outputType=xml"], "comercial", None),
    ("Gestión", ["https://gestion.pe/arc/outboundfeeds/rss/?outputType=xml"], "comercial", "economia"),
    ("La República", ["https://larepublica.pe/rss/"], "comercial", None),
    ("RPP", ["https://rpp.pe/feed"], "comercial", None),
    ("Infobae Perú", ["https://www.infobae.com/arc/outboundfeeds/rss/category/peru/"], "comercial", None),
    ("Expreso", ["https://www.expreso.com.pe/feed/"], "comercial", None),
    ("El Búho", ["https://elbuho.pe/feed/"], "comercial", None),
    # Internacionales
    ("BBC Mundo", ["https://feeds.bbci.co.uk/mundo/rss.xml"], "internacional", "mundo"),
    ("DW Español", ["https://rss.dw.com/xml/rss-sp-all"], "internacional", "mundo"),
    ("El País América", ["https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/america/portada"], "internacional", "mundo"),
    ("France 24 Español", ["https://www.france24.com/es/rss"], "internacional", "mundo"),
    ("ONU Noticias", ["https://news.un.org/feed/subscribe/es/news/all/rss.xml"], "internacional", "mundo"),
    # Inteligencia artificial: Perú y mundo (Google Noticias agrega varios medios; la fuente real viene en <source>)
    ("Google Noticias · IA en el Perú", ["https://news.google.com/rss/search?q=%22inteligencia+artificial%22+Per%C3%BA+when:7d&hl=es-419&gl=PE&ceid=PE:es-419"], "comercial", "ia"),
    ("Google Noticias · IA en el mundo", ["https://news.google.com/rss/search?q=%22inteligencia+artificial%22+(OpenAI+OR+Anthropic+OR+Google+OR+regulaci%C3%B3n+OR+NVIDIA)+when:7d&hl=es-419&gl=US&ceid=US:es-419"], "internacional", "ia"),
]

CLAVES = {
    "politica": ["congreso", "senad", "diputad", "president", "ministr", "gabinete", "premier", "jne", "onpe", "eleccion",
                 "partido", "fuerza popular", "vacancia", "censura", "reforma", "constitucion", "bancada", "ejecutivo",
                 "parlament", "alcalde", "regional", "bicameral"],
    "economia": ["pbi", "inflacion", "bcrp", "economi", "mef", "sunat", "inversion", "exportacion", "dolar", "tipo de cambio",
                 "mineria", "empleo", "sueldo", "igv", "tasa de interes", "banco", "bolsa", "precio", "canasta", "arancel",
                 "cobre", "oro", "minero", "fiscal ", "deficit", "credito"],
    "salud": ["salud", "minsa", "essalud", "dengue", "hospital", "vacuna", "epidemi", "enfermedad", "medic", "paciente",
              "anemia", "covid", "brote", "sis ", "clinica", "cancer", "diresa"],
    "ia": ["inteligencia artificial", " ia ", "chatgpt", "openai", "anthropic", "gemini", "claude", "modelo de lenguaje",
           "machine learning", "aprendizaje automatico", "ia generativa", "agente de ia", "nvidia", "deepfake",
           "algoritmo", "robot", "copilot", "deepseek", "llm", "centro de datos", "ai act"],
    "tecnologia": ["tecnolog", "ciberseg", "hacker", "ciberataque", "datos personales",
                   "internet", "digital", "software", "aplicacion", "startup", "phishing", "5g", "satelit",
                   "ransomware", "celular"],
    "deporte": ["futbol", "liga 1", "seleccion", "deporte", "campeonato", "copa ", "olimpic", "voley", "tenis", "gol ",
                "entrenador", "alianza lima", "universitario", "sporting cristal", "mundial", "atleta", "clasificatoria"],
    "investigacion": ["investigacion", "fiscalia", "fiscal", "corrupcion", "reportaje", "lavado", "organizacion criminal",
                      "colaboracion eficaz", "allanamiento", "prision preventiva", "audios", "denuncia", "contraloria",
                      "extorsion", "crimen organizado", "narcotrafico", "sicari", "caso "],
    "coyuntura": ["protesta", "paro ", "seguridad ciudadana", "el nino", "huaico", "lluvia", "emergencia", "transporte",
                  "marcha", "inseguridad", "delincuencia", "clima", "sismo", "incendio", "apagon"],
}


def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def limpiar(s, n=280):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return (s[: n - 1].rsplit(" ", 1)[0] + "…") if len(s) > n else s


def descargar(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        datos = r.read(MAX_BYTES + 1)
    if len(datos) > MAX_BYTES:
        raise ValueError("feed demasiado grande")
    return datos


def descargar_parcial(url):
    """Lee solo el inicio de una página HTML (donde están las etiquetas <meta>)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read(MAX_BYTES_HTML).decode("utf-8", errors="replace")


RE_OG = [
    re.compile(r'<meta[^>]+(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\'][^>]*content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\']', re.I),
]


def imagen_og(url):
    try:
        cabecera = descargar_parcial(url)
    except Exception:  # noqa: BLE001
        return None
    for rx in RE_OG:
        m = rx.search(cabecera)
        if m:
            img = urljoin(url, html.unescape(m.group(1)).strip())
            if img.startswith("https://"):
                return img
    return None


def enriquecer_imagenes(items, previos):
    """Hereda imágenes ya conocidas y busca la foto de portada (og:image) de las notas nuevas."""
    conocidas = {url_canonica(i["url"]): i.get("imagen") for i in previos if i.get("imagen")}
    pendientes = []
    for it in items:
        if it.get("imagen") or urlsplit(it["url"]).netloc.endswith("news.google.com"):
            continue  # las páginas de Google Noticias no exponen la foto del medio
        k = url_canonica(it["url"])
        if k in conocidas:
            it["imagen"] = conocidas[k]
        else:
            pendientes.append(it)
    pendientes = pendientes[:MAX_IMAGENES_POR_EJECUCION]
    if pendientes:
        with ThreadPoolExecutor(max_workers=6) as ex:
            for it, img in zip(pendientes, ex.map(lambda i: imagen_og(i["url"]), pendientes)):
                it["imagen"] = img
    print(f"Imágenes de portada: {sum(1 for i in items if i.get('imagen'))}/{len(items)} notas")


def parsear_fecha(txt):
    if not txt:
        return None
    txt = txt.strip()
    try:
        d = email.utils.parsedate_to_datetime(txt)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(txt.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def url_canonica(u):
    p = urlsplit(u.strip())
    return urlunsplit((p.scheme, p.netloc.lower(), p.path.rstrip("/"), "", ""))


def etiqueta(tag):
    return tag.rsplit("}", 1)[-1]


def hijo_texto(el, *nombres):
    for h in el:
        if etiqueta(h.tag) in nombres and (h.text or "").strip():
            return h.text.strip()
    return ""


def extraer_imagen(el):
    for h in el.iter():
        t = etiqueta(h.tag)
        u = h.get("url") or ""
        if t in ("content", "thumbnail") and u.startswith("https://"):
            tipo = h.get("type", "")
            if t == "thumbnail" or tipo.startswith("image") or h.get("medium") == "image" or re.search(r"\.(jpe?g|png|webp)(\?|$)", u, re.I):
                return u
        if t == "enclosure" and u.startswith("https://") and h.get("type", "").startswith("image"):
            return u
    cuerpo = hijo_texto(el, "encoded", "description", "content", "summary")
    m = re.search(r'<img[^>]+src=["\'](https://[^"\']+)["\']', cuerpo or "", re.I)
    return m.group(1) if m else None


def parsear_feed(datos, nombre, tipo, sector_def):
    texto = datos.decode("utf-8", errors="replace")
    if re.search(r"<!ENTITY", texto, re.I):
        raise ValueError("feed con entidades XML no permitido")
    raiz = ET.fromstring(texto.encode("utf-8"))
    entradas = [e for e in raiz.iter() if etiqueta(e.tag) in ("item", "entry")]
    limite = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=DIAS_MAXIMOS)
    salida = []
    for e in entradas[:MAX_POR_FEED * 2]:
        titulo = limpiar(hijo_texto(e, "title"), 200)
        url = hijo_texto(e, "link")
        if not url:
            for h in e:
                if etiqueta(h.tag) == "link" and h.get("href"):
                    url = h.get("href")
                    break
        if not titulo or not url.startswith("http"):
            continue
        fecha = parsear_fecha(hijo_texto(e, "pubDate", "published", "updated", "date"))
        if fecha and fecha < limite:
            continue
        resumen = limpiar(hijo_texto(e, "description", "summary", "encoded", "content"))
        fuente = nombre
        if nombre.startswith("Google Noticias"):
            # Google Noticias agrega medios: el titular termina en " - Medio" y <source> trae el nombre real.
            fuente = limpiar(hijo_texto(e, "source"), 60) or nombre
            if fuente != nombre and titulo.endswith(" - " + fuente):
                titulo = titulo[: -len(fuente) - 3].strip()
            resumen = ""  # el resumen de Google Noticias solo repite el titular con enlaces
        item = {
            "id": hashlib.sha1(url_canonica(url).encode()).hexdigest()[:10],
            "sector": clasificar(titulo, resumen, sector_def),
            "titulo": titulo,
            "resumen": resumen if norm(resumen) != norm(titulo) else "",
            "fuente": fuente,
            "url": url,
            "fecha": fecha.strftime("%Y-%m-%dT%H:%M:%SZ") if fecha else None,
            "tipo": tipo,
            "ambito": "mundo" if tipo == "internacional" else "peru",
            "imagen": extraer_imagen(e),
        }
        salida.append(item)
        if len(salida) >= MAX_POR_FEED:
            break
    return salida


def clasificar(titulo, resumen, sector_def):
    if sector_def in ("mundo", "ia"):
        return sector_def
    t = " " + norm(titulo + " " + resumen) + " "
    puntos = {s: sum(t.count(k) for k in ks) for s, ks in CLAVES.items()}
    mejor = max(puntos, key=lambda s: puntos[s])
    if puntos[mejor] == 0:
        return sector_def or "coyuntura"
    if sector_def and puntos[mejor] < 2:
        return sector_def
    return mejor


def cargar_previo():
    try:
        with open(ARCHIVO_JSON, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        pass
    try:
        with open(ARCHIVO_JS, encoding="utf-8") as f:
            m = re.search(r"window\.NOTICIAS\s*=\s*(\{.*\});?\s*$", f.read(), re.S)
            return json.loads(m.group(1)) if m else {}
    except (OSError, ValueError):
        return {}


def clave_orden(i):
    return i.get("fecha") or "0000"


def fusionar(nuevos, previos):
    vistos_url, vistos_tit, todos = set(), set(), []
    for it in sorted(nuevos, key=clave_orden, reverse=True) + sorted(previos, key=clave_orden, reverse=True):
        u, t = url_canonica(it["url"]), norm(it["titulo"])[:90]
        if u in vistos_url or t in vistos_tit:
            continue
        vistos_url.add(u)
        vistos_tit.add(t)
        todos.append(it)
    por_sector, final = {}, []
    for it in todos:
        n = por_sector.get(it["sector"], 0)
        if n < MAX_POR_SECTOR_ESPECIAL.get(it["sector"], MAX_POR_SECTOR):
            por_sector[it["sector"]] = n + 1
            final.append(it)
    return sorted(final, key=clave_orden, reverse=True)


def obtener_feed(nombre, urls, tipo, sector_def):
    ultimo = "sin intentos"
    for u in urls:
        try:
            return parsear_feed(descargar(u), nombre, tipo, sector_def), None
        except Exception as ex:  # noqa: BLE001 - cualquier fallo de un feed no debe detener el resto
            ultimo = f"{type(ex).__name__}: {str(ex)[:120]}"
    return None, ultimo


def escribir(datos):
    os.makedirs(DATOS, exist_ok=True)
    with open(ARCHIVO_JSON, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
    with open(ARCHIVO_JS, "w", encoding="utf-8") as f:
        f.write("/* Generado por scripts/actualizar_noticias.py (GitHub Actions, 08:00 y 23:00 hora de Lima). No editar a mano. */\n")
        f.write("window.NOTICIAS = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")


def main(feeds=None):
    feeds = feeds or FEEDS
    previo = cargar_previo()
    nuevos, estado, ok = [], {}, 0
    for nombre, urls, tipo, sector in feeds:
        items, err = obtener_feed(nombre, urls, tipo, sector)
        if items is None:
            estado[nombre] = {"ok": False, "error": err}
            print(f"  ✗ {nombre}: {err}")
        else:
            ok += 1
            nuevos.extend(items)
            estado[nombre] = {"ok": True, "n": len(items)}
            print(f"  ✓ {nombre}: {len(items)} notas")
    print(f"Feeds correctos: {ok}/{len(feeds)} · notas nuevas: {len(nuevos)}")
    if ok == 0:
        print("Ningún feed respondió: se conservan los datos actuales.", file=sys.stderr)
        return 0
    enriquecer_imagenes(nuevos, previo.get("items", []))
    datos = {
        "generado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "modo": "automatico",
        "estado_fuentes": estado,
        "items": fusionar(nuevos, previo.get("items", [])),
    }
    escribir(datos)
    print(f"Escrito {ARCHIVO_JS} con {len(datos['items'])} notas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
