#!/usr/bin/env python3
"""Revisa que respondan los enlaces de fuentes del contenido editorial (opcional; no bloquea la publicación).

Uso: python3 coyuntura-peru/scripts/verificar_enlaces.py [--estricto]
Muestra los enlaces que devuelven error. Algunos sitios bloquean consultas automáticas (403/429): se informan como aviso.
"""
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "ContextoPeruVerificador/1.0 (+https://github.com/Willy4903/demo-taller-ia)"


def enlaces():
    node = shutil.which("node")
    js = ("global.window={};require(process.argv[1]);require(process.argv[2]);const u=new Set();"
          "(function w(o){if(typeof o==='string'){if(/^https:\\/\\//.test(o))u.add(o)}else if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==='object')Object.values(o).forEach(w)})([window.EDITORIAL,window.TALLERES]);"
          "console.log(JSON.stringify([...u]))")
    r = subprocess.run([node, "-e", js, os.path.join(RAIZ, "data", "editorial.js"), os.path.join(RAIZ, "data", "talleres.js")], capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout.strip().splitlines()[-1])


def probar(url):
    for metodo in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=metodo, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=15) as r:
                return url, r.status, None
        except urllib.error.HTTPError as e:
            if metodo == "HEAD" and e.code in (403, 405, 501):
                continue
            return url, e.code, str(e)
        except Exception as e:  # noqa: BLE001
            if metodo == "HEAD":
                continue
            return url, 0, f"{type(e).__name__}: {str(e)[:80]}"
    return url, 0, "sin respuesta"


def main():
    urls = enlaces()
    with ThreadPoolExecutor(max_workers=8) as ex:
        res = list(ex.map(probar, urls))
    rotos = [(u, c, e) for u, c, e in res if c == 0 or c >= 400]
    bloqueados = [x for x in rotos if x[1] in (403, 429)]
    reales = [x for x in rotos if x not in bloqueados]
    for u, c, e in reales:
        print(f"ROTO ({c}): {u} {e or ''}")
    for u, c, e in bloqueados:
        print(f"AVISO (bloquea consultas automáticas, {c}): {u}")
    print(f"{len(urls)} enlaces revisados: {len(reales)} rotos, {len(bloqueados)} que bloquean consultas automáticas")
    return 1 if (reales and "--estricto" in sys.argv) else 0


if __name__ == "__main__":
    sys.exit(main())
