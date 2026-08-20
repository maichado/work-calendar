import { toast } from 'sonner'
import { useId, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { formatDayMonth, parseISODate, toISODate, type Kind } from '../lib/schedule'
import {
  isPersistedSlice,
  snapshotStore,
  type PersistedSlice,
  type Theme,
} from '../store'

type Props = {
  today: Date
  theme: Theme
  workStart: string
  workEnd: string
  customHolidays: Record<string, string>
  onTheme: (theme: Theme) => void
  onShift: (start: string, end: string) => void
  onRealign: (kind: Kind) => void
  onClearExceptions: () => void
  onCustomHoliday: (isoDate: string, name: string | null) => void
  onImport: (data: PersistedSlice) => void
}

export function SettingsDialog({
  today,
  theme,
  workStart,
  workEnd,
  customHolidays,
  onTheme,
  onShift,
  onRealign,
  onClearExceptions,
  onCustomHoliday,
  onImport,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const descId = useId()
  const [holidayDate, setHolidayDate] = useState(toISODate(today))
  const [holidayName, setHolidayName] = useState('Feriado municipal')

  function open() {
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) close()
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(snapshotStore(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `folga-${toISODate(today)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup exportado')
  }

  function importFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        if (!isPersistedSlice(parsed)) {
          toast.error('Arquivo inválido')
          return
        }
        onImport(parsed)
        toast.success('Dados importados')
      } catch {
        toast.error('Não foi possível ler o arquivo')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <button className="ghost" type="button" onClick={open}>
        Ajustes
      </button>
      {createPortal(
        <dialog
          ref={dialogRef}
          className="dialog-portal"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={onBackdropClick}
        >
        <div className="dialog-popup">
          <div className="dialog-head">
            <div>
              <h2 id={titleId}>Ajustes</h2>
              <p id={descId}>
                Escala, feriados, horário do plantão, tema e backup local.
              </p>
            </div>
            <button type="button" className="icon-btn" aria-label="Fechar" onClick={close}>
              <CloseIcon />
            </button>
          </div>

          <section className="dialog-block">
            <h3>Escala</h3>
            <p>Um dia de plantão, um dia de folga. Realinha a partir de hoje.</p>
            <div className="dialog-row">
              <button
                type="button"
                className="solid"
                data-kind="off"
                onClick={() => {
                  onRealign('off')
                  toast.success('Hoje marcado como folga. A escala segue daqui.')
                }}
              >
                Hoje é folga
              </button>
              <button
                type="button"
                className="solid"
                data-kind="work"
                onClick={() => {
                  onRealign('work')
                  toast.success('Hoje marcado como plantão. A escala segue daqui.')
                }}
              >
                Hoje é plantão
              </button>
            </div>
          </section>

          <section className="dialog-block">
            <h3>Feriado local</h3>
            <p>
              Feriados nacionais já entram sozinhos. No hospital o plantão segue.
              Marque aqui ponto facultativo ou feriado municipal.
            </p>
            <div className="dialog-row times">
              <label>
                Data
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                />
              </label>
              <label>
                Nome
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="Feriado municipal"
                />
              </label>
            </div>
            <div className="dialog-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  if (!holidayDate || !holidayName.trim()) {
                    toast.error('Preencha data e nome')
                    return
                  }
                  onCustomHoliday(holidayDate, holidayName.trim())
                  toast.success('Feriado local marcado')
                }}
              >
                Adicionar
              </button>
            </div>
            {Object.keys(customHolidays).length > 0 ? (
              <ul className="holiday-list">
                {Object.entries(customHolidays)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([iso, name]) => (
                    <li key={iso}>
                      <span>
                        {formatDayMonth(parseISODate(iso))} · {name}
                      </span>
                      <button
                        type="button"
                        className="ghost danger compact"
                        onClick={() => onCustomHoliday(iso, null)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
              </ul>
            ) : null}
          </section>

          <section className="dialog-block">
            <h3>Horário do plantão</h3>
            <div className="dialog-row times">
              <label>
                Início
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => onShift(e.target.value, workEnd)}
                />
              </label>
              <label>
                Fim
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => onShift(workStart, e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="dialog-block">
            <h3>Aparência</h3>
            <p>Claro para o dia. Noturno para o plantão da noite.</p>
            <div className="seg">
              <button
                type="button"
                className={theme === 'light' ? 'is-on' : undefined}
                onClick={() => onTheme('light')}
              >
                Claro
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'is-on' : undefined}
                onClick={() => onTheme('dark')}
              >
                Noturno
              </button>
            </div>
          </section>

          <section className="dialog-block">
            <h3>Dados</h3>
            <p>Tudo fica neste aparelho. Exporte se quiser um backup.</p>
            <div className="dialog-row">
              <button type="button" className="ghost" onClick={exportData}>
                Exportar
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => fileRef.current?.click()}
              >
                Importar
              </button>
              <button
                type="button"
                className="ghost danger"
                onClick={() => {
                  onClearExceptions()
                  toast.success('Exceções e folgas compensatórias removidas')
                }}
              >
                Limpar exceções
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importFile(file)
                e.target.value = ''
              }}
            />
          </section>
        </div>
      </dialog>,
      document.body,
      )}
    </>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
