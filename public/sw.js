const CACHE_NAME = 'crazy-farm-pwa-v1'

// 可以根据需要扩展预缓存的静态资源
const URLS_TO_CACHE = ['/', './', 'index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        // 忽略预缓存失败，避免安装阶段报错
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

  // 仅缓存本域的静态资源（HTML、JS、CSS、图片、字体等），接口请求直接放行
  const isHtmlNavigate = event.request.mode === 'navigate'
  const isStaticAsset =
    isSameOrigin &&
    /\.(js|css|png|jpg|jpeg|webp|svg|ico|gif|woff|woff2|ttf|eot)$/.test(requestUrl.pathname)

  if (!isHtmlNavigate && !isStaticAsset) {
    // 非页面导航、非静态资源（例如 Supabase 接口）不经过缓存，直接走网络
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // 命中缓存优先返回，同时后台尝试更新
        event.waitUntil(
          fetch(event.request)
            .then((response) => {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone)
              })
            })
            .catch(() => {
              // 静默失败即可
            })
        )
        return cached
      }

      // 未命中缓存，走网络并写入缓存
      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          // 网络失败且无缓存时，直接抛错
          return Promise.reject()
        })
    })
  )
})

