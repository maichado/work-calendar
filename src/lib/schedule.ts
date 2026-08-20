export type Kind = 'work' | 'off'

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return startOfDay(next)
}

export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** Monday = 0 … Sunday = 6 */
export function weekdayMon0(date: Date): number {
  return (date.getDay() + 6) % 7
}

export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -weekdayMon0(date))
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function monthGrid(view: Date): Date[] {
  const start = startOfMonth(view)
  const first = addDays(start, -weekdayMon0(start))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export function atTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0)
}

export function cycleKind(date: Date, anchor: Date, anchorKind: Kind): Kind {
  const even = ((daysBetween(anchor, date) % 2) + 2) % 2 === 0
  if (even) return anchorKind
  return anchorKind === 'off' ? 'work' : 'off'
}

export function resolveKind(
  date: Date,
  anchor: Date,
  anchorKind: Kind,
  exceptions: Record<string, Kind>,
): { kind: Kind; overridden: boolean } {
  const key = toISODate(date)
  const exception = exceptions[key]
  if (exception) return { kind: exception, overridden: true }
  return { kind: cycleKind(date, anchor, anchorKind), overridden: false }
}

export function nextDateWithKind(
  from: Date,
  target: Kind,
  anchor: Date,
  anchorKind: Kind,
  exceptions: Record<string, Kind>,
): Date {
  let cursor = addDays(from, 1)
  for (let i = 0; i < 400; i += 1) {
    if (resolveKind(cursor, anchor, anchorKind, exceptions).kind === target) {
      return cursor
    }
    cursor = addDays(cursor, 1)
  }
  return cursor
}

export function monthStats(
  view: Date,
  anchor: Date,
  anchorKind: Kind,
  exceptions: Record<string, Kind>,
) {
  const year = view.getFullYear()
  const month = view.getMonth()
  const last = new Date(year, month + 1, 0).getDate()
  let work = 0
  let off = 0
  let overrides = 0

  for (let day = 1; day <= last; day += 1) {
    const date = new Date(year, month, day)
    const resolved = resolveKind(date, anchor, anchorKind, exceptions)
    if (resolved.kind === 'work') work += 1
    else off += 1
    if (resolved.overridden) overrides += 1
  }

  return { work, off, overrides, last }
}

export function yearWorkedToDate(
  todayDate: Date,
  anchor: Date,
  anchorKind: Kind,
  exceptions: Record<string, Kind>,
) {
  const start = new Date(todayDate.getFullYear(), 0, 1)
  const total = daysBetween(start, todayDate) + 1
  let work = 0
  for (let i = 0; i < total; i += 1) {
    const date = addDays(start, i)
    if (resolveKind(date, anchor, anchorKind, exceptions).kind === 'work') {
      work += 1
    }
  }
  return work
}

export function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatLongDate(date: Date): string {
  return cap(
    new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date),
  )
}

export function formatMonthYear(date: Date): string {
  return cap(
    new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(date),
  )
}

export function formatShortWeekday(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(date)
    .replace('.', '')
}

export function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function sameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b)
}

export function remainingParts(from: Date, to: Date) {
  const ms = Math.max(0, to.getTime() - from.getTime())
  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return { days, hours, minutes, ms }
}

export const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const

export const KIND_LABEL: Record<Kind, string> = {
  work: 'Plantão',
  off: 'Folga',
}

export function formatHour(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':')
  if (!hours) return hhmm
  return minutes === '00' ? `${hours}h` : `${hours}h${minutes}`
}

export function formatShiftRange(start: string, end: string): string {
  return `${formatHour(start)}–${formatHour(end)}`
}
