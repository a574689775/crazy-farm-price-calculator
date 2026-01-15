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
    setCurrentPage('calculator')
  }

  const handleBackToSelector = () => {
    // 清空URL参数
    const url = new URL(window.location.href)
    url.searchParams.delete('s')
    window.history.replaceState({}, '', url.toString())
    setSelectedCrop(null)
    setCurrentPage('selector')
  }

  return (
    <div className="app">
      <main className={`main ${selectedCrop ? 'has-crop' : ''}`}>
        <div className="content-container">
          {currentPage === 'selector' && (
            <CropSelector
              crops={crops}
              selectedCrop={selectedCrop}
              onSelectCrop={handleSelectCrop}
            />
          )}
          {currentPage === 'calculator' && selectedCrop && (
            <PriceCalculator crop={selectedCrop} onBack={handleBackToSelector} />
          )}
          {currentPage === 'feedback' && (
            <FeedbackDataView />
          )}
        </div>
      </main>
      {currentPage === 'selector' && <Footer />}
    </div>
  )
}
