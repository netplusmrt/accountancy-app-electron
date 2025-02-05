// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// -----------------------
// Release = 1.1.0
// -----------------------

const VERSION = 'v.25.1.11.1';
var appName = 'accountancy-app';
var filesToCache = [
  "/",
  "/companies"
];

function cacheAssets() {
  return caches.open(getCacheName()).then(function(cache) {
		console.log('[ServiceWorker] Caching app shell');
		fetch('/ngsw.json')
		.then(function(response) {
      console.log(response);
      return response.json();
    }).then(function(urls) {
			console.log(urls);
			let files = filesToCache.concat(urls.assetGroups[0].urls);
      cache.addAll(files);
    });
	});
}

self.addEventListener('install', function(e) {
  console.log('[ServiceWorker] Install');

  self.skipWaiting();

  e.waitUntil(
		cacheAssets()
  );
});

self.addEventListener('activate', function(e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== getCacheName()) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  /*
   * Fixes a corner case in which the app wasn't returning the latest data.
   * You can reproduce the corner case by commenting out the line below and
   * then doing the following steps: 1) load app for first time so that the
   * initial New York City data is shown 2) press the refresh button on the
   * app 3) go offline 4) reload the app. You expect to see the newer NYC
   * data, but you actually see the initial data. This happens because the
   * service worker is not yet activated. The code below essentially lets
   * you activate the service worker faster.
   */
  return self.clients.claim();
});

// self.addEventListener('fetch', function(e) {
  // console.log('[ServiceWorker] Fetch', e.request.url);
  // e.respondWith(
    // caches.match(e.request).then(function(response) {
      // return response || fetch(e.request);
    // })
  // );
// });


self.addEventListener('fetch', event => event.respondWith(cacheThenNetwork(event)));

async function cacheThenNetwork(event) {

    const cache = await caches.open(getCacheName());

    const cachedResponse = await cache.match(event.request);

    if (cachedResponse) {
        log('Serving From Cache: ' + event.request.url);
        return cachedResponse;
    }

    const networkResponse = await fetch(event.request);

    log('Calling network: ' + event.request.url);

    return networkResponse;


}

function getCacheName() {
    return appName + '-' + VERSION;
}


function log(message, ...data) {
    if (data.length > 0) {
        console.log(VERSION, message, data);
    }
    else {
        console.log(VERSION, message);
    }
}
