#!/usr/bin/env python3
"""Actualiza data/noticias.js y data/noticias.json a partir de feeds RSS/Atom.

- Solo usa la biblioteca estándar de Python.
- Tolera feeds caídos: si ninguno responde no sobrescribe los datos existentes.
- Pensado para correr en GitHub Actions 7 veces al día (hora de Lima).
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
ARCHIVO_EDITORIAL = os.path.join(DATOS, "editorial.js")

MAX_POR_SECTOR = 24
MAX_POR_SECTOR_ESPECIAL = {"ia": 40}  # IA cubre Perú y mundo
MAX_POR_FEED = 15
SECTORES = {"politica", "economia", "salud", "nino", "tecnologia", "ia", "deporte", "investigacion", "coyuntura", "mundo"}
UMBRAL_REDUCCION = 0.5  # no se publica si las notas caen por debajo de esta fracción de las anteriores
MAX_REGISTRO = 30
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
    ("OjoPúblico", ["https://ojo-publico.com/rss.xml", "https://ojo-publico.com/feed", "https://ojo-publico.com/rss", "https://ojo-publico.com/feed/"], "independiente", "investigacion"),
    ("Convoca", ["https://convoca.pe/feed", "https://convoca.pe/feed/", "https://convoca.pe/rss.xml", "https://convoca.pe/rss"], "independiente", "investigacion"),
    ("Hildebrandt en sus trece", ["https://www.hildebrandtensustrece.com/feed/", "https://hildebrandtensustrece.com/feed/", "https://hildebrandtensustrece.com/feed", "https://www.hildebrandtensustrece.com/rss"], "independiente", None),
    ("Wayka", ["https://wayka.pe/feed/"], "independiente", None),
    ("La Mula", ["https://www.lamula.pe/feed/"], "independiente", None),
    ("Salud con Lupa", ["https://saludconlupa.com/feed/"], "independiente", "salud"),
    ("Mongabay Latam", ["https://es.mongabay.com/feed/"], "independiente", "coyuntura"),
    ("Caretas", ["https://caretas.pe/feed/"], "comercial", None),
    # Comerciales
    ("El Comercio", ["https://elcomercio.pe/arc/outboundfeeds/rss/?outputType=xml"], "comercial", None),
    ("Gestión", ["https://gestion.pe/arc/outboundfeeds/rss/?outputType=xml"], "comercial", "economia"),
    ("La República", ["https://larepublica.pe/rss/", "https://larepublica.pe/arc/outboundfeeds/rss/?outputType=xml", "https://larepublica.pe/feed/"], "comercial", None),
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
    # El Niño costero (Perú)
    ("Google Noticias · El Niño", ["https://news.google.com/rss/search?q=%22Fen%C3%B3meno+El+Ni%C3%B1o%22+OR+%22Ni%C3%B1o+costero%22+ENFEN+when:14d&hl=es-419&gl=PE&ceid=PE:es-419"], "comercial", "nino"),
    ("Google Noticias · IA en el mundo", ["https://news.google.com/rss/search?q=%22inteligencia+artificial%22+(OpenAI+OR+Anthropic+OR+Google+OR+regulaci%C3%B3n+OR+NVIDIA)+when:7d&hl=es-419&gl=US&ceid=US:es-419"], "internacional", "ia"),
]

# Medios con feed directo caído: se prueban endpoints alternativos y, si ninguno responde, un respaldo
# en Google Noticias restringido al dominio del medio. Esas notas se marcan como "agregador" y nunca
# se presentan como obtenidas directamente del medio.
ALTERNATIVAS = {
    "OjoPúblico": ["https://ojo-publico.com/rss", "https://ojo-publico.com/rss.xml", "https://ojo-publico.com/feed", "https://ojo-publico.com/feed/"],
    "Convoca": ["https://convoca.pe/rss.xml", "https://convoca.pe/rss", "https://convoca.pe/feed/", "https://convoca.pe/feed"],
    "Hildebrandt en sus trece": ["https://www.hildebrandtensustrece.com/feed/", "https://hildebrandtensustrece.com/feed/", "https://www.hildebrandtensustrece.com/rss", "https://hildebrandtensustrece.com/rss.xml"],
    "La República": ["https://larepublica.pe/rss/", "https://larepublica.pe/rss", "https://larepublica.pe/arc/outboundfeeds/rss/?outputType=xml", "https://larepublica.pe/feed/"],
    "Expreso": ["https://www.expreso.com.pe/feed/", "https://www.expreso.com.pe/rss", "https://www.expreso.com.pe/arc/outboundfeeds/rss/?outputType=xml"],
}
RESPALDO_DOMINIO = {
    "OjoPúblico": "ojo-publico.com",
    "Convoca": "convoca.pe",
    "Hildebrandt en sus trece": "hildebrandtensustrece.com",
    "La República": "larepublica.pe",
    "Expreso": "expreso.com.pe",
}
GENERO_OPINION = re.compile(r"/(opinion|opinión|columna|columnas|columnistas|editorial|blog|blogs|tribuna)(/|-|$)", re.I)

# Control de relevancia: no se publican horóscopos, tarot o predicciones astrológicas.
# Se aplica también a los registros heredados de actualizaciones anteriores.
PATRON_CONTENIDO_IRRELEVANTE = re.compile(
    r"\b(?:horoscopos?|zodiaco|zodiacal(?:es)?|signos? zodiacales?|carta astral|"
    r"astrologia|tarot|numerologia|predicciones? astrales?|"
    r"compatibilidad amorosa segun tu signo|lectura de cartas)\b",
    re.I,
)


def es_irrelevante(titulo):
    return bool(PATRON_CONTENIDO_IRRELEVANTE.search(norm(titulo or "")))



def url_respaldo(dominio):
    return ("https://news.google.com/rss/search?q=site:" + dominio + "+when:7d&hl=es-419&gl=PE&ceid=PE:es-419")


def genero_de(url, titulo=""):
    """'opinion' si la dirección indica una columna, editorial o blog; 'noticia' en los demás casos."""
    return "opinion" if GENERO_OPINION.search(url or "") else "noticia"


CLAVES = {
    "politica": ["congreso", "senad", "diputad", "president", "ministr", "gabinete", "premier", "jne", "onpe", "eleccion",
                 "partido", "fuerza popular", "vacancia", "censura", "reforma", "constitucion", "bancada", "ejecutivo",
                 "parlament", "alcalde", "regional", "bicameral"],
    "economia": ["pbi", "inflacion", "bcrp", "economi", "mef", "sunat", "inversion", "exportacion", "dolar", "tipo de cambio",
                 "mineria", "empleo", "sueldo", "igv", "tasa de interes", "banco", "bolsa", "precio", "canasta", "arancel",
                 "cobre", "oro", "minero", "fiscal ", "deficit", "credito"],
    "salud": ["salud", "minsa", "essalud", "dengue", "hospital", "vacuna", "epidemi", "enfermedad", "medic", "paciente",
              "anemia", "covid", "brote", "sis ", "clinica", "cancer", "diresa"],
    "nino": ["el nino", "nino costero", "enfen", "senamhi", "indeci", "anomalia termica", "temperatura del mar",
             "temperatura superficial del mar", "la nina", "oceanograf", "imarpe", "fenomeno el nino"],
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
    "coyuntura": ["protesta", "paro ", "seguridad ciudadana", "huaico", "temblor", "terremoto", "lluvia", "emergencia", "transporte",
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


def fuentes_editoriales():
    """Lee data/editorial.js y devuelve {id_del_análisis: [(medio, url), ...]} (solo enlaces https de los insights)."""
    try:
        with open(ARCHIVO_EDITORIAL, encoding="utf-8") as f:
            txt = f.read()
    except OSError:
        return {}
    ini = txt.find("insights: [")
    fin = txt.find("glosario: [", ini)
    if ini < 0 or fin < 0:
        return {}
    bloque = txt[ini:fin]
    salida = {}
    partes = re.split(r"\n    \{\n      (?=(?:id: \"[^\"]+\", )?sector: )", bloque)
    for parte in partes[1:]:
        m = re.match(r'(?:id: "([^"]+)", )?sector: "([^"]+)"', parte)
        if not m:
            continue
        clave = m.group(1) or m.group(2)
        salida[clave] = re.findall(r'\{ n: "([^"]+)", u: "(https://[^"]+)"', parte)
    return salida


def imagenes_editoriales(previas):
    """Foto de portada (og:image) de la primera fuente citada que la tenga, por cada análisis."""
    res = dict(previas or {})
    for clave, fuentes in fuentes_editoriales().items():
        for nombre, url in fuentes:
            host = urlsplit(url).netloc
            if host.endswith(("bcrp.gob.pe", "dge.gob.pe", "gob.pe", "noaa.gov", "wmo.int")):
                continue  # portales institucionales: su og:image es un escudo o logotipo, no una foto de la nota
            img = imagen_og(url)
            if img:
                res[clave] = {"url": img, "fuente": re.split(r" · ", nombre)[0], "enlace": url}
                break
    print(f"Fotos de análisis: {len([c for c in res if res[c].get('url')])}/{len(fuentes_editoriales())}")
    return res


MESES = {"ene": 1, "jan": 1, "feb": 2, "mar": 3, "abr": 4, "apr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "aug": 8,
         "set": 9, "sep": 9, "oct": 10, "nov": 11, "dic": 12, "dec": 12}


def _bcrp(hoy):
    """Serie diaria interbancario venta (S/ por US$) de la API del BCRP (PD04638PD); prueba formatos de fecha."""
    ini = hoy - dt.timedelta(days=45)
    ultimo = "sin intentos"
    for fmt in ("{d.year}-{d.month}-{d.day}", "{d:%Y-%m-%d}"):
        url = ("https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04638PD/json/"
               + fmt.format(d=ini) + "/" + fmt.format(d=hoy) + "/esp")
        crudo = b""
        try:
            crudo = descargar(url)
            datos = json.loads(crudo.decode("utf-8", errors="replace"))
            serie = []
            for per in datos.get("periods", []):
                m = re.search(r"(\d{1,2})\D*([A-Za-z]{3})\D*(\d{2,4})", per.get("name", ""))
                vals = per.get("values") or []
                if not m or not vals:
                    continue
                try:
                    v = float(vals[0])
                except (TypeError, ValueError):
                    continue
                mes = MESES.get(m.group(2).lower())
                if not mes:
                    continue
                anio = int(m.group(3)) + (2000 if len(m.group(3)) == 2 else 0)
                serie.append({"f": dt.date(anio, mes, int(m.group(1))).isoformat(), "v": round(v, 4)})
            serie = sorted(serie, key=lambda x: x["f"])[-30:]
            if len(serie) >= 3:
                return serie
            ultimo = f"respuesta sin datos suficientes ({len(serie)})"
        except Exception as ex:  # noqa: BLE001
            ultimo = f"{type(ex).__name__}: {str(ex)[:80]} | inicio de la respuesta: {crudo[:100]!r}"
    print(f"  ✗ Tipo de cambio BCRP: {ultimo}")
    return None


def _spot_pen():
    """Respaldo: tipo de cambio referencial USD/PEN de APIs públicas sin clave."""
    for url, ruta in (("https://open.er-api.com/v6/latest/USD", ("rates", "PEN")), ("https://api.exchangerate-api.com/v4/latest/USD", ("rates", "PEN"))):
        try:
            datos = json.loads(descargar(url).decode("utf-8", errors="replace"))
            v = float(datos[ruta[0]][ruta[1]])
            if 2.0 < v < 6.0:
                return round(v, 4), urlsplit(url).netloc
        except Exception as ex:  # noqa: BLE001
            print(f"  ✗ Respaldo {urlsplit(url).netloc}: {type(ex).__name__}: {str(ex)[:80]}")
    return None


def tipo_cambio(previo=None):
    """USD/PEN: serie del BCRP; si falla, valor referencial diario que se acumula entre ejecuciones."""
    hoy = dt.datetime.now(dt.timezone(dt.timedelta(hours=-5))).date()
    serie = _bcrp(hoy)
    if serie:
        print(f"Tipo de cambio BCRP: {len(serie)} datos, último {serie[-1]}")
        return {"serie": serie, "fuente": "BCRP", "serie_id": "PD04638PD"}
    spot = _spot_pen()
    if spot:
        v, host = spot
        hist = [x for x in ((previo or {}).get("serie") or []) if x.get("f") != hoy.isoformat()]
        hist.append({"f": hoy.isoformat(), "v": v})
        print(f"Tipo de cambio referencial ({host}): {v}")
        return {"serie": hist[-60:], "fuente": "Referencial · " + host, "nota": "Valor de mercado referencial; el oficial está en el BCRP."}
    return previo


SERIES_BM = [
    ("SP.POP.TOTL", "Población total", "personas"),
    ("SL.UEM.TOTL.ZS", "Desempleo (estimación OIT, % de la fuerza laboral)", "%"),
    ("IT.NET.USER.ZS", "Personas que usan internet (% de la población)", "%"),
    ("NY.GDP.MKTP.KD.ZG", "Crecimiento del PBI (% anual)", "%"),
    ("FP.CPI.TOTL.ZG", "Inflación (precios al consumidor, % anual)", "%"),
    ("SP.DYN.LE00.IN", "Esperanza de vida al nacer", "años"),
]


def datos_bm(previo=None):
    """Series históricas del Perú desde la API pública del Banco Mundial (sin clave)."""
    res = dict(previo or {})
    nuevas = 0
    for cod, nombre, unidad in SERIES_BM:
        url = f"https://api.worldbank.org/v2/country/PER/indicator/{cod}?format=json&per_page=80"
        try:
            datos = json.loads(descargar(url).decode("utf-8", errors="replace"))
            filas = datos[1] if isinstance(datos, list) and len(datos) > 1 and datos[1] else []
            serie = sorted(({"a": int(f["date"]), "v": float(f["value"])} for f in filas if f.get("value") is not None), key=lambda x: x["a"])[-20:]
            if len(serie) >= 3:
                res[cod] = {"nombre": nombre, "unidad": unidad, "serie": serie, "fuente": "Banco Mundial"}
                nuevas += 1
        except Exception as ex:  # noqa: BLE001
            print(f"  ✗ Banco Mundial {cod}: {type(ex).__name__}: {str(ex)[:80]}")
    print(f"Series del Banco Mundial: {nuevas}/{len(SERIES_BM)}")
    return res


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
    texto = datos.decode("utf-8", errors="replace").lstrip("\ufeff \t\r\n")  # algunos feeds (Wayka) anteponen espacios o BOM
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
        if not titulo or not url.startswith("http") or es_irrelevante(titulo):
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
            "genero": genero_de(url, titulo),
            "imagen": extraer_imagen(e),
        }
        salida.append(item)
        if len(salida) >= MAX_POR_FEED:
            break
    return salida


def es_deporte(titulo):
    """Prioriza los eventos deportivos: 'partido' no siempre significa partido político."""
    t = norm(titulo or "")
    return bool(re.search(
        r"\b(?:champions league|masters? 1000|liga 1|max en vivo|"
        r"partido de futbol|partido de tenis|copa libertadores|"
        r"transmision espn|real madrid|universitario vs|alianza lima vs|"
        r"seleccion peruana vs|tenista|tenis|voley|volleyball)\b",
        t,
    ))


def clasificar(titulo, resumen, sector_def):
    if es_deporte(titulo):
        return "deporte"
    if sector_def in ("mundo", "ia", "nino"):
        return sector_def
    t = " " + norm(titulo + " " + resumen) + " "
    puntos = {s: sum(t.count(k) for k in ks) for s, ks in CLAVES.items()}
    mejor = max(puntos, key=lambda s: puntos[s])
    if puntos[mejor] == 0:
        return sector_def or "coyuntura"
    if sector_def and puntos[mejor] < 2 and puntos.get(sector_def, 0) > 0:
        return sector_def
    if sector_def and puntos[mejor] < 2 and sector_def in ("economia",):
        return "coyuntura"  # un medio económico publica de todo: sin señales claras no se fuerza el sector
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


def es_antiguo(it, ahora=None):
    f = parsear_fecha(it.get("fecha") or "")
    if not f:
        return False
    ahora = ahora or dt.datetime.now(dt.timezone.utc)
    return f < ahora - dt.timedelta(days=DIAS_MAXIMOS)


def fusionar(nuevos, previos):
    vistos_url, vistos_tit, todos = set(), set(), []
    previos = [i for i in previos if not es_antiguo(i) and not es_irrelevante(i.get("titulo"))]
    nuevos = [i for i in nuevos if not es_irrelevante(i.get("titulo"))]
    for it in sorted(nuevos, key=clave_orden, reverse=True) + sorted(previos, key=clave_orden, reverse=True):
        if es_deporte(it.get("titulo")):
            it["sector"] = "deporte"
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


def ahora_iso():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def obtener_feed(nombre, urls, tipo, sector_def):
    """Devuelve (items, error, url_usada). Prueba cada URL en orden."""
    ultimo = "sin intentos"
    for u in urls:
        try:
            items = parsear_feed(descargar(u), nombre, tipo, sector_def)
            if not items:
                ultimo = "respuesta válida pero sin notas recientes"
                continue
            return items, None, u
        except Exception as ex:  # noqa: BLE001 - cualquier fallo de un feed no debe detener el resto
            ultimo = f"{type(ex).__name__}: {str(ex)[:120]}"
    return None, ultimo, None


def obtener_con_respaldo(nombre, urls, tipo, sector_def):
    """Feed directo (con alternativas) y, si falla, respaldo identificado en Google Noticias."""
    candidatas = list(urls) + [u for u in ALTERNATIVAS.get(nombre, []) if u not in urls]
    items, err, usada = obtener_feed(nombre, candidatas, tipo, sector_def)
    if items is not None:
        for it in items:
            it["procedencia"] = "directa"
        return items, {"ok": True, "procedencia": "directa", "url": usada}
    dominio = RESPALDO_DOMINIO.get(nombre)
    if dominio:
        gn, err2, usada2 = obtener_feed("Google Noticias · " + nombre, [url_respaldo(dominio)], tipo, sector_def)
        if gn is not None:
            propios = []
            for it in gn:
                # el nombre real del medio llega en <source>; se descartan notas de otros dominios
                propio, ajeno = re.sub(r"[^a-z0-9]", "", norm(nombre)), re.sub(r"[^a-z0-9]", "", norm(it["fuente"]))
                if propio not in ajeno and ajeno not in propio:
                    continue
                it["fuente"] = nombre
                it["procedencia"] = "agregador"
                it["via"] = "Google Noticias"
                propios.append(it)
            if propios:
                return propios, {"ok": True, "procedencia": "agregador", "via": "Google Noticias", "url": usada2, "error_directo": err}
            err2 = "Google Noticias respondió sin notas de ese medio"
        return None, {"ok": False, "procedencia": "sin datos", "error": err, "error_respaldo": err2}
    return None, {"ok": False, "procedencia": "sin datos", "error": err}


def validar_item(it):
    """Devuelve un motivo de descarte o None si el registro es válido."""
    if not it.get("titulo") or not str(it.get("url", "")).startswith("http"):
        return "sin título o dirección válida"
    if es_irrelevante(it.get("titulo")):
        return "contenido sin relevancia informativa"
    if it.get("sector") not in SECTORES:
        return "sector desconocido"
    f = it.get("fecha")
    if f:
        d = parsear_fecha(f)
        if not d:
            return "fecha inválida"
        if d > dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1):
            return "fecha en el futuro"
    return None


def validar_datos(items, previos):
    """Descarta registros inválidos y decide si el resultado se puede publicar."""
    buenos, descartes = [], {}
    for it in items:
        motivo = validar_item(it)
        if motivo:
            descartes[motivo] = descartes.get(motivo, 0) + 1
        else:
            buenos.append(it)
    errores = []
    if not buenos:
        errores.append("el resultado quedó vacío")
    elif previos and len(buenos) < UMBRAL_REDUCCION * len(previos):
        errores.append(f"las notas bajaron de {len(previos)} a {len(buenos)} (más de la mitad)")
    return buenos, descartes, errores


MESES_ES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
            "setiembre": 9, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}
URL_ENFEN = "https://www.gob.pe/institucion/senamhi/colecciones/1308-comunicados-enfen"


def parsear_enfen(html_txt):
    """Busca el comunicado ENFEN más reciente (mayor año y número) y, si aparece cerca, su fecha."""
    txt = html.unescape(re.sub(r"<[^>]+>", " ", html_txt))
    txt = re.sub(r"\s+", " ", txt)
    mejor = None
    for m in re.finditer(r"Comunicado Oficial ENFEN\s*N[°º.]?\s*(\d{1,3})\s*-\s*(\d{4})", txt, re.I):
        clave = (int(m.group(2)), int(m.group(1)))
        if mejor is None or clave > mejor[0]:
            ventana = txt[m.end(): m.end() + 260]
            fecha = None
            f = re.search(r"(\d{1,2}) de ([a-záéíóú]+) de (\d{4})", ventana, re.I)
            if f and MESES_ES.get(f.group(2).lower()):
                try:
                    fecha = dt.date(int(f.group(3)), MESES_ES[f.group(2).lower()], int(f.group(1))).isoformat()
                except ValueError:
                    fecha = None
            mejor = (clave, {"numero": f"{m.group(1)}-{m.group(2)}", "fecha": fecha})
    return mejor[1] if mejor else None


def enfen_ultimo(previo=None):
    """Último comunicado oficial ENFEN publicado en gob.pe (lectura automática; la fecha puede no detectarse)."""
    try:
        r = parsear_enfen(descargar_parcial(URL_ENFEN))
        if r:
            r.update({"url": URL_ENFEN, "comprobado": ahora_iso(), "ok": True})
            print(f"ENFEN: último comunicado detectado N.° {r['numero']} ({r['fecha'] or 'fecha no detectada'})")
            return r
        print("  ✗ ENFEN: no se detectó ningún comunicado en la página")
        err = "no se detectó ningún comunicado"
    except Exception as ex:  # noqa: BLE001
        print(f"  ✗ ENFEN: {type(ex).__name__}: {str(ex)[:100]}")
        err = f"{type(ex).__name__}: {str(ex)[:100]}"
    previo = dict(previo or {})
    previo.update({"ok": False, "comprobado": ahora_iso(), "error": err, "url": URL_ENFEN})
    return previo


def escribir(datos):
    os.makedirs(DATOS, exist_ok=True)
    tmp_json, tmp_js = ARCHIVO_JSON + ".tmp", ARCHIVO_JS + ".tmp"
    with open(tmp_json, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
    with open(tmp_js, "w", encoding="utf-8") as f:
        f.write("/* Generado por scripts/actualizar_noticias.py (GitHub Actions, 7 veces al día, hora de Lima). No editar a mano. */\n")
        f.write("window.NOTICIAS = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")
    os.replace(tmp_json, ARCHIVO_JSON)  # se escribe a un temporal y se reemplaza: nunca queda un archivo a medias
    os.replace(tmp_js, ARCHIVO_JS)


def resumen_ejecucion(titulo, lineas):
    """Escribe el resumen visible en la pestaña de la ejecución de GitHub Actions."""
    ruta = os.environ.get("GITHUB_STEP_SUMMARY")
    if not ruta:
        return
    try:
        with open(ruta, "a", encoding="utf-8") as f:
            f.write(f"### {titulo}\n\n" + "\n".join(lineas) + "\n")
    except OSError:
        pass


def main(feeds=None):
    feeds = feeds or FEEDS
    previo = cargar_previo()
    previo_estado = previo.get("estado_fuentes") or {}
    ahora = ahora_iso()
    nuevos, estado, ok = [], {}, 0
    for nombre, urls, tipo, sector in feeds:
        items, info = obtener_con_respaldo(nombre, urls, tipo, sector)
        info["comprobado"] = ahora
        ant = previo_estado.get(nombre) or {}
        if items:
            ok += 1
            nuevos.extend(items)
            fechas = [i["fecha"] for i in items if i.get("fecha")]
            info.update({"n": len(items), "ultima_nota": max(fechas) if fechas else None, "ultimo_ok": ahora})
            etiqueta_via = " (vía Google Noticias)" if info["procedencia"] == "agregador" else ""
            print(f"  ✓ {nombre}: {len(items)} notas{etiqueta_via}")
        else:
            info["ultimo_ok"] = ant.get("ultimo_ok")
            info["ultima_nota"] = ant.get("ultima_nota")
            print(f"  ✗ {nombre}: {info.get('error')}")
        estado[nombre] = info
    print(f"Feeds con datos: {ok}/{len(feeds)} · notas nuevas: {len(nuevos)}")
    if ok == 0:
        print("Ningún feed respondió: se conservan los datos actuales.", file=sys.stderr)
        resumen_ejecucion("Actualización sin cambios", ["Ningún feed respondió; se conservaron los datos anteriores."])
        return 1
    enriquecer_imagenes(nuevos, previo.get("items", []))
    combinados = fusionar(nuevos, previo.get("items", []))
    items, descartes, errores = validar_datos(combinados, previo.get("items", []))
    if errores:
        print("Validación fallida, no se publica: " + "; ".join(errores), file=sys.stderr)
        resumen_ejecucion("Actualización rechazada", ["- " + e for e in errores])
        return 1
    if descartes:
        print("Registros descartados por validación: " + json.dumps(descartes, ensure_ascii=False))
    registro = (previo.get("registro") or [])[-(MAX_REGISTRO - 1):]
    registro.append({"t": ahora, "fuentes_ok": ok, "fuentes": len(feeds), "nuevas": len(nuevos), "notas": len(items),
                     "descartes": descartes, "agregador": [n for n, v in estado.items() if v.get("procedencia") == "agregador"],
                     "sin_datos": [n for n, v in estado.items() if not v.get("ok")]})
    datos = {
        "generado": ahora,
        "modo": "automatico",
        "estado_fuentes": estado,
        "items": items,
        "imagenes_editorial": imagenes_editoriales(previo.get("imagenes_editorial")),
        "indicadores": {"tipo_cambio": tipo_cambio((previo.get("indicadores") or {}).get("tipo_cambio"))},
        "datos_bm": datos_bm(previo.get("datos_bm")),
        "enfen": enfen_ultimo(previo.get("enfen")),
        "registro": registro,
    }
    escribir(datos)
    print(f"Escrito {ARCHIVO_JS} con {len(datos['items'])} notas.")
    resumen_ejecucion("Actualización publicada", [
        f"- Fuentes con datos: {ok}/{len(feeds)}",
        f"- Notas nuevas: {len(nuevos)}; notas publicadas: {len(items)}",
        "- Respaldo (agregador): " + (", ".join(registro[-1]["agregador"]) or "ninguna"),
        "- Sin datos: " + (", ".join(registro[-1]["sin_datos"]) or "ninguna")])
    return 0


if __name__ == "__main__":
    sys.exit(main())
