"""Depura controles y promoción incrustados en extractos sin redactar texto nuevo.

Los campos ajenos al contenido (URL, fechas, medio, imágenes, etc.) se conservan.
La evidencia numérica puede ser un campo narrativo o el extracto original `datos.c`;
ambos se limpian antes de aceptar una cifra. No se infieren valores ni unidades.
"""
from copy import deepcopy
import re
import unicodedata

_ORACIONES = re.compile(r'(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9])')
_CONTROLES = re.compile(r'^\s*(?:seguir\s+escuchar\s+(?:(?:puntos\s+clave|resumen)\s+)*|escuchar\s+(?:puntos\s+clave\s+resumen|resumen)\s+)', re.I)
_LEER = re.compile(r'^\s*(?:seguir\s+leyendo|leer\s+m[aá]s)\s*[:»→-]?\s*$', re.I)
_AVISO_IA = re.compile(r'\beste\s+resumen\s+(?:es|fue|ha\s+sido)\s+generado\s+por\s+inteligencia\s+artificial\b', re.I)
_PROMOCION = re.compile(
    r'\b(?:pon\s+tu\s+lupa\s+sobre\s+lo\s+que\s+importa|'
    r'tu\s+aporte\s+nos\s+permite|si\s+quieres\s+saber\s+m[aá]s\s+sobre\s+c[oó]mo\s+usamos\s+los\s+fondos|'
    r'visita\s+nuestro\s+portal\s+de\s+donaciones|apoya\s+nuestro\s+periodismo|'
    r'haz\s+tu\s+aporte|dona\s+ahora|suscr[ií]bete\s+a\s+nuestr[oa]|'
    r'suscr[ií]bete\s+al\s+newsletter|inicia\s+sesi[oó]n\s+para\s+(?:seguir|continuar)|'
    r'reg[ií]strate\s+para\s+(?:seguir|continuar))\b', re.I)
_POST = re.compile(r'\b(?:the\s+post|la\s+entrada)\b.*?(?:appeared\s+first\s+on|se\s+public[oó]\s+primero\s+en)\b', re.I)
_CREDITO = re.compile(r'\s*[-–—]\s*cr[eé]dito\s*:|\bcr[eé]dito\s*:\s*(?:difusi[oó]n|afp|efe|reuters|getty(?: images)?|shutterstock)\b', re.I)


def _normal(texto):
    texto = unicodedata.normalize('NFKC', str(texto or ''))
    return re.sub(r'\s+', ' ', texto).strip().casefold()


def _significativo(texto, minimo=8):
    # Una cifra o un teléfono sueltos no son una oración ni un extracto.
    return len(texto) >= minimo and bool(re.search(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3}', texto))


def limpiar_texto(texto, minimo=8):
    """Devuelve únicamente fragmentos originales que no sean controles o CTAs."""
    if not isinstance(texto, str):
        return ''
    texto = re.sub(r'\s+', ' ', texto).strip()
    partes = []
    for parte in _ORACIONES.split(texto):
        parte = _CONTROLES.sub('', parte).strip()
        if _LEER.fullmatch(parte):
            continue
        marcadores = [m.start() for rx in (_PROMOCION, _AVISO_IA, _POST, _CREDITO)
                      if (m := rx.search(parte))]
        if marcadores:
            parte = parte[:min(marcadores)].rstrip(' -–—')
        if _significativo(parte, minimo):
            partes.append(parte)
    return ' '.join(partes).strip()


def _incluye(texto, valor):
    texto, valor = _normal(texto), _normal(valor)
    if not valor:
        return False
    # Evita que «12 personas» se valide con «312 personas», o «20» con «2026».
    for match in re.finditer(re.escape(valor), texto):
        antes = texto[match.start()-1:match.start()] if match.start() else ''
        despues = texto[match.end():match.end()+1]
        if valor[0].isalnum() and antes.isalnum():
            continue
        if valor[-1].isalnum() and despues.isalnum():
            continue
        return True
    return False


def limpiar_registro(item):
    """Retorna una copia depurada; nunca cambia el registro recibido."""
    registro = deepcopy(item)
    if not isinstance(registro, dict):
        return registro
    for campo in ('resumen', 'sintesis'):
        if campo in registro:
            registro[campo] = limpiar_texto(registro[campo], minimo=1 if campo == 'titulo' else 8)
    titulo = _normal(registro.get('titulo'))
    for campo in ('resumen', 'sintesis'):
        if registro.get(campo) and _normal(registro[campo]) == titulo:
            registro[campo] = ''
    if 'puntos' in registro:
        puntos = registro['puntos'] if isinstance(registro['puntos'], list) else []
        vistos = set()
        limpios = []
        for punto in puntos:
            texto = limpiar_texto(punto)
            clave = _normal(texto)
            if texto and clave != titulo and clave not in vistos:
                limpios.append(texto)
                vistos.add(clave)
        registro['puntos'] = limpios
    if 'datos' in registro:
        campos = [registro.get(k, '') for k in ('titulo', 'resumen', 'sintesis')]
        campos += registro.get('puntos', [])
        validos = []
        for dato in registro['datos'] if isinstance(registro['datos'], list) else []:
            if not isinstance(dato, dict) or not isinstance(dato.get('v'), str):
                continue
            copia = deepcopy(dato)
            contexto = limpiar_texto(copia.get('c'))
            valor = copia['v'].strip()
            # El contexto es también un extracto de la fuente, no texto inventado.
            if not (_significativo(valor) or re.search(r'\d', valor)):
                continue
            evidencia = [contexto] if contexto else campos
            if not any(_incluye(campo, valor) for campo in evidencia):
                continue
            if contexto:
                copia['c'] = contexto
            elif 'c' in copia:
                copia['c'] = ''
            validos.append(copia)
        registro['datos'] = validos
    return registro
