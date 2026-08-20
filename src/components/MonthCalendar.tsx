import NumberFlow from '@number-flow/react'
import clsx from 'clsx'
import { compensatoryFor, getHoliday } from '../lib/holidays'
import {
  WEEKDAYS,
  formatMonthYear,
  monthGrid,
  monthStats,
  resolveKind,
  sameDay,
  startOfMonth,
  toISODate,
  yearWorkedToDate,
  type Kind,
} from '../lib/schedule'

type Props = {
  today: Date
  selected: Date
  view: Date
  onViewChange: (date: Date) => void
  onSelect: (date: Date) => void
  onToggle: (date: Date) => void
  pickingFor: string | null
  onCancelPick: () => void
  anchor: Date
  anchorKind: Kind
  exceptions: Record<string, Kind>
  customHolidays: Record<string, string>
  compensations: Record<string, string>
}

export function MonthCalendar({
  today,
  selected,
  view,
  onViewChange,
  onSelect,
  onToggle,
  pickingFor,
  onCancelPick,
  anchor,
  anchorKind,
  exceptions,
  customHolidays,
  compensations,
}: Props) {
  const days = monthGrid(view)
  const stats = monthStats(view, anchor, anchorKind, exceptions)
  const yearWork = yearWorkedToDate(today, anchor, anchorKind, exceptions)
  const viewingCurrent =
    view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth()

  let holidayWork = 0
  const last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  for (let day = 1; day <= last; day += 1) {
    const date = new Date(view.getFullYear(), view.getMonth(), day)
    const holiday = getHoliday(date, customHolidays)
    if (!holiday) continue
    if (resolveKind(date, anchor, anchorKind, exceptions).kind === 'work') {
      holidayWork += 1
    }
  }

  return (
    <section className="cal" aria-label="Calendário do mês">
      <header className="cal-head">
        <h2>{formatMonthYear(view)}</h2>
        <div className="cal-nav">
          <div className="cal-legend" aria-hidden="true">
            <span data-kind="work">Plantão</span>
            <span data-kind="off">Folga</span>
            <span data-holiday="">Feriado</span>
          </div>
          {!viewingCurrent ? (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                onViewChange(startOfMonth(today))
                onSelect(today)
              }}
            >
              Hoje
            </button>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            aria-label="Mês anterior"
            onClick={() =>
              onViewChange(new Date(view.getFullYear(), view.getMonth() - 1, 1))
            }
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Próximo mês"
            onClick={() =>
              onViewChange(new Date(view.getFullYear(), view.getMonth() + 1, 1))
            }
          >
            <Chevron dir="right" />
          </button>
        </div>
      </header>

      {pickingFor ? (
        <div className="pick-banner" role="status">
          <p>Toque em um dia de plantão para virar a folga compensatória.</p>
          <button type="button" className="ghost" onClick={onCancelPick}>
            Cancelar
          </button>
        </div>
      ) : null}

      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="cal-grid" key={`${view.getFullYear()}-${view.getMonth()}`}>
        {days.map((date) => {
          const inMonth = date.getMonth() === view.getMonth()
          const { kind, overridden } = resolveKind(date, anchor, anchorKind, exceptions)
          const iso = toISODate(date)
          const holiday = getHoliday(date, customHolidays)
          const isCompOff = Boolean(compensatoryFor(iso, compensations))
          const pending =
            Boolean(holiday) && kind === 'work' && !compensations[holiday!.date]
          const pickable =
            Boolean(pickingFor) &&
            kind === 'work' &&
            iso !== pickingFor &&
            !isCompOff
          const labelParts = [
            `${date.getDate()}`,
            kind === 'work' ? 'plantão' : 'folga',
            holiday ? holiday.name : null,
            pending ? 'direito a folga compensatória' : null,
            isCompOff ? 'folga compensatória' : null,
          ].filter(Boolean)

          return (
            <button
              key={iso}
              type="button"
              className={clsx(
                'cal-day',
                !inMonth && 'is-out',
                sameDay(date, today) && 'is-today',
                sameDay(date, selected) && 'is-selected',
                pickable && 'is-pickable',
                pickingFor && !pickable && 'is-blocked',
              )}
              data-kind={kind}
              data-holiday={holiday ? '' : undefined}
              data-pending={pending ? '' : undefined}
              aria-label={labelParts.join(', ')}
              aria-pressed={sameDay(date, selected)}
              onClick={() => onSelect(date)}
              onDoubleClick={() => {
                if (!pickingFor) onToggle(date)
              }}
            >
              <span className="cal-num">{date.getDate()}</span>
              <span className="cal-tag">
                <span className="cal-tag-full">
                  {isCompOff ? 'Comp.' : kind === 'work' ? 'Plantão' : 'Folga'}
                </span>
                <span className="cal-tag-short">
                  {isCompOff ? 'C' : kind === 'work' ? 'Pl' : 'Fg'}
                </span>
              </span>
              {holiday ? <span className="cal-hol">Feriado</span> : null}
              {overridden && !isCompOff ? <i className="mark" aria-hidden="true" /> : null}
              {isCompOff ? <i className="mark is-comp" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>

      <dl className="stats">
        <div>
          <dt>Plantão</dt>
          <dd>
            <NumberFlow value={stats.work} />
            <span>dias</span>
          </dd>
        </div>
        <div>
          <dt>Folga</dt>
          <dd>
            <NumberFlow value={stats.off} />
            <span>dias</span>
          </dd>
        </div>
        <div>
          <dt>Ano</dt>
          <dd>
            <NumberFlow value={yearWork} />
            <span>plantões</span>
          </dd>
        </div>
        <div>
          <dt>Feriado</dt>
          <dd>
            <NumberFlow value={holidayWork} />
            <span>plantões</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {dir === 'left' ? (
        <path
          d="M10 3.5 5.5 8 10 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M6 3.5 10.5 8 6 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
