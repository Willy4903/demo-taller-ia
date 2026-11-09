"""Regresiones de ruido extraído de páginas y de evidencia numérica."""
import copy
import unittest
from limpieza_noticias import limpiar_registro, limpiar_texto


class LimpiezaNoticiasTests(unittest.TestCase):
    def test_donaciones_no_forman_parte_de_sintesis(self):
        real = 'El informe describe el efecto del calor sobre la salud.'
        registro = {'titulo': 'El calor afecta la salud', 'sintesis': real + ' Pon tu lupa sobre lo que importa Tu aporte nos permite investigar con independencia y defender la salud como un bien común, manteniendo nuestro contenido abierto para todos.',
                    'puntos': [real, '908 821 142 Si quieres saber más sobre cómo usamos los fondos, nuestras políticas o tienes alguna duda, visita nuestro portal de donaciones .']}
        limpio = limpiar_registro(registro)
        self.assertEqual(limpio['sintesis'], real)
        self.assertEqual(limpio['puntos'], [real])

    def test_extracto_truncado_se_preserva_antes_del_cta(self):
        texto = 'Se recogieron muestras en el Gran Mercado Mayorista de Lima, en presencia… Pon tu lupa sobre lo que importa Tu aporte nos permite investigar.'
        self.assertEqual(limpiar_texto(texto), 'Se recogieron muestras en el Gran Mercado Mayorista de Lima, en presencia…')

    def test_controles_se_quitan_sin_borrar_la_noticia(self):
        real = 'El profesional peruano consiguió el triunfo por 3-0.'
        self.assertEqual(limpiar_texto('Seguir Escuchar Puntos clave Resumen ' + real), real)
        self.assertEqual(limpiar_texto('Seguir leyendo'), '')
        self.assertEqual(limpiar_texto(real + ' Este resumen es generado por inteligencia artificial y revisado por la redacción.'), real)

    def test_noticias_sobre_donaciones_ia_y_telefono_son_legitimas(self):
        for texto in ['El hospital recibió donaciones por S/ 20 millones.',
                      'Escuchar a las víctimas será una prioridad del nuevo servicio.',
                      'Crédito: conoce las tasas vigentes para las pequeñas empresas.',
                      'Un estudio analiza resúmenes generados por inteligencia artificial.',
                      'La línea 105 atiende emergencias y denuncias las 24 horas.',
                      'El Ministerio lanzó una campaña de donaciones para las familias afectadas.']:
            self.assertEqual(limpiar_texto(texto), texto)

    def test_credito_y_sindicalizacion_no_se_inventan(self):
        self.assertEqual(limpiar_texto('Nolberto Solano ofreciendo una charla táctica. - Crédito: Difusión 09 Nov, 2026 03:00 p. m.'), 'Nolberto Solano ofreciendo una charla táctica.')
        self.assertEqual(limpiar_texto('La nota describe los hechos. The post La nota describe los hechos appeared first on Caretas.'), 'La nota describe los hechos.')

    def test_titulo_corto_legitimo_no_se_borra(self):
        self.assertEqual(limpiar_registro({"titulo": "Perú", "resumen": "Perú"}), {"titulo": "Perú", "resumen": ""})

    def test_solo_ruido_deja_extracto_vacio(self):
        limpio = limpiar_registro({'titulo': 'Dato publicado por el medio', 'resumen': 'Pon tu lupa sobre lo que importa', 'sintesis': 'Este resumen es generado por inteligencia artificial y revisado por la redacción.', 'puntos': ['908 821 142']})
        self.assertEqual(limpio['resumen'], '')
        self.assertEqual(limpio['sintesis'], '')
        self.assertEqual(limpio['puntos'], [])

    def test_cifras_con_evidencia_se_conservan_sin_cambios(self):
        datos = [{'v': 'S/ 20 millones', 't': 'monto', 'c': 'El presupuesto del hospital suma S/ 20 millones.'},
                 {'v': '3-0', 't': 'marcador', 'c': 'El club ganó el partido por 3-0.'},
                 {'v': '17 años', 't': 'cantidad', 'c': 'La víctima tenía 17 años al ocurrir los hechos.'}]
        self.assertEqual(limpiar_registro({'titulo': 'Nota de prueba', 'datos': datos})['datos'], datos)

    def test_datos_sin_evidencia_o_solo_promocionales_se_descartan(self):
        limpio = limpiar_registro({'titulo': 'El presupuesto publicado', 'resumen': 'Se asignan S/ 20 millones al hospital.', 'datos': [
            {'v': 'S/ 20 millones', 't': 'monto', 'c': ''},
            {'v': '908 821 142', 't': 'telefono', 'c': '908 821 142 Si quieres saber más sobre cómo usamos los fondos, visita nuestro portal de donaciones.'},
            {'v': '12 personas', 't': 'cantidad', 'c': 'Se atiende a 312 personas.'},
            {'v': '99%', 't': 'porcentaje', 'c': ''}]})
        self.assertEqual([d['v'] for d in limpio['datos']], ['S/ 20 millones'])

    def test_una_cifra_no_cambia_de_contexto(self):
        limpio = limpiar_registro({'titulo': 'Costo de S/ 20 millones', 'datos': [{'v': 'S/ 20 millones', 't': 'monto', 'c': 'La obra terminó ayer.'}]})
        self.assertEqual(limpio['datos'], [])

    def test_inmutable_idempotente_y_metadata_intacta(self):
        item = {'titulo': 'Nota sobre salud', 'resumen': 'El presupuesto es de S/ 20 millones. Pon tu lupa sobre lo que importa.', 'url': 'https://medio.test/nota', 'fecha': '2026-11-09', 'fuente': 'Medio', 'imagen': {'url': 'imagen'}, 'puntos': ['La atención se mantiene.', 'La atención se mantiene.']}
        previo = copy.deepcopy(item)
        limpio = limpiar_registro(item)
        self.assertEqual(item, previo)
        self.assertEqual(limpiar_registro(limpio), limpio)
        for campo in ('url', 'fecha', 'fuente', 'imagen'):
            self.assertEqual(limpio[campo], item[campo])
        self.assertEqual(limpio['puntos'], ['La atención se mantiene.'])


if __name__ == '__main__':
    unittest.main()
