import type { CropConfig } from '@/types'
import { getCropImagePath } from '@/data/crops'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { SVGText } from '@/components/SVGText'
import { GradientButton } from '@/components/GradientButton'
import './CropSelector.css'

interface CropSelectorProps {
  crops: CropConfig[]
  selectedCrop: CropConfig | null
  onSelectCrop: (crop: CropConfig) => void
  /** 打开个人中心抽屉 */
  onOpenUserCenter?: () => void
  /** 用户收藏的作物名，按收藏时间倒序（最新在前） */
  favoriteCropNames?: string[]
  /** 正在获取收藏列表 */
  favoriteLoading?: boolean
}

export const CropSelector = ({
  crops,
  onSelectCrop,
  onOpenUserCenter,
  favoriteCropNames = [],
  favoriteLoading = false,
}: CropSelectorProps) => {
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())
  const prevPositionsRef = useRef(new Map<string, DOMRect>())
  const prevOrderRef = useRef<string>('')
  const clearTimersRef = useRef(new Map<string, number>())
  const isAnimatingRef = useRef(false)

  // 数据文件中的顺序即品质优先级（索引越小品质越高）
  const cropOrder = useMemo(() => new Map(crops.map((crop, index) => [crop.name, index])), [crops])

  // 排序函数：仅按品质排序（品质越高越靠前，索引越小品质越高）
  const sortByQuality = (a: CropConfig, b: CropConfig) =>
    (cropOrder.get(b.name) ?? 0) - (cropOrder.get(a.name) ?? 0)

  // 月球作物、普通作物分开，各自按品质排序
  const moonCrops = useMemo(
    () => crops.filter(c => c.type === '月球').sort(sortByQuality),
    [crops, cropOrder]
  )
  const normalCrops = useMemo(
    () => crops.filter(c => c.type === '普通').sort(sortByQuality),
    [crops, cropOrder]
  )

  /** 我的收藏：按 favoriteCropNames 顺序（最新在前），只保留在 crops 中存在的 */
  const favoriteCrops = useMemo(() => {
    const nameToCrop = new Map(crops.map(c => [c.name, c]))
    return favoriteCropNames.map(name => nameToCrop.get(name)).filter((c): c is CropConfig => !!c)
  }, [crops, favoriteCropNames])

  const orderKey = useMemo(
    () => [...moonCrops, ...normalCrops].map(c => c.name).join(','),
    [moonCrops, normalCrops]
  )

  // FLIP 动画：仅在排序变化时触发，避免无关抖动
  useLayoutEffect(() => {
    const prevOrder = prevOrderRef.current
    const isOrderChanged = prevOrder !== '' && prevOrder !== orderKey

    // 正在动画中，跳过但更新缓存
    if (isAnimatingRef.current) {
      const newPositions = new Map<string, DOMRect>()
      nodeRefs.current.forEach((node, key) => {
        newPositions.set(key, node.getBoundingClientRect())
      })
      prevPositionsRef.current = newPositions
      prevOrderRef.current = orderKey
      return
    }

    // 首次进入（无历史顺序）或顺序未变：仅更新缓存
    if (!isOrderChanged) {
      const newPositions = new Map<string, DOMRect>()
      nodeRefs.current.forEach((node, key) => {
        newPositions.set(key, node.getBoundingClientRect())
      })
      prevPositionsRef.current = newPositions
      prevOrderRef.current = orderKey
      return
    }

    // 获取新位置
    const newPositions = new Map<string, DOMRect>()
    nodeRefs.current.forEach((node, key) => {
      newPositions.set(key, node.getBoundingClientRect())
    })

    const prevPositions = prevPositionsRef.current
    const elementsToAnimate: Array<{ node: HTMLDivElement; dx: number; dy: number }> = []

    // 收集所有需要动画的元素
    nodeRefs.current.forEach((node, key) => {
      const prev = prevPositions.get(key)
      const next = newPositions.get(key)
      if (!prev || !next) return

      const dx = prev.left - next.left
      const dy = prev.top - next.top

      // 忽略微小移动
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

      elementsToAnimate.push({ node, dx, dy })
    })

    // 如果没有需要动画的元素，直接更新缓存
    if (elementsToAnimate.length === 0) {
      prevPositionsRef.current = newPositions
      prevOrderRef.current = orderKey
      return
    }

    // 设置动画锁定，防止动画过程中再次触发
    isAnimatingRef.current = true

    // 清理之前的定时器
    clearTimersRef.current.forEach(timer => window.clearTimeout(timer))
    clearTimersRef.current.clear()

    // 第一步：设置初始位置（所有元素同时）
    // 使用 requestAnimationFrame 确保在下一帧设置，避免与当前渲染冲突
    requestAnimationFrame(() => {
      elementsToAnimate.forEach(({ node, dx, dy }) => {
        node.style.transition = 'none'
        node.style.transform = `translate(${dx}px, ${dy}px)`
      })

      // 强制回流，确保 transform 生效
      void document.body.offsetHeight

      // 第二步：在下一帧启动动画（所有元素同时）
      requestAnimationFrame(() => {
        elementsToAnimate.forEach(({ node }) => {
          node.style.transition = 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)'
          node.style.transform = ''
        })

        // 动画结束后清理（600ms 动画 + 50ms 缓冲）
        const timer = window.setTimeout(() => {
          elementsToAnimate.forEach(({ node }) => {
            node.style.transition = ''
          })
          isAnimatingRef.current = false
        }, 650)
        clearTimersRef.current.set('all', timer)
      })
    })

    // 更新缓存
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

  const renderCropItem = (crop: CropConfig, refKey?: string) => (
    <div
      key={refKey ?? crop.name}
      className="crop-item"
      ref={setNodeRef(refKey ?? crop.name)}
      onClick={() => onSelectCrop(crop)}
    >
      <div className="crop-item-image-wrapper">
        <img
          src={getCropImagePath(crop.name)}
          alt={crop.name}
          className="crop-item-image"
        />
      </div>
      <div className="crop-item-name">{crop.name}</div>
    </div>
  )

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
        {/* 收藏：常驻，无收藏时居中提示 */}
        <div className="champion-section champion-section-favorite">
          <div className="champion-title-row">
            <span className="champion-title-label">我的收藏</span>
            <GradientButton onClick={onOpenUserCenter}>
              <UserOutlined style={{ marginRight: '4px', color: '#000' }} />
              个人中心
            </GradientButton>
          </div>
          {favoriteLoading ? (
            <div className="crop-selector-empty-favorite crop-selector-favorite-loading">
              正在获取收藏…
            </div>
          ) : favoriteCrops.length > 0 ? (
            <div className="champion-grid">
              {favoriteCrops.map((crop) => renderCropItem(crop, `favorite-${crop.name}`))}
            </div>
          ) : (
            <div className="crop-selector-empty-favorite">
              暂无收藏作物
            </div>
          )}
        </div>
        <div className="champion-section">
          <div className="champion-title-row">
            <span className="champion-title-label">月球作物</span>
          </div>
          <div className="champion-grid">
            {moonCrops.map((crop) => renderCropItem(crop))}
          </div>
        </div>

        <div className="champion-section champion-section-normal">
          <div className="champion-title-row">
            <span className="champion-title-label">普通作物</span>
          </div>
          <div className="champion-grid">
            {normalCrops.map((crop) => renderCropItem(crop))}
          </div>
        </div>
      </div>
    </div>
  )
}

