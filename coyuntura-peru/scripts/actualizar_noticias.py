#!/usr/bin/env python3
"""Actualiza data/noticias.js y data/noticias.json a partir de feeds RSS/Atom.

- Solo usa la biblioteca estándar de Python.
- Tolera feeds caídos: si ninguno responde no sobrescribe los datos existentes.
- Pensado para correr en GitHub Actions 7 veces al día (hora de Lima).
"""
from geografia import aplicar_geografia, generar_js
from limpieza_noticias import limpiar_registro, limpiar_texto
import base64
import collections
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
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATOS = os.path.join(RAIZ, "data")
ARCHIVO_JS = os.path.join(DATOS, "noticias.js")
ARCHIVO_JSON = os.path.join(DATOS, "noticias.json")
ARCHIVO_EDITORIAL = os.path.join(DATOS, "editorial.js")

MAX_POR_SECTOR = 24
MAX_POR_SECTOR_ESPECIAL = {"ia": 40, "mundo": 90}  # IA cubre Perú y mundo
MAX_POR_FEED = 15
SECTORES = {"politica", "economia", "salud", "nino", "tecnologia", "ia", "deporte", "investigacion", "coyuntura", "mundo"}
UMBRAL_REDUCCION = 0.5  # no se publica si las notas caen por debajo de esta fracción de las anteriores
MAX_REGISTRO = 30
DIAS_MAXIMOS = 30
TIMEOUT = 20
MAX_BYTES = 3 * 1024 * 1024
MAX_BYTES_HTML = 250 * 1024
MAX_IMAGENES_POR_EJECUCION = 160
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
    ("The New York Times en Español", ["https://news.google.com/rss/search?q=site:nytimes.com/es+when:7d&hl=es-419&gl=US&ceid=US:es-419"], "internacional", "mundo"),
    # Medios en inglés: se traducen al español (traducción automática, marcada en cada nota)
    ("The Guardian", ["https://www.theguardian.com/world/rss", "https://www.theguardian.com/international/rss"], "internacional", "mundo"),
    ("The New Yorker", ["https://www.newyorker.com/feed/everything", "https://www.newyorker.com/feed/news"], "internacional", "mundo"),
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
    t = norm(titulo or "").strip()
    servicios = {"seccion", "inicio", "portada", "sin titulo", "reportar un caso", "denuncia segura",
                 "alertas de defensores en riesgo", "los resistentes del peru", "suscribete al newsletter",
                 "ojo publico", "ojo-publico"}
    return (bool(PATRON_CONTENIDO_IRRELEVANTE.search(t)) or t.strip(" -") in servicios
            or bool(re.fullmatch(r"(?:reportar un caso|denuncia segura|alertas de defensores en riesgo)(?:\s*[·|–—].*)?", t)))




FUENTES_EN = {"The Guardian", "The New Yorker"}
URL_TRADUCCION = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q="


def traducir_texto(texto):
    """Traduce al español con el servicio público de Google Translate (sin clave). Devuelve None si falla."""
    texto = (texto or "").strip()
    if not texto:
        return ""
    try:
        crudo = descargar(URL_TRADUCCION + quote(texto[:900]))
        partes = json.loads(crudo.decode("utf-8", errors="replace"))[0]
        out = "".join(p[0] for p in partes if p and p[0]).strip()
        return out or None
    except Exception as ex:  # noqa: BLE001
        print(f"  ✗ traducción: {type(ex).__name__}: {str(ex)[:80]}")
        return None


def traducir_notas(items, previos, maximo=40):
    """Traduce título y extracto de las notas en inglés. Reutiliza traducciones previas; descarta lo que no se pueda traducir."""
    conocidas = {url_canonica(i["url"]): i for i in previos if i.get("traducido")}
    salida, hechas = [], 0
    for it in items:
        if it.get("fuente") not in FUENTES_EN:
            salida.append(it)
            continue
        previa = conocidas.get(url_canonica(it["url"]))
        if previa:
            it.update({k: previa[k] for k in ("titulo", "resumen", "titulo_original", "traducido") if k in previa})
            salida.append(it)
            continue
        if hechas >= maximo:
            continue  # se traducirá en la próxima ejecución; nunca se publica texto en inglés
        t = traducir_texto(it["titulo"])
        if not t:
            continue
        r = traducir_texto(it.get("resumen", ""))
        it.update({"titulo_original": it["titulo"], "titulo": t, "resumen": r or "", "traducido": True})
        salida.append(it)
        hechas += 1
    print(f"Traducciones nuevas: {hechas}")
    return salida


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


def descargar_parcial(url, limite=MAX_BYTES_HTML):
    """Lee solo el inicio de una página HTML (donde están las etiquetas <meta>)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read(limite).decode("utf-8", errors="replace")


# ───────────── enlaces de Google Noticias → nota original del medio ─────────────
GN_BATCH = "https://news.google.com/_/DotsSplashUi/data/batchexecute"


def es_google_news(url):
    return urlsplit(url or "").netloc.lower().endswith("news.google.com")


def gn_id(url):
    """Identificador del artículo en un enlace de Google Noticias (…/articles/<id>)."""
    if not es_google_news(url):
        return None
    partes = [p for p in urlsplit(url).path.split("/") if p]
    for marca in ("articles", "read"):
        if marca in partes and partes.index(marca) + 1 < len(partes):
            return partes[partes.index(marca) + 1]
    return None


def gn_decodificar_local(art_id):
    """Formato antiguo: la URL del medio va codificada en base64 dentro del identificador."""
    try:
        crudo = base64.urlsafe_b64decode(art_id + "=" * (-len(art_id) % 4))
    except (ValueError, TypeError):
        return None
    if b"AU_yqL" in crudo[:12]:
        return None
    m = re.search(rb"https?://[\x21-\x7e]+", crudo)
    if not m:
        return None
    u = m.group(0).decode("ascii", "ignore")
    return None if es_google_news(u) else u


def gn_extraer_respuesta(texto):
    """Extrae la URL del medio de la respuesta de Google Noticias."""
    for bloque in texto.split("\n\n")[1:]:
        try:
            datos = json.loads(bloque)
        except ValueError:
            continue
        for fila in datos if isinstance(datos, list) else []:
            if isinstance(fila, list) and len(fila) > 2 and fila[1] == "Fbv4je" and isinstance(fila[2], str):
                try:
                    u = json.loads(fila[2])[1]
                except (ValueError, IndexError, TypeError, KeyError):
                    continue
                if isinstance(u, str) and u.startswith("http") and not es_google_news(u):
                    return u
    return None


GN_DIAG = collections.Counter()  # motivos de fallo al resolver enlaces de Google Noticias (se imprimen en el registro)
GN_MUESTRA = {}


def gn_decodificar_remoto(art_id):
    """Formato actual: el identificador va firmado; se pide la URL con la firma que publica la propia página."""
    pagina = None
    for base in ("https://news.google.com/rss/articles/", "https://news.google.com/articles/"):
        try:
            pagina = descargar_parcial(base + art_id + "?hl=es-419&gl=PE&ceid=PE:es-419", MAX_BYTES)
        except Exception as ex:  # noqa: BLE001
            GN_DIAG["pagina: " + type(ex).__name__ + " " + str(getattr(ex, "code", ""))] += 1
            pagina = None
            continue
        if "data-n-a-sg" in pagina:
            break
    if not pagina:
        return None
    sg = re.search(r'data-n-a-sg="([^"]+)"', pagina)
    ts = re.search(r'data-n-a-ts="([^"]+)"', pagina)
    if not sg or not ts:
        GN_DIAG["pagina sin firma"] += 1
        i = max(pagina.find("data-n-a"), pagina.find("c-wiz"))
        GN_MUESTRA.setdefault("pagina", f"{len(pagina)} caracteres; data-n-a={pagina.count('data-n-a')}; "
                              f"c-wiz={pagina.count('<c-wiz')}; fragmento: " + re.sub(r"\s+", " ", pagina[max(i, 0):max(i, 0) + 400]))
        return None
    req_art = ["Fbv4je", '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],'
               '"X","X",1,[1,1,1],1,1,null,0,0,null,0],"%s",%s,"%s"]' % (art_id, ts.group(1), sg.group(1))]
    cuerpo = ("f.req=" + quote(json.dumps([[req_art]]))).encode()
    req = urllib.request.Request(GN_BATCH, data=cuerpo, headers={
        "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            texto = r.read(MAX_BYTES_HTML).decode("utf-8", errors="replace")
    except Exception as ex:  # noqa: BLE001
        GN_DIAG["batch: " + type(ex).__name__ + " " + str(getattr(ex, "code", ""))] += 1
        return None
    u = gn_extraer_respuesta(texto)
    if not u:
        GN_DIAG["batch sin URL"] += 1
        GN_MUESTRA.setdefault("batch", re.sub(r"\s+", " ", texto[:300]))
    return u


def resolver_google_news(url):
    art_id = gn_id(url)
    if not art_id:
        return None
    return gn_decodificar_local(art_id) or gn_decodificar_remoto(art_id)


def url_del_medio(it):
    """URL de la nota en el sitio del medio (la de Google Noticias solo redirige)."""
    if it.get("url_medio"):
        return it["url_medio"]
    return None if es_google_news(it.get("url")) else it.get("url")


# ───────────── foto original de la nota ─────────────
RE_OG = [
    re.compile(r'<meta[^>]+(?:property|name|itemprop)=["\'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?|image)["\'][^>]*content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name|itemprop)=["\'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?|image)["\']', re.I),
    re.compile(r'<link[^>]+rel=["\']image_src["\'][^>]*href=["\']([^"\']+)["\']', re.I),
    re.compile(r'"image"\s*:\s*(?:\[\s*)?(?:\{[^{}]*?"url"\s*:\s*)?"(https:[^"]+)"', re.I),
]
# Logotipos, íconos y comodines del sitio: no son la foto de la nota.
RE_NO_FOTO = re.compile(r"(logo|favicon|apple-touch|sprite|placeholder|(?:^|[/_-])default(?:[-_.]|$)|"
                        r"no[-_]?image|sin[-_]?imagen|blank\.|pixel\.|1x1|\.svg(?:\?|$)|\.gif(?:\?|$))", re.I)


def es_foto_valida(img):
    return isinstance(img, str) and img.startswith("https://") and not RE_NO_FOTO.search(img)


def buscar_foto(cabecera, base):
    for rx in RE_OG:
        for m in rx.finditer(cabecera):
            img = urljoin(base, html.unescape(m.group(1)).strip().replace("\\/", "/"))
            if img.startswith("http://"):
                img = "https://" + img[7:]
            if es_foto_valida(img):
                return img
    return None


def imagen_og(url):
    """Foto de portada de la nota (og:image, twitter:image o JSON-LD), nunca un logotipo."""
    if not url or es_google_news(url):
        return None
    dominio = urlsplit(url).netloc.lower().removeprefix("www.")
    try:
        cabecera = descargar_parcial(url, MAX_BYTES_META)
    except Exception as ex:  # noqa: BLE001
        IMG_DIAG[f"{dominio}: {type(ex).__name__} {getattr(ex, 'code', '')}".strip()] += 1
        return None
    img = buscar_foto(cabecera, url)
    if not img:
        IMG_DIAG[f"{dominio}: sin foto en la página ({len(cabecera)} caracteres)"] += 1
    return img


MAX_INTENTOS_IMAGEN = 6
MAX_BYTES_META = 1024 * 1024  # algunos medios ponen las etiquetas <meta> tras mucho CSS en línea
IMG_DIAG = collections.Counter()


def enriquecer_imagenes(items, previos):
    """Busca la foto original de cada nota: resuelve el enlace real del medio y toma su og:image.

    Hereda lo ya conocido y reintenta en ejecuciones siguientes las notas que aún no tienen foto
    (hasta MAX_INTENTOS_IMAGEN veces). Nunca asigna ilustraciones ni logotipos."""
    previos_por_url = {url_canonica(i["url"]): i for i in previos if i.get("url")}
    pendientes = []
    for it in items:
        prev = previos_por_url.get(url_canonica(it["url"])) or {}
        if not it.get("url_medio") and prev.get("url_medio"):
            it["url_medio"] = prev["url_medio"]
        if it.get("imagen") and not es_foto_valida(it["imagen"]):
            it["imagen"] = None
        if not it.get("imagen") and es_foto_valida(prev.get("imagen")):
            it["imagen"] = prev["imagen"]
        if it.get("imagen"):
            it.pop("imagen_intentos", None)
            continue
        it["imagen_intentos"] = max(it.get("imagen_intentos") or 0, prev.get("imagen_intentos") or 0)
        if it["imagen_intentos"] < MAX_INTENTOS_IMAGEN:
            pendientes.append(it)
    pendientes = pendientes[:MAX_IMAGENES_POR_EJECUCION]

    def procesar(it):
        if es_google_news(it["url"]) and not it.get("url_medio"):
            real = resolver_google_news(it["url"])
            if real:
                it["url_medio"] = real
        return imagen_og(url_del_medio(it))

    if pendientes:
        with ThreadPoolExecutor(max_workers=4) as ex:  # pocas conexiones simultáneas con Google Noticias
            for it, img in zip(pendientes, ex.map(procesar, pendientes)):
                if img:
                    it["imagen"] = img
                    it.pop("imagen_intentos", None)
                else:
                    it["imagen"] = None
                    it["imagen_intentos"] = it.get("imagen_intentos", 0) + 1
    con = sum(1 for i in items if i.get("imagen"))
    gn = [i for i in items if es_google_news(i["url"])]
    print(f"Imágenes de portada: {con}/{len(items)} notas · Google Noticias resueltas: "
          f"{sum(1 for i in gn if i.get('url_medio'))}/{len(gn)}")
    for motivo, n in GN_DIAG.most_common():
        print(f"  Google Noticias sin resolver: {motivo} ({n})")
    for k, v in GN_MUESTRA.items():
        print(f"  Muestra de respuesta ({k}): {v}")
    for motivo, n in IMG_DIAG.most_common(15):
        print(f"  Sin foto: {motivo} ({n})")
    return con


# ───────────── síntesis y cifras clave por noticia ─────────────
MAX_SINTESIS_POR_EJECUCION = 160
RE_DESC = [
    re.compile(r'<meta[^>]+(?:property|name)=["\'](?:og:description|twitter:description|description)["\'][^>]*content=["\']([^"\']+)["\']', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\'](?:og:description|twitter:description|description)["\']', re.I),
]
RE_PARRAFO = re.compile(r"<p[^>]*>(.*?)</p>", re.I | re.S)
RE_ORACION = re.compile(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡\"“«0-9])")
RUIDO_ORACION = re.compile(
    r"lee tambi[eé]n|te puede interesar|suscr[ií]b|s[ií]guenos|foto:|imagen:|©|cookies|newsletter|whatsapp|publicidad|"
    r"todos los derechos|inicia sesi[oó]n|reg[ií]strate|haz clic|más informaci[oó]n en|the post", re.I)
MESES_TXT = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre"
_NUM = r"\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?"
PATRONES_DATOS = [
    ("monto", re.compile(rf"(?:S/|US\$|\$)\s?(?:{_NUM})(?:\s?(?:mil millones|millones|mil))?", re.I)),
    ("porcentaje", re.compile(rf"(?:{_NUM})\s?%")),
    ("escala", re.compile(rf"(?:{_NUM})\s(?:mil millones|millones|mill[oó]n)(?:\s+de\s+\w+)?", re.I)),
    ("temperatura", re.compile(r"\d{1,2}(?:[.,]\d)?\s?°\s?C")),
    ("cantidad", re.compile(rf"(?:{_NUM})\s(?:personas|casos|fallecidos|heridos|hogares|kil[oó]metros|km|d[ií]as|a[ñn]os|puntos|votos|esca[ñn]os|diputados|senadores|empresas|colegios|hospitales|detenidos|v[ií]ctimas|intervenciones|toneladas|hect[aá]reas|soles|d[oó]lares)\b", re.I)),
    ("marcador", re.compile(r"\b\d{1,2}\s?-\s?\d{1,2}\b")),
    ("fecha", re.compile(rf"\b\d{{1,2}} de (?:{MESES_TXT})(?: de \d{{4}})?", re.I)),
]


def oraciones_de(texto):
    texto = re.sub(r"\s+", " ", texto or "").strip()
    return [o.strip() for o in RE_ORACION.split(texto) if o.strip()]


def descripcion_html(html_txt):
    for rx in RE_DESC:
        m = rx.search(html_txt)
        if m:
            return limpiar(html.unescape(m.group(1)), 600)
    return ""


def parrafos_html(html_txt, maximo=8):
    html_txt = re.sub(r"<(script|style|nav|footer|aside|figure)[^>]*>.*?</\1>", " ", html_txt, flags=re.I | re.S)
    out = []
    for m in RE_PARRAFO.finditer(html_txt):
        t = limpiar(m.group(1), 700)
        if len(t) >= 70 and not RUIDO_ORACION.search(t):
            out.append(t)
        if len(out) >= maximo:
            break
    return out


def contexto_cifra(texto, ini, fin):
    """La oración donde aparece la cifra; si es muy larga, una ventana alrededor de ella."""
    pos, ctx = 0, texto
    for o in RE_ORACION.split(texto):
        i = texto.find(o, pos)
        if i <= ini < i + len(o):
            ctx, ini, fin = o, ini - i, fin - i
            break
        pos = i + len(o)
    if len(ctx) > 140:
        a, b = max(0, ini - 60), min(len(ctx), fin + 60)
        frag = ctx[a:b]
        if a > 0:
            frag = frag.split(" ", 1)[-1]
        if b < len(ctx):
            frag = frag.rsplit(" ", 1)[0]
        ctx = ("…" if a > 0 else "") + frag.strip(" ,;") + ("…" if b < len(ctx) else "")
    return ctx.strip()


def cifras_clave(texto, maximo=5):
    """Extrae cifras con su contexto inmediato. Solo reporta lo que el texto dice, nunca calcula ni estima."""
    texto = re.sub(r"\s+", " ", texto or "")
    vistos, out = set(), []
    for tipo, rx in PATRONES_DATOS:
        for m in rx.finditer(texto):
            v = m.group(0).strip(" .,;")
            clave = norm(v)
            if clave in vistos or any(clave in x or x in clave for x in vistos):
                continue
            if tipo == "marcador" and not re.search(r"\b(?:vs|gano|derrot\w*|empat\w*|venci\w*|goles?|partido|marcador)\b", norm(texto)):
                continue
            ctx = contexto_cifra(texto, m.start(), m.end())
            vistos.add(clave)
            out.append({"v": v, "t": tipo, "c": ctx.strip(" ,;")})
            if len(out) >= maximo:
                return out
    return out


def elegir_oraciones(titulo, descripcion, parrafos, maximo=3, limite=520):
    base = norm(titulo)
    cand, vistos = [], []
    for o in oraciones_de(descripcion) + [x for p in parrafos for x in oraciones_de(p)]:
        o = o.strip()
        n = norm(o)
        if len(o) < 40 or len(o) > 380 or RUIDO_ORACION.search(o):
            continue
        if n[:60] == base[:60] or base in n or n in base:
            continue
        pal = set(n.split())
        if any(n[:50] == v[:50] or len(pal & set(v.split())) / max(1, min(len(pal), len(v.split()))) > 0.6 for v in vistos):
            continue
        vistos.append(n)
        cand.append(o)
        if len(cand) >= maximo or sum(len(c) for c in cand) >= limite:
            break
    return cand


def sintetizar(it, descripcion="", parrafos=None):
    """Arma la síntesis de una nota con el texto publicado por el medio: primeras oraciones relevantes y cifras clave."""
    parrafos = [limpiar_texto(p) for p in (parrafos or [])]
    base_desc = limpiar_texto(descripcion or it.get("resumen") or "")
    oraciones = elegir_oraciones(it.get("titulo", ""), base_desc, parrafos)
    texto_cifras = ". ".join([it.get("titulo", "").rstrip(".:"), base_desc] + parrafos[:6])
    res = {}
    if oraciones:
        res["sintesis"] = " ".join(oraciones[:2])
        res["puntos"] = oraciones[:3]
    datos = cifras_clave(texto_cifras)
    if datos:
        res["datos"] = datos
    return res


def sintesis_de_pagina(it):
    url = url_del_medio(it)
    if not url:
        return sintetizar(it)  # el agregador no expone el texto del medio: se usa solo el extracto del feed
    try:
        pagina = descargar_parcial(url)
    except Exception:  # noqa: BLE001
        return sintetizar(it)
    return sintetizar(it, descripcion_html(pagina), parrafos_html(pagina))


def enriquecer_sintesis(items, previos):
    """Hereda síntesis ya generadas y crea las de las notas nuevas (máximo por ejecución, en paralelo)."""
    conocidas = {url_canonica(i["url"]): i for i in previos if i.get("sintesis") or i.get("datos")}
    pendientes = []
    for it in items:
        if it.get("sintesis") or it.get("datos"):
            continue
        k = url_canonica(it["url"])
        if k in conocidas:
            for campo in ("sintesis", "puntos", "datos"):
                if conocidas[k].get(campo):
                    it[campo] = conocidas[k][campo]
        else:
            pendientes.append(it)
    pendientes = sorted(pendientes, key=clave_orden, reverse=True)[:MAX_SINTESIS_POR_EJECUCION]
    if pendientes:
        with ThreadPoolExecutor(max_workers=6) as ex:
            for it, res in zip(pendientes, ex.map(sintesis_de_pagina, pendientes)):
                it.update(res)
    print(f"Síntesis: {sum(1 for i in items if i.get('sintesis'))}/{len(items)} notas · con cifras: {sum(1 for i in items if i.get('datos'))}")


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
            "genero": genero_de(url, titulo),
            "imagen": extraer_imagen(e),
        }
        if "/publirreportaje/" not in url.lower():
            salida.append(aplicar_geografia(limpiar_registro(item)))
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
    previos = [i for i in previos if not es_antiguo(i) and not es_irrelevante(i.get("titulo")) and "/publirreportaje/" not in i.get("url", "").lower()]
    nuevos = [i for i in nuevos if not es_irrelevante(i.get("titulo")) and "/publirreportaje/" not in i.get("url", "").lower()]
    for it in sorted(nuevos, key=clave_orden, reverse=True) + sorted(previos, key=clave_orden, reverse=True):
        if es_deporte(it.get("titulo")):
            it["sector"] = "deporte"
        it = aplicar_geografia(it)
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
    generar_js()
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
    previo["items"] = [limpiar_registro(i) for i in previo.get("items", [])]
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
    nuevos = traducir_notas(nuevos, previo.get("items", []))
    enriquecer_sintesis(nuevos, previo.get("items", []))
    combinados = fusionar(nuevos, previo.get("items", []))
    enriquecer_imagenes(combinados, previo.get("items", []))
    enriquecer_sintesis(combinados, previo.get("items", []))
    combinados = [aplicar_geografia(limpiar_registro(i)) for i in combinados]
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
