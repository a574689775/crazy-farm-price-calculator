import type { HistoryRecord } from '@/types'

const STORAGE_KEY = 'historyRecords'
const MAX_RECORDS = 20

const safeParse = (value: string | null): HistoryRecord[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed as HistoryRecord[]
    }
    return []
  } catch (e) {
    console.error('Failed to parse history records', e)
    return []
  }
}

export const getHistoryRecords = (): HistoryRecord[] => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return safeParse(raw)
}

export const saveHistoryRecords = (records: HistoryRecord[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
}

export const addHistoryRecord = (record: HistoryRecord) => {
  const list = getHistoryRecords()
  const newList = [record, ...list].slice(0, MAX_RECORDS)
  saveHistoryRecords(newList)
}

export const removeHistoryRecord = (id: string) => {
  const list = getHistoryRecords()
  const newList = list.filter((item) => item.id !== id)
  saveHistoryRecords(newList)
}
