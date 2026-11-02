import csv
import json
import os
from collections import defaultdict

DIRECTORIO = os.path.dirname(__file__)
ARCHIVO_CSV = os.path.join(DIRECTORIO, "ventas_simuladas.csv")
ARCHIVO_TEMPLATE = os.path.join(DIRECTORIO, "dashboard_template.html")
ARCHIVO_SALIDA = os.path.join(DIRECTORIO, "dashboard_ventas.html")

NOMBRES_MES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}
ABREVIATURA_MES = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
}


def leer_transacciones(ruta):
    with open(ruta, newline="") as archivo:
        lector = csv.DictReader(archivo)
        transacciones = []
        for fila in lector:
            fila["unidades"] = int(fila["unidades"])
            fila["precio_unitario"] = float(fila["precio_unitario"])
            fila["total"] = float(fila["total"])
            fila["cliente_nuevo"] = fila["cliente_nuevo"] == "True"
            fila["anio_mes"] = fila["fecha"][:7]
            transacciones.append(fila)
        return transacciones


def calcular_ventas_por_mes(transacciones):
    totales_por_mes = defaultdict(float)
    for t in transacciones:
        totales_por_mes[t["anio_mes"]] += t["total"]

    meses_ordenados = sorted(totales_por_mes.keys())
    ultimos_6 = meses_ordenados[-6:]

    ventas_por_mes = []
    for anio_mes in ultimos_6:
        anio, mes = anio_mes.split("-")
        ventas_por_mes.append(
            {"mes": ABREVIATURA_MES[int(mes)], "anio": int(anio), "total": round(totales_por_mes[anio_mes], 2)}
        )
    return ventas_por_mes, ultimos_6


def calcular_top_productos(transacciones, mes_actual):
    unidades_por_producto = defaultdict(int)
    ingresos_por_producto = defaultdict(float)
    for t in transacciones:
        if t["anio_mes"] != mes_actual:
            continue
        unidades_por_producto[t["producto"]] += t["unidades"]
        ingresos_por_producto[t["producto"]] += t["total"]

    productos = [
        {"nombre": nombre, "unidades": unidades_por_producto[nombre], "ingresos": round(ingresos_por_producto[nombre], 2)}
        for nombre in ingresos_por_producto
    ]
    productos.sort(key=lambda p: p["ingresos"], reverse=True)
    return productos[:10]


def calcular_estadisticas(transacciones, mes_actual, mes_anterior):
    ventas_mes_actual = [t for t in transacciones if t["anio_mes"] == mes_actual]
    ventas_mes_anterior = [t for t in transacciones if t["anio_mes"] == mes_anterior]

    total_actual = sum(t["total"] for t in ventas_mes_actual)
    total_anterior = sum(t["total"] for t in ventas_mes_anterior)

    productos_actual = {t["producto"] for t in ventas_mes_actual}
    productos_anterior = {t["producto"] for t in ventas_mes_anterior}

    promedio_actual = total_actual / len(productos_actual) if productos_actual else 0
    promedio_anterior = total_anterior / len(productos_anterior) if productos_anterior else 0

    clientes_nuevos_actual = sum(1 for t in ventas_mes_actual if t["cliente_nuevo"])
    clientes_nuevos_anterior = sum(1 for t in ventas_mes_anterior if t["cliente_nuevo"])

    return {
        "total_actual": total_actual,
        "delta_total_pct": ((total_actual - total_anterior) / total_anterior * 100) if total_anterior else 0,
        "promedio_actual": promedio_actual,
        "delta_promedio_pct": ((promedio_actual - promedio_anterior) / promedio_anterior * 100) if promedio_anterior else 0,
        "clientes_nuevos_actual": clientes_nuevos_actual,
        "delta_clientes": clientes_nuevos_actual - clientes_nuevos_anterior,
    }


def formatear_soles(valor):
    return "S/ " + f"{valor:,.0f}"


def formatear_delta(valor_pct):
    flecha = "▲" if valor_pct >= 0 else "▼"
    return f"{flecha} {abs(valor_pct):.1f}% vs. mes anterior"


def generar_dashboard():
    transacciones = leer_transacciones(ARCHIVO_CSV)
    ventas_por_mes, meses_ordenados = calcular_ventas_por_mes(transacciones)

    mes_actual = meses_ordenados[-1]
    mes_anterior = meses_ordenados[-2]

    top_productos = calcular_top_productos(transacciones, mes_actual)
    stats = calcular_estadisticas(transacciones, mes_actual, mes_anterior)

    anio, mes = mes_actual.split("-")
    periodo_actual = f"{NOMBRES_MES[int(mes)]} {anio}"

    delta_clientes = stats["delta_clientes"]
    signo_clientes = "▲" if delta_clientes >= 0 else "▼"
    texto_delta_clientes = f"{signo_clientes} {abs(delta_clientes)} {'nuevos' if delta_clientes >= 0 else 'menos'} vs. mes anterior"

    reemplazos = {
        "__PERIODO_ACTUAL__": periodo_actual,
        "__STAT_TOTAL__": formatear_soles(stats["total_actual"]),
        "__STAT_TOTAL_DELTA__": formatear_delta(stats["delta_total_pct"]),
        "__STAT_PROMEDIO__": formatear_soles(stats["promedio_actual"]),
        "__STAT_PROMEDIO_DELTA__": formatear_delta(stats["delta_promedio_pct"]),
        "__STAT_CLIENTES__": str(stats["clientes_nuevos_actual"]),
        "__STAT_CLIENTES_DELTA__": texto_delta_clientes,
        "__VENTAS_POR_MES_JSON__": json.dumps(ventas_por_mes, ensure_ascii=False),
        "__TOP_PRODUCTOS_JSON__": json.dumps(top_productos, ensure_ascii=False),
    }

    with open(ARCHIVO_TEMPLATE, encoding="utf-8") as archivo:
        html = archivo.read()

    for marcador, valor in reemplazos.items():
        html = html.replace(marcador, valor)

    with open(ARCHIVO_SALIDA, "w", encoding="utf-8") as archivo:
        archivo.write(html)

    print(f"Dashboard generado en: {ARCHIVO_SALIDA}")
    print(f"Periodo: {periodo_actual} | Total: {formatear_soles(stats['total_actual'])} | "
          f"Promedio/producto: {formatear_soles(stats['promedio_actual'])} | "
          f"Clientes nuevos: {stats['clientes_nuevos_actual']}")


if __name__ == "__main__":
    if not os.path.exists(ARCHIVO_CSV):
        raise SystemExit(
            "No se encontro ventas_simuladas.csv. Ejecuta primero: python3 simular_datos_ventas.py"
        )
    generar_dashboard()
