import type { CropConfig } from '@/types'
import { useLayoutEffect, useMemo, useRef } from 'react'
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
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())
  const prevPositionsRef = useRef(new Map<string, DOMRect>())
  const prevOrderRef = useRef<string>('')
  const clearTimersRef = useRef(new Map<string, number>())

  // 数据文件中的顺序即品质优先级（索引越小品质越高）
  const cropOrder = useMemo(() => new Map(crops.map((crop, index) => [crop.name, index])), [crops])

  // 获取果王争霸的作物配置
  const sortByCountThenQuality = (a: CropConfig, b: CropConfig) => {
    const countDiff = (queryCounts[b.name] ?? 0) - (queryCounts[a.name] ?? 0)
    if (countDiff !== 0) return countDiff
    // 品质高（原数据顺序靠前）排前
    return (cropOrder.get(b.name) ?? 0) - (cropOrder.get(a.name) ?? 0)
  }

  const championCrops = useMemo(() => 
    CHAMPION_CROPS.map(name => 
      crops.find(crop => crop.name === name)
    )
      .filter((crop): crop is CropConfig => crop !== undefined)
      .sort(sortByCountThenQuality),
    [crops, queryCounts, cropOrder]
  )

  // 获取其他作物（排除果王争霸的作物）
  const otherCrops = useMemo(() =>
    crops
      .filter(crop => !CHAMPION_CROPS.includes(crop.name))
      .sort(sortByCountThenQuality),
    [crops, queryCounts, cropOrder]
  )

  const orderKey = useMemo(
    () => [...championCrops, ...otherCrops].map(c => c.name).join(','),
    [championCrops, otherCrops]
  )

  // FLIP 动画：仅在排序变化时触发，避免无关抖动
  useLayoutEffect(() => {
    const prevOrder = prevOrderRef.current
    const isOrderChanged = prevOrder !== '' && prevOrder !== orderKey

    const newPositions = new Map<string, DOMRect>()
    nodeRefs.current.forEach((node, key) => {
      newPositions.set(key, node.getBoundingClientRect())
    })

    if (isOrderChanged) {
      const prevPositions = prevPositionsRef.current

      nodeRefs.current.forEach((node, key) => {
        const prev = prevPositions.get(key)
        const next = newPositions.get(key)
        if (!prev || !next) return

        const dx = prev.left - next.left
        const dy = prev.top - next.top

        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

        // 清理之前的定时器
        const prevTimer = clearTimersRef.current.get(key)
        if (prevTimer) {
          window.clearTimeout(prevTimer)
        }

        node.style.transition = 'none'
        node.style.transform = `translate(${dx}px, ${dy}px)`
        // 强制回流，确保 transform 生效
        void node.getBoundingClientRect()

        requestAnimationFrame(() => {
          node.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
          node.style.transform = ''
          const timer = window.setTimeout(() => {
            node.style.transition = ''
          }, 450)
          clearTimersRef.current.set(key, timer)
        })
      })
    }

    prevPositionsRef.current = newPositions
    prevOrderRef.current = orderKey
  }, [orderKey])

  const setNodeRef = (name: string) => (el: HTMLDivElement | null) => {
    if (!el) {
      nodeRefs.current.delete(name)
      return
    }
    nodeRefs.current.set(name, el)
  }

  const renderCropItem = (crop: CropConfig) => {
    const rawCount = queryCounts[crop.name] ?? 0
    const count =
      rawCount >= 10000 ? `${(rawCount / 10000).toFixed(1)}万` : rawCount
    return (
      <div
        key={crop.name}
        className="crop-item"
        ref={setNodeRef(crop.name)}
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

