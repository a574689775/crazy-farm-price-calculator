import { useState, useEffect } from 'react'
import type { CropConfig } from '@/types'
import { crops } from '@/data/crops'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { PriceCalculator } from '@/components/PriceCalculator'
import { parseShareUrl } from '@/utils/shareEncoder'
import './App.css'

export const App = () => {
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)

  // 从URL参数恢复配置（仅在首次加载时）
  useEffect(() => {
    const shareData = parseShareUrl()
    if (shareData && shareData.cropIndex < crops.length) {
      const sharedCrop = crops[shareData.cropIndex]
      setSelectedCrop(sharedCrop)
      // 不清除URL参数，让PriceCalculator组件读取后再清除
    }
  }, [])

  return (
    <div className="app">
      <div className="lightEffect">
        <div className="lightLeft"></div>
        <div className="lightRight"></div>
      </div>
      {!selectedCrop && <Header />}
      <main className={`main ${selectedCrop ? 'has-crop' : ''}`}>
        <div className="content-container">
          {!selectedCrop ? (
            <CropSelector
              crops={crops}
              selectedCrop={selectedCrop}
              onSelectCrop={setSelectedCrop}
            />
          ) : (
            <PriceCalculator crop={selectedCrop} onBack={() => {
              // 清空URL参数
              const url = new URL(window.location.href)
              url.searchParams.delete('s')
              window.history.replaceState({}, '', url.toString())
              setSelectedCrop(null)
            }} />
          )}
        </div>
      </main>
      {!selectedCrop && <Footer />}
    </div>
  )
}
