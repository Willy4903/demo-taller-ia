import json
import unittest
from geografia import RAIZ, REGLAS, aplicar_geografia, clasificar_geografia

class Geografia(unittest.TestCase):
    def test_casos_reales_y_ambiguos(self):
        for caso in json.loads((RAIZ / 'tests/geografia-casos.json').read_text(encoding='utf-8')):
            with self.subTest(titulo=caso['item']['titulo']):
                self.assertEqual(clasificar_geografia(caso['item'])['zona'], caso['zona'])

    def test_cambiar_el_medio_no_cambia_la_geografia(self):
        original = {'titulo':'Representante republicano presenta moción contra jefe del Pentágono', 'url':'https://gestion.pe/mundo/eeuu/nota/'}
        for tipo in ['comercial','internacional','independiente','estatal']:
            self.assertEqual(aplicar_geografia(dict(original,tipo=tipo,ambito='peru'))['ambito'], 'mundo')

    def test_bundle_web_es_la_misma_configuracion(self):
        bundle = (RAIZ / 'data/geografia.js').read_text(encoding='utf-8')
        contenido = bundle.split('window.PERU_GEO_REGLAS = ',1)[1].strip().removesuffix(';')
        self.assertEqual(json.loads(contenido), REGLAS)
