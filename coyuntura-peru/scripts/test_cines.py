import datetime as dt
import unittest
from unittest.mock import patch

import actualizar_cines as cines


class Cartelera(unittest.TestCase):
    def test_fusiona_versiones_y_conserva_ciudades(self):
        def ficha(titulo, cadena, url, ciudad, dia):
            return {"titulo": titulo, "cadena": cadena, "url": url,
                    "sedes": [{"ciudad": ciudad, "funciones": [{"dia": dia}]}]}
        datos = {"scraped_at": "2026-11-18T05:05:00Z", "peliculas": [
            ficha("Película (DOB)", "Cineplanet", "https://www.cineplanet.com.pe/peliculas/p", "Lima", "2026-11-18"),
            ficha("Película", "UVK", "https://uvk.pe/peliculas/p", "Ica", "2026-11-19"),
            ficha("Caducada", "UVK", "https://uvk.pe/peliculas/x", "Lima", "2026-11-17"),
        ]}
        nuevo = cines.cartelera(datos, {"pelicula": {"origen": "Perú", "reparto": ["Actor"]}})
        self.assertEqual(len(nuevo["peliculas"]), 1)
        titulo, = nuevo["peliculas"]
        self.assertEqual(titulo["reparto"], ["Actor"])
        self.assertEqual([c["dias"] for c in titulo["cines"]], [{"2026-11-18": ["Lima"]}, {"2026-11-19": ["Ica"]}])
        cines.marcar_novedades(nuevo, {"peliculas": []})
        self.assertEqual(titulo["nueva_desde"], "2026-11-18")

    def test_estreno_regional_y_reparto(self):
        resultados = {"results": [{"id": 123, "title": "Película", "release_date": "2026-11-12"}]}
        ficha = {"production_countries": [{"iso_3166_1": "PE"}], "credits": {"cast": [{"name": "Actora"}]},
                 "release_dates": {"results": [{"iso_3166_1": "PE", "release_dates": [
                     {"type": 4, "release_date": "2026-11-10T00:00:00Z"},
                     {"type": 3, "release_date": "2026-11-19T00:00:00Z"}]}]}}
        with patch.object(cines, "datos_tmdb", side_effect=[resultados, ficha]):
            datos = cines.ficha_tmdb({"id": "pelicula", "titulo": "Película", "origen": "", "reparto": [],
                                     "generos": ["Drama"], "sinopsis": "Resumen"}, "token", dt.date(2026, 11, 18))
        self.assertEqual(datos["estreno"], "2026-11-19")
        self.assertEqual(datos["origen"], "Perú")
        self.assertEqual(datos["reparto"], ["Actora"])
