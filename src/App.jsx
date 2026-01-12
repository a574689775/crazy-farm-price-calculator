import { useState } from 'react'
import './App.css'

function App() {
  const [items, setItems] = useState([
    { name: '胡萝卜', price: 10, quantity: 0 },
    { name: '玉米', price: 15, quantity: 0 },
    { name: '番茄', price: 20, quantity: 0 },
    { name: '土豆', price: 12, quantity: 0 },
  ])

  const updateQuantity = (index, delta) => {
    const newItems = [...items]
    newItems[index].quantity = Math.max(0, newItems[index].quantity + delta)
    setItems(newItems)
  }

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="app">
      <header className="header">
        <h1>🌾 疯狂农场价格计算器</h1>
        <p>计算你的农场收益</p>
      </header>

      <main className="main">
        <div className="items-container">
          {items.map((item, index) => (
            <div key={index} className="item-card">
              <div className="item-info">
                <h3>{item.name}</h3>
                <p className="price">¥{item.price}/个</p>
              </div>
              <div className="quantity-controls">
                <button 
                  onClick={() => updateQuantity(index, -1)}
                  className="btn btn-minus"
                >
                  -
                </button>
                <span className="quantity">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(index, 1)}
                  className="btn btn-plus"
                >
                  +
                </button>
              </div>
              <div className="item-total">
                小计: ¥{item.price * item.quantity}
              </div>
            </div>
          ))}
        </div>

        <div className="total-section">
          <div className="total-card">
            <h2>总价</h2>
            <p className="total-price">¥{totalPrice}</p>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Made with ❤️ for GitHub Pages</p>
      </footer>
    </div>
  )
}

export default App

