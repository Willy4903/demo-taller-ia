#!/usr/bin/env python3
"""Genera la cartelera estática a partir del corte público de CineScope Perú."""
import argparse
import datetime as dt
import json
import os
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parents[1]
FUENTE = "https://raw.githubusercontent.com/jhannfrank/cartelera-cine/main/data/peliculas.json"
CADENAS = {
    "Cineplanet": "cineplanet.com.pe",
    "Cinemark": "cinemark-peru.com",
    "Cinépolis": "cinepolis.com.pe",
    "Movie Time": "movietime.com.pe",
    "Cine Star": "cinestar.com.pe",
    "UVK": "uvk.pe",
}
ALIAS = {
    "ebenezer los fantasmas de navidad": "ebenezer los fantasmas de la navidad",
    "el bosque salvaje wildwood": "wildwood el bosque salvaje",
    "juegos del hambre amanecer cosecha": "los juegos del hambre amanecer en la cosecha",
    "los juegos del hambre amanecer en la cosecha doblada": "los juegos del hambre amanecer en la cosecha",
    "re ju on el grito": "ju on el grito",
    "bts world tour arirang in kaohsiung live viewin": "bts world tour arirang in kaohsiung",
    "bts world tour arirang in kaohsiung live viewing": "bts world tour arirang in kaohsiung",
    "bts world tour arirang in kaohsiung lv": "bts world tour arirang in kaohsiung",
}
GENEROS = {"animada": "Animación", "anime": "Anime", "thriller": "Suspenso", "ficción": "Ciencia ficción"}


def clave(titulo):
    texto = re.sub(r"\s*[\[(](?:dob|sub|\d{4}|\d+ aniversario)[\])]\s*$", "", titulo, flags=re.I)
    texto = unicodedata.normalize("NFKD", texto.casefold()).encode("ascii", "ignore").decode()
    texto = " ".join(re.findall(r"[a-z0-9]+", texto))
    return ALIAS.get(texto, texto)


def url_https(url, dominio=None):
    u = urlsplit(url or "")
    host = u.hostname or ""
    return bool(u.scheme == "https" and host and not u.username and
                (not dominio or host == dominio or host.endswith("." + dominio)))


def sinopsis_breve(sinopsis):
    texto = " ".join((sinopsis or "").split())
    if len(texto) <= 230:
        return texto
    finales = list(re.finditer(r"[.!?](?=\s|$)", texto[:230]))
    return texto[:finales[-1].end()] if finales else texto[:225].rsplit(" ", 1)[0] + "…"


def cartelera(datos, fichas):
    corte = dt.datetime.fromisoformat(datos["scraped_at"]).astimezone(ZoneInfo("America/Lima"))
    inicio = corte.date()
    fin = inicio + dt.timedelta(days=13)
    grupos = {}
    for registro in datos["peliculas"]:
        cadena = registro.get("cadena")
        url = registro.get("url")
        if cadena not in CADENAS or not url_https(url, CADENAS[cadena]):
            continue
        funciones = {}
        for sede in registro.get("sedes", []):
            ciudad = sede.get("ciudad")
            if not ciudad:
                continue
            for funcion in sede.get("funciones", []):
                dia = funcion.get("dia", "")
                if inicio.isoformat() <= dia <= fin.isoformat():
                    funciones.setdefault(dia, set()).add(ciudad)
        if not funciones:
            continue
        titulo = registro.get("titulo", "").strip()
        id_pelicula = clave(titulo)
        if not id_pelicula:
            continue
        grupo = grupos.setdefault(id_pelicula, {
            "id": id_pelicula, "titulo": titulo, "generos": set(),
            "sinopsis": "", "reparto": [], "origen": "", "cines": {},
        })
        cine = grupo["cines"].setdefault(cadena, {"cadena": cadena, "url": url, "dias": {}})
        for dia, ciudades in funciones.items():
            cine["dias"].setdefault(dia, set()).update(ciudades)
        for genero in re.split(r",\s*|\s*/\s*", registro.get("genero") or ""):
            genero = genero.strip()
            if genero and genero.lower() not in {"general", "n/d"}:
                grupo["generos"].add(GENEROS.get(genero.casefold(), genero.capitalize()))
        foto = registro.get("poster_url")
        if not grupo.get("poster") and url_https(foto):
            grupo["poster"] = foto
        if not grupo["sinopsis"] and registro.get("sinopsis"):
            grupo["sinopsis"] = sinopsis_breve(registro["sinopsis"])
            grupo["fuente_sinopsis"] = cadena

    peliculas = []
    for id_pelicula, grupo in grupos.items():
        grupo["generos"] = sorted(grupo["generos"])
        grupo["cines"] = list(grupo["cines"].values())
        for cine in grupo["cines"]:
            cine["dias"] = {dia: sorted(ciudades) for dia, ciudades in sorted(cine["dias"].items())}
        ficha = fichas.get(id_pelicula, {})
        grupo.update(ficha)
        if ficha.get("sinopsis"):
            grupo.pop("fuente_sinopsis", None)
        peliculas.append(grupo)

    if not peliculas:
        raise ValueError("La fuente no contiene funciones próximas con enlaces de las cadenas.")
    peliculas.sort(key=lambda pelicula: pelicula["titulo"].casefold())
    return {"corte": corte.isoformat(timespec="seconds"), "peliculas": peliculas}


def marcar_novedades(nuevo, anterior):
    anteriores = {p["id"]: p for p in anterior.get("peliculas", [])}
    fecha = nuevo["corte"][:10]
    limite = (dt.date.fromisoformat(fecha) - dt.timedelta(days=6)).isoformat()
    for pelicula in nuevo["peliculas"]:
        previa = anteriores.get(pelicula["id"])
        primera = previa.get("nueva_desde", "") if previa else fecha
        if primera >= limite:
            pelicula["nueva_desde"] = primera


def datos_tmdb(ruta, token, **parametros):
    url = "https://api.themoviedb.org/3/" + ruta + "?" + urlencode(parametros)
    req = Request(url, headers={"Authorization": "Bearer " + token, "Accept": "application/json"})
    with urlopen(req, timeout=12) as response:
        return json.load(response)


def ficha_tmdb(pelicula, token, fecha_corte):
    encontrados = datos_tmdb("search/movie", token, query=pelicula["titulo"], language="es-PE").get("results", [])
    limite = (fecha_corte - dt.timedelta(days=370)).isoformat()
    tope = (fecha_corte + dt.timedelta(days=45)).isoformat()
    exactos = [p for p in encontrados
               if pelicula["id"] in {clave(p.get("title", "")), clave(p.get("original_title", ""))}
               and limite <= p.get("release_date", "") <= tope]
    if len(exactos) != 1:
        return {}
    info = datos_tmdb(f"movie/{exactos[0]['id']}", token, language="es-PE",
                      append_to_response="credits,release_dates")
    paises = [p["iso_3166_1"] for p in info.get("production_countries", [])]
    funciones_pe = next((r.get("release_dates", []) for r in info.get("release_dates", {}).get("results", [])
                         if r.get("iso_3166_1") == "PE"), [])
    estrenos = sorted(r["release_date"][:10] for r in funciones_pe
                      if r.get("type") == 3 and r.get("release_date"))
    reparto = [x["name"] for x in info.get("credits", {}).get("cast", [])[:4] if x.get("name")]
    ficha = {}
    if reparto and not pelicula["reparto"]:
        ficha["reparto"] = reparto
    if paises and not pelicula["origen"]:
        ficha["origen"] = "Perú" if "PE" in paises else "Internacional"
    if not pelicula["generos"] and info.get("genres"):
        ficha["generos"] = [g["name"] for g in info["genres"]]
    if estrenos and not pelicula.get("estreno"):
        ficha["estreno"] = estrenos[0]
    if not pelicula["sinopsis"] and info.get("overview"):
        ficha.update(sinopsis=sinopsis_breve(info["overview"]), fuente_sinopsis="TMDB")
    if ficha:
        ficha["ficha_tmdb"] = f"https://www.themoviedb.org/movie/{exactos[0]['id']}"
    return ficha


def enriquecer_cartelera(nuevo, token):
    fecha_corte = dt.date.fromisoformat(nuevo["corte"][:10])
    datos_tmdb("configuration", token)

    def enriquecer(pelicula):
        try:
            pelicula.update(ficha_tmdb(pelicula, token, fecha_corte))
        except (OSError, ValueError) as error:
            print(f"TMDB · {pelicula['titulo']}: {type(error).__name__}")

    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(enriquecer, nuevo["peliculas"]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--entrada", type=Path, help="Usar un corte local de CineScope Perú")
    parser.add_argument("--anterior", type=Path, help="Corte previo de CineScope Perú para la primera comparación")
    args = parser.parse_args()
    destino = RAIZ / "data" / "cines.json"
    if args.entrada:
        datos = json.loads(args.entrada.read_text(encoding="utf-8"))
    else:
        with urlopen(FUENTE, timeout=30) as response:
            datos = json.load(response)
        corte = dt.datetime.fromisoformat(datos["scraped_at"])
        if dt.datetime.now(dt.timezone.utc) - corte > dt.timedelta(days=2):
            raise ValueError("El corte de CineScope Perú tiene más de dos días.")
    fichas = json.loads((RAIZ / "data" / "cines-editorial.json").read_text(encoding="utf-8"))
    nuevo = cartelera(datos, fichas)
    anterior = None
    if args.anterior:
        anterior = cartelera(json.loads(args.anterior.read_text(encoding="utf-8")), fichas)
    elif destino.exists():
        anterior = json.loads(destino.read_text(encoding="utf-8"))
    if anterior:
        if dt.datetime.fromisoformat(nuevo["corte"]) < dt.datetime.fromisoformat(anterior["corte"]):
            raise ValueError("El corte recibido es anterior al publicado.")
        marcar_novedades(nuevo, anterior)
    token = os.environ.get("TMDB_READ_TOKEN")
    if token:
        enriquecer_cartelera(nuevo, token)
    temporal = destino.with_suffix(".tmp")
    temporal.write_text(json.dumps(nuevo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    temporal.replace(destino)
    print(f"{len(nuevo['peliculas'])} títulos con funciones. Corte {nuevo['corte']}.")


if __name__ == "__main__":
    main()
