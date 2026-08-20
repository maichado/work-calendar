import clsx from 'clsx'
import { compensatoryFor, getHoliday } from '../lib/holidays'
import {
  addDays,
  formatShortWeekday,
  resolveKind,
  sameDay,
  startOfWeek,
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
  customHolidays: Record<string, string>
  compensations: Record<string, string>
}

export function WeekStrip({
  today,
  selected,
  onSelect,
  anchor,
  anchorKind,
  exceptions,
  customHolidays,
  compensations,
}: Props) {
  const start = startOfWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <section className="week" aria-label="Esta semana">
      {days.map((date) => {
        const { kind, overridden } = resolveKind(date, anchor, anchorKind, exceptions)
        const iso = toISODate(date)
        const holiday = getHoliday(date, customHolidays)
        const isCompOff = Boolean(compensatoryFor(iso, compensations))
        const pending =
          Boolean(holiday) && kind === 'work' && !compensations[holiday!.date]
        return (
          <button
            key={iso}
            type="button"
            className={clsx('week-day', sameDay(date, selected) && 'is-selected')}
            data-kind={kind}
            data-holiday={holiday ? '' : undefined}
            data-pending={pending ? '' : undefined}
            aria-pressed={sameDay(date, selected)}
            onClick={() => onSelect(date)}
          >
            <span className="week-name">{formatShortWeekday(date)}</span>
            <span className="week-num">{date.getDate()}</span>
            <span className="week-kind">
              {isCompOff ? 'Compensatória' : kind === 'work' ? 'Plantão' : 'Folga'}
            </span>
            {holiday ? <span className="week-hol">feriado</span> : null}
            {overridden || isCompOff ? <span className="dot" aria-hidden="true" /> : null}
            {sameDay(date, today) ? <span className="week-today">hoje</span> : null}
          </button>
        )
      })}
    </section>
  )
}
