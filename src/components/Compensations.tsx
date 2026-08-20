import { pendingHolidayShifts } from '../lib/holidays'
import {
  addDays,
  formatDayMonth,
  resolveKind,
  toISODate,
  type Kind,
} from '../lib/schedule'

type Props = {
  today: Date
  selected: Date
  onSelect: (date: Date) => void
  onPick: (holidayIso: string) => void
  pickingFor: string | null
  anchor: Date
  anchorKind: Kind
  exceptions: Record<string, Kind>
  customHolidays: Record<string, string>
  compensations: Record<string, string>
}

export function Compensations({
  today,
  selected,
  onSelect,
  onPick,
  pickingFor,
  anchor,
  anchorKind,
  exceptions,
  customHolidays,
  compensations,
}: Props) {
  const from = addDays(today, -120)
  const to = addDays(today, 400)
  const pending = pendingHolidayShifts({
    from,
    to,
    customHolidays,
    compensations,
    isWork: (date) =>
      resolveKind(date, anchor, anchorKind, exceptions).kind === 'work',
  })
  const selectedIso = toISODate(selected)

  if (pending.length === 0) return null

  return (
    <section className="agenda rights">
      <header>
        <h2>Folga compensatória</h2>
      </header>
      <p className="rights-copy">
        Plantão em feriado segue igual. O hospital libera uma folga em outro dia,
        à sua escolha.
      </p>
      <ul>
        {pending.map(({ holiday, date }) => {
          const iso = holiday.date
          return (
            <li key={iso}>
              <div
                className={
                  pickingFor === iso || iso === selectedIso
                    ? 'rights-row is-selected'
                    : 'rights-row'
                }
              >
                <button type="button" onClick={() => onSelect(date)}>
                  <strong>{holiday.name}</strong>
                  <em>{formatDayMonth(date)}</em>
                </button>
                <button
                  type="button"
                  className="ghost compact"
                  onClick={() => onPick(iso)}
                >
                  Escolher folga
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
