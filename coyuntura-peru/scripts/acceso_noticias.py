"""Comprueba el enlace y el acceso al artículo visible en el sitio del medio."""
import re
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

RESTRINGIDO = re.compile(
    r'"isAccessibleForFree"\s*:\s*(?:false|"false")'
    r'|(?:suscr[ií]bete|inicia sesi[oó]n|reg[ií]strate)\s+para\s+(?:seguir|continuar|leer|acceder)'
    r'|(?:este (?:art[ií]culo|contenido) es (?:solo|exclusivo)|content (?:is )?for subscribers'
    r'|subscribe to (?:continue reading|read this article))',
    re.I,
)
ARTICULO = re.compile(r"<article\b[^>]*>(.*?)</article>", re.I | re.S)


def original(url):
    u = urlsplit(url or "")
    host = u.hostname or ""
    if (u.scheme != "https" or not host or u.username or host == "news.google.com"
            or host.endswith(".news.google.com") or not u.path.strip("/")):
        return None
    parametros = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=True)
                  if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid", "amp"}
                  and (k.lower(), v.lower()) != ("outputtype", "amp")]
    ruta = re.sub(r"/amp/?$", "/", u.path, flags=re.I)
    return urlunsplit((u.scheme, u.netloc, ruta, urlencode(parametros), ""))


class Cabecera(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonica = ""
        self.tipo = ""
        self.pago = False

    def handle_starttag(self, tag, atributos):
        attrs = dict(atributos)
        if tag == "link" and "canonical" in (attrs.get("rel") or "").lower().split():
            self.canonica = attrs.get("href") or ""
        if tag == "meta":
            nombre = (attrs.get("property") or attrs.get("itemprop") or "").lower()
            valor = (attrs.get("content") or "").lower()
            if nombre == "og:type":
                self.tipo = valor
            if nombre == "isaccessibleforfree" and valor == "false":
                self.pago = True


def mismo_medio(a, b):
    def host(u):
        return re.sub(r"^(www|amp|m)\.", "", urlsplit(u).hostname or "")
    return host(a) == host(b)


def comprobar(url, pagina, parrafos):
    """Una descripción o un párrafo aislado no acredita acceso al artículo."""
    if not original(url):
        return {"acceso": "sin_verificar"}
    parser = Cabecera()
    parser.feed(pagina)
    destino = original(urljoin(url, parser.canonica)) if parser.canonica else original(url)
    if destino and not mismo_medio(destino, url):
        destino = None
    if not destino:
        return {"acceso": "sin_verificar"}
    if parser.pago or RESTRINGIDO.search(pagina):
        return {"acceso": "restringido", "url_medio": destino}
    cuerpo = max((parrafos(m.group(1)) for m in ARTICULO.finditer(pagina)), key=len, default=[])
    if not cuerpo and parser.tipo == "article":
        cuerpo = parrafos(pagina)
    if len(cuerpo) < 2 or sum(map(len, cuerpo)) < 220:
        return {"acceso": "sin_verificar", "url_medio": destino}
    return {"acceso": "abierto", "url_medio": destino}
