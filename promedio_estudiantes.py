import csv
import os

ARCHIVO_CSV = os.path.join(os.path.dirname(__file__), "estudiantes.csv")

DATOS_EJEMPLO = [
    {"nombre": "Ana", "edad": "20", "calificacion": "17.5"},
    {"nombre": "Luis", "edad": "22", "calificacion": "14.0"},
    {"nombre": "Maria", "edad": "21", "calificacion": "16.8"},
    {"nombre": "Carlos", "edad": "19", "calificacion": "12.5"},
    {"nombre": "Sofia", "edad": "23", "calificacion": "18.2"},
]


def crear_archivo_ejemplo(ruta):
    with open(ruta, "w", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=["nombre", "edad", "calificacion"])
        escritor.writeheader()
        escritor.writerows(DATOS_EJEMPLO)


def calcular_promedio(ruta):
    with open(ruta, newline="") as archivo:
        lector = csv.DictReader(archivo)
        calificaciones = [float(fila["calificacion"]) for fila in lector]

    if not calificaciones:
        return 0.0

    return sum(calificaciones) / len(calificaciones)


if __name__ == "__main__":
    if not os.path.exists(ARCHIVO_CSV):
        crear_archivo_ejemplo(ARCHIVO_CSV)
        print(f"Archivo {ARCHIVO_CSV} no existía, se creó con datos de ejemplo.")

    promedio = calcular_promedio(ARCHIVO_CSV)
    print(f"Promedio de calificaciones: {promedio:.2f}")
