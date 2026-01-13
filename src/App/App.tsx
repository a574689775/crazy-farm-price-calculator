import { useState } from 'react'
import type { CropConfig } from '@/types'
import { crops } from '@/data/crops'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { PriceCalculator } from '@/components/PriceCalculator'
import './App.css'

export const App = () => {
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)

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
            <PriceCalculator crop={selectedCrop} onBack={() => setSelectedCrop(null)} />
          )}
        </div>
      </main>
      {!selectedCrop && <Footer />}
    </div>
  )
}
