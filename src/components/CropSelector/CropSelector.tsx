import type { CropConfig } from '@/types'
import './CropSelector.css'

interface CropSelectorProps {
  crops: CropConfig[]
  selectedCrop: CropConfig | null
  onSelectCrop: (crop: CropConfig) => void
}

export const CropSelector = ({ crops, onSelectCrop }: CropSelectorProps) => {
  return (
    <div className="crop-selector">
      <div className="crop-title">
        疯狂农场价格计算器
      </div>
      <div className="crop-grid">
        {[...crops].reverse().map(crop => {
          return (
            <div
              key={crop.name}
              className="crop-item"
              onClick={() => onSelectCrop(crop)}
            >
              <img 
                src={`https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/${crop.name}.png`}
                alt={crop.name}
                className="crop-item-image"
              />
              <div className="crop-item-name">{crop.name}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

