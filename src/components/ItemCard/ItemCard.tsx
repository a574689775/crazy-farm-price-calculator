import type { FarmItem } from '@/types'
import { calculateItemTotal, formatPrice } from '@/utils/calculations'
import './ItemCard.css'

interface ItemCardProps {
  item: FarmItem
  onQuantityChange: (id: string, delta: number) => void
}

export const ItemCard = ({ item, onQuantityChange }: ItemCardProps) => {
  const handleDecrease = () => {
    onQuantityChange(item.id, -1)
  }

  const handleIncrease = () => {
    onQuantityChange(item.id, 1)
  }

  return (
    <div className="item-card">
      <div className="item-info">
        <h3>{item.name}</h3>
        <p className="price">{formatPrice(item.price)}/个</p>
      </div>
      <div className="quantity-controls">
        <button onClick={handleDecrease} className="btn btn-minus">
          -
        </button>
        <span className="quantity">{item.quantity}</span>
        <button onClick={handleIncrease} className="btn btn-plus">
          +
        </button>
      </div>
      <div className="item-total">
        小计: {formatPrice(calculateItemTotal(item))}
      </div>
    </div>
  )
}

