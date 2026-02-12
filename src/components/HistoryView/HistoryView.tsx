import { useEffect, useState } from 'react'
import { LeftOutlined } from '@ant-design/icons'
import { Modal } from '@/components/Modal'
import type { HistoryRecord } from '@/types'
import { getHistoryRecords, removeHistoryRecord } from '@/utils/historyStorage'
import './HistoryView.css'

interface HistoryViewProps {
  onBack?: () => void
  active: boolean
  onSelectRecord: (record: HistoryRecord) => void
}

export const HistoryView = ({ onBack, active, onSelectRecord }: HistoryViewProps) => {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [deleteTarget, setDeleteTarget] = useState<HistoryRecord | null>(null)

  useEffect(() => {
    if (active) {
      setRecords(getHistoryRecords())
    }
  }, [active])

  const handleDelete = (id: string) => {
    removeHistoryRecord(id)
    setRecords((prev) => prev.filter((item) => item.id !== id))
  }

  const renderRecord = (record: HistoryRecord) => {
    const weightDisplay = Number(record.weight).toFixed(2).replace(/\.?0+$/, '')
    return (
      <div
        className="history-item"
        key={record.id}
        onClick={() => onSelectRecord(record)}
      >
        <button
          type="button"
          className="history-item-delete"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteTarget(record)
          }}
          aria-label="删除历史记录"
        >
          ×
        </button>
        <div className="history-item-body">
          <img
            className="history-item-image"
            src={`/carzyfarm/${record.cropName}.png`}
            alt={record.cropName}
          />
          <div className="history-item-info">
            <div className="history-item-name">{record.cropName}</div>
            <div className="history-item-price">价格：{record.price}</div>
            <div className="history-item-weight">重量：{weightDisplay}kg</div>
          </div>
        </div>
      </div>
    )
  }

  return (
      <>
        <div className="history-view">
          <div className="history-header">
            {onBack && (
              <span className="back-link" onClick={onBack}>
                <LeftOutlined />
              </span>
            )}
            <h3 className="history-title">历史记录</h3>
          </div>
          <div className="history-content">
            {records.length === 0 ? (
              <div className="history-empty">暂无历史记录</div>
            ) : (
              <div className="history-list">
                {records.map(renderRecord)}
              </div>
            )}
          </div>
        </div>

        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="删除历史记录"
        >
          <div className="modal-text history-delete-modal">
            <p>确定要删除这条历史记录吗？此操作不可撤销。</p>
            {deleteTarget && (
              <p className="history-delete-meta">
                作物：{deleteTarget.cropName}，价格：{deleteTarget.price}
              </p>
            )}
            <div className="history-delete-actions">
              <button
                type="button"
                className="history-delete-btn history-delete-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="history-delete-btn history-delete-confirm"
                onClick={() => {
                  if (!deleteTarget) return
                  handleDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }}
              >
                删除
              </button>
            </div>
          </div>
        </Modal>
      </>
  )
}
