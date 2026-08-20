import { Hospital } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { Agenda } from './components/Agenda'
import { Compensations } from './components/Compensations'
import { DayPanel } from './components/DayPanel'
import { MonthCalendar } from './components/MonthCalendar'
import { SettingsDialog } from './components/SettingsDialog'
import { ThemeToggle } from './components/ThemeToggle'
import { TodayHero } from './components/TodayHero'
import { WeekStrip } from './components/WeekStrip'
import { compensatoryFor, getHoliday } from './lib/holidays'
import {
  KIND_LABEL,
  formatDayMonth,
  parseISODate,
  resolveKind,
  startOfDay,
  startOfMonth,
  toISODate,
  formatShiftRange,
} from './lib/schedule'
import { useStore, type PersistedSlice } from './store'

function useToday() {
  const [today, setToday] = useState(() => startOfDay(new Date()))

  useEffect(() => {
    const tick = () => {
      const next = startOfDay(new Date())
      setToday((prev) => (toISODate(prev) === toISODate(next) ? prev : next))
    }
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  return today
}

export default function App() {
  const today = useToday()
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState(() => startOfMonth(today))
  const [pickingFor, setPickingFor] = useState<string | null>(null)

  const anchorDate = useStore((s) => s.anchorDate)
  const anchorKind = useStore((s) => s.anchorKind)
  const exceptions = useStore((s) => s.exceptions)
  const notes = useStore((s) => s.notes)
  const workStart = useStore((s) => s.workStart)
  const workEnd = useStore((s) => s.workEnd)
  const theme = useStore((s) => s.theme)
  const customHolidays = useStore((s) => s.customHolidays)
  const compensations = useStore((s) => s.compensations)
  const setTheme = useStore((s) => s.setTheme)
  const setShift = useStore((s) => s.setShift)
  const setNote = useStore((s) => s.setNote)
  const setOverride = useStore((s) => s.setOverride)
  const realignCycle = useStore((s) => s.realignCycle)
  const clearExceptions = useStore((s) => s.clearExceptions)
  const setCustomHoliday = useStore((s) => s.setCustomHoliday)
  const setCompensation = useStore((s) => s.setCompensation)
  const replaceAll = useStore((s) => s.replaceAll)

  const anchor = parseISODate(anchorDate)

  function select(date: Date) {
    if (pickingFor) {
      assignCompensation(pickingFor, date)
      return
    }
    setSelected(date)
    setView(startOfMonth(date))
  }

  function assignCompensation(holidayIso: string, date: Date) {
    const iso = toISODate(date)
    if (iso === holidayIso) {
      toast.error('Escolha outro dia, não o próprio feriado')
      return
    }
    const resolved = resolveKind(date, anchor, anchorKind, exceptions)
    if (resolved.kind !== 'work') {
      toast.error('Escolha um dia de plantão para virar a folga')
      return
    }
    const taken = compensatoryFor(iso, compensations)
    if (taken && taken !== holidayIso) {
      toast.error('Esse dia já é folga compensatória de outro feriado')
      return
    }
    const holiday = getHoliday(holidayIso, customHolidays)
    setCompensation(holidayIso, iso)
    setPickingFor(null)
    setSelected(date)
    setView(startOfMonth(date))
    toast.success(`Folga compensatória em ${formatDayMonth(date)}`, {
      description: holiday ? holiday.name : undefined,
    })
  }

  function toggle(date: Date) {
    const iso = toISODate(date)
    const resolved = resolveKind(date, anchor, anchorKind, exceptions)
    if (resolved.overridden) {
      setOverride(iso, null)
      toast('Voltou à escala', { description: KIND_LABEL[resolved.kind] + ' era exceção' })
      return
    }
    const next = resolved.kind === 'work' ? 'off' : 'work'
    setOverride(iso, next)
    toast.success(`${date.getDate()} marcado como ${KIND_LABEL[next].toLowerCase()}`)
  }

  function importData(data: PersistedSlice) {
    replaceAll({
      ...data,
      customHolidays: data.customHolidays ?? {},
      compensations: data.compensations ?? {},
    })
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo" aria-hidden="true">
              <Hospital size={18} strokeWidth={1.75} absoluteStrokeWidth />
            </span>
            <div className="brand-copy">
              <strong>Eduarda Ferraz Piucco</strong>
              <span>Biomédica · plantão {formatShiftRange(workStart, workEnd)}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle theme={theme} onTheme={setTheme} />
            <SettingsDialog
              today={today}
              theme={theme}
              workStart={workStart}
              workEnd={workEnd}
              customHolidays={customHolidays}
              onTheme={setTheme}
              onShift={setShift}
              onRealign={(kind) => {
                realignCycle(toISODate(today), kind)
                setSelected(today)
                setView(startOfMonth(today))
              }}
              onClearExceptions={clearExceptions}
              onCustomHoliday={setCustomHoliday}
              onImport={importData}
            />
          </div>
        </div>
      </header>

      <div className="app">
      <main>
        <TodayHero
          today={today}
          anchor={anchor}
          anchorKind={anchorKind}
          exceptions={exceptions}
          workStart={workStart}
          workEnd={workEnd}
          customHolidays={customHolidays}
          compensations={compensations}
        />

        <WeekStrip
          today={today}
          selected={selected}
          onSelect={select}
          anchor={anchor}
          anchorKind={anchorKind}
          exceptions={exceptions}
          customHolidays={customHolidays}
          compensations={compensations}
        />

        <div className="layout">
          <MonthCalendar
            today={today}
            selected={selected}
            view={view}
            onViewChange={setView}
            onSelect={select}
            onToggle={toggle}
            pickingFor={pickingFor}
            onCancelPick={() => setPickingFor(null)}
            anchor={anchor}
            anchorKind={anchorKind}
            exceptions={exceptions}
            customHolidays={customHolidays}
            compensations={compensations}
          />
          <div className="side">
            <DayPanel
              key={toISODate(selected)}
              date={selected}
              today={today}
              anchor={anchor}
              anchorKind={anchorKind}
              exceptions={exceptions}
              notes={notes}
              workStart={workStart}
              workEnd={workEnd}
              customHolidays={customHolidays}
              compensations={compensations}
              pickingFor={pickingFor}
              onOverride={(kind) => {
                const iso = toISODate(selected)
                setOverride(iso, kind)
                if (kind === null) toast('Voltou à escala')
                else toast.success(`Marcado como ${KIND_LABEL[kind].toLowerCase()}`)
              }}
              onNote={(note) => setNote(toISODate(selected), note)}
              onPickCompensation={(holidayIso) => {
                setPickingFor(holidayIso)
                toast('Toque no calendário no dia da folga')
              }}
              onClearCompensation={(holidayIso) => {
                setCompensation(holidayIso, null)
                toast('Folga compensatória removida')
              }}
              onCustomHoliday={(name) => {
                setCustomHoliday(toISODate(selected), name)
                toast.success(name ? 'Feriado local marcado' : 'Feriado local removido')
              }}
            />
            <Compensations
              today={today}
              selected={selected}
              onSelect={(date) => {
                setSelected(date)
                setView(startOfMonth(date))
              }}
              onPick={(holidayIso) => {
                setPickingFor(holidayIso)
                toast('Toque no calendário no dia da folga')
              }}
              pickingFor={pickingFor}
              anchor={anchor}
              anchorKind={anchorKind}
              exceptions={exceptions}
              customHolidays={customHolidays}
              compensations={compensations}
            />
            <Agenda
              today={today}
              selected={selected}
              onSelect={select}
              anchor={anchor}
              anchorKind={anchorKind}
              exceptions={exceptions}
              notes={notes}
              workStart={workStart}
              workEnd={workEnd}
              customHolidays={customHolidays}
              compensations={compensations}
            />
          </div>
        </div>
      </main>
      <Toaster theme={theme} position="bottom-center" gap={8} offset={24} />
      </div>
    </div>
  )
}
