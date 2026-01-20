import type { CropConfig } from '@/types'
import { ClockCircleOutlined } from '@ant-design/icons'
import { SVGText } from '@/components/SVGText'
import { GradientButton } from '@/components/GradientButton'
import './CropSelector.css'

interface CropSelectorProps {
  crops: CropConfig[]
  selectedCrop: CropConfig | null
  onSelectCrop: (crop: CropConfig) => void
  onShowHistory?: () => void
  queryCounts?: Record<string, number>
}

// 本期果王争霸的作物
const CHAMPION_CROPS = ['蟠桃', '葡萄', '西瓜', '番茄']

export const CropSelector = ({ crops, onSelectCrop, onShowHistory, queryCounts = {} }: CropSelectorProps) => {
  // 数据文件中的顺序即品质优先级（索引越小品质越高）
  const cropOrder = new Map(crops.map((crop, index) => [crop.name, index]))

  // 获取果王争霸的作物配置
  const sortByCountThenQuality = (a: CropConfig, b: CropConfig) => {
    const countDiff = (queryCounts[b.name] ?? 0) - (queryCounts[a.name] ?? 0)
    if (countDiff !== 0) return countDiff
    // 品质高（原数据顺序靠前）排前
    return (cropOrder.get(b.name) ?? 0) - (cropOrder.get(a.name) ?? 0)
  }

  const championCrops = CHAMPION_CROPS.map(name => 
    crops.find(crop => crop.name === name)
  )
    .filter((crop): crop is CropConfig => crop !== undefined)
    .sort(sortByCountThenQuality)

  // 获取其他作物（排除果王争霸的作物）
  const otherCrops = crops
    .filter(crop => !CHAMPION_CROPS.includes(crop.name))
    .sort(sortByCountThenQuality)

  const renderCropItem = (crop: CropConfig) => {
    const rawCount = queryCounts[crop.name] ?? 0
    const count =
      rawCount >= 10000 ? `${(rawCount / 10000).toFixed(1)}万` : rawCount
    return (
      <div
        key={crop.name}
        className="crop-item"
        onClick={() => onSelectCrop(crop)}
      >
        {rawCount > 0 && <div className="crop-item-count">{count}</div>}
        <img 
          src={`https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/${crop.name}.png`}
          alt={crop.name}
          className="crop-item-image"
        />
        <div className="crop-item-name">{crop.name}</div>
      </div>
    )
  }

  return (
    <div className="crop-selector">
      <div className="crop-title">
        <SVGText
          fillColor="#fff"
          strokeColor="rgba(177, 95, 47, 1)"
          strokeWidth={5}
          fontSize={20}
          fontWeight={700}
          style={{ width: '100%', height: '100%' }}
        >
          疯狂农场价格计算器
        </SVGText>
      </div>
      <div className="crop-selector-content">
        {/* 本期果王争霸 */}
        <div className="champion-section">
          <div className="champion-title-row">
            <div className="champion-title">本期果王争霸：</div>
            <GradientButton onClick={onShowHistory}>
              <ClockCircleOutlined style={{ marginRight: '4px', color: '#000' }} />
              计算历史
            </GradientButton>
          </div>
          <div className="champion-grid">
            {championCrops.map(renderCropItem)}
          </div>
          <div className="champion-divider"></div>
        </div>

        {/* 所有作物 */}
        <div className="crop-grid">
          {otherCrops.map(renderCropItem)}
        </div>
      </div>
    </div>
  )
}

