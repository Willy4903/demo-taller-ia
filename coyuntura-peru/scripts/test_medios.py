"""Pruebas de la lectura de prensa. Las que necesitan PyMuPDF se omiten si no está instalado."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import medios_analisis as ma  # noqa: E402

try:
    import fitz
except ImportError:  # el flujo de noticias no instala PyMuPDF
    fitz = None


def _pdf(ruta, paginas):
    """paginas: lista de listas [(texto, tamaño)] apiladas de arriba hacia abajo."""
    doc = fitz.open()
    for items in paginas:
        pg = doc.new_page(width=595, height=842)
        y = 60
        for texto, tam in items:
            r = fitz.Rect(40, y, 555, y + (tam * 5 if tam > 15 else 200))
            pg.insert_textbox(r, texto, fontsize=tam)
            y += tam * 5.2 if tam > 15 else 210
    doc.save(ruta)
    doc.close()


CUERPO = ("El Congreso de la República debatió ayer la reforma, según Dina Ejemplo y Luis Muestra. " * 6 +
          "Trujillo y Arequipa reportaron lluvias. El PBI creció 3,2 % y la inversión llegó a S/ 5 millones. " * 6 +
          "La PNP capturó a una banda en Chiclayo. " * 4)


class Nombres(unittest.TestCase):
    def test_fechas_y_medio(self):
        casos = {
            "PERU 🇵🇪 EL COMERCIO 121126.pdf": ("El Comercio", "2026-11-12"),
            "PERU 🇵🇪 Diario Uno 12-nov-2026.pdf": ("Diario Uno", "2026-11-12"),
            "PERU 🇵🇪 La República 12-11-26.pdf": ("La República", "2026-11-12"),
            "PERU 🇵🇪 CAJAMARCA Edición 12112026.pdf": ("Cajamarca", "2026-11-12"),
        }
        for nombre, esperado in casos.items():
            self.assertEqual(ma.parse_nombre(nombre, "2026-11-13"), esperado, nombre)

    def test_sin_dia_usa_fecha_del_mensaje(self):
        self.assertEqual(ma.parse_nombre("PERU 🇵🇪 Correo-nov-2026.pdf", "2026-11-12"), ("Correo", "2026-11-12"))
        self.assertEqual(ma.parse_nombre("Gestion.pdf", "2026-11-12"), ("Gestión", "2026-11-12"))

    def test_fecha_imposible_cae_en_mensaje(self):
        self.assertEqual(ma.parse_nombre("Trome 301326.pdf", "2026-11-12")[1], "2026-11-12")

    def test_ambito(self):
        self.assertEqual(ma.ambito_de("Correo Arequipa"), "regional")
        self.assertEqual(ma.ambito_de("El Comercio"), "nacional")
        self.assertEqual(ma.ambito_de("Estar Bien"), "suplemento")


class Textos(unittest.TestCase):
    def test_temas(self):
        self.assertEqual(ma.clasificar_tema("Congreso aprueba reforma y el premier enfrenta moción de censura"), "politica")
        self.assertEqual(ma.clasificar_tema("Capturan a sicarios que cometían extorsión"), "seguridad")
        self.assertEqual(ma.clasificar_tema("Universitario venció 2-0 en la Liga 1"), "deportes")
        self.assertEqual(ma.clasificar_tema("Un perro encontró su casa"), "otros")

    def test_estadisticas(self):
        self.assertIn("Arequipa", ma.contar_lugares("Llovió en Arequipa y en Trujillo"))
        self.assertEqual(ma.contar_lugares("Llovió en Trujillo")["La Libertad"], 1)
        c = ma.contar_cifras("Costó S/ 20, subió 3,5 % y valen US$ 4, unos 2 millones")
        self.assertEqual((c["soles"], c["porcentajes"], c["dolares"], c["millones"]), (1, 1, 1, 1))
        w = dict(ma.contar_palabras("congreso congreso reforma reforma el de la pdf"))
        self.assertEqual(w, {"congreso": 2, "reforma": 2})
        e = dict(ma.contar_entidades("Dina Ejemplo habló. Dina Ejemplo volvió. La JNE y la JNE respondieron."))
        self.assertEqual(e.get("Dina Ejemplo"), 2)
        self.assertEqual(e.get("JNE"), 2)


@unittest.skipUnless(fitz, "PyMuPDF no instalado")
class Pdf(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def test_titulares_y_estadisticas(self):
        ruta = os.path.join(self.tmp, "a.pdf")
        _pdf(ruta, [
            [("EL CONGRESO APRUEBA LA REFORMA POLÍTICA TRAS LARGO DEBATE", 30), (CUERPO, 9), ("BCRP anuncia que la inflación bajó y el dólar cerró estable en el mercado", 26), (CUERPO, 9)],
            [("Siempre ocurre algo importante en la ciudad de Trujillo esta semana", 28), (CUERPO, 9)],
        ])
        fecha, ed = ma.analizar_pdf(ruta, "PERU 🇵🇪 EL COMERCIO 121126.pdf", "2026-11-13")
        self.assertEqual(fecha, "2026-11-12")
        self.assertEqual((ed["id"], ed["nombre"], ed["calidad"], ed["paginas"]), ("el-comercio", "El Comercio", "texto", 2))
        titulos = [t["t"] for t in ed["titulares"]]
        self.assertEqual(len(titulos), 3, titulos)
        self.assertTrue(any("REFORMA" in t for t in titulos))
        self.assertTrue(all(len(t) <= 220 for t in titulos))
        self.assertEqual(ed["titulares"][0]["p"], 1)
        self.assertEqual(ed["titulares"][0]["tema"], "politica")
        self.assertIn("Arequipa", ed["lugares"])
        self.assertGreater(ed["cifras"]["porcentajes"], 0)
        self.assertTrue(any(w == "congreso" for w, _ in ed["palabras"]))
        # No se guarda texto corrido: nada más largo que un titular
        self.assertLess(len(json.dumps({k: v for k, v in ed.items() if k != "titulares"}, ensure_ascii=False)), 4000)

    def test_edicion_escaneada(self):
        ruta = os.path.join(self.tmp, "b.pdf")
        doc = fitz.open()
        doc.new_page()
        doc.save(ruta)
        doc.close()
        _, ed = ma.analizar_pdf(ruta, "Trome 121126.pdf", "2026-11-12")
        self.assertEqual((ed["calidad"], ed["titulares"]), ("imagen", []))


def _ed(medio, titulares):
    return {"id": ma.slug(medio), "nombre": medio, "ambito": "nacional", "paginas": 20, "calidad": "texto", "palabras_total": 5000,
            "titulares": [{"t": t, "p": 1, "tema": ma.clasificar_tema(t)} for t in titulares],
            "temas": {}, "palabras": [["congreso", 5]], "entidades": [["Dina Ejemplo", 4]], "lugares": {"Lima": 3},
            "cifras": {"soles": 1, "dolares": 0, "porcentajes": 2, "millones": 0}}


class Fusion(unittest.TestCase):
    def test_fusionar_reemplaza_y_agrega(self):
        e0 = ma.estado_vacio()
        n1 = [{"id": 1, "fecha": "2026-11-12", "edicion": _ed("El Comercio", ["Congreso aprueba la reforma de pensiones"])},
              {"id": 2, "fecha": "2026-11-12", "edicion": _ed("Correo", ["Capturan a banda de extorsionadores en Lima"])}]
        e1, tocados = ma.fusionar(e0, n1, "2026-11-12T20:00:00Z")
        self.assertEqual(tocados, ["2026-11-12"])
        self.assertEqual(e1["dias"][0]["resumen"]["medios"], 2)
        self.assertEqual(e1["procesados"], [1, 2])
        # misma edición otra vez: reemplaza, no duplica
        n2 = [{"id": 3, "fecha": "2026-11-12", "edicion": _ed("El Comercio", ["Dólar baja y la inflación se modera"])}]
        e2, _ = ma.fusionar(e1, n2, "2026-11-12T22:00:00Z")
        self.assertEqual(e2["dias"][0]["resumen"]["medios"], 2)
        self.assertEqual(sum(len(m["titulares"]) for m in e2["dias"][0]["medios"]), 2)
        # un día nuevo queda primero
        n3 = [{"id": 4, "fecha": "2026-11-13", "edicion": _ed("Gestión", ["Inversión minera crece"])}]
        e3, _ = ma.fusionar(e2, n3, "2026-11-13T12:00:00Z")
        self.assertEqual([d["fecha"] for d in e3["dias"]], ["2026-11-13", "2026-11-12"])
        self.assertEqual(ma.validar_estado(e3)[0], [])

    def test_errores_se_registran_sin_detener(self):
        e, tocados = ma.fusionar(ma.estado_vacio(), [{"id": 9, "error": "PDF dañado", "archivo": "x.pdf"}], "2026-11-12T20:00:00Z")
        self.assertEqual((tocados, e["procesados"], len(e["avisos"]), e["dias"]), ([], [9], 1, []))

    def test_entidades_exigen_tres_menciones(self):
        d = ma.agregar_dia("2026-11-12", [_ed("A", []), _ed("B", [])])
        self.assertEqual(d["entidades"][0], ["Dina Ejemplo", 8, 2])

    def test_salida_js_liviana(self):
        e = ma.estado_vacio()
        for i in range(10):
            e, _ = ma.fusionar(e, [{"id": i, "fecha": f"2026-11-{20 - i:02d}", "edicion": _ed("El Comercio", ["Congreso debate"])}], "2026-11-20T00:00:00Z")
        js = ma.salida_js(e)
        self.assertEqual((len(js["dias"]), len(js["serie"])), (ma.DIAS_COMPLETOS_JS, 10))
        self.assertNotIn("procesados", js)

    def test_validacion_rechaza_texto_largo_y_desorden(self):
        e, _ = ma.fusionar(ma.estado_vacio(), [{"id": 1, "fecha": "2026-11-12", "edicion": _ed("El Comercio", ["Congreso debate"])}], "x")
        e["dias"][0]["medios"][0]["titulares"][0]["t"] = "palabra " * 60
        self.assertTrue(ma.validar_estado(e)[0])
        e2, _ = ma.fusionar(ma.estado_vacio(), [{"id": 1, "fecha": "2026-11-12", "edicion": _ed("Correo", ["Congreso debate"])},
                                                {"id": 2, "fecha": "2026-11-13", "edicion": _ed("Correo", ["Congreso debate"])}], "x")
        e2["dias"].reverse()
        self.assertTrue(ma.validar_estado(e2)[0])

    def test_escribir_y_cargar(self):
        e, _ = ma.fusionar(ma.estado_vacio(), [{"id": 1, "fecha": "2026-11-12", "edicion": _ed("Correo", ["Congreso debate"])}], "2026-11-12T00:00:00Z")
        with tempfile.TemporaryDirectory() as d:
            ma.escribir_salida(e, d)
            self.assertEqual(ma.cargar_estado(d)["procesados"], [1])
            with open(os.path.join(d, "medios.js"), encoding="utf-8") as fh:
                js = fh.read()
            self.assertTrue(js.startswith("/*") and "window.MEDIOS = " in js and js.rstrip().endswith(";"))
        self.assertEqual(ma.cargar_estado("/no/existe")["dias"], [])


class Sintesis(unittest.TestCase):
    def test_sin_clave_no_llama(self):
        self.assertIsNone(ma.sintetizar({"fecha": "2026-11-12", "medios": []}, None))

    def test_respuesta_json_y_fallos(self):
        dia = ma.agregar_dia("2026-11-12", [_ed("El Comercio", ["Congreso aprueba la reforma de pensiones"])])
        ok = ma.sintetizar(dia, "k", llamar=lambda p, c, m: 'Aquí va: {"sintesis": "Domina la agenda política.", "puntos": ["Reforma", "Pensiones"]}')
        self.assertEqual(ok, {"sintesis": "Domina la agenda política.", "puntos": ["Reforma", "Pensiones"]})
        def falla(p, c, m):
            raise OSError("sin red")
        self.assertIsNone(ma.sintetizar(dia, "k", llamar=falla))


if __name__ == "__main__":
    unittest.main()
