import type { CropConfig } from '@/types'
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { ClockCircleOutlined, FireFilled } from '@ant-design/icons'
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

const SHAKE_DURATION_MS = 400

export const CropSelector = ({ crops, onSelectCrop, onShowHistory, queryCounts = {} }: CropSelectorProps) => {
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())
  const prevPositionsRef = useRef(new Map<string, DOMRect>())
  const prevOrderRef = useRef<string>('')
  const clearTimersRef = useRef(new Map<string, number>())
  const isAnimatingRef = useRef(false)
  const prevQueryCountsRef = useRef<Record<string, number>>({})
  const [shakeCrops, setShakeCrops] = useState<Set<string>>(new Set())
  const shakeTimersRef = useRef(new Map<string, number>())

  // 根据视口宽度计算每行列数（与 CSS 断点一致：<480 为 4，480–640 为 5，>640 为 6）
  const [columns, setColumns] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 375
    if (w < 480) return 4
    if (w <= 640) return 5
    return 6
  })
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      setColumns(w < 480 ? 4 : w <= 640 ? 5 : 6)
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 数据文件中的顺序即品质优先级（索引越小品质越高）
  const cropOrder = useMemo(() => new Map(crops.map((crop, index) => [crop.name, index])), [crops])

  // 计算最大查询量，用于颜色计算
  const maxQueryCount = useMemo(() => {
    const counts = Object.values(queryCounts)
    return counts.length > 0 ? Math.max(...counts) : 1
  }, [queryCounts])

  // 根据查询量计算颜色（热度越高越红）
  const getHeatColor = (count: number): string => {
    if (count === 0 || maxQueryCount === 0) {
      // 没有查询量时使用默认颜色
      return '#fff'
    }
    // 计算热度比例（0-1）
    const heatRatio = Math.min(count / maxQueryCount, 1)
    // 从浅橙红色 (#FFA07A, rgb(255, 160, 122)) 到深红色 (#FF4500, rgb(255, 69, 0))
    const r = 255 // 红色通道保持255
    const g = Math.floor(160 - (160 - 69) * heatRatio)  // 从 160 到 69
    const b = Math.floor(122 - (122 - 0) * heatRatio)   // 从 122 到 0
    return `rgb(${r}, ${g}, ${b})`
  }

  // 排序函数：按查询量排序，查询量相同则按品质排序
  const sortByCountThenQuality = (a: CropConfig, b: CropConfig) => {
    const countDiff = (queryCounts[b.name] ?? 0) - (queryCounts[a.name] ?? 0)
    if (countDiff !== 0) return countDiff
    // 品质高（原数据顺序靠前）排前
    return (cropOrder.get(b.name) ?? 0) - (cropOrder.get(a.name) ?? 0)
  }

  // 获取热门作物（查询量最多的前 N 个，N = 当前每行列数，占满第一行）
  const hotCrops = useMemo(() => {
    const sorted = [...crops].sort(sortByCountThenQuality)
    return sorted.slice(0, columns)
  }, [crops, queryCounts, cropOrder, columns])

  // 获取其他作物（排除热门作物的剩余作物，按热度排序）
  const otherCrops = useMemo(() => {
    const hotCropNames = new Set(hotCrops.map(c => c.name))
    return crops
      .filter(crop => !hotCropNames.has(crop.name))
      .sort(sortByCountThenQuality)
  }, [crops, hotCrops, queryCounts, cropOrder])

  // 谁的热度变了，那个热度标签抖一抖
  useEffect(() => {
    const prev = prevQueryCountsRef.current
    const toShake: string[] = []
    crops.forEach(crop => {
      const name = crop.name
      const curr = queryCounts[name] ?? 0
      const prevCount = prev[name] ?? 0
      if (curr !== prevCount && curr > 0) toShake.push(name)
    })
    if (toShake.length === 0) {
      prevQueryCountsRef.current = { ...queryCounts }
      return
    }
    setShakeCrops(s => new Set([...s, ...toShake]))
    toShake.forEach(name => {
      const captured = queryCounts[name] ?? 0
      const existing = shakeTimersRef.current.get(name)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        shakeTimersRef.current.delete(name)
        setShakeCrops(s => {
          const next = new Set(s)
          next.delete(name)
          return next
        })
        prevQueryCountsRef.current = { ...prevQueryCountsRef.current, [name]: captured }
      }, SHAKE_DURATION_MS)
      shakeTimersRef.current.set(name, timer)
    })
  }, [queryCounts, crops])

  useEffect(() => () => {
    shakeTimersRef.current.forEach(t => window.clearTimeout(t))
    shakeTimersRef.current.clear()
  }, [])

  const orderKey = useMemo(
    () => [...hotCrops, ...otherCrops].map(c => c.name).join(','),
    [hotCrops, otherCrops]
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

  const renderCropItem = (crop: CropConfig) => {
    const rawCount = queryCounts[crop.name] ?? 0
    const count =
      rawCount >= 10000 ? `${(rawCount / 10000).toFixed(1)}万` : rawCount
    const heatColor = getHeatColor(rawCount)
    
    return (
      <div
        key={crop.name}
        className="crop-item"
        ref={setNodeRef(crop.name)}
        onClick={() => onSelectCrop(crop)}
      >
        <div className="crop-item-image-wrapper">
          {rawCount > 0 && (
            <div 
              className={`crop-item-count${shakeCrops.has(crop.name) ? ' heat-shake' : ''}`}
              style={{ 
                borderColor: heatColor,
                color: heatColor
              }}
            >
              <FireFilled 
                className="crop-item-count-icon" 
                style={{ color: heatColor }}
              />
              <span className="crop-item-count-text">{count}</span>
            </div>
          )}
          <img 
            src={`https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/${crop.name}.png`}
            alt={crop.name}
            className="crop-item-image"
          />
        </div>
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
        {/* 热门作物 */}
        <div className="champion-section">
          <div className="champion-title-row">
            <div className="champion-title">热门作物：</div>
            <GradientButton onClick={onShowHistory}>
              <ClockCircleOutlined style={{ marginRight: '4px', color: '#000' }} />
              计算历史
            </GradientButton>
          </div>
          <div className="champion-grid">
            {hotCrops.map(renderCropItem)}
          </div>
          <div className="champion-divider"></div>
        </div>

        {/* 其他作物 */}
        <div className="crop-grid">
          {otherCrops.map(renderCropItem)}
        </div>
      </div>
    </div>
  )
}

