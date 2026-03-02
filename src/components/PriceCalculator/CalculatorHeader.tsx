import { ShareAltOutlined, LeftOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
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
  /** 当前作物是否已收藏 */
  isFavorite?: boolean
  /** 点击收藏/取消收藏 */
  onFavoriteClick?: () => void
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
  isFavorite = false,
  onFavoriteClick,
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
          percentage: percentageNum || Math.floor((weightNum / crop.maxWeight) * 100),
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
      <div className="calculator-header-actions">
        {onFavoriteClick && (
          <button
            type="button"
            className={`favorite-header-button${isFavorite ? ' favorite-header-button--active' : ''}`}
            onClick={onFavoriteClick}
            title={isFavorite ? '取消收藏' : '收藏'}
          >
            {isFavorite ? <StarFilled /> : <StarOutlined />}
          </button>
        )}
        <button
          type="button"
          className="share-header-button"
          onClick={handleShare}
          title="分享计算结果"
        >
          <ShareAltOutlined />
        </button>
      </div>
    </div>
  )
}
