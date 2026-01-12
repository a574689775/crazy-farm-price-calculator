import { useCalculator } from '@/hooks/useCalculator'
import { calculateTotalPrice } from '@/utils/calculations'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ItemCard } from '@/components/ItemCard'
import { TotalCard } from '@/components/TotalCard'
import { initialItems } from './constants'
import './App.css'

export const App = () => {
  const { items, updateQuantity } = useCalculator(initialItems)
  const totalPrice = calculateTotalPrice(items)

  return (
    <div className="app">
      <Header />
      <main className="main">
        <div className="items-container">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onQuantityChange={updateQuantity}
            />
          ))}
        </div>

        <div className="total-section">
          <TotalCard totalPrice={totalPrice} />
        </div>
      </main>
      <Footer />
    </div>
  )
}

