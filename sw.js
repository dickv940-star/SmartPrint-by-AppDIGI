/*
=================================================
 SmartPrint by AppDIGI
 Service Worker
 Version 7.4
=================================================
*/

"use strict";

const CACHE_NAME = "smartprint-v7.4";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/style.css",
    "./css/responsive.css",
    "./js/app.js",
    "./js/settings.js",
    "./js/preview.js",
    "./js/image.js",
    "./js/pdf.js",
    "./js/barcode.js",
    "./js/barcode-pro.js",
    "./js/grid-layout.js",
    "./js/qrcode.js",
    "./js/label.js",
    "./js/bluetooth.js",
    "./js/printer.js",
    "./js/escpos.js",
    "./js/tspl.js",
    "./js/zpl.js",
    "./js/cpcl.js",
    "./js/install.js",
    "./assets/logo.png",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-512-maskable.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.map(key => key === CACHE_NAME ? null : caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    const isAppCode = url.pathname.endsWith(".js") ||
        url.pathname.endsWith("/index.html") ||
        url.pathname.endsWith("/sw.js");

    /* Application code must be network-first so installed PWA sessions
       do not keep an older printer/Bluetooth implementation. */
    if (isAppCode) {
        event.respondWith(
            fetch(event.request, { cache: "no-store" })
                .then(response => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.ok && response.type === "basic") {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                });
            })
            .catch(() => caches.match("./index.html"))
    );
});
