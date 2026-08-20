import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getHoliday } from './lib/holidays'
import type { Kind } from './lib/schedule'
import { cycleKind, parseISODate } from './lib/schedule'

export type Theme = 'dark' | 'light'

export type PersistedSlice = {
  anchorDate: string
  anchorKind: Kind
  exceptions: Record<string, Kind>
  notes: Record<string, string>
  workStart: string
  workEnd: string
  theme: Theme
  customHolidays: Record<string, string>
  compensations: Record<string, string>
}

type Store = PersistedSlice & {
  setTheme: (theme: Theme) => void
  setShift: (workStart: string, workEnd: string) => void
  setNote: (isoDate: string, note: string) => void
  setOverride: (isoDate: string, kind: Kind | null) => void
  realignCycle: (isoDate: string, kind: Kind) => void
  clearExceptions: () => void
  setCustomHoliday: (isoDate: string, name: string | null) => void
  setCompensation: (holidayIso: string, offIso: string | null) => void
  replaceAll: (data: PersistedSlice) => void
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#eef4f2' : '#0f1716')
  }
}

function dropCompensation(
  holidayIso: string,
  compensations: Record<string, string>,
  exceptions: Record<string, Kind>,
) {
  const nextComp = { ...compensations }
  const nextExc = { ...exceptions }
  const offIso = nextComp[holidayIso]
  delete nextComp[holidayIso]
  if (offIso && nextExc[offIso] === 'off') delete nextExc[offIso]
  return { compensations: nextComp, exceptions: nextExc }
}

function unlinkIfNotOff(
  iso: string,
  kind: Kind,
  compensations: Record<string, string>,
  exceptions: Record<string, Kind>,
) {
  let nextComp = { ...compensations }
  let nextExc = { ...exceptions }
  if (kind !== 'off') {
    for (const [holiday, off] of Object.entries(nextComp)) {
      if (off === iso) delete nextComp[holiday]
    }
  }
  if (kind !== 'work' && nextComp[iso]) {
    const dropped = dropCompensation(iso, nextComp, nextExc)
    nextComp = dropped.compensations
    nextExc = dropped.exceptions
  }
  return { compensations: nextComp, exceptions: nextExc }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      anchorDate: '2026-08-20',
      anchorKind: 'off',
      exceptions: {},
      notes: {},
      workStart: '07:00',
      workEnd: '19:00',
      theme: 'light',
      customHolidays: {},
      compensations: {},
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },
      setShift: (workStart, workEnd) => set({ workStart, workEnd }),
      setNote: (isoDate, note) => {
        const notes = { ...get().notes }
        if (note.trim().length === 0) delete notes[isoDate]
        else notes[isoDate] = note
        set({ notes })
      },
      setOverride: (isoDate, kind) => {
        const { anchorDate, anchorKind, exceptions, compensations } = get()
        const next = { ...exceptions }
        const cycle = cycleKind(parseISODate(isoDate), parseISODate(anchorDate), anchorKind)
        if (kind === null || kind === cycle) delete next[isoDate]
        else next[isoDate] = kind
        const finalKind = kind === null || kind === cycle ? cycle : kind
        const linked = unlinkIfNotOff(isoDate, finalKind, compensations, next)
        set({
          exceptions: linked.exceptions,
          compensations: linked.compensations,
        })
      },
      realignCycle: (isoDate, kind) => set({ anchorDate: isoDate, anchorKind: kind }),
      clearExceptions: () => set({ exceptions: {}, compensations: {} }),
      setCustomHoliday: (isoDate, name) => {
        const customHolidays = { ...get().customHolidays }
        if (!name || name.trim().length === 0) {
          delete customHolidays[isoDate]
          const stillHoliday = getHoliday(isoDate, customHolidays)
          if (stillHoliday) {
            set({ customHolidays })
            return
          }
          const dropped = dropCompensation(
            isoDate,
            get().compensations,
            get().exceptions,
          )
          set({ customHolidays, ...dropped })
          return
        }
        customHolidays[isoDate] = name.trim()
        set({ customHolidays })
      },
      setCompensation: (holidayIso, offIso) => {
        const { compensations, exceptions, anchorDate, anchorKind } = get()
        const nextComp = { ...compensations }
        const nextExc = { ...exceptions }
        const previousOff = nextComp[holidayIso]
        if (previousOff) {
          const cycle = cycleKind(
            parseISODate(previousOff),
            parseISODate(anchorDate),
            anchorKind,
          )
          if (cycle === 'off') delete nextExc[previousOff]
          else if (nextExc[previousOff] === 'off') delete nextExc[previousOff]
        }
        if (!offIso) {
          delete nextComp[holidayIso]
          set({ compensations: nextComp, exceptions: nextExc })
          return
        }
        nextComp[holidayIso] = offIso
        const offCycle = cycleKind(
          parseISODate(offIso),
          parseISODate(anchorDate),
          anchorKind,
        )
        if (offCycle === 'work') nextExc[offIso] = 'off'
        else delete nextExc[offIso]
        set({ compensations: nextComp, exceptions: nextExc })
      },
      replaceAll: (data) => {
        applyTheme(data.theme)
        set({
          anchorDate: data.anchorDate,
          anchorKind: data.anchorKind,
          exceptions: data.exceptions,
          notes: data.notes,
          workStart: data.workStart,
          workEnd: data.workEnd,
          theme: data.theme,
          customHolidays: data.customHolidays ?? {},
          compensations: data.compensations ?? {},
        })
      },
    }),
    {
      name: 'folga-store',
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<PersistedSlice>
        return {
          ...state,
          theme: state.theme ?? 'light',
          workStart: '07:00',
          workEnd: '19:00',
          customHolidays: state.customHolidays ?? {},
          compensations: state.compensations ?? {},
        }
      },
      partialize: (state): PersistedSlice => ({
        anchorDate: state.anchorDate,
        anchorKind: state.anchorKind,
        exceptions: state.exceptions,
        notes: state.notes,
        workStart: state.workStart,
        workEnd: state.workEnd,
        theme: state.theme,
        customHolidays: state.customHolidays,
        compensations: state.compensations,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

export function snapshotStore(): PersistedSlice {
  const s = useStore.getState()
  return {
    anchorDate: s.anchorDate,
    anchorKind: s.anchorKind,
    exceptions: s.exceptions,
    notes: s.notes,
    workStart: s.workStart,
    workEnd: s.workEnd,
    theme: s.theme,
    customHolidays: s.customHolidays,
    compensations: s.compensations,
  }
}

export function isPersistedSlice(value: unknown): value is PersistedSlice {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const holidaysOk =
    v.customHolidays === undefined ||
    (typeof v.customHolidays === 'object' && v.customHolidays !== null)
  const compsOk =
    v.compensations === undefined ||
    (typeof v.compensations === 'object' && v.compensations !== null)
  return (
    typeof v.anchorDate === 'string' &&
    (v.anchorKind === 'work' || v.anchorKind === 'off') &&
    typeof v.workStart === 'string' &&
    typeof v.workEnd === 'string' &&
    (v.theme === 'dark' || v.theme === 'light') &&
    typeof v.exceptions === 'object' &&
    typeof v.notes === 'object' &&
    holidaysOk &&
    compsOk
  )
}
