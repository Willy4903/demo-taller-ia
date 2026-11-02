#!/usr/bin/env python3
"""Obtiene fotos documentales reales y valida que sean JPEG antes de publicar.

Se ejecuta en GitHub Actions; los binarios se alojan en gh-pages para evitar
dependencias de imágenes externas en los navegadores de los visitantes.
"""
import argparse
import mimetypes
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PHOTOS = {
    "hero-lima.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Peru_-_Lima_004_-_sunset_light_over_the_coastal_cliffs_%286999152559%29.jpg/1280px-Peru_-_Lima_004_-_sunset_light_over_the_coastal_cliffs_%286999152559%29.jpg",
    "noticias-congreso.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Congreso_de_la_Rep%C3%BAblica_del_Per%C3%BA.jpg/1280px-Congreso_de_la_Rep%C3%BAblica_del_Per%C3%BA.jpg",
    "datos-bcrp.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Edificio_del_BCRP_en_Lima_01.jpg/1280px-Edificio_del_BCRP_en_Lima_01.jpg",
    "nino-piura.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MINISTRO_DE_DEFENSA_LLEV%C3%93_AYUDA_HUMANITARIA_A_PIURA_Y_COORDIN%C3%93_ACCIONES_PARA_ENFRENTAR_EFECTOS_DEL_FEN%C3%93MENO_DEL_NI%C3%91O_COSTERO.jpg/1280px-MINISTRO_DE_DEFENSA_LLEV%C3%93_AYUDA_HUMANITARIA_A_PIURA_Y_COORDIN%C3%93_ACCIONES_PARA_ENFRENTAR_EFECTOS_DEL_FEN%C3%93MENO_DEL_NI%C3%91O_COSTERO.jpg",
}


def valid_jpeg(path):
    if not path.is_file() or path.stat().st_size < 20_000:
        return False
    with path.open("rb") as f:
        return f.read(3) == b"\xff\xd8\xff"


def fetch_jpeg(url, destination):
    last_error = None
    for attempt in range(3):
        try:
            req = Request(url, headers={
                "User-Agent": "PeruEnClaro-Observatorio/1.0 (GitHub Pages; https://github.com/Willy4903/demo-taller-ia)",
                "Accept": "image/jpeg,image/*;q=0.9",
            })
            with urlopen(req, timeout=40) as response:
                if response.status != 200:
                    raise ValueError(f"Estado HTTP {response.status}")
                data = response.read(7_000_000)
            if len(data) < 20_000 or len(data) >= 7_000_000 or data[:3] != b"\xff\xd8\xff":
                raise ValueError(f"Imagen no válida: {len(data)} bytes")
            tmp = destination.with_suffix(".tmp")
            tmp.write_bytes(data)
            tmp.replace(destination)
            print(f"{destination.name}: JPEG real, {len(data):,} bytes")
            return
        except (HTTPError, URLError, OSError, ValueError) as exc:
            last_error = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"No se pudo descargar {destination.name}: {last_error}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dest", type=Path, required=True)
    args = parser.parse_args()
    args.dest.mkdir(parents=True, exist_ok=True)
    for name, url in PHOTOS.items():
        path = args.dest / name
        if valid_jpeg(path):
            print(f"{name}: se reutiliza JPEG existente")
            continue
        fetch_jpeg(url, path)
        if not valid_jpeg(path):
            raise ValueError(f"JPEG ilegible: {path}")
    assert len(list(args.dest.glob("*.jpg"))) >= 4
    print("Fotografías verificadas y listas para publicación.")


if __name__ == "__main__":
    main()
