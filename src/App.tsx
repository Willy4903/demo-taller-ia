import { useState } from 'react'
import { DataPanel } from './components/DataPanel'
import { FixturePanel } from './components/FixturePanel'
import { Header } from './components/Header'
import { KpiGrid } from './components/KpiGrid'
import { ScenarioBar } from './components/ScenarioBar'
import { StandingsTable } from './components/StandingsTable'
import { TitlePanel } from './components/TitlePanel'
import type { TableKind } from './domain/types'
import { useSimulation } from './hooks/useSimulation'

export default function App() {
  const sim = useSimulation()
  const [kind, setKind] = useState<TableKind>('clausura')

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <KpiGrid tables={sim.tables} />
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
        <DataPanel />
      </main>
      <footer className="bg-granate-900 py-4 text-center text-xs text-crema-200">
        Simulador independiente, sin vínculo oficial con la Liga 1 ni con el club. Los resultados simulados no son pronósticos.
      </footer>
    </>
  )
}
