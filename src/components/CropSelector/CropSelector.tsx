import type { CropConfig, MutationColor } from '@/types'
import { mutationColorConfig } from '@/data/weatherMutations'
import './CropSelector.css'

interface CropSelectorProps {
  crops: CropConfig[]
  selectedCrop: CropConfig | null
  onSelectCrop: (crop: CropConfig) => void
}

// 作物颜色映射
const cropColorMap: Record<string, MutationColor> = {
  // 灰色
  '土豆': '灰色',
  '香菇': '灰色',
  '番茄': '灰色',
  '波斯菊': '灰色',
  // 绿色
  '大豆': '绿色',
  '竹子': '绿色',
  '黄瓜': '绿色',
  // 蓝色
  '西瓜': '蓝色',
  '梨': '蓝色',
  '橘子': '蓝色',
  '玉米': '蓝色',
  '白菜': '蓝色',
  '牵牛花': '蓝色',
  '棉花': '蓝色',
  // 紫色
  '苹果': '紫色',
  '石榴': '紫色',
  '香蕉': '紫色',
  '车厘子': '紫色',
  '椰子': '紫色',
  '南瓜': '紫色',
  // 金色
  '草莓': '金色',
  '猕猴桃': '金色',
  '荔枝': '金色',
  '榴莲': '金色',
  // 彩色
  '葡萄': '彩色',
  '蟠桃': '彩色',
  '大王菊': '彩色',
  '惊奇菇': '彩色',
  '向日葵': '彩色',
  '仙人掌象': '彩色',
  '松果': '彩色',
  '魔鬼朝天椒': '彩色',
}

export const CropSelector = ({ crops, onSelectCrop }: CropSelectorProps) => {
  return (
    <div className="crop-selector">
      <div className="crop-grid">
        {[...crops].reverse().map(crop => {
          const color = cropColorMap[crop.name] || '灰色'
          const colorConfig = mutationColorConfig[color]
          
          return (
            <div
              key={crop.name}
              className="crop-item"
              style={{
                background: colorConfig.gradient || colorConfig.bgColor,
                color: colorConfig.textColor,
              }}
              onClick={() => onSelectCrop(crop)}
            >
              {crop.name}
            </div>
          )
        })}
      </div>
    </div>
  )
}

