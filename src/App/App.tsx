import { useState, useEffect } from 'react'
import type { CropConfig } from '@/types'
import { crops } from '@/data/crops'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { PriceCalculator } from '@/components/PriceCalculator'
import { FeedbackDataView } from '@/components/FeedbackDataView'
import { parseShareUrl } from '@/utils/shareEncoder'
import './App.css'

type Page = 'selector' | 'calculator' | 'feedback'

export const App = () => {
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('selector')

  // 从URL参数恢复配置（仅在首次加载时）
  useEffect(() => {
    // 检查是否是反馈数据页面
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('page') === 'feedback') {
      setCurrentPage('feedback')
      return
    }

    const shareData = parseShareUrl()
    if (shareData && shareData.cropIndex < crops.length) {
      const sharedCrop = crops[shareData.cropIndex]
      setSelectedCrop(sharedCrop)
      setCurrentPage('calculator')
      // 不清除URL参数，让PriceCalculator组件读取后再清除
    }
  }, [])

  const handleSelectCrop = (crop: CropConfig) => {
    setSelectedCrop(crop)
    // 使用 setTimeout 确保 DOM 更新后再添加 active 类，让动画生效
    setTimeout(() => {
      setCurrentPage('calculator')
    }, 0)
  }

  const handleBackToSelector = () => {
    // 清空URL参数
    const url = new URL(window.location.href)
    url.searchParams.delete('s')
    window.history.replaceState({}, '', url.toString())
    // 先移除 active 类，让计算器页面滑出
    setCurrentPage('selector')
    // 延迟清空 selectedCrop，确保动画完成后再移除 DOM
    setTimeout(() => {
      setSelectedCrop(null)
    }, 300)
  }

  return (
    <div className="app">
      <main className="main">
        <div className={`content-container ${currentPage === 'calculator' ? 'calculator-active' : ''}`}>
          {/* 选择作物页面 - 始终渲染，通过transform控制位置 */}
          <div className="page-wrapper page-selector">
            <div className="selector-page-container">
              <CropSelector
                crops={crops}
                selectedCrop={selectedCrop}
                onSelectCrop={handleSelectCrop}
              />
              <Footer />
            </div>
          </div>
          
          {/* 计算器页面 - 始终渲染，通过transform控制位置 */}
          <div className={`page-wrapper page-calculator ${currentPage === 'calculator' && selectedCrop ? 'active' : ''}`}>
            {selectedCrop && (
              <PriceCalculator crop={selectedCrop} onBack={handleBackToSelector} />
            )}
          </div>
          
          {/* 反馈数据页面 - 独立处理，不参与滑动 */}
          {currentPage === 'feedback' && (
            <FeedbackDataView />
          )}
        </div>
      </main>
    </div>
  )
}
