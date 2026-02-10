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
// 注意：本地开发环境（localhost/127.0.0.1/0.0.0.0）不注册，避免缓存干扰调试
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hostname = window.location.hostname
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'

    if (isLocal) return

    const base = (import.meta as any).env?.BASE_URL || '/'
    navigator.serviceWorker
      .register(`${base}sw.js`)
      .catch((err) => {
        console.error('Service worker registration failed:', err)
      })
  })
}
