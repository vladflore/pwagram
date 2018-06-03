importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const CACHE_STATIC_NAME = 'static-v18';
const CACHE_DYNAMIC_NAME = 'dynamic-v2';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

function trimCache(cacheName, maxItems) {
  caches.open(cacheName)
    .then(function (cache) {
      return cache.keys().then(function (keys) {
        if (keys.length > maxItems) {
          cache.delete(keys[0])
            .then(trimCache(cacheName, maxItems));
        }
      })
    });
}

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing Service Worker ...', event);

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(function (cache) {
        console.log('[Service Worker] Precaching App Shell');
        cache.addAll(STATIC_FILES);
      })
  );

});

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating Service Worker ....', event);

  event.waitUntil(
    caches.keys()
      .then(function (keyList) {
        return Promise.all(keyList.map(function (key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        }))
      })
  );

  return self.clients.claim();
});

// function isInArray(string, array) {
//   for (var i = 0; i < array.length; i++) {
//     if (array[i] === string) {
//       return true;
//     }
//   }
//   return false;
// }

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
    //console.log('matched ', string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

self.addEventListener('fetch', function (event) {
  const url = 'https://udemy-pwagram-29b2e.firebaseio.com/posts';

  //console.log('fetch event', event);

  //cache, then network strategy
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          //store the response in the indexeddb
          var clonedRes = res.clone();
          clearAllData('posts')
            .then(function () {
              return clonedRes.json()
            })
            .then(function (data) {
              for (var key in data) {
                writeData('posts', data[key])
                // .then(function () {
                //   //learning purposes - makes no sense otherwise
                //   deleteItemFromData('posts', key);
                // });
              }
            })
          return res;
        })
    );
    // } else if (new RegExp('\\b' + STATIC_FILES.join('\\b|\\b') + '\\b').test(event.request.url)) {
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    //cache only strategy    
    event.respondWith(caches.match(event.request));
  } else {
    //network fallback
    event.respondWith(
      caches.match(event.request)
        .then(function (response) {
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then(function (res) {
                return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
                  //trimCache(CACHE_DYNAMIC_NAME, 3);
                  cache.put(event.request.url, res.clone())
                  return res;
                })
              })
              .catch(function (error) {
                return caches.open(CACHE_STATIC_NAME)
                  .then(function (cache) {
                    //here more resources can be returned, css, images etc.
                    if (event.request.headers.get('accept').includes('text/html')) {
                      return cache.match('/offline.html');
                    }
                  })
              });
          }
        })
    )
  }
});

// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//    caches.match(event.request)
//     .then(function (response) {
//       if (response) {
//         return response;
//       } else {
//         return fetch(event.request)
//           .then(function (res) {
//             return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
//               cache.put(event.request.url, res.clone())
//               return res;
//             })
//           })
//           .catch(function (error) {
//             return caches.open(CACHE_STATIC_NAME).then(function (cache) {
//               return cache.match('/offline.html');
//             })
//           });
//       }
//     })
//   );
// });

// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function (res) {
//         return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
//           cache.put(event.request.url, res.clone())
//           return res;
//         })
//       })
//       .catch(function (error) {
//         return caches.match(event.request);
//       })
//   );
// });

//cache only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(caches.match(event.request));
// });

//network only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(fetch(event.request));
// });