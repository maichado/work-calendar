import clsx from 'clsx'
import { useState } from 'react'
import { compensatoryFor, getHoliday } from '../lib/holidays'
import {
  KIND_LABEL,
  cycleKind,
  formatDayMonth,
  formatLongDate,
  formatShiftRange,
  parseISODate,
  resolveKind,
  sameDay,
  toISODate,
  type Kind,
} from '../lib/schedule'

type Props = {
  date: Date
  today: Date
  anchor: Date
  anchorKind: Kind
  exceptions: Record<string, Kind>
  notes: Record<string, string>
  workStart: string
  workEnd: string
  customHolidays: Record<string, string>
  compensations: Record<string, string>
  pickingFor: string | null
  onOverride: (kind: Kind | null) => void
  onNote: (note: string) => void
  onPickCompensation: (holidayIso: string) => void
  onClearCompensation: (holidayIso: string) => void
  onCustomHoliday: (name: string | null) => void
}

export function DayPanel({
  date,
  today,
  anchor,
  anchorKind,
  exceptions,
  notes,
  workStart,
  workEnd,
  customHolidays,
  compensations,
  pickingFor,
  onOverride,
  onNote,
  onPickCompensation,
  onClearCompensation,
  onCustomHoliday,
}: Props) {
  const iso = toISODate(date)
  const resolved = resolveKind(date, anchor, anchorKind, exceptions)
  const cycle = cycleKind(date, anchor, anchorKind)
  const note = notes[iso] ?? ''
  const mode = resolved.overridden ? resolved.kind : 'cycle'
  const isToday = sameDay(date, today)
  const holiday = getHoliday(date, customHolidays)
  const compensatedOff = holiday ? compensations[holiday.date] : undefined
  const sourceHolidayIso = compensatoryFor(iso, compensations)
  const sourceHoliday = sourceHolidayIso
    ? getHoliday(sourceHolidayIso, customHolidays)
    : null
  const pendingHolidayWork =
    Boolean(holiday) && resolved.kind === 'work' && !compensatedOff
  const [localName, setLocalName] = useState('Feriado municipal')

  return (
    <section
      className="panel"
      data-kind={resolved.kind}
      data-holiday={holiday ? '' : undefined}
    >
      <header className="panel-head">
        <p className="panel-kicker">
          {isToday ? 'Hoje' : 'Dia selecionado'}
        </p>
        <h2>{formatLongDate(date)}</h2>
        <p className="panel-status">
          {KIND_LABEL[resolved.kind]}
          <span>
            {holiday
              ? holiday.name
              : resolved.overridden
                ? 'Exceção na escala'
                : `Escala: ${KIND_LABEL[cycle].toLowerCase()}`}
          </span>
        </p>
      </header>

      <div className="seg" role="group" aria-label="Tipo do dia">
        <button
          type="button"
          className={clsx(mode === 'cycle' && 'is-on')}
          aria-pressed={mode === 'cycle'}
          onClick={() => onOverride(null)}
        >
          Escala
        </button>
        <button
          type="button"
          className={clsx(mode === 'work' && 'is-on')}
          data-kind="work"
          aria-pressed={mode === 'work'}
          onClick={() => onOverride('work')}
        >
          Plantão
        </button>
        <button
          type="button"
          className={clsx(mode === 'off' && 'is-on')}
          data-kind="off"
          aria-pressed={mode === 'off'}
          onClick={() => onOverride('off')}
        >
          Folga
        </button>
      </div>

      {resolved.kind === 'work' ? (
        <p className="panel-shift">
          Plantão {formatShiftRange(workStart, workEnd)}
          {holiday ? ' · feriado no hospital segue igual' : ''}
        </p>
      ) : (
        <p className="panel-shift">
          {sourceHoliday
            ? `Folga compensatória de ${sourceHoliday.name} (${formatDayMonth(parseISODate(sourceHolidayIso!))})`
            : 'Dia de descanso na escala 1 sim · 1 não'}
        </p>
      )}

      {pendingHolidayWork ? (
        <div className="holiday-card">
          <p>
            Plantão em feriado. Você pode escolher outro dia de folga por ter
            trabalhado em {holiday!.name.toLowerCase()}.
          </p>
          <button
            type="button"
            className="solid"
            data-kind="off"
            onClick={() => onPickCompensation(holiday!.date)}
          >
            {pickingFor === holiday!.date
              ? 'Escolhendo no calendário…'
              : 'Escolher folga compensatória'}
          </button>
        </div>
      ) : null}

      {holiday && compensatedOff ? (
        <div className="holiday-card is-done">
          <p>
            Folga compensatória marcada em{' '}
            {formatDayMonth(parseISODate(compensatedOff))}.
          </p>
          <div className="dialog-row">
            <button
              type="button"
              className="ghost"
              onClick={() => onPickCompensation(holiday.date)}
            >
              Trocar dia
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => onClearCompensation(holiday.date)}
            >
              Remover
            </button>
          </div>
        </div>
      ) : null}

      {sourceHoliday && sourceHolidayIso ? (
        <div className="holiday-card is-done">
          <p>Este dia compensa o plantão de {sourceHoliday.name}.</p>
          <button
            type="button"
            className="ghost"
            onClick={() => onClearCompensation(sourceHolidayIso)}
          >
            Desvincular
          </button>
        </div>
      ) : null}

      {!holiday ? (
        <label className="note holiday-local">
          <span>Feriado local / municipal</span>
          <span className="holiday-local-row">
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Nome do feriado"
            />
            <button
              type="button"
              className="ghost"
              onClick={() => onCustomHoliday(localName)}
            >
              Marcar
            </button>
          </span>
        </label>
      ) : holiday.source === 'custom' ? (
        <button
          type="button"
          className="ghost danger"
          onClick={() => onCustomHoliday(null)}
        >
          Remover feriado local
        </button>
      ) : null}

      <label className="note">
        <span>Observação clínica</span>
        <textarea
          value={note}
          rows={4}
          placeholder="Troca de plantão, exame, o que quiser lembrar…"
          onChange={(e) => onNote(e.target.value)}
        />
      </label>
    </section>
  )
}
