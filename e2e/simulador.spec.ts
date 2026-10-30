import { expect, test, type Page } from '@playwright/test'

const pts = (page: Page, kind: 'clausura' | 'acumulado', team: string) =>
  page.getByTestId(`row-${kind}-${team}`).getByTestId('pts')
const pos = (page: Page, kind: 'clausura' | 'acumulado', team: string) =>
  page.getByTestId(`row-${kind}-${team}`).getByTestId('pos')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('muestra las tablas iniciales del corte', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Universitario')
  await expect(page.getByTestId('hud-clausura')).toContainText('3.º · 27 pts')
  await expect(page.getByTestId('hud-acumulado')).toContainText('2.º · 56 pts')
  await expect(pos(page, 'clausura', 'universitario')).toHaveText('3')
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('27')
  await expect(page.getByTestId('fixture-count')).toHaveText('Mostrando 29 de 29 partidos')
  await page.getByRole('tab', { name: 'Acumulado anual' }).click()
  await expect(pts(page, 'acumulado', 'universitario')).toHaveText('56')
  await expect(pts(page, 'acumulado', 'alianza-lima')).toHaveText('65')
  await expect(page.getByTestId('row-acumulado-utc')).toHaveAttribute('data-zone', 'descenso')
})

test('un marcador completo recalcula Clausura y acumulado sin recargar', async ({ page }) => {
  await page.getByTestId('home-c14-08').fill('2')
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('27')
  await page.getByTestId('away-c14-08').fill('0')
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('30')
  await page.getByRole('tab', { name: 'Acumulado anual' }).click()
  await expect(pts(page, 'acumulado', 'universitario')).toHaveText('59')
  await expect(page.getByText('1 de 29', { exact: true })).toBeVisible()
})

test('un marcador incompleto o inválido no modifica la tabla y muestra el error', async ({ page }) => {
  await page.getByTestId('home-c14-08').fill('3')
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('27')
  await page.getByTestId('away-c14-08').fill('x')
  await expect(page.getByTestId('match-c14-08').getByRole('alert')).toContainText('número entero')
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('27')
  await expect(page.getByTestId('away-c14-08')).toHaveAttribute('aria-invalid', 'true')
})

test('Universitario gana todos sus partidos: suma 12 puntos y sube a la cima del Clausura', async ({ page }) => {
  await page.getByRole('button', { name: 'Universitario gana todos' }).click()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('39')
  await expect(pos(page, 'clausura', 'universitario')).toHaveText('1')
  await page.getByRole('tab', { name: 'Acumulado anual' }).click()
  await expect(pts(page, 'acumulado', 'universitario')).toHaveText('68')
  await expect(pos(page, 'acumulado', 'universitario')).toHaveText('1')
  await expect(page.getByTestId('contenders')).toContainText('Universitario')
})

test('todos empatan y restablecer devuelve las tablas iniciales', async ({ page }) => {
  await page.getByRole('button', { name: 'Todos empatan' }).click()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('31')
  await expect(page.getByTestId('fixture-count')).toBeVisible()
  await page.getByTestId('reset').click()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('27')
  await expect(pos(page, 'clausura', 'universitario')).toHaveText('3')
  await expect(page.getByTestId('home-c14-08')).toHaveValue('')
})

test('los accesos rápidos fijan victoria local, empate y victoria visitante', async ({ page }) => {
  await page.getByTestId('home-btn-c14-08').click()
  await expect(page.getByTestId('home-c14-08')).toHaveValue('1')
  await expect(page.getByTestId('away-c14-08')).toHaveValue('0')
  await page.getByTestId('away-btn-c14-08').click()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('27')
  await page.getByTestId('draw-btn-c14-08').click()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('28')
})

test('filtra partidos por equipo y por fecha', async ({ page }) => {
  await page.getByLabel('Equipo').selectOption('universitario')
  await expect(page.getByTestId('fixture-count')).toHaveText('Mostrando 4 de 29 partidos')
  await page.getByLabel('Fecha', { exact: true }).selectOption('16')
  await expect(page.getByTestId('fixture-count')).toHaveText('Mostrando 1 de 29 partidos')
  await expect(page.getByTestId('match-c16-09')).toBeVisible()
})

test('las simulaciones persisten al recargar la página', async ({ page }) => {
  await page.getByTestId('home-btn-c14-08').click()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('30')
  await page.reload()
  await expect(pts(page, 'clausura', 'universitario')).toHaveText('30')
  await expect(page.getByTestId('home-c14-08')).toHaveValue('1')
})

test('exporta las tablas y los resultados a CSV', async ({ page }) => {
  await page.getByTestId('home-btn-c14-08').click()
  const download = async (name: string) => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()])
    const stream = await d.createReadStream()
    let text = ''
    for await (const chunk of stream) text += chunk.toString()
    return { filename: d.suggestedFilename(), text }
  }
  const clausura = await download('CSV Clausura')
  expect(clausura.filename).toBe('tabla_clausura_2026.csv')
  expect(clausura.text).toContain('posicion,equipo,pj,pg,pe,pp')
  expect(clausura.text).toContain('Universitario,14,9,3,2')
  const acum = await download('CSV acumulado')
  expect(acum.text).toContain('Alianza Lima,31')
  const res = await download('CSV resultados')
  expect(res.text).toContain('Universitario,Sport Boys,1,0,simulado')
})

test('la tabla acumulada se puede alternar con el teclado y destaca a Universitario', async ({ page }) => {
  await page.getByRole('tab', { name: 'Clausura' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Acumulado anual' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('row-acumulado-universitario')).toHaveAttribute('aria-current', 'true')
})

test('la carrera de barras reordena los equipos al simular', async ({ page }) => {
  const race = page.getByTestId('race-universitario')
  await expect(race).toHaveAttribute('data-position', '3')
  await page.getByRole('button', { name: 'Universitario gana todos' }).click()
  await expect(race).toHaveAttribute('data-position', '1')
  await expect(page.getByTestId('race-sporting-cristal')).toHaveAttribute('data-position', '2')
  await page.getByRole('group', { name: 'Tabla de la carrera' }).getByRole('button', { name: 'Acumulado anual' }).click()
  await expect(page.getByTestId('race-utc')).toHaveAttribute('data-position', '18')
})

test('el resumen en vivo se actualiza y restablece', async ({ page }) => {
  await page.getByRole('button', { name: 'Universitario gana todos' }).click()
  await expect(page.getByTestId('hud-clausura')).toContainText('1.º · 39 pts')
  await expect(page.getByTestId('hud-sim')).toHaveText('4/29 simulados')
  await page.getByRole('region', { name: 'Resumen en vivo de Universitario' }).getByRole('button', { name: 'Restablecer' }).click()
  await expect(page.getByTestId('hud-clausura')).toContainText('3.º · 27 pts')
  await expect(page.getByTestId('hud-sim')).toHaveText('0/29 simulados')
})

test('la matriz de Universitario carga el escenario elegido', async ({ page }) => {
  const cell = page.getByTestId('matrix-2-1')
  await cell.scrollIntoViewIfNeeded()
  await expect(cell).toContainText('34 pts')
  await cell.click()
  await expect(cell).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('hud-clausura')).toContainText('34 pts')
  await expect(page.getByTestId('hud-sim')).toHaveText('4/29 simulados')
})

test('el laboratorio de probabilidades responde a los marcadores', async ({ page }) => {
  const champ = page.getByTestId('mc-u-champion')
  await champ.scrollIntoViewIfNeeded()
  await expect(champ).toHaveText(/\d+(,\d)? %/)
  const before = await champ.textContent()
  await page.getByRole('button', { name: 'Universitario gana todos' }).click()
  await expect(champ).not.toHaveText(before ?? '')
  await expect(page.getByText('25 partidos al azar, 4 fijados por ti')).toBeVisible()
  const share = (text: string | null) => Number((text ?? '0').replace(',', '.').replace(/[^\d.]/g, ''))
  expect(share(await champ.textContent())).toBeGreaterThan(share(before))
})

test('los techos de puntos marcan a UTC descendido y a Universitario en carrera', async ({ page }) => {
  await expect(page.getByTestId('rel-utc')).toContainText('Descendido')
  await expect(page.getByTestId('title-universitario')).toContainText('En carrera')
  await expect(page.getByTestId('title-adt')).toContainText('Sin opciones')
})
