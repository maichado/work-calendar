import clsx from 'clsx'
import { compensatoryFor, getHoliday } from '../lib/holidays'
import {
  KIND_LABEL,
  addDays,
  formatDayMonth,
  formatShiftRange,
  formatShortWeekday,
  resolveKind,
  toISODate,
  type Kind,
} from '../lib/schedule'

type Props = {
  today: Date
  selected: Date
  onSelect: (date: Date) => void
  anchor: Date
  anchorKind: Kind
  exceptions: Record<string, Kind>
  notes: Record<string, string>
  workStart: string
  workEnd: string
  customHolidays: Record<string, string>
  compensations: Record<string, string>
}

export function Agenda({
  today,
  selected,
  onSelect,
  anchor,
  anchorKind,
  exceptions,
  notes,
  workStart,
  workEnd,
  customHolidays,
  compensations,
}: Props) {
  const days = Array.from({ length: 10 }, (_, i) => addDays(today, i + 1))

  return (
    <section className="agenda">
      <header>
        <h2>Próximos dias</h2>
      </header>
      <ul>
        {days.map((date) => {
          const { kind, overridden } = resolveKind(date, anchor, anchorKind, exceptions)
          const iso = toISODate(date)
          const selectedIso = toISODate(selected)
          const holiday = getHoliday(date, customHolidays)
          const isCompOff = Boolean(compensatoryFor(iso, compensations))
          const extra = holiday
            ? holiday.name
            : isCompOff
              ? 'compensatória'
              : overridden
                ? 'exceção'
                : notes[iso]
                  ? 'nota'
                  : ''
          return (
            <li key={iso}>
              <button
                type="button"
                className={clsx('agenda-row', iso === selectedIso && 'is-selected')}
                data-kind={kind}
                data-holiday={holiday ? '' : undefined}
                onClick={() => onSelect(date)}
              >
                <span className="agenda-when">
                  <strong>{formatShortWeekday(date)}</strong>
                  <span>{formatDayMonth(date)}</span>
                </span>
                <span className="agenda-kind">
                  {isCompOff ? 'Folga compensatória' : KIND_LABEL[kind]}
                  {kind === 'work' ? (
                    <em>{formatShiftRange(workStart, workEnd)}</em>
                  ) : null}
                </span>
                <span className="agenda-extra">{extra}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
