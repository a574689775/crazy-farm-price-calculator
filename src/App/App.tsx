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

    // 检查是否有作物参数（用于浏览器前进/后退）
    const cropName = urlParams.get('crop')
    if (cropName) {
      const crop = crops.find(c => c.name === cropName)
      if (crop) {
        setSelectedCrop(crop)
        setCurrentPage('calculator')
        return
      }
    }

    // 检查是否有分享链接参数
    const shareData = parseShareUrl()
    if (shareData && shareData.cropIndex < crops.length) {
      const sharedCrop = crops[shareData.cropIndex]
      setSelectedCrop(sharedCrop)
      setCurrentPage('calculator')
      // 更新 URL 为作物参数格式，支持浏览器前进/后退
      const url = new URL(window.location.href)
      url.searchParams.set('crop', sharedCrop.name)
      window.history.replaceState({ page: 'calculator', crop: sharedCrop.name }, '', url.toString())
    }
  }, [])

  const handleSelectCrop = (crop: CropConfig) => {
    setSelectedCrop(crop)
    // 更新 URL，添加作物参数，支持浏览器前进/后退
    const url = new URL(window.location.href)
    url.searchParams.set('crop', crop.name)
    window.history.pushState({ page: 'calculator', crop: crop.name }, '', url.toString())
    // 使用 setTimeout 确保 DOM 更新后再添加 active 类，让动画生效
    setTimeout(() => {
      setCurrentPage('calculator')
    }, 0)
  }

  const handleBackToSelector = () => {
    // 先移除 active 类，让计算器页面滑出
    setCurrentPage('selector')
    // 延迟更新 URL 和清空状态，确保动画完成
    setTimeout(() => {
      const url = new URL(window.location.href)
      // 清除所有参数（包括 crop 和 s）
      url.search = ''
      window.history.pushState({ page: 'selector' }, '', url.toString())
      setSelectedCrop(null)
    }, 300)
  }

  // 监听浏览器前进/后退
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const cropName = urlParams.get('crop')
      
      if (cropName) {
        // 从 URL 恢复作物和页面状态（前进到计算器页面）
        const crop = crops.find(c => c.name === cropName)
        if (crop) {
          setSelectedCrop(crop)
          // 延迟添加 active 类，确保动画效果
          setTimeout(() => {
            setCurrentPage('calculator')
          }, 0)
        } else {
          // 如果找不到作物，返回选择页面
          setSelectedCrop(null)
          setCurrentPage('selector')
        }
      } else {
        // 没有作物参数，返回选择页面（后退到选择页面）
        // 先移除 active 类，让计算器页面滑出
        setCurrentPage('selector')
        // 延迟清空 selectedCrop，确保动画完成
        setTimeout(() => {
          setSelectedCrop(null)
        }, 300)
      }
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return (
    <div className="app">
      <main className={`main ${currentPage === 'feedback' ? 'feedback-mode' : ''}`}>
        {currentPage === 'feedback' ? (
          <FeedbackDataView />
        ) : (
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
              <PriceCalculator crop={selectedCrop} onBack={handleBackToSelector} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
