import type { CropConfig } from '@/types'
import './CropDetails.css'

interface CropDetailsProps {
  crop: CropConfig | null
}

export const CropDetails = ({ crop }: CropDetailsProps) => {
  if (!crop) {
    return (
      <div className="crop-details empty">
        <p>请先选择作物查看详情</p>
      </div>
    )
  }

  return (
    <div className="crop-details">
      <h3 className="crop-details-title">{crop.name}</h3>
      
      <div className="crop-details-grid">
        <div className="detail-item">
          <span className="detail-label">售价系数</span>
          <span className="detail-value">{crop.priceCoefficient}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">最大重量</span>
          <span className="detail-value">{crop.maxWeight}kg</span>
        </div>
      </div>
    </div>
  )
}

