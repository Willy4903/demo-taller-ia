#!/usr/bin/env python3
"""Lectura de prensa: convierte ediciones PDF de diarios en datos agregados para #/datos.

Solo guarda estadísticas y titulares breves (con su página). NUNCA guarda el texto de las notas ni los PDF:
los titulares pertenecen a cada medio y la página lo indica. PyMuPDF se importa al usarlo, así que las
funciones puras (nombres, temas, fusión, validación) funcionan con la biblioteca estándar.
"""
import collections
import datetime as dt
import json
import math
import os
import re
import unicodedata

VERSION = 1
DIAS_COMPLETOS_JS = 7      # días con detalle completo dentro de data/medios.js
DIAS_HISTORIAL = 60        # días conservados en data/medios.json
MAX_TITULARES = 30         # titulares por edición
MAX_PALABRAS = 30
MAX_ENTIDADES = 20
MAX_PROCESADOS = 600

# ───────────────────────── utilidades ─────────────────────────


def norm(s):
    """Minúsculas y sin tildes, para comparar."""
    s = unicodedata.normalize("NFD", str(s).lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", norm(s)).strip("-") or "medio"


# ───────────────────────── temas ─────────────────────────

TEMAS = [
    ("politica", "Política", ["congreso", "congresista", "presidente", "presidenta", "premier", "ministro", "ministra", "gabinete", "partido politico", "bancada", "elecciones", "electoral", "jne", "onpe", "vacancia", "candidato", "pleno", "reforma", "oposicion", "mocion", "censura", "interpelacion", "fujimorismo", "palacio de gobierno", "ejecutivo", "legislativo"]),
    ("economia", "Economía", ["economia", "bcr", "bcrp", "mef", "inflacion", "dolar", "tipo de cambio", "pbi", "inversion", "exportacion", "minera", "mineria", "empleo", "desempleo", "sueldo", "remuneracion", "sunat", "impuesto", "tributo", "precios", "canasta", "bolsa", "bvl", "afp", "retiro", "mype", "empresa", "crecimiento", "deficit", "deuda", "gestion"]),
    ("seguridad", "Seguridad y justicia", ["policia", "pnp", "crimen", "extorsion", "sicario", "sicariato", "asesin", "homicidio", "robo", "asalto", "banda", "organizacion criminal", "estado de emergencia", "serenazgo", "detenido", "captur", "fiscalia", "fiscal", "juez", "poder judicial", "prision", "penal", "condena", "narcotrafico", "droga", "delincuen", "inseguridad", "sentencia"]),
    ("salud", "Salud", ["salud", "hospital", "essalud", "minsa", "dengue", "vacuna", "covid", "medico", "paciente", "enfermedad", "epidemia", "brote", "medicamento", "desnutricion", "anemia", "clinica"]),
    ("educacion", "Educación", ["educacion", "colegio", "escolar", "estudiante", "universidad", "sunedu", "docente", "profesor", "minedu", "beca", "clases", "alumno"]),
    ("clima", "Clima y desastres", ["el nino", "enfen", "senamhi", "lluvia", "huaico", "inundacion", "sismo", "temblor", "friaje", "helada", "sequia", "clima", "calor", "oleaje", "tsunami", "deslizamiento", "indeci", "incendio"]),
    ("deportes", "Deportes", ["futbol", "liga 1", "seleccion", "universitario", "alianza lima", "sporting cristal", "gol", "campeonato", "mundial", "eliminatorias", "tenis", "voley", "copa", "entrenador", "tecnico", "atleta", "juegos"]),
    ("espectaculos", "Espectáculos", ["farandula", "cantante", "actriz", "actor", "concierto", "pelicula", "television", "reality", "artista", "musica", "estreno", "novela", "show", "cine"]),
    ("internacional", "Internacional", ["eeuu", "ee uu", "estados unidos", "trump", "china", "rusia", "ucrania", "gaza", "israel", "venezuela", "argentina", "chile", "bolivia", "ecuador", "colombia", "brasil", "mexico", "espana", "europa", "onu", "otan", "papa", "vaticano", "guerra", "mundo"]),
    ("gestion", "Gestión pública y obras", ["obra", "alcalde", "municipalidad", "gobierno regional", "gobernador", "agua potable", "desague", "carretera", "puente", "licitacion", "contraloria", "presupuesto", "transporte", "metro", "tren", "aeropuerto", "terminal", "vivienda", "region"]),
    ("tecnologia", "Tecnología", ["inteligencia artificial", "ia", "tecnologia", "celular", "internet", "ciberseguridad", "aplicacion", "app", "redes sociales", "tiktok", "whatsapp", "digital", "robot"]),
]
TEMA_IDS = [t[0] for t in TEMAS] + ["otros"]
CATALOGO_TEMAS = [{"id": t[0], "nombre": t[1]} for t in TEMAS] + [{"id": "otros", "nombre": "Otros"}]


def _compilar(kw):
    kw = norm(kw)
    final = r"(?![a-z0-9])" if len(kw) <= 3 else ""
    return re.compile(r"(?<![a-z0-9])" + re.escape(kw).replace(r"\ ", r"\s+") + final)


_PATRONES_TEMA = [(t[0], [_compilar(k) for k in t[2]]) for t in TEMAS]


def clasificar_tema(texto):
    """Devuelve el id del tema con más coincidencias, o «otros»."""
    n = norm(texto)
    mejor, puntaje = "otros", 0
    for tid, pats in _PATRONES_TEMA:
        p = sum(1 for pat in pats if pat.search(n))
        if p > puntaje:
            mejor, puntaje = tid, p
    return mejor


# ───────────────────────── nombres de archivo ─────────────────────────

MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12}
CANONICOS = {
    "el comercio": "El Comercio", "comercio": "El Comercio", "la republica": "La República", "peru21": "Perú21", "peru 21": "Perú21",
    "trome": "Trome", "ojo": "Ojo", "libero": "Líbero", "gestion": "Gestión", "expreso": "Expreso", "correo": "Correo",
    "el peruano": "El Peruano", "diario uno": "Diario Uno", "la razon": "La Razón", "exitosa": "Exitosa", "el popular": "El Popular",
    "depor": "Depor", "estar bien": "Estar Bien",
}
SUPLEMENTOS = ("estar bien", "suplemento", "revista", "dominical", "variedades")
REGIONES = {
    "Amazonas": ["amazonas", "chachapoyas"], "Áncash": ["ancash", "chimbote", "huaraz"], "Apurímac": ["apurimac", "abancay", "andahuaylas"],
    "Arequipa": ["arequipa"], "Ayacucho": ["ayacucho", "huamanga"], "Cajamarca": ["cajamarca", "jaen"], "Callao": ["callao"],
    "Cusco": ["cusco", "cuzco"], "Huancavelica": ["huancavelica"], "Huánuco": ["huanuco", "tingo maria"], "Ica": ["ica", "chincha", "pisco", "nasca"],
    "Junín": ["junin", "huancayo"], "La Libertad": ["la libertad", "trujillo"], "Lambayeque": ["lambayeque", "chiclayo"],
    "Lima": ["lima", "san juan de lurigancho", "villa el salvador", "los olivos", "comas", "miraflores", "san isidro", "surco"],
    "Loreto": ["loreto", "iquitos"], "Madre de Dios": ["madre de dios", "puerto maldonado"], "Moquegua": ["moquegua", "ilo"], "Pasco": ["pasco", "cerro de pasco"],
    "Piura": ["piura", "sullana", "talara", "paita"], "Puno": ["puno", "juliaca"], "San Martín": ["region san martin", "tarapoto", "moyobamba"],
    "Tacna": ["tacna"], "Tumbes": ["tumbes"], "Ucayali": ["ucayali", "pucallpa"],
}
_PATRONES_REGION = {r: [_compilar(a) for a in al] for r, al in REGIONES.items()}


def _fecha_valida(d, m, a):
    try:
        a = int(a)
        if a < 100:
            a += 2000
        return dt.date(a, int(m), int(d))
    except ValueError:
        return None


def parse_nombre(nombre, fecha_mensaje=None):
    """Del nombre del archivo saca (medio, fecha ISO). Si el nombre no trae día completo, usa la fecha del mensaje."""
    s = os.path.splitext(os.path.basename(str(nombre)))[0].replace("_", " ")
    fecha = None
    meses = "|".join(MESES)
    patrones = (
        (r"(?<!\d)(\d{1,2})[\s\-/.]*(" + meses + r")[a-z]*[\s\-/.]*(\d{4}|\d{2})(?!\d)", True),
        (r"(?<!\d)(\d{1,2})[\-/.](\d{1,2})[\-/.](\d{4}|\d{2})(?!\d)", True),
        (r"(?<!\d)(\d{2})(\d{2})(\d{4}|\d{2})(?!\d)", True),
    )
    for patron, _ in patrones:
        m = re.search(patron, s, re.I)
        if not m:
            continue
        d, mes, a = m.group(1), m.group(2), m.group(3)
        mes = MESES[mes[:3].lower()] if not mes.isdigit() else mes
        f = _fecha_valida(d, mes, a)
        if f:
            fecha = f.isoformat()
            s = s[:m.start()] + " " + s[m.end():]
            break
    if not fecha:  # «Correo-nov-2026»: mes y año sin día
        m = re.search(r"(?<![a-z])(" + meses + r")[a-z]*[\s\-/.]*(\d{4})(?!\d)", s, re.I)
        if m and fecha_mensaje:
            f = _fecha_valida(str(fecha_mensaje)[8:10], MESES[m.group(1)[:3].lower()], m.group(2))
            if f:
                fecha = f.isoformat()
                s = s[:m.start()] + " " + s[m.end():]
    if not fecha and fecha_mensaje:
        fecha = str(fecha_mensaje)[:10]
    s = re.sub(r"[^\w\s&.'\-]", " ", s)
    s = re.sub(r"^\s*per[uú]\b", " ", s, flags=re.I)
    s = re.sub(r"\b(?:edici[oó]n|digital|pdf)\b", " ", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip(" -.")
    palabras = [(w.capitalize() if (w.isupper() and len(w) > 4) or w.islower() else w) for w in s.split()]
    s = " ".join(palabras)
    medio = CANONICOS.get(norm(s), s) or "Sin nombre"
    return medio, fecha


def ambito_de(nombre):
    n = norm(nombre)
    if any(k in n for k in SUPLEMENTOS):
        return "suplemento"
    for region, pats in _PATRONES_REGION.items():
        if region not in ("Lima", "Callao") and any(p.search(n) for p in pats):
            return "regional"
    return "nacional"


# ───────────────────────── texto y estadísticas ─────────────────────────

STOP = set(norm("""
a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque bien cada casi como con contra cual cuales cuando cuanto de del desde donde dos
el ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta estaba estaban estado estamos estan estar estas este esto estos fue fueron fui ha haber
habia hace hacen hacer hacia han hasta hay he hecho hoy la las le les lo los mas me mi mis mismo mucho muchos muy nada ni no nos nuestra nuestro nunca o otra otras otro
otros para pero poco por porque pues que quien quienes se sea segun ser si sido siendo sin sobre sois solo somos son soy su sus tambien tampoco tan tanto te tendra tenemos tener
tengo ti tiene tienen todas todavia todo todos tras tres tu tus un una unas uno unos usted va vamos van varias varios vez vosotros voy ya yo
dijo dice dicen afirmo indico senalo explico agrego anuncio informo manifesto cuenta ademas ayer manana semana mes meses anos ano dia dias lunes martes miercoles jueves viernes sabado domingo
enero febrero marzo abril mayo junio julio agosto setiembre septiembre octubre noviembre diciembre
peru lima www com pdf pagina paginas edicion nota notas foto fotos redaccion diario lectores
parte sera seran podria podrian puede pueden debe deben hacia durante mientras luego entonces cuyo cuya otro tras menos mayor mayores nuevo nueva nuevos nuevas primer primera primero
segundo segunda tercer tercera despues antes ahora aqui alli esta estan estara seguir sigue siguen unos unas cual quien
""".split()))

ORGANIZACIONES_RUIDO = set(norm("""
el la los las un una en con por para segun pero sin sobre hoy ayer este esta estos estas lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio
julio agosto setiembre septiembre octubre noviembre diciembre peru lima pagina edicion diario redaccion foto
""".split()))
SIGLAS_RUIDO = {"PDF", "SA", "SAC", "EIRL", "AM", "PM", "TV", "FM", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII", "SRL", "NO", "SI", "EL", "LA", "UN", "EN", "DE", "LOS", "LAS", "POR", "CON", "UNA", "HOY", "DNI", "RUC", "WEB", "OK"}

RE_PALABRA = re.compile(r"[a-záéíóúñü]{4,}")
RE_CAPS = re.compile(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,}(?:\s+(?:de|del|la|las|los|y)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+|\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,}){0,3}")
RE_SIGLA = re.compile(r"\b[A-ZÁÉÍÓÚÑ]{2,7}\b")
RE_SOLES = re.compile(r"S/\.?\s?\d")
RE_DOLARES = re.compile(r"US\s?\$|(?<![A-Za-z])\$\s?\d")
RE_PCT = re.compile(r"\d+(?:[.,]\d+)?\s?%")
RE_MILLONES = re.compile(r"\d+(?:[.,]\d+)?\s+(?:mil\s+)?millones", re.I)


def contar_palabras(texto, n=MAX_PALABRAS):
    c = collections.Counter()
    for w in RE_PALABRA.findall(texto.lower()):
        if norm(w) in STOP:
            continue
        c[w] += 1
    return [[w, k] for w, k in c.most_common(n) if k >= 2]


def contar_entidades(texto, n=MAX_ENTIDADES):
    """Secuencias en mayúscula inicial (personas, organizaciones, lugares) y siglas. Solo cuenta; no guarda frases."""
    c = collections.Counter()
    for m in RE_CAPS.finditer(texto):
        palabras = m.group(0).split()
        while palabras and norm(palabras[0]) in ORGANIZACIONES_RUIDO:
            palabras.pop(0)
        if len(palabras) < 2:
            continue
        c[" ".join(palabras)] += 1
    for m in RE_SIGLA.finditer(texto):
        s = m.group(0)
        if s not in SIGLAS_RUIDO and len(s) >= 3:
            c[s] += 1
    return [[e, k] for e, k in c.most_common(n * 2) if k >= 2][:n]


def contar_lugares(texto):
    t = norm(texto)
    out = {}
    for region, pats in _PATRONES_REGION.items():
        k = sum(len(p.findall(t)) for p in pats)
        if k:
            out[region] = k
    return out


def contar_cifras(texto):
    return {"soles": len(RE_SOLES.findall(texto)), "dolares": len(RE_DOLARES.findall(texto)),
            "porcentajes": len(RE_PCT.findall(texto)), "millones": len(RE_MILLONES.findall(texto))}


# ───────────────────────── PDF → edición ─────────────────────────

RUIDO_TITULAR = re.compile(r"^(www\.|https?:|\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|a[ñn]o\s+[ivxlc\d]+|edici[oó]n|lima,|per[uú]\s*,|s/\s?\d|publicidad|clasificados|\d+$)", re.I)


def _lineas_pagina(page):
    d = page.get_text("dict")
    lineas = []
    for bi, b in enumerate(d.get("blocks", [])):
        if b.get("type") != 0:
            continue
        for l in b.get("lines", []):
            spans = [s for s in l.get("spans", []) if s.get("text", "").strip()]
            if not spans:
                continue
            txt = "".join(s["text"] for s in spans).strip()
            peso = sum(len(s["text"]) for s in spans)
            tam = sum(s["size"] * len(s["text"]) for s in spans) / max(peso, 1)
            lineas.append({"t": txt, "tam": tam, "n": peso, "bloque": bi, "y0": l["bbox"][1], "y1": l["bbox"][3], "x0": l["bbox"][0]})
    return lineas


def _tam_cuerpo(todas):
    """Tamaño de letra del texto corrido: el que más caracteres acumula."""
    c = collections.Counter()
    for l in todas:
        c[round(l["tam"] * 2) / 2] += l["n"]
    return c.most_common(1)[0][0] if c else 9.0


def _unir(lineas_titular):
    texto = ""
    for t in lineas_titular:
        t = t.strip()
        if texto.endswith("-") and t[:1].islower():
            texto = texto[:-1] + t
        else:
            texto = (texto + " " + t).strip()
    return re.sub(r"\s+", " ", texto)


def extraer_titulares(paginas_lineas, nombre_medio=""):
    """Selecciona líneas de letra grande (≥1,8 veces el cuerpo) y une las contiguas en un titular."""
    todas = [l for p in paginas_lineas for l in p]
    cuerpo = _tam_cuerpo(todas)
    umbral = max(cuerpo * 1.8, cuerpo + 5)
    candidatos, vistos = [], set()
    nm = norm(nombre_medio)
    for pno, lineas in enumerate(paginas_lineas, 1):
        grupo, prev = [], None
        grupos = []
        for l in sorted(lineas, key=lambda x: (x["bloque"], x["y0"])):
            if l["tam"] >= umbral:
                if prev and l["bloque"] == prev["bloque"] and abs(l["tam"] - prev["tam"]) <= prev["tam"] * 0.2 and l["y0"] - prev["y1"] < prev["tam"] * 1.2:
                    grupo.append(l)
                else:
                    if grupo:
                        grupos.append(grupo)
                    grupo = [l]
                prev = l
            else:
                if grupo:
                    grupos.append(grupo)
                grupo, prev = [], None
        if grupo:
            grupos.append(grupo)
        for g in grupos:
            txt = _unir([x["t"] for x in g])
            palabras = txt.split()
            letras = sum(ch.isalpha() for ch in txt)
            if not (3 <= len(palabras) <= 28 and 15 <= len(txt) <= 220) or letras / max(len(txt), 1) < 0.6:
                continue
            if RUIDO_TITULAR.match(txt) or (nm and norm(txt) == nm):
                continue
            k = norm(txt)
            if k in vistos:
                continue
            vistos.add(k)
            candidatos.append({"t": txt, "p": pno, "tam": round(max(x["tam"] for x in g), 1)})
    candidatos.sort(key=lambda c: (-c["tam"], c["p"]))
    elegidos = candidatos[:MAX_TITULARES]
    elegidos.sort(key=lambda c: (c["p"], -c["tam"]))
    for c in elegidos:
        c["tema"] = clasificar_tema(c["t"])
        del c["tam"]
    return elegidos


def analizar_pdf(ruta, nombre_archivo, fecha_mensaje=None, max_paginas=120):
    """Devuelve (fecha, edición). La edición contiene solo estadísticas y titulares breves."""
    import fitz  # PyMuPDF; se importa aquí para que el resto del módulo no lo exija

    medio, fecha = parse_nombre(nombre_archivo, fecha_mensaje)
    doc = fitz.open(ruta)
    try:
        total = doc.page_count
        paginas_lineas, textos = [], []
        for i in range(min(total, max_paginas)):
            page = doc[i]
            paginas_lineas.append(_lineas_pagina(page))
            textos.append(page.get_text("text"))
    finally:
        doc.close()
    texto = "\n".join(textos)
    caracteres = len(re.sub(r"\s+", "", texto))
    leidas = max(len(textos), 1)
    escaneada = caracteres / leidas < 300
    ed = {
        "id": slug(medio), "nombre": medio, "ambito": ambito_de(medio), "paginas": total,
        "calidad": "imagen" if escaneada else "texto", "palabras_total": len(RE_PALABRA.findall(texto.lower())),
        "titulares": [], "temas": {}, "palabras": [], "entidades": [], "lugares": {}, "cifras": {"soles": 0, "dolares": 0, "porcentajes": 0, "millones": 0},
    }
    if escaneada:
        return fecha, ed
    ed["titulares"] = extraer_titulares(paginas_lineas, medio)
    c = collections.Counter(t["tema"] for t in ed["titulares"])
    ed["temas"] = dict(c.most_common())
    ed["palabras"] = contar_palabras(texto)
    ed["entidades"] = contar_entidades(texto)
    ed["lugares"] = contar_lugares(texto)
    ed["cifras"] = contar_cifras(texto)
    return fecha, ed


# ───────────────────────── agregación y fusión ─────────────────────────


def agregar_dia(fecha, ediciones):
    medios = sorted(ediciones, key=lambda e: (-len(e["titulares"]), e["nombre"]))
    temas, palabras, lugares = collections.Counter(), collections.Counter(), collections.Counter()
    entidades, ent_medios = collections.Counter(), collections.Counter()
    cifras = collections.Counter()
    for e in medios:
        temas.update(e["temas"])
        palabras.update(dict(e["palabras"]))
        lugares.update(e["lugares"])
        cifras.update(e["cifras"])
        for nombre, k in e["entidades"]:
            entidades[nombre] += k
            ent_medios[nombre] += 1
    return {
        "fecha": fecha,
        "resumen": {
            "medios": len(medios), "paginas": sum(e["paginas"] for e in medios), "titulares": sum(len(e["titulares"]) for e in medios),
            "escaneados": sum(1 for e in medios if e["calidad"] == "imagen"),
        },
        "temas": [{"id": t, "n": n} for t, n in temas.most_common()],
        "palabras": [[w, n] for w, n in palabras.most_common(40)],
        "entidades": [[e, n, ent_medios[e]] for e, n in entidades.most_common(60) if n >= 3][:25],
        "lugares": [[r, n] for r, n in lugares.most_common()],
        "cifras": dict(cifras),
        "medios": medios,
    }


def estado_vacio():
    return {"version": VERSION, "generado": None, "catalogo_temas": CATALOGO_TEMAS, "procesados": [], "avisos": [], "dias": []}


def fusionar(estado, nuevas, ahora):
    """nuevas: lista de dicts {id, fecha, edicion|None, error|None}. Reemplaza la edición del mismo medio y día."""
    estado = dict(estado)
    estado["version"] = VERSION
    estado["catalogo_temas"] = CATALOGO_TEMAS
    dias = {d["fecha"]: d for d in estado.get("dias", [])}
    procesados = list(estado.get("procesados", []))
    avisos = list(estado.get("avisos", []))
    tocados = set()
    for n in nuevas:
        procesados.append(n["id"])
        if n.get("error") or not n.get("edicion") or not n.get("fecha"):
            avisos.append({"fecha": ahora, "msg": n.get("error") or "Archivo sin fecha o sin edición", "archivo": n.get("archivo", "")})
            continue
        dia = dias.get(n["fecha"]) or {"fecha": n["fecha"], "medios": []}
        previas = [e for e in dia["medios"] if e["id"] != n["edicion"]["id"]]
        dias[n["fecha"]] = {"fecha": n["fecha"], "medios": previas + [n["edicion"]], **({"sintesis": dia["sintesis"]} if dia.get("sintesis") else {})}
        tocados.add(n["fecha"])
    for f in tocados:
        previo = dias[f]
        nuevo = agregar_dia(f, previo["medios"])
        nuevo["actualizado"] = ahora
        # La síntesis anterior queda desactualizada si cambió el conjunto de ediciones; se regenera aparte.
        dias[f] = nuevo
    estado["dias"] = [dias[f] for f in sorted(dias, reverse=True)][:DIAS_HISTORIAL]
    estado["procesados"] = procesados[-MAX_PROCESADOS:]
    estado["avisos"] = avisos[-20:]
    if tocados:
        estado["generado"] = ahora
    return estado, sorted(tocados)


def serie_ligera(dia):
    return {"fecha": dia["fecha"], "medios": dia["resumen"]["medios"], "titulares": dia["resumen"]["titulares"],
            "temas": {t["id"]: t["n"] for t in dia["temas"]}, "palabras": dia["palabras"][:20]}


def salida_js(estado):
    """Versión liviana para la web: detalle completo solo de los últimos días."""
    dias = estado.get("dias", [])
    js = {k: estado[k] for k in ("version", "generado", "catalogo_temas", "avisos") if k in estado}
    js["dias"] = dias[:DIAS_COMPLETOS_JS]
    js["serie"] = [serie_ligera(d) for d in dias]
    return js


def escribir_salida(estado, carpeta):
    os.makedirs(carpeta, exist_ok=True)
    with open(os.path.join(carpeta, "medios.json"), "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=1)
        f.write("\n")
    with open(os.path.join(carpeta, "medios.js"), "w", encoding="utf-8") as f:
        f.write("/* Generado por scripts/actualizar_medios.py. No editar a mano. Solo estadísticas y titulares breves con su página. */\n")
        f.write("window.MEDIOS = " + json.dumps(salida_js(estado), ensure_ascii=False, separators=(",", ":")) + ";\n")


def cargar_estado(carpeta):
    try:
        with open(os.path.join(carpeta, "medios.json"), encoding="utf-8") as f:
            e = json.load(f)
        if not isinstance(e, dict) or not isinstance(e.get("dias"), list):
            return estado_vacio()
        return e
    except (OSError, ValueError):
        return estado_vacio()


# ───────────────────────── validación ─────────────────────────


def validar_estado(e):
    """Devuelve (errores, avisos). Impide publicar texto largo: solo titulares breves y estadísticas."""
    errores, avisos = [], []
    if not isinstance(e, dict) or e.get("version") != VERSION:
        return ["medios.json: versión desconocida"], avisos
    fechas = []
    for d in e.get("dias", []):
        f = d.get("fecha", "")
        try:
            dt.date.fromisoformat(f)
        except ValueError:
            errores.append(f"medios.json: fecha inválida {f!r}")
            continue
        fechas.append(f)
        ids = [m.get("id") for m in d.get("medios", [])]
        if len(ids) != len(set(ids)):
            errores.append(f"medios.json {f}: medios repetidos")
        if d.get("resumen", {}).get("medios") != len(ids):
            errores.append(f"medios.json {f}: el resumen no coincide con las ediciones")
        for m in d.get("medios", []):
            if len(m.get("titulares", [])) > MAX_TITULARES:
                errores.append(f"medios.json {f} {m.get('id')}: demasiados titulares")
            for t in m.get("titulares", []):
                if not isinstance(t.get("t"), str) or len(t["t"]) > 220 or t.get("tema") not in TEMA_IDS:
                    errores.append(f"medios.json {f} {m.get('id')}: titular inválido o demasiado largo")
                    break
            if m.get("calidad") == "imagen":
                avisos.append(f"{f} {m.get('nombre')}: edición escaneada, sin texto extraíble")
        if len(d.get("sintesis", "")) > 1800:
            errores.append(f"medios.json {f}: síntesis demasiado larga")
    if fechas != sorted(fechas, reverse=True) or len(fechas) != len(set(fechas)):
        errores.append("medios.json: los días deben estar ordenados de más reciente a más antiguo y sin repetir")
    return errores, avisos


# ───────────────────────── síntesis opcional con IA ─────────────────────────


def sintetizar(dia, clave, modelo="claude-sonnet-5-5", llamar=None):
    """Genera una síntesis breve a partir SOLO de los titulares y las estadísticas. Opcional: requiere ANTHROPIC_API_KEY."""
    if not clave and not llamar:
        return None
    lineas = []
    for m in dia["medios"]:
        if m["titulares"]:
            lineas.append(f"[{m['nombre']}] " + " | ".join(t["t"] for t in m["titulares"][:12]))
    if not lineas:
        return None
    prompt = (
        f"Titulares de la prensa peruana del {dia['fecha']}, por medio:\n" + "\n".join(lineas[:20]) +
        "\n\nEscribe en español neutro una síntesis de 4 a 6 oraciones de la agenda del día: qué temas dominan, en qué coinciden y en qué difieren los medios. "
        "No copies titulares textualmente, no opines y no inventes datos que no estén en los titulares. Luego da entre 3 y 5 puntos breves (máximo 15 palabras cada uno). "
        'Responde solo JSON: {"sintesis": "...", "puntos": ["...", "..."]}'
    )
    try:
        texto = (llamar or _llamar_api)(prompt, clave, modelo)
        m = re.search(r"\{.*\}", texto, re.S)
        datos = json.loads(m.group(0)) if m else {"sintesis": texto.strip()}
        s = str(datos.get("sintesis", "")).strip()[:1500]
        p = [str(x).strip()[:140] for x in (datos.get("puntos") or [])][:5]
        return {"sintesis": s, "puntos": p} if s else None
    except Exception:  # la síntesis es un extra: si falla, el resto se publica igual
        return None


def _llamar_api(prompt, clave, modelo):
    import urllib.request
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps({"model": modelo, "max_tokens": 700, "messages": [{"role": "user", "content": prompt}]}).encode(),
        headers={"x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["content"][0]["text"]
