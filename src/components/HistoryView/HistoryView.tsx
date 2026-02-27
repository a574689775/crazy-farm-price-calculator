import { useState } from 'react'
import { LeftOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons'
import { Modal } from '@/components/Modal'
import type { HistoryRecord } from '@/types'
import { getCropImagePath } from '@/data/crops'
import { getHistoryRecords, removeHistoryRecord, toggleHistoryRecordLock } from '@/utils/historyStorage'
import { weatherMutations, mutationColorConfig } from '@/data/weatherMutations'
import { SVGText } from '@/components/SVGText'
import './HistoryView.css'

interface HistoryViewProps {
  onBack?: () => void
  active: boolean
  onSelectRecord: (record: HistoryRecord) => void
}

export const HistoryView = ({ onBack, active, onSelectRecord }: HistoryViewProps) => {
  const [, setRefreshTick] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<HistoryRecord | null>(null)
  const records = active ? getHistoryRecords() : []

  const handleDelete = (id: string) => {
    removeHistoryRecord(id)
    setRefreshTick((v) => v + 1)
  }

  const handleToggleLock = (id: string) => {
    toggleHistoryRecordLock(id)
    setRefreshTick((v) => v + 1)
  }

  const renderRecord = (record: HistoryRecord) => {
    const weightDisplay = Number(record.weight).toFixed(2).replace(/\.?0+$/, '')
    // 按品质高低对突变排序：彩色 > 金色 > 紫色 > 蓝色 > 绿色 > 灰色，同色内按倍数从高到低
    const colorPriority: Record<string, number> = {
      '灰色': 1,
      '绿色': 2,
      '蓝色': 3,
      '紫色': 4,
      '金色': 5,
      '彩色': 6,
    }
    const mutationPriority = new Map<string, number>(
      weatherMutations.map((m) => [
        m.name,
        (colorPriority[m.color] || 0) * 1000 + m.multiplier,
      ])
    )
    const sortedMutations = [...(record.mutations || [])].sort((a, b) => {
      const pa = mutationPriority.get(a as any) ?? 0
      const pb = mutationPriority.get(b as any) ?? 0
      return pb - pa
    })

    const renderMutationTag = (name: string) => {
      const config = weatherMutations.find((m) => m.name === (name as any))
      if (!config) return null
      const colorCfg = mutationColorConfig[config.color]
      return (
        <span
          key={name}
          className="history-mutation-tag"
          style={{
            background: colorCfg.gradient || colorCfg.bgColor,
            color: colorCfg.textColor,
          }}
        >
          <SVGText
            fillColor={colorCfg.textColor}
            strokeColor="#000"
            strokeWidth={2}
            fontSize={12}
            fontWeight={900}
            className="history-mutation-text"
          >
            {name}
          </SVGText>
        </span>
      )
    }

    return (
      <div
        className={`history-item ${record.locked ? 'history-item-locked' : ''}`}
        key={record.id}
      >
        <button
          type="button"
          className={`history-item-lock ${record.locked ? 'history-item-lock--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleLock(record.id)
          }}
          aria-label={record.locked ? '取消锁定' : '锁定此记录'}
        >
          {record.locked ? <LockOutlined /> : <UnlockOutlined />}
        </button>
        <button
          type="button"
          className="history-item-delete"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteTarget(record)
          }}
          aria-label="删除历史记录"
        >
          <DeleteOutlined />
        </button>
        <div
          className="history-item-body"
          onClick={() => onSelectRecord(record)}
        >
          <div className="history-item-top">
            <img
              className="history-item-image"
              src={getCropImagePath(record.cropName)}
              alt={record.cropName}
            />
            <div className="history-item-info">
              <div className="history-item-row1">
                <span className="history-item-name">{record.cropName}</span>
                <span className="history-item-weight">{weightDisplay}kg</span>
              </div>
              <div className="history-item-price-inline">
                <span className="history-item-price-label">价格</span>
                <span className="history-item-price-value">{record.price}</span>
              </div>
            </div>
          </div>
          <div className="history-item-bottom">
            {sortedMutations && sortedMutations.length > 0 ? (
              <div className="history-mutations">
                {sortedMutations.map((m) => renderMutationTag(m))}
              </div>
            ) : (
              <span className="history-mutations-empty">无突变</span>
            )}
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
