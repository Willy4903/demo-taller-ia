import { useState } from 'react'
import { DataNotice } from './components/DataNotice'
import { DataPanel } from './components/DataPanel'
import { FixturePanel } from './components/FixturePanel'
import { Hero } from './components/Hero'
import { Hud } from './components/Hud'
import { KpiGrid } from './components/KpiGrid'
import { RaceChart } from './components/RaceChart'
import { Reveal, SectionHead } from './components/Reveal'
import { ProbabilityLab } from './components/ProbabilityLab'
import { ScenarioBar } from './components/ScenarioBar'
import { StandingsTable } from './components/StandingsTable'
import { TitleMath } from './components/TitleMath'
import { TitlePanel } from './components/TitlePanel'
import { UMatrix } from './components/UMatrix'
import type { TableKind } from './domain/types'
import { useSimulation } from './hooks/useSimulation'

export default function App() {
  const sim = useSimulation()
  const [kind, setKind] = useState<TableKind>('clausura')

  return (
    <>
      <Hero tables={sim.tables} />
      <DataNotice />
      <Hud tables={sim.tables} onReset={sim.reset} />
      <main className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6">
        <KpiGrid tables={sim.tables} />

        <Reveal id="carrera">
          <SectionHead kicker="En vivo" title="La carrera por puntos">
            Cada marcador que cargas mueve las barras y reordena la tabla. La línea punteada marca el techo de cada club.
          </SectionHead>
          <RaceChart tables={sim.tables} inputs={sim.inputs} />
        </Reveal>

        <Reveal id="simulador" className="space-y-6">
          <SectionHead kicker="Simulador" title="Escribe los resultados">
            Marcadores editables, accesos rápidos y escenarios. Las tablas se recalculan sin recargar la página.
          </SectionHead>
          <ScenarioBar
            inputs={sim.inputs}
            tables={sim.tables}
            onUniversitarioWins={sim.universitarioWinsAll}
            onAllDraw={sim.everyoneDraws}
            onReset={sim.reset}
          />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-6">
              <StandingsTable kind={kind} onKindChange={setKind} tables={sim.tables} />
              <TitlePanel title={sim.title} />
            </div>
            <FixturePanel inputs={sim.inputs} onScore={sim.setScore} onPick={sim.pick} onClear={sim.clear} />
          </div>
        </Reveal>

        <Reveal id="matriz">
          <SectionHead kicker="Universitario" title="Cuatro partidos, quince destinos">
            Todas las combinaciones de victorias, empates y derrotas de la U en sus cuatro partidos pendientes y dónde termina en cada tabla.
          </SectionHead>
          <UMatrix inputs={sim.inputs} onApply={sim.setAll} />
        </Reveal>

        <Reveal id="probabilidades">
          <SectionHead kicker="Laboratorio" title="Probabilidades">
            Miles de torneos simulados en tu navegador a partir de los marcadores que dejaste abiertos.
          </SectionHead>
          <ProbabilityLab inputs={sim.inputs} />
        </Reveal>

        <Reveal id="matematica">
          <SectionHead kicker="Aritmética" title="Techos y descenso">
            Lo que es matemáticamente imposible o seguro, sin modelos ni estimaciones.
          </SectionHead>
          <TitleMath tables={sim.tables} inputs={sim.inputs} />
        </Reveal>

        <Reveal>
          <DataPanel />
        </Reveal>
      </main>
      <footer className="bg-granate-900 py-6 text-center text-xs text-crema-200">
        Simulador independiente, sin vínculo oficial con la Liga 1 ni con el club. Los resultados simulados no son pronósticos.
      </footer>
    </>
  )
}
