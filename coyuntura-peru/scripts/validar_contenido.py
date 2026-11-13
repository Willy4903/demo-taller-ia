#!/usr/bin/env python3
"""Control de calidad de Contexto Perú. Sale con código 1 si encuentra errores (los avisos no bloquean).

Revisa: noticias (fechas, duplicados, sectores, dirección), estado de las fuentes, indicadores del contenido
editorial (unidad, fecha de corte y fuente primaria), enlaces de las fuentes (formato) y la estructura del HTML.
"""
from geografia import clasificar_geografia
import medios_analisis
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTORES = {"politica", "economia", "salud", "nino", "tecnologia", "ia", "deporte", "investigacion", "coyuntura", "mundo"}
errores, avisos = [], []


def err(m):
    errores.append(m)


def aviso(m):
    avisos.append(m)


def fecha_ok(txt):
    try:
        d = dt.datetime.fromisoformat(txt.replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


def validar_noticias():
    ruta = os.path.join(RAIZ, "data", "noticias.json")
    try:
        with open(ruta, encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, ValueError) as ex:
        err(f"noticias.json ilegible: {ex}")
        return
    items = d.get("items") or []
    if not items:
        err("noticias.json no tiene notas")
    ahora = dt.datetime.now(dt.timezone.utc)
    urls, titulos = set(), set()
    antiguas = 0
    for i in items:
        t = i.get("titulo", "")
        if not t or not str(i.get("url", "")).startswith("http"):
            err(f"nota sin título o dirección: {i.get('id')}")
            continue
        if i.get("sector") not in SECTORES:
            err(f"sector desconocido en «{t[:50]}»: {i.get('sector')}")
        esperado = clasificar_geografia(i)
        if i.get("geografia") != esperado or i.get("ambito") != esperado["ambito"]:
            err(f"geografía incoherente en «{t[:70]}»")
        f = i.get("fecha")
        if f:
            dd = fecha_ok(f)
            if not dd:
                err(f"fecha inválida en «{t[:50]}»: {f}")
            else:
                if dd > ahora + dt.timedelta(days=1):
                    err(f"fecha en el futuro en «{t[:50]}»: {f}")
                if dd < ahora - dt.timedelta(days=45):
                    antiguas += 1
        u = i["url"].rstrip("/")
        if u in urls:
            err(f"dirección duplicada: {u}")
        urls.add(u)
        k = re.sub(r"\W+", "", t.lower())[:90]
        if k in titulos:
            aviso(f"título repetido: {t[:60]}")
        titulos.add(k)
        if i.get("procedencia") == "agregador" and not i.get("via"):
            err(f"nota de agregador sin etiqueta «via»: {t[:50]}")
    if antiguas:
        aviso(f"{antiguas} notas con más de 45 días")
    for i in items:
        img = i.get("imagen")
        if img and not str(img).startswith("https://"):
            err(f"foto sin https en «{i.get('titulo', '')[:50]}»: {img}")
    sin_foto = sum(1 for i in items if not i.get("imagen"))
    if sin_foto:
        aviso(f"{sin_foto} notas aún sin foto original (no se publican hasta obtenerla)")
    gen = fecha_ok(d.get("generado", "")) if d.get("generado") else None
    if not gen:
        err("noticias.json sin fecha de generación válida")
    elif gen < ahora - dt.timedelta(days=2):
        aviso("el sistema no se actualiza hace más de 2 días")
    for nombre, e in (d.get("estado_fuentes") or {}).items():
        if not e.get("ok"):
            aviso(f"fuente sin datos: {nombre} ({str(e.get('error'))[:80]})")
        elif e.get("procedencia") == "agregador":
            aviso(f"fuente vía agregador: {nombre}")
    tc = (d.get("indicadores") or {}).get("tipo_cambio")
    if tc:
        if not tc.get("fuente"):
            err("tipo de cambio sin fuente")
        for p in tc.get("serie", []):
            if not isinstance(p.get("v"), (int, float)) or not fecha_ok(p.get("f", "") + "T00:00:00"):
                err(f"punto inválido del tipo de cambio: {p}")
    else:
        aviso("sin tipo de cambio")


def validar_editorial():
    node = shutil.which("node")
    if not node:
        aviso("node no disponible: no se validó editorial.js")
        return
    js = r"""
global.window = {};
require(process.argv[1]); require(process.argv[2]);
const E = window.EDITORIAL, out = [];
const https = (u) => /^https:\/\//.test(u || "");
const tieneNumero = (v) => /\d/.test(v || "");
(E.datos.grupos || []).forEach(g => g.items.forEach(i => {
  if (!https(i.u)) out.push("E datos «" + i.id + "» sin enlace https");
  if (!i.f || !i.fp) out.push("E datos «" + i.id + "» sin fuente");
  if (!i.corte) out.push("E datos «" + i.id + "» sin fecha de corte");
  if (tieneNumero(i.v) && !i.un) out.push("E datos «" + i.id + "» tiene cifra sin unidad");
  if (!i.c || !i.e) out.push("E datos «" + i.id + "» sin explicación");
}));
(E.indicadores || []).forEach(i => {
  if (!https(i.u) || !i.fp || !i.corte) out.push("E indicador «" + i.k + "» sin fuente o fecha de corte");
  if (tieneNumero(i.v) && !i.un) out.push("E indicador «" + i.k + "» sin unidad");
});
const ids = new Set();
E.insights.forEach(c => {
  const id = c.id || c.sector; if (ids.has(id)) out.push("E análisis repetido: " + id); ids.add(id);
  if (!c.fuentes || !c.fuentes.length) out.push("E análisis «" + id + "» sin fuentes");
  (c.fuentes || []).forEach(f => { if (!https(f.u)) out.push("E fuente sin https en «" + id + "»: " + f.n); });
  if (!["alta", "media", "baja"].includes(c.nivel)) out.push("E análisis «" + id + "» sin nivel de confianza");
});
if (!/^\d{4}-\d{2}-\d{2}$/.test(E.corte)) out.push("E corte editorial inválido");
(E.fuentes || []).forEach(f => { if (!https(f.u)) out.push("E directorio de fuentes sin https: " + f.n); });
const gl = new Set(E.glosario.map(g => g.id));
E.sectores.forEach(s => (s.terminos || []).forEach(t => { if (!gl.has(t)) out.push("E término inexistente en «" + s.id + "»: " + t); }));
console.log(JSON.stringify(out));
"""
    ed = os.path.join(RAIZ, "data", "editorial.js")
    tl = os.path.join(RAIZ, "data", "talleres.js")
    r = subprocess.run([node, "-e", js, ed, tl], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        err("editorial.js no se pudo cargar: " + r.stderr.strip()[:200])
        return
    for linea in json.loads(r.stdout.strip().splitlines()[-1]):
        err(linea[2:])


class Estructura(HTMLParser):
    VACIOS = {"meta", "link", "br", "img", "input", "hr", "source", "area", "base", "col", "embed", "param", "track", "wbr"}

    def __init__(self):
        super().__init__()
        self.pila, self.ids, self.err = [], set(), []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                self.err.append(f"id repetido: {a['id']}")
            self.ids.add(a["id"])
        if tag not in self.VACIOS:
            self.pila.append(tag)

    def handle_endtag(self, tag):
        if tag in self.VACIOS:
            return
        if not self.pila or self.pila[-1] != tag:
            self.err.append(f"etiqueta de cierre inesperada </{tag}> (abierta: {self.pila[-1] if self.pila else 'ninguna'})")
            if tag in self.pila:
                while self.pila and self.pila.pop() != tag:
                    pass
        else:
            self.pila.pop()


def validar_html():
    with open(os.path.join(RAIZ, "index.html"), encoding="utf-8") as f:
        txt = f.read()
    p = Estructura()
    p.feed(txt)
    for e in p.err:
        err("index.html: " + e)
    if p.pila:
        err("index.html: etiquetas sin cerrar: " + ", ".join(p.pila))
    for requisito, patron in (("lang", r"<html[^>]+lang="), ("viewport", r'name="viewport"'), ("main", r"<main[ >]"), ("título", r"<title>[^<]+</title>")):
        if not re.search(patron, txt):
            err(f"index.html: falta {requisito}")
    for ref in re.findall(r'(?:src|href)="((?:assets|data)/[^"?#]+)', txt):
        if not os.path.exists(os.path.join(RAIZ, ref)):
            err(f"index.html: recurso inexistente {ref}")


def validar_medios():
    """Prensa del día: estructura, fechas y que solo haya titulares breves (nunca texto de las notas)."""
    ruta = os.path.join(RAIZ, "data", "medios.json")
    try:
        with open(ruta, encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, ValueError) as ex:
        err(f"medios.json ilegible: {ex}")
        return
    errores_m, avisos_m = medios_analisis.validar_estado(d)
    for e in errores_m:
        err(e)
    for a in avisos_m:
        aviso(a)
    try:
        with open(os.path.join(RAIZ, "data", "medios.js"), encoding="utf-8") as f:
            js = f.read()
        if not js.rstrip().endswith(";") or "window.MEDIOS = " not in js:
            err("medios.js: formato inesperado")
        else:
            esperado = json.dumps(medios_analisis.salida_js(d), ensure_ascii=False, separators=(",", ":"))
            if esperado not in js:
                err("medios.js no coincide con medios.json: vuelve a generarlo con actualizar_medios.py")
    except OSError as ex:
        err(f"medios.js ilegible: {ex}")


def main():
    validar_noticias()
    validar_editorial()
    validar_medios()
    validar_html()
    for a in avisos:
        print("AVISO:", a)
    for e in errores:
        print("ERROR:", e)
    print(f"Validación: {len(errores)} errores, {len(avisos)} avisos")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
