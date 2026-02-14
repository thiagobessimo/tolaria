import { useState, useRef, useEffect, useMemo } from 'react'
import type { VaultEntry } from '../types'
import './QuickOpenPalette.css'

interface QuickOpenPaletteProps {
  open: boolean
  entries: VaultEntry[]
  onSelect: (entry: VaultEntry) => void
  onClose: () => void
}

/** Simple fuzzy match: all query chars appear in order in the target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  let score = 0
  let lastMatchIndex = -1

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches
      if (ti === lastMatchIndex + 1) score += 2
      // Bonus for matching at start or after separator
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-') score += 3
      score += 1
      lastMatchIndex = ti
      qi++
    }
  }

  return { match: qi === q.length, score }
}

export function QuickOpenPalette({ open, entries, onSelect, onClose }: QuickOpenPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show all entries sorted by most recently modified
      return [...entries].sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0)).slice(0, 20)
    }
    return entries
      .map((entry) => ({ entry, ...fuzzyMatch(query, entry.title) }))
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.entry)
  }, [entries, query])

  // Keep selectedIndex in bounds
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Close on Escape, navigate with arrows, select with Enter
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex])
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, results, selectedIndex, onSelect, onClose])

  if (!open) return null

  return (
    <div className="palette__overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="palette__results" ref={listRef}>
          {results.length === 0 ? (
            <div className="palette__empty">No matching notes</div>
          ) : (
            results.map((entry, i) => (
              <div
                key={entry.path}
                className={`palette__item${i === selectedIndex ? ' palette__item--selected' : ''}`}
                onClick={() => {
                  onSelect(entry)
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="palette__item-title">{entry.title}</span>
                {entry.isA && <span className="palette__item-type">{entry.isA}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
