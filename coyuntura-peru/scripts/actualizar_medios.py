#!/usr/bin/env python3
"""Lee los PDF descargados (manifiesto.json) y actualiza data/medios.json y data/medios.js.

Uso: python actualizar_medios.py --entrada DIR [--datos DIR] [--sin-ia]
Si no hay PDF nuevos no escribe nada. Un PDF dañado se registra en «avisos» y no detiene al resto.
"""
import argparse
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import medios_analisis as ma  # noqa: E402

DATOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entrada", required=True)
    ap.add_argument("--datos", default=DATOS)
    ap.add_argument("--sin-ia", action="store_true")
    a = ap.parse_args()

    try:
        with open(os.path.join(a.entrada, "manifiesto.json"), encoding="utf-8") as f:
            manifiesto = json.load(f)
    except (OSError, ValueError):
        print("No hay manifiesto: no se descargó nada.")
        return 0
    if not manifiesto:
        print("Sin PDF nuevos.")
        return 0

    nuevas = []
    for m in manifiesto:
        ruta = os.path.join(a.entrada, os.path.basename(m["archivo"]))
        try:
            fecha, ed = ma.analizar_pdf(ruta, m["nombre"], m.get("fecha_mensaje"))
            nuevas.append({"id": m["id"], "fecha": fecha, "edicion": ed, "archivo": m["nombre"]})
            print(f"OK  {ed['nombre']:<28} {fecha}  {ed['paginas']:>3} pág.  {len(ed['titulares']):>2} titulares  [{ed['calidad']}]")
        except Exception as ex:  # PDF dañado, protegido, etc.
            nuevas.append({"id": m["id"], "error": f"{type(ex).__name__}: {str(ex)[:160]}", "archivo": m["nombre"]})
            print(f"ERR {m['nombre']}: {ex}", file=sys.stderr)

    ahora = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    estado, tocados = ma.fusionar(ma.cargar_estado(a.datos), nuevas, ahora)

    clave = None if a.sin_ia else os.environ.get("ANTHROPIC_API_KEY")
    if clave:
        modelo = os.environ.get("MEDIOS_MODELO", "claude-sonnet-5-5")
        for d in estado["dias"]:
            if d["fecha"] in tocados:
                s = ma.sintetizar(d, clave, modelo)
                if s:
                    d["sintesis"], d["puntos"] = s["sintesis"], s["puntos"]
                else:
                    print(f"Sin síntesis de IA para {d['fecha']} (se publica el resto).")

    errores, avisos = ma.validar_estado(estado)
    for av in avisos:
        print("AVISO:", av)
    if errores:
        for e in errores:
            print("ERROR:", e, file=sys.stderr)
        return 1
    if not tocados and not nuevas:
        return 0
    ma.escribir_salida(estado, a.datos)
    print(f"Días actualizados: {', '.join(tocados) or 'ninguno'}. Procesados: {len(nuevas)}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
