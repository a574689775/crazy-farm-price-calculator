const CACHE_NAME = 'crazy-farm-pwa-v2'

// 预缓存：仅用于离线回退
const URLS_TO_CACHE = ['/', './', 'index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        return Promise.resolve()
      })
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  const isSameOrigin = requestUrl.origin === self.location.origin

  const isHtmlNavigate = event.request.mode === 'navigate'
  const isStaticAsset =
    isSameOrigin &&
    /\.(js|css|png|jpg|jpeg|webp|svg|ico|gif|woff|woff2|ttf|eot)$/.test(requestUrl.pathname)

  if (!isHtmlNavigate && !isStaticAsset) {
    // 非页面导航、非静态资源（例如 Supabase 接口）不经过缓存，直接放行
    return
  }

  // HTML / 页面导航：network-first，有网时拿最新，离线才用缓存
  if (isHtmlNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached
            return new Response('网络不可用，请稍后重试', {
              status: 503,
              statusText: 'Service Unavailable',
            })
          })
        )
    )
    return
  }

  // 静态资源（带 hash 的 js/css 等）：cache-first，URL 变则内容变
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        event.waitUntil(
          fetch(event.request)
            .then((response) => {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            })
            .catch(() => {})
        )
        return cached
      }
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => Promise.reject())
    })
  )
})
