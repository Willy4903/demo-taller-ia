import unittest
from unittest.mock import patch

import actualizar_noticias as noticias
from acceso_noticias import comprobar, original


URL = "https://medio.pe/noticia/a"
PARRAFO = "<p>El reportaje completo desarrolla los hechos explicando sus antecedentes y el contexto en que se tomó la decisión.</p>"
TEXTO = "<article>" + PARRAFO + "<p>La publicación explica cómo se reunieron los datos y las fuentes acreditadas por los responsables del estudio.</p></article>"


class LecturaOriginal(unittest.TestCase):
    def test_articulo_abierto_y_url_canonica(self):
        pagina = '<link href="/reportaje/a" rel="canonical">' + TEXTO
        self.assertEqual(comprobar(URL, pagina, noticias.parrafos_html),
                         {"acceso": "abierto", "url_medio": "https://medio.pe/reportaje/a"})

    def test_extracto_y_bloqueo(self):
        for contenido, esperado in [
            ("<article>" + PARRAFO + "</article>", "sin_verificar"),
            ('<script type="application/ld+json">{"isAccessibleForFree":false}</script>' + TEXTO, "restringido"),
            (TEXTO + "<aside>Suscríbete para seguir leyendo</aside>", "restringido"),
            ('<link rel="canonical" href="/">' + TEXTO, "sin_verificar"),
        ]:
            with self.subTest(esperado=esperado, contenido=contenido):
                self.assertEqual(comprobar(URL, contenido, noticias.parrafos_html)["acceso"], esperado)

    def test_destino_directo_y_canonica_restringida(self):
        self.assertIsNone(original("https://news.google.com/rss/articles/id"))
        self.assertEqual(original(URL + "?utm_source=feed&edicion=plena&outputType=amp#texto"), URL + "?edicion=plena")
        respuestas = [(URL, '<link rel="canonical" href="/nota/a">' + TEXTO),
                      ("https://medio.pe/nota/a", "<article>" + PARRAFO + "</article>")]
        with patch.object(noticias, "pagina_articulo", side_effect=respuestas) as pagina:
            dato = noticias.sintesis_de_pagina({"titulo": "Reporte", "url": URL})
        self.assertEqual(dato["acceso"], "sin_verificar")
        self.assertEqual(pagina.call_count, 2)
