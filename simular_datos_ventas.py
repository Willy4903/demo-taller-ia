import csv
import os
import random
from datetime import date, timedelta

random.seed(42)

DIRECTORIO = os.path.dirname(__file__)
ARCHIVO_SALIDA = os.path.join(DIRECTORIO, "ventas_simuladas.csv")

MESES = [
    (2026, 4), (2026, 5), (2026, 6),
    (2026, 7), (2026, 8), (2026, 9),
]

PRODUCTOS = [
    ("Laptop Ultra X1", "Tecnologia", 3200, 6.0),
    ("Smartphone Galaxy Z", "Tecnologia", 2800, 6.5),
    ("Monitor 27 4K", "Tecnologia", 900, 4.0),
    ("Tablet 10 pulgadas", "Tecnologia", 700, 2.0),
    ("Router WiFi 6", "Tecnologia", 250, 2.5),
    ("Auriculares Pro", "Accesorios", 90, 10.0),
    ("Teclado Mecanico RGB", "Accesorios", 120, 7.0),
    ("Mouse Inalambrico", "Accesorios", 60, 9.0),
    ("Disco SSD 1TB", "Accesorios", 150, 6.5),
    ("Camara Web HD", "Accesorios", 70, 4.5),
    ("Impresora LaserJet", "Oficina", 400, 1.5),
    ("Silla Ergonomica", "Oficina", 550, 1.8),
]

NOMBRES_CLIENTES = [f"Cliente-{i:04d}" for i in range(1, 601)]


def dias_del_mes(anio, mes):
    primer_dia = date(anio, mes, 1)
    if mes == 12:
        siguiente_mes = date(anio + 1, 1, 1)
    else:
        siguiente_mes = date(anio, mes + 1, 1)
    dias = []
    dia_actual = primer_dia
    while dia_actual < siguiente_mes:
        dias.append(dia_actual)
        dia_actual += timedelta(days=1)
    return dias


def generar_transacciones():
    transacciones = []
    clientes_vistos = set()
    pesos_productos = [p[3] for p in PRODUCTOS]

    for indice_mes, (anio, mes) in enumerate(MESES):
        # Tendencia de crecimiento suave mes a mes
        factor_crecimiento = 1 + (indice_mes * 0.09)
        transacciones_del_mes = int(random.uniform(85, 110) * factor_crecimiento)

        for _ in range(transacciones_del_mes):
            dia = random.choice(dias_del_mes(anio, mes))
            producto, categoria, precio_base, _ = random.choices(PRODUCTOS, weights=pesos_productos, k=1)[0]
            unidades = random.randint(1, 4)
            precio_unitario = round(precio_base * random.uniform(0.95, 1.05), 2)
            total = round(unidades * precio_unitario, 2)

            cliente = random.choice(NOMBRES_CLIENTES)
            es_nuevo = cliente not in clientes_vistos
            clientes_vistos.add(cliente)

            transacciones.append(
                {
                    "fecha": dia.isoformat(),
                    "producto": producto,
                    "categoria": categoria,
                    "unidades": unidades,
                    "precio_unitario": precio_unitario,
                    "total": total,
                    "cliente_id": cliente,
                    "cliente_nuevo": es_nuevo,
                }
            )

    transacciones.sort(key=lambda t: t["fecha"])
    return transacciones


def guardar_csv(transacciones, ruta):
    campos = ["fecha", "producto", "categoria", "unidades", "precio_unitario", "total", "cliente_id", "cliente_nuevo"]
    with open(ruta, "w", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=campos)
        escritor.writeheader()
        escritor.writerows(transacciones)


if __name__ == "__main__":
    transacciones = generar_transacciones()
    guardar_csv(transacciones, ARCHIVO_SALIDA)
    print(f"Se generaron {len(transacciones)} transacciones simuladas en {ARCHIVO_SALIDA}")
