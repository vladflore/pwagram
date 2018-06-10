importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const CACHE_STATIC_NAME = 'static-v19';
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

self.addEventListener('sync', function (event) {
  console.log('[Service Worker] Syncing - Background syncing', event);
  if (event.tag === 'sync-new-posts') {
    console.log('[Service Worker] Syncing - Syncing new posts', event);
    event.waitUntil(
      readAllData('sync-posts')
        .then(function (data) {
          for (var dt of data) {
            console.log(dt.id);
            fetch('https://us-central1-udemy-pwagram-29b2e.cloudfunctions.net/storePostData', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                id: dt.id,
                title: dt.title,
                location: dt.location,
                image: 'https://firebasestorage.googleapis.com/v0/b/udemy-pwagram-29b2e.appspot.com/o/sf-boat.jpg?alt=media&token=171ce05a-be26-4d90-918c-f62b695a48c7'
              })
            }).then(function (res) {
              console.log('[Service Worker] Syncing - Sent data', res);
              if (res.ok) {
                res.json().then(function (resData) {
                  deleteItemFromData('sync-posts', resData.id);
                })
              }
            }).catch(function (error) {
              console.log('[Service Worker] Syncing - Error while sending data', error);
            });
          }
        })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  var notification = event.notification;
  var action = event.action;

  console.log(notification);

  if (action === 'confirm') {
    console.log('Confirm was chosen');
    notification.close();
  } else {
    console.log(action);
    notification.close();
  }
})

