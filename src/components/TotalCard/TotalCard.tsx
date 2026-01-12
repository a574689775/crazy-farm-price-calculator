import { formatPrice } from '@/utils/calculations'
import './TotalCard.css'

interface TotalCardProps {
  totalPrice: number
}

export const TotalCard = ({ totalPrice }: TotalCardProps) => {
  return (
    <div className="total-card">
      <h2>总价</h2>
      <p className="total-price">{formatPrice(totalPrice)}</p>
    </div>
  )
}

