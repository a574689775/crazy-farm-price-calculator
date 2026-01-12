import { useState } from 'react'
import type { CropConfig } from '@/types'
import { crops } from '@/data/crops'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { CropDetails } from '@/components/CropDetails'
import { PriceCalculator } from '@/components/PriceCalculator'
import './App.css'

export const App = () => {
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)

  return (
    <div className="app">
      <Header />
      <main className="main">
        <div className="content-container">
          <div className="left-panel">
            <CropSelector
              crops={crops}
              selectedCrop={selectedCrop}
              onSelectCrop={setSelectedCrop}
            />
              <CropDetails crop={selectedCrop} />
          </div>
          
          <div className="right-panel">
              <PriceCalculator crop={selectedCrop} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
