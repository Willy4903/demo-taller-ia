"""Pruebas del actualizador (sin red): python3 -m unittest discover -s coyuntura-peru/scripts -p "test_*.py" """
import datetime as dt
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import actualizar_noticias as a  # noqa: E402


def rss(items, fuente=None):
    cuerpo = ""
    for t, u, f in items:
        src = f'<source url="https://x.pe">{fuente}</source>' if fuente else ""
        cuerpo += f"<item><title>{t}</title><link>{u}</link><pubDate>{f}</pubDate><description>x</description>{src}</item>"
    return ("﻿ \n<?xml version='1.0'?><rss><channel>" + cuerpo + "</channel></rss>").encode("utf-8")


def hoy_rfc():
    return dt.datetime.now(dt.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")


class Parseo(unittest.TestCase):
    def test_bom_y_espacios(self):
        r = a.parsear_feed(rss([("Hola", "https://x.pe/a", hoy_rfc())]), "Wayka", "independiente", None)
        self.assertEqual(r[0]["titulo"], "Hola")

    def test_rechaza_entidades(self):
        malo = b'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><rss><channel/></rss>'
        with self.assertRaises(ValueError):
            a.parsear_feed(malo, "X", "comercial", None)

    def test_descarta_antiguas(self):
        vieja = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=90)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        self.assertEqual(a.parsear_feed(rss([("Vieja", "https://x.pe/v", vieja)]), "X", "comercial", None), [])

    def test_genero(self):
        self.assertEqual(a.genero_de("https://medio.pe/opinion/columna-1"), "opinion")
        self.assertEqual(a.genero_de("https://medio.pe/politica/nota-1"), "noticia")


class Clasificacion(unittest.TestCase):
    def test_no_fuerza_economia(self):
        self.assertEqual(a.clasificar("Temblor en Estados Unidos EN VIVO hoy", "", "economia"), "coyuntura")

    def test_nino(self):
        self.assertEqual(a.clasificar("ENFEN mantiene alerta de El Niño costero", "", None), "nino")

    def test_sector_por_defecto_de_medio_especializado(self):
        self.assertEqual(a.clasificar("Una nota sin palabras clave", "", "salud"), "salud")


class Fusion(unittest.TestCase):
    def item(self, t, u, f=None, s="politica"):
        return {"titulo": t, "url": u, "fecha": f, "sector": s}

    def test_duplicados_por_url_y_titulo(self):
        f = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        r = a.fusionar([self.item("A", "https://x.pe/1", f), self.item("a", "https://x.pe/2", f)], [self.item("B", "https://x.pe/1/", f)])
        self.assertEqual(len(r), 1)

    def test_antiguas_se_eliminan(self):
        vieja = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=60)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.assertEqual(a.fusionar([], [self.item("Vieja", "https://x.pe/v", vieja)]), [])

    def test_sin_fecha_se_conserva(self):
        self.assertEqual(len(a.fusionar([], [self.item("Sin fecha", "https://x.pe/s")])), 1)


class Validacion(unittest.TestCase):
    def ok(self, n):
        return {"titulo": f"t{n}", "url": f"https://x.pe/{n}", "fecha": None, "sector": "politica"}

    def test_vacio(self):
        _, _, err = a.validar_datos([], [self.ok(1)])
        self.assertTrue(err)

    def test_caida_fuerte(self):
        previos = [self.ok(i) for i in range(10)]
        _, _, err = a.validar_datos([self.ok(1)], previos)
        self.assertTrue(err)

    def test_descarta_invalidos(self):
        malos = [{"titulo": "x", "url": "ftp://x", "sector": "politica"},
                 {"titulo": "x", "url": "https://x.pe/a", "sector": "inventado"},
                 {"titulo": "x", "url": "https://x.pe/b", "sector": "politica", "fecha": "no-es-fecha"},
                 {"titulo": "x", "url": "https://x.pe/c", "sector": "politica", "fecha": "2999-01-01T00:00:00Z"}]
        buenos, desc, err = a.validar_datos(malos + [self.ok(1)], [])
        self.assertEqual(len(buenos), 1)
        self.assertEqual(sum(desc.values()), 4)
        self.assertFalse(err)


class Respaldo(unittest.TestCase):
    def setUp(self):
        self.orig = a.descargar

    def tearDown(self):
        a.descargar = self.orig

    def test_directo_ok(self):
        a.descargar = lambda u: rss([("Nota", "https://ojo-publico.com/1", hoy_rfc())])
        items, info = a.obtener_con_respaldo("OjoPúblico", ["https://ojo-publico.com/rss.xml"], "independiente", "investigacion")
        self.assertEqual(info["procedencia"], "directa")
        self.assertEqual(items[0]["procedencia"], "directa")

    def test_respaldo_se_marca_como_agregador(self):
        def fake(u):
            if "news.google.com" in u:
                return rss([("Nota - Convoca", "https://news.google.com/rss/articles/x", hoy_rfc())], fuente="Convoca")
            raise OSError("404")
        a.descargar = fake
        items, info = a.obtener_con_respaldo("Convoca", ["https://convoca.pe/feed"], "independiente", "investigacion")
        self.assertEqual(info["procedencia"], "agregador")
        self.assertEqual(items[0]["via"], "Google Noticias")
        self.assertEqual(items[0]["fuente"], "Convoca")
        self.assertEqual(items[0]["titulo"], "Nota")

    def test_respaldo_descarta_otros_medios(self):
        def fake(u):
            if "news.google.com" in u:
                return rss([("Nota - Otro", "https://news.google.com/rss/articles/y", hoy_rfc())], fuente="Otro Medio")
            raise OSError("404")
        a.descargar = fake
        items, info = a.obtener_con_respaldo("Convoca", ["https://convoca.pe/feed"], "independiente", "investigacion")
        self.assertIsNone(items)
        self.assertFalse(info["ok"])

    def test_nombre_con_guion_o_espacio(self):
        for escrito in ("Ojo-Público", "Ojo Público", "OjoPúblico"):
            a.descargar = lambda u, e=escrito: rss([("Nota - X", "https://news.google.com/rss/articles/q", hoy_rfc())], fuente=e) if "news.google.com" in u else (_ for _ in ()).throw(OSError("404"))
            items, info = a.obtener_con_respaldo("OjoPúblico", ["https://ojo-publico.com/rss.xml"], "independiente", "investigacion")
            self.assertIsNotNone(items, escrito)
            self.assertEqual(info["procedencia"], "agregador")

    def test_sin_datos(self):
        def fake(u):
            raise OSError("caído")
        a.descargar = fake
        items, info = a.obtener_con_respaldo("Expreso", ["https://www.expreso.com.pe/feed/"], "comercial", None)
        self.assertIsNone(items)
        self.assertEqual(info["procedencia"], "sin datos")
        self.assertIn("error", info)


class Enfen(unittest.TestCase):
    def test_ultimo_comunicado_y_fecha(self):
        html_txt = ("<li>Comunicado Oficial ENFEN N° 12-2026 Publicado el 30 de setiembre de 2026</li>"
                    "<li>Comunicado Oficial ENFEN N° 16-2026 15 de octubre de 2026</li>"
                    "<li>Comunicado Oficial ENFEN N° 01-2026 15 de enero de 2026</li>")
        r = a.parsear_enfen(html_txt)
        self.assertEqual(r["numero"], "16-2026")
        self.assertEqual(r["fecha"], "2026-10-15")

    def test_sin_fecha(self):
        r = a.parsear_enfen("<p>Comunicado Oficial ENFEN N° 3-2026</p>")
        self.assertEqual(r["numero"], "3-2026")
        self.assertIsNone(r["fecha"])

    def test_sin_comunicados(self):
        self.assertIsNone(a.parsear_enfen("<p>nada</p>"))


class Indicadores(unittest.TestCase):
    def setUp(self):
        self.orig = a.descargar

    def tearDown(self):
        a.descargar = self.orig

    def test_tipo_cambio_respaldo_acumula(self):
        def fake(u):
            if "bcrp" in u:
                return b"<html>error</html>"
            return json.dumps({"rates": {"PEN": 3.45}}).encode()
        a.descargar = fake
        r = a.tipo_cambio({"serie": [{"f": "2020-01-01", "v": 3.3}]})
        self.assertEqual(len(r["serie"]), 2)
        self.assertIn("Referencial", r["fuente"])

    def test_banco_mundial(self):
        a.descargar = lambda u: json.dumps([{}, [{"date": str(2024 - i), "value": 30.0 + i} for i in range(6)]]).encode()
        r = a.datos_bm()
        self.assertEqual(len(r), len(a.SERIES_BM))


class Integracion(unittest.TestCase):
    """Ejecuta main() completo en una carpeta temporal con la red simulada."""

    def setUp(self):
        import tempfile
        self.tmp = tempfile.mkdtemp()
        self.guardado = {k: getattr(a, k) for k in ("DATOS", "ARCHIVO_JS", "ARCHIVO_JSON", "descargar", "descargar_parcial", "imagen_og", "tipo_cambio", "datos_bm", "imagenes_editoriales")}
        a.DATOS = self.tmp
        a.ARCHIVO_JS = os.path.join(self.tmp, "noticias.js")
        a.ARCHIVO_JSON = os.path.join(self.tmp, "noticias.json")
        a.imagen_og = lambda u: None
        a.tipo_cambio = lambda previo=None: previo
        a.datos_bm = lambda previo=None: previo or {}
        a.imagenes_editoriales = lambda previas=None: previas or {}
        a.descargar_parcial = lambda u: "<p>Comunicado Oficial ENFEN N° 16-2026 15 de octubre de 2026</p>"

    def tearDown(self):
        for k, v in self.guardado.items():
            setattr(a, k, v)

    def test_flujo_completo(self):
        def fake(u):
            if "news.google.com" in u:
                return rss([("Investigación - Convoca", "https://news.google.com/rss/articles/z", hoy_rfc())], fuente="Convoca")
            if "feed-ok" in u:
                return rss([("Congreso aprueba reforma", "https://x.pe/a", hoy_rfc()), ("Opinión del día", "https://x.pe/opinion/b", hoy_rfc())])
            raise OSError("404")
        a.descargar = fake
        feeds = [("Medio OK", ["https://x.pe/feed-ok"], "comercial", None), ("Convoca", ["https://convoca.pe/feed"], "independiente", "investigacion"), ("Expreso", ["https://e.pe/feed"], "comercial", None)]
        self.assertEqual(a.main(feeds), 0)
        d = json.load(open(a.ARCHIVO_JSON, encoding="utf-8"))
        self.assertTrue(d["estado_fuentes"]["Medio OK"]["ok"])
        self.assertEqual(d["estado_fuentes"]["Convoca"]["procedencia"], "agregador")
        self.assertFalse(d["estado_fuentes"]["Expreso"]["ok"])
        self.assertIn("error", d["estado_fuentes"]["Expreso"])
        self.assertTrue(d["estado_fuentes"]["Medio OK"]["comprobado"])
        self.assertEqual(d["enfen"]["numero"], "16-2026")
        self.assertEqual({i["genero"] for i in d["items"] if i["fuente"] == "Medio OK"}, {"noticia", "opinion"})
        self.assertTrue(all(i.get("via") == "Google Noticias" for i in d["items"] if i.get("procedencia") == "agregador"))
        self.assertEqual(len(d["registro"]), 1)
        self.assertTrue(open(a.ARCHIVO_JS, encoding="utf-8").read().startswith("/* Generado"))

    def test_sin_feeds_no_escribe(self):
        def caido(u):
            raise OSError("caído")
        a.descargar = caido
        self.assertEqual(a.main([("X", ["https://x.pe/f"], "comercial", None)]), 1)
        self.assertFalse(os.path.exists(a.ARCHIVO_JSON))

    def test_conserva_ultimo_ok_de_fuente_caida(self):
        os.makedirs(self.tmp, exist_ok=True)
        previo = {"items": [{"id": "1", "titulo": "Vieja pero válida", "url": "https://e.pe/1", "sector": "politica", "fecha": None, "fuente": "Expreso"}],
                  "estado_fuentes": {"Expreso": {"ok": True, "ultimo_ok": "2026-11-01T00:00:00Z", "ultima_nota": "2026-10-31T10:00:00Z"}}}
        json.dump(previo, open(a.ARCHIVO_JSON, "w", encoding="utf-8"))

        def fake(u):
            if "feed-ok" in u:
                return rss([("Congreso aprueba", "https://x.pe/a", hoy_rfc())])
            raise OSError("403")
        a.descargar = fake
        self.assertEqual(a.main([("Medio OK", ["https://x.pe/feed-ok"], "comercial", None), ("Expreso", ["https://e.pe/feed"], "comercial", None)]), 0)
        d = json.load(open(a.ARCHIVO_JSON, encoding="utf-8"))
        self.assertFalse(d["estado_fuentes"]["Expreso"]["ok"])
        self.assertEqual(d["estado_fuentes"]["Expreso"]["ultimo_ok"], "2026-11-01T00:00:00Z")
        self.assertIn("Vieja pero válida", [i["titulo"] for i in d["items"]])


class Sintesis(unittest.TestCase):
    HTML = (
        '<meta property="og:description" content="El precio de la gasolina de 90 octanos sube a S/ 17,90 por galón en Lima, un 2,5 % más que la semana pasada. '
        'La plataforma Facilito de Osinergmin permite comparar 1 250 grifos.">'
        "<p>La plataforma Facilito de Osinergmin permite consultar precios en 1 250 grifos de todo el país desde el 3 de noviembre de 2026.</p>"
        "<p>Lee también: otra nota que no debe entrar en la síntesis de ninguna manera posible.</p>")

    def test_sintesis_y_cifras_desde_la_pagina(self):
        it = {"titulo": "Precio de la gasolina en Lima hoy", "resumen": "", "url": "https://x.pe/a", "sector": "economia"}
        r = a.sintetizar(it, a.descripcion_html(self.HTML), a.parrafos_html(self.HTML))
        self.assertIn("S/ 17,90", r["sintesis"])
        self.assertLessEqual(len(r["puntos"]), 3)
        self.assertNotIn("Lee también", " ".join(r["puntos"]))
        valores = [d["v"] for d in r["datos"]]
        self.assertIn("S/ 17,90", valores)
        self.assertIn("2,5 %", valores)

    def test_no_repite_el_titular_ni_inventa_cifras(self):
        it = {"titulo": "El Congreso aprobó la ley de presupuesto del año", "resumen": "El Congreso aprobó la ley de presupuesto del año", "url": "https://x.pe/b"}
        r = a.sintetizar(it)
        self.assertNotIn("sintesis", r)
        self.assertNotIn("datos", r)

    def test_marcador_solo_en_contexto_deportivo(self):
        self.assertEqual([d["v"] for d in a.cifras_clave("Universitario empató 2-2 con Sport Boys")], ["2-2"])
        self.assertEqual(a.cifras_clave("Ley 30-12 publicada en el diario oficial"), [])

    def test_hereda_sintesis_previa_sin_descargar(self):
        previos = [{"url": "https://x.pe/a", "titulo": "t", "sintesis": "Texto previo.", "datos": [{"v": "5 %", "t": "porcentaje", "c": "x"}]}]
        nuevos = [{"url": "https://x.pe/a", "titulo": "t"}]
        original = a.sintesis_de_pagina
        a.sintesis_de_pagina = lambda it: (_ for _ in ()).throw(AssertionError("no debe descargar"))
        try:
            a.enriquecer_sintesis(nuevos, previos)
        finally:
            a.sintesis_de_pagina = original
        self.assertEqual(nuevos[0]["sintesis"], "Texto previo.")


class FotosOriginales(unittest.TestCase):
    def setUp(self):
        self.orig = (a.descargar_parcial, a.resolver_google_news)

    def tearDown(self):
        a.descargar_parcial, a.resolver_google_news = self.orig

    def test_url_con_tildes(self):
        self.assertEqual(a.uri_ascii("https://www.dw.com/es/la-unión-europea/a-1?maca=spa"),
                         "https://www.dw.com/es/la-uni%C3%B3n-europea/a-1?maca=spa")
        self.assertEqual(a.uri_ascii("https://x.pe/a%20b?q=1"), "https://x.pe/a%20b?q=1")

    def test_id_de_google_news(self):
        self.assertEqual(a.gn_id("https://news.google.com/rss/articles/CBMiABC?oc=5"), "CBMiABC")
        self.assertIsNone(a.gn_id("https://forbes.pe/nota"))

    def test_decodifica_formato_antiguo(self):
        import base64
        crudo = b"\x08\x13\x22\x1a" + b"https://forbes.pe/ia/nota-1" + b"\xd2\x01\x00"
        art = base64.urlsafe_b64encode(crudo).decode().rstrip("=")
        self.assertEqual(a.gn_decodificar_local(art), "https://forbes.pe/ia/nota-1")

    def test_formato_firmado_no_se_decodifica_localmente(self):
        import base64
        art = base64.urlsafe_b64encode(b"\x08\x13\x22\x5fAU_yqLxyz").decode().rstrip("=")
        self.assertIsNone(a.gn_decodificar_local(art))

    def test_respuesta_de_google(self):
        interno = json.dumps(["garturlres", "https://peru21.pe/ia/top-3", 1])
        texto = ")]}'\n\n" + json.dumps([["wrb.fr", "Fbv4je", interno, None, None, None, "generic"]]) + "\n\n"
        self.assertEqual(a.gn_extraer_respuesta(texto), "https://peru21.pe/ia/top-3")

    def test_foto_og_y_rechazo_de_logotipos(self):
        html_ = ('<meta property="og:image" content="https://forbes.pe/logo-forbes.png">'
                 '<meta name="twitter:image" content="https://forbes.pe/fotos/ia.jpg">')
        self.assertEqual(a.buscar_foto(html_, "https://forbes.pe/n"), "https://forbes.pe/fotos/ia.jpg")
        self.assertEqual(a.buscar_foto('<script>{"image":{"url":"https:\\/\\/x.pe\\/f.jpg"}}</script>', "https://x.pe/n"), "https://x.pe/f.jpg")
        self.assertIsNone(a.buscar_foto('<meta property="og:image" content="https://x.pe/default-share.png">', "https://x.pe/n"))
        self.assertIsNone(a.buscar_foto('<meta property="og:image" content="https://gestion.pe/pf/resources/dist/gestion/images/default-md.png">', "https://gestion.pe/n"))
        self.assertEqual(a.buscar_foto('<meta property="og:image" content="http://static.dw.com/image/1_6.jpg">', "https://dw.com/n"), "https://static.dw.com/image/1_6.jpg")

    def test_google_news_resuelve_medio_y_toma_su_foto(self):
        a.resolver_google_news = lambda u: "https://forbes.pe/ia/nota"
        a.descargar_parcial = lambda u, *r: '<meta property="og:image" content="https://forbes.pe/f/ia.jpg">' if "forbes.pe" in u else ""
        it = {"url": "https://news.google.com/rss/articles/CBMiX", "titulo": "t"}
        a.enriquecer_imagenes([it], [])
        self.assertEqual(it["url_medio"], "https://forbes.pe/ia/nota")
        self.assertEqual(it["imagen"], "https://forbes.pe/f/ia.jpg")

    def test_reintenta_notas_previas_sin_foto_y_hereda(self):
        llamadas = []
        a.resolver_google_news = lambda u: None
        a.descargar_parcial = lambda u, *r: llamadas.append(u) or ""
        previos = [{"url": "https://dw.com/a", "imagen_intentos": 2}, {"url": "https://dw.com/b", "imagen": "https://static.dw.com/b.jpg"}]
        items = [{"url": "https://dw.com/a"}, {"url": "https://dw.com/b"}]
        a.enriquecer_imagenes(items, previos)
        self.assertEqual(llamadas, ["https://dw.com/a"])
        self.assertEqual(items[0]["imagen_intentos"], 3)
        self.assertEqual(items[1]["imagen"], "https://static.dw.com/b.jpg")

    def test_deja_de_reintentar_tras_el_limite(self):
        a.descargar_parcial = lambda u, *r: (_ for _ in ()).throw(AssertionError("no debe descargar"))
        items = [{"url": "https://dw.com/a", "imagen_intentos": a.MAX_INTENTOS_IMAGEN}]
        a.enriquecer_imagenes(items, [])
        self.assertFalse(items[0].get("imagen"))


if __name__ == "__main__":
    unittest.main()
