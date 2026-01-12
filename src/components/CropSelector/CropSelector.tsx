import type { CropConfig } from '@/types'
import './CropSelector.css'

interface CropSelectorProps {
  crops: CropConfig[]
  selectedCrop: CropConfig | null
  onSelectCrop: (crop: CropConfig) => void
}

export const CropSelector = ({ crops, selectedCrop, onSelectCrop }: CropSelectorProps) => {

  return (
    <div className="crop-selector">
      <label className="crop-selector-label">选择作物</label>
      <select
        className="crop-selector-select"
        value={selectedCrop?.name || ''}
        onChange={(e) => {
          const crop = crops.find(c => c.name === e.target.value)
          if (crop) onSelectCrop(crop)
        }}
      >
        <option value="">请选择作物</option>
        {[...crops].reverse().map(crop => (
          <option key={crop.name} value={crop.name}>
            {crop.name}
          </option>
        ))}
      </select>
    </div>
  )
}

