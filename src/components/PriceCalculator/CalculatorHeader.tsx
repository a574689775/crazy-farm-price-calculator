import { ShareAltOutlined, LeftOutlined } from '@ant-design/icons'
import type { CropConfig, WeatherMutation } from '@/types'
import { crops } from '@/data/crops'
import { generateShareUrl } from '@/utils/shareEncoder'
import './PriceCalculator.css'

interface CalculatorHeaderProps {
  crop: CropConfig
  onBack?: () => void
  weight: string
  percentage: string
  selectedMutations: WeatherMutation[]
  onShareClick: (url: string) => void
  onError: (message: string) => void
}

/**
 * 计算器头部组件
 * 包含返回按钮、作物名称、分享按钮
 */
export const CalculatorHeader = ({
  crop,
  onBack,
  weight,
  percentage,
  selectedMutations,
  onShareClick,
  onError,
}: CalculatorHeaderProps) => {
  const weightNum = parseFloat(weight) || 0
  const isValidWeight = weightNum > 0 && weightNum <= crop.maxWeight

  const handleShare = () => {
    if (isValidWeight && weightNum > 0) {
      const cropIndex = crops.findIndex(c => c.name === crop.name)
      if (cropIndex !== -1) {
        const percentageNum = parseFloat(percentage) || 0
        const url = generateShareUrl({
          cropIndex,
          weight: weightNum,
          percentage: percentageNum || Math.round((weightNum / crop.maxWeight) * 100),
          mutations: selectedMutations,
        })
        onShareClick(url)
      }
    } else {
      onError('请先输入重量并选择突变')
    }
  }

  return (
    <div className="calculator-header">
      {onBack && (
        <span className="back-link" onClick={onBack}>
          <LeftOutlined />
        </span>
      )}
      <h3 className="calculator-title">{crop.name}</h3>
      <button
        className="share-header-button"
        onClick={handleShare}
        title="分享计算结果"
      >
        <ShareAltOutlined />
      </button>
    </div>
  )
}
