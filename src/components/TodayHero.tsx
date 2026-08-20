import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import { useEffect, useMemo, useState } from 'react'
import { compensatoryFor, getHoliday } from '../lib/holidays'
import {
  KIND_LABEL,
  atTime,
  formatLongDate,
  nextDateWithKind,
  remainingParts,
  resolveKind,
  startOfDay,
  toISODate,
  type Kind,
} from '../lib/schedule'

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function nextEvent(opts: {
  now: Date
  todayKind: Kind
  workStart: string
  workEnd: string
  nextWork: Date
  nextOff: Date
}) {
  const today = startOfDay(opts.now)
  if (opts.todayKind === 'work') {
    const start = atTime(today, opts.workStart)
    const end = atTime(today, opts.workEnd)
    if (opts.now < start) return { label: 'Plantão começa', at: start }
    if (opts.now < end) return { label: 'Fim do plantão', at: end }
    return { label: 'Folga começa', at: startOfDay(opts.nextOff) }
  }
  return { label: 'Próximo plantão', at: atTime(opts.nextWork, opts.workStart) }
}

type Props = {
  today: Date
  anchor: Date
  anchorKind: Kind
  exceptions: Record<string, Kind>
  workStart: string
  workEnd: string
  customHolidays: Record<string, string>
  compensations: Record<string, string>
}

export function TodayHero({
  today,
  anchor,
  anchorKind,
  exceptions,
  workStart,
  workEnd,
  customHolidays,
  compensations,
}: Props) {
  const now = useNow()
  const resolved = resolveKind(today, anchor, anchorKind, exceptions)
  const nextWork = nextDateWithKind(today, 'work', anchor, anchorKind, exceptions)
  const nextOff = nextDateWithKind(today, 'off', anchor, anchorKind, exceptions)
  const event = nextEvent({
    now,
    todayKind: resolved.kind,
    workStart,
    workEnd,
    nextWork,
    nextOff,
  })
  const parts = remainingParts(now, event.at)
  const holiday = getHoliday(today, customHolidays)
  const sourceHolidayIso = compensatoryFor(toISODate(today), compensations)
  const pending =
    Boolean(holiday) && resolved.kind === 'work' && !compensations[holiday!.date]

  const hint = useMemo(() => {
    if (resolved.kind === 'off') {
      return `Plantão ${formatLongDate(nextWork).toLowerCase()}`
    }
    return `Folga ${formatLongDate(nextOff).toLowerCase()}`
  }, [nextOff, nextWork, resolved.kind])

  return (
    <section className="hero" data-kind={resolved.kind} data-holiday={holiday ? '' : undefined}>
      <p className="hero-kicker">Status do dia · {formatLongDate(today)}</p>
      <h1 className="hero-status">{KIND_LABEL[resolved.kind]}</h1>
      <div className="hero-meta">
        <p className="hero-hint">{hint}</p>
        <p className="hero-count" aria-live="polite">
          <span className="hero-count-label">{event.label}</span>
          <span className="hero-count-time">
            <NumberFlowGroup>
              {parts.days > 0 ? (
                <>
                  <NumberFlow value={parts.days} />
                  <span className="hero-unit">d</span>
                </>
              ) : null}
              <NumberFlow value={parts.hours} />
              <span className="hero-unit">h</span>
              <NumberFlow value={parts.minutes} />
              <span className="hero-unit">m</span>
            </NumberFlowGroup>
          </span>
        </p>
      </div>
      {holiday ? (
        <p className="hero-flag is-holiday">
          {pending
            ? `${holiday.name} · plantão em feriado, direito a folga compensatória`
            : resolved.kind === 'work'
              ? `${holiday.name} · plantão em feriado`
              : holiday.name}
        </p>
      ) : sourceHolidayIso ? (
        <p className="hero-flag is-holiday">Folga compensatória de feriado</p>
      ) : resolved.overridden ? (
        <p className="hero-flag">Exceção na escala</p>
      ) : null}
    </section>
  )
}
