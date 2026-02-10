import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 注册 Service Worker，启用 PWA 能力（仅在支持的浏览器中生效）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = (import.meta as any).env?.BASE_URL || '/'
    navigator.serviceWorker
      .register(`${base}sw.js`)
      .catch((err) => {
        console.error('Service worker registration failed:', err)
      })
  })
}
