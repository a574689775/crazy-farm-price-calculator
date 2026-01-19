import { useEffect, useState } from 'react'
import { LeftOutlined } from '@ant-design/icons'
import { GradientButton } from '@/components/GradientButton'
import type { HistoryRecord } from '@/types'
import { getHistoryRecords } from '@/utils/historyStorage'
import './HistoryView.css'

interface HistoryViewProps {
  onBack?: () => void
  active: boolean
  onSelectRecord: (record: HistoryRecord) => void
}

export const HistoryView = ({ onBack, active, onSelectRecord }: HistoryViewProps) => {
  const [records, setRecords] = useState<HistoryRecord[]>([])

  useEffect(() => {
    if (active) {
      setRecords(getHistoryRecords())
    }
  }, [active])

  const renderRecord = (record: HistoryRecord) => {
    const weightDisplay = Number(record.weight).toFixed(2).replace(/\.?0+$/, '')
    return (
      <div className="history-item" key={record.id}>
        <div className="history-item-body">
          <img
            className="history-item-image"
            src={`https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/${record.cropName}.png`}
            alt={record.cropName}
          />
          <div className="history-item-info">
            <div className="history-item-name">{record.cropName}</div>
            <div className="history-item-price">价格：{record.price}</div>
            <div className="history-item-weight">重量：{weightDisplay}kg</div>
          </div>
        </div>
        <GradientButton onClick={() => onSelectRecord(record)}>查看</GradientButton>
      </div>
    )
  }

  return (
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
  )
}
