const CACHE='memocious-static-v1';
const SAFE=['/offline.html','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SAFE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('memocious-static-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;if(SAFE.includes(url.pathname)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));return;}if(event.request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/shop'||url.pathname.startsWith('/shop/')||url.pathname.startsWith('/product/'))){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));}});
