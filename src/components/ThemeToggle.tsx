import type { Theme } from '../store'

type Props = {
  theme: Theme
  onTheme: (theme: Theme) => void
}

export function ThemeToggle({ theme, onTheme }: Props) {
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-pressed={dark}
      onClick={() => onTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 9.2A5.5 5.5 0 0 1 6.8 2.5 5.6 5.6 0 1 0 13.5 9.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.2 3.2l.9.9M11.9 11.9l.9.9M12.8 3.2l-.9.9M4.1 11.9l-.9.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
