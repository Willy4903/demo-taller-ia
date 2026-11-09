"""Geografía de la noticia, independiente del país del medio. Reglas compartidas con la web."""
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlsplit

RAIZ = Path(__file__).resolve().parents[1]
REGLAS = json.loads((RAIZ / 'data/geografia.json').read_text(encoding='utf-8'))

def normal(texto):
    s = ''.join(c for c in unicodedata.normalize('NFD', str(texto or '').lower()) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def coincide(clave, texto):
    return bool(re.search(r'\b(?:' + REGLAS[clave] + r')\b', texto))

def clasificar_geografia(item):
    titulo = re.sub(REGLAS['ignorar'], ' ', normal(item.get('titulo')))
    resumen = re.sub(REGLAS['boilerplate'], ' ', normal(item.get('resumen'))[:600])
    resumen = re.sub(REGLAS['ignorar'], ' ', resumen)
    try:
        url = urlsplit(item.get('url') or '')
        ruta, host = unquote(url.path).lower(), (url.hostname or '').removeprefix('www.')
    except ValueError:
        ruta, host = '', ''
    def resultado(zona, motivo):
        return {'version': REGLAS['version'], 'ambito': 'mundo' if zona == 'latam' else zona, 'zona': zona, 'motivo': motivo}
    if coincide('peru', titulo): return resultado('peru', 'referencia_peru_titulo')
    if coincide('peru', resumen): return resultado('peru', 'contexto_peru_resumen')
    if coincide('latam', titulo): return resultado('latam', 'referencia_latinoamerica_titulo')
    if coincide('mundo', titulo): return resultado('mundo', 'referencia_internacional_titulo')
    if host in REGLAS['medios_nacionales'] and re.search(REGLAS['secciones_nacionales'], ruta): return resultado('peru', 'seccion_nacional_fuente')
    if coincide('latam', resumen): return resultado('latam', 'contexto_latinoamerica_resumen')
    if coincide('mundo', resumen): return resultado('mundo', 'contexto_internacional_resumen')
    if re.search(REGLAS['secciones_extranjeras'], ruta): return resultado('mundo', 'seccion_internacional_fuente')
    return resultado('pendiente', 'sin_evidencia_geografica')

def aplicar_geografia(item):
    nuevo = dict(item)
    nuevo['geografia'] = clasificar_geografia(nuevo)
    nuevo['ambito'] = nuevo['geografia']['ambito']
    return nuevo

def generar_js():
    (RAIZ / 'data/geografia.js').write_text('/* Generado desde geografia.json; no editar a mano. */\nwindow.PERU_GEO_REGLAS = ' + json.dumps(REGLAS, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
