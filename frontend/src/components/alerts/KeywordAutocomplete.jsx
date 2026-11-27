/**
 * KeywordAutocomplete.jsx
 *
 * Text box with a drop-down of role keyword suggestions while typing, taken
 * from the titles of open jobs (GET /api/alerts/suggestions/?q=…), each with how
 * many open jobs mention it — so a seeker picks a keyword that actually finds
 * jobs. Keyboard: ↓/↑ move through suggestions, Enter picks the highlighted one,
 * Escape closes the list. Free text is always allowed.
 *
 * Used for the job alert form's "Role / Keyword" field and the tender alert form's
 * "Keyword" field on pages/seeker/Alerts.jsx (bound to React Hook Form via
 * `Controller`); tender alerts pass `fetchSuggestions` to suggest from tender titles.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { seekerService } from '@/services/seekerService'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

const DEBOUNCE_MS = 250 // wait for a pause in typing before asking the server
const MIN_CHARS = 2     // the API suggests nothing for shorter text

/**
 * KeywordAutocomplete
 *
 * Props:
 * - value (string) / onChange (function(string)) — the field's text (controlled).
 * - onBlur (function, optional) — passed through (React Hook Form touch tracking).
 * - id, placeholder, className (optional) — forwarded to the input.
 * - fetchSuggestions (function(q) => Promise<{data: [{keyword, count}]}>, optional) —
 *   where suggestions come from; defaults to job titles (seekerService.keywordSuggestions).
 * - unit (string, default 'job') — what `count` counts, shown as "66 jobs" / "12 tenders".
 */
export function KeywordAutocomplete({
  value = '', onChange, onBlur, id, placeholder, className,
  fetchSuggestions = seekerService.keywordSuggestions, unit = 'job',
}) {
  const listId = useId()
  const [suggestions, setSuggestions] = useState([]) // [{keyword, count}] for the current text
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)           // highlighted suggestion index, -1 = none
  const typedRef = useRef(false)                     // only suggest after the user types (not after picking one)
  const latestRef = useRef('')                       // the text the newest request was for

  // Fetch suggestions after a pause in typing; drop responses for older text.
  useEffect(() => {
    const q = value.trim()
    if (!typedRef.current || q.length < MIN_CHARS) {
      setSuggestions([])
      return undefined
    }
    const timer = setTimeout(() => {
      latestRef.current = q
      fetchSuggestions(q)
        .then(({ data }) => {
          if (latestRef.current !== q) return
          // Nothing to suggest if the only option is exactly what's typed.
          const useful = data.filter(s => s.keyword.toLowerCase() !== q.toLowerCase() || data.length > 1)
          setSuggestions(useful)
          setActive(-1)
          setOpen(useful.length > 0)
        })
        .catch(() => setSuggestions([]))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, fetchSuggestions])

  /** Put a suggestion in the box and close the list. */
  const pick = (keyword) => {
    typedRef.current = false
    onChange(keyword)
    setOpen(false)
    setSuggestions([])
  }

  /** Arrow keys move the highlight, Enter picks it (instead of submitting), Escape closes. */
  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(suggestions[active].keyword)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && suggestions.length > 0

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { typedRef.current = true; onChange(e.target.value) }}
        onKeyDown={onKeyDown}
        onFocus={() => { if (suggestions.length) setOpen(true) }}
        onBlur={(e) => { setOpen(false); onBlur?.(e) }}
      />
      {showList && (
        <ul id={listId} role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.keyword}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the pick happens before the input's blur closes the list
              onMouseDown={(e) => { e.preventDefault(); pick(s.keyword) }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm',
                i === active ? 'bg-muted' : 'hover:bg-muted/60')}
            >
              <span className="truncate">{s.keyword}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{s.count.toLocaleString('en-IN')} {unit}{s.count === 1 ? '' : 's'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
