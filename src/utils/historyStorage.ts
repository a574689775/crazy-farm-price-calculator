import type { HistoryRecord } from '@/types'

const STORAGE_KEY = 'historyRecords'
const MAX_RECORDS = 100

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
  // 锁定的记录：永远保留，不参与被顶掉
  const locked = records.filter((r) => r.locked)
  const unlocked = records.filter((r) => !r.locked)

  // 未锁定记录按当前顺序截断，锁定记录全部保留
  const maxUnlocked = Math.max(0, MAX_RECORDS - locked.length)
  const trimmedUnlocked = maxUnlocked > 0 ? unlocked.slice(0, maxUnlocked) : []

  const finalList = [...locked, ...trimmedUnlocked]

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(finalList))
}

export const addHistoryRecord = (record: HistoryRecord) => {
  const list = getHistoryRecords()
  // 如果带有 sessionId：同一个 sessionId 视为同一条「计算会话」记录，只保留最新一次
  if (record.sessionId) {
    const existingIndex = list.findIndex(item => item.sessionId === record.sessionId)

    let newList: HistoryRecord[]
    if (existingIndex >= 0) {
      const remaining = list.filter((_, index) => index !== existingIndex)
      newList = [record, ...remaining]
    } else {
      newList = [record, ...list]
    }

    saveHistoryRecords(newList)
    return
  }

  // 兼容旧逻辑：没有 sessionId 的记录，直接追加
  const newList = [record, ...list]
  saveHistoryRecords(newList)
}

export const toggleHistoryRecordLock = (id: string) => {
  const list = getHistoryRecords()
  const newList = list.map((item) =>
    item.id === id ? { ...item, locked: !item.locked } : item
  )
  saveHistoryRecords(newList)
}

export const removeHistoryRecord = (id: string) => {
  const list = getHistoryRecords()
  const newList = list.filter((item) => item.id !== id)
  saveHistoryRecords(newList)
}
