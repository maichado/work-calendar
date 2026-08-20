import { addDays, parseISODate, toISODate } from './schedule'

export type Holiday = {
  date: string
  name: string
  source: 'national' | 'custom'
}

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function nationalHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const list: Holiday[] = [
    { date: `${year}-01-01`, name: 'Confraternização Universal', source: 'national' },
    { date: toISODate(addDays(easter, -48)), name: 'Carnaval', source: 'national' },
    { date: toISODate(addDays(easter, -47)), name: 'Carnaval', source: 'national' },
    { date: toISODate(addDays(easter, -2)), name: 'Sexta-feira Santa', source: 'national' },
    { date: `${year}-04-21`, name: 'Tiradentes', source: 'national' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho', source: 'national' },
    { date: toISODate(addDays(easter, 60)), name: 'Corpus Christi', source: 'national' },
    { date: `${year}-09-07`, name: 'Independência do Brasil', source: 'national' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', source: 'national' },
    { date: `${year}-11-02`, name: 'Finados', source: 'national' },
    { date: `${year}-11-15`, name: 'Proclamação da República', source: 'national' },
    { date: `${year}-11-20`, name: 'Consciência Negra', source: 'national' },
    { date: `${year}-12-25`, name: 'Natal', source: 'national' },
  ]
  return list
}

export function holidaysForYear(
  year: number,
  custom: Record<string, string>,
): Holiday[] {
  const national = nationalHolidays(year)
  const extra = Object.entries(custom)
    .filter(([iso]) => iso.startsWith(`${year}-`))
    .map(([date, name]) => ({ date, name, source: 'custom' as const }))
  const byDate = new Map<string, Holiday>()
  for (const item of [...national, ...extra]) byDate.set(item.date, item)
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function getHoliday(
  date: Date | string,
  custom: Record<string, string>,
): Holiday | null {
  const iso = typeof date === 'string' ? date : toISODate(date)
  const year = Number(iso.slice(0, 4))
  return holidaysForYear(year, custom).find((item) => item.date === iso) ?? null
}

export function compensatoryFor(
  offIso: string,
  compensations: Record<string, string>,
): string | null {
  const found = Object.entries(compensations).find(([, off]) => off === offIso)
  return found ? found[0] : null
}

export function pendingHolidayShifts(opts: {
  from: Date
  to: Date
  customHolidays: Record<string, string>
  compensations: Record<string, string>
  isWork: (date: Date) => boolean
}): { holiday: Holiday; date: Date }[] {
  const years = new Set([opts.from.getFullYear(), opts.to.getFullYear()])
  const list: { holiday: Holiday; date: Date }[] = []
  for (const year of years) {
    for (const holiday of holidaysForYear(year, opts.customHolidays)) {
      const date = parseISODate(holiday.date)
      if (date < opts.from || date > opts.to) continue
      if (!opts.isWork(date)) continue
      if (opts.compensations[holiday.date]) continue
      list.push({ holiday, date })
    }
  }
  return list.sort((a, b) => a.holiday.date.localeCompare(b.holiday.date))
}
