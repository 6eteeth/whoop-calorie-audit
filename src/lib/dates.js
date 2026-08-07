import { useEffect, useState } from 'react'

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localTimezoneOffset(dateKey = localDateKey()) {
  const localNoon = new Date(`${dateKey}T12:00:00`)
  const total = -localNoon.getTimezoneOffset()
  const sign = total >= 0 ? '+' : '-'
  const absolute = Math.abs(total)
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

export function shiftLocalDate(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

export function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function longDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function useLocalDateKey() {
  const [dateKey, setDateKey] = useState(localDateKey())

  useEffect(() => {
    let timer
    const schedule = () => {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = window.setTimeout(() => {
        setDateKey(localDateKey())
        schedule()
      }, nextMidnight.getTime() - now.getTime() + 250)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  return dateKey
}
