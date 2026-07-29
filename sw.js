/*
=================================================
 SmartPrint by AppDIGI
 Service Worker
 Version 2.0
=================================================
*/

"use strict";

const CACHE_NAME = "smartprint-v2";

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


// ========================================
// INSTALL
// ========================================

self.addEventListener("install", event => {

    console.log("SmartPrint Service Worker Installed");

    self.skipWaiting();

    event.waitUntil(

        caches.open(CACHE_NAME)

        .then(cache => cache.addAll(APP_FILES))

    );

});


// ========================================
// ACTIVATE
// ========================================

self.addEventListener("activate", event => {

    console.log("SmartPrint Service Worker Active");

    event.waitUntil(

        caches.keys()

        .then(keys =>

            Promise.all(

                keys.map(key => {

                    if (key !== CACHE_NAME) {

                        console.log("Delete Cache :", key);

                        return caches.delete(key);

                    }

                })

            )

        )

    );

    self.clients.claim();

});


// ========================================
// FETCH
// ========================================

self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") return;

    event.respondWith(

        fetch(event.request)

        .then(response => {

            const clone = response.clone();

            caches.open(CACHE_NAME)

            .then(cache => {

                cache.put(event.request, clone);

            });

            return response;

        })

        .catch(() => {

            return caches.match(event.request)

            .then(response => {

                if (response) return response;

                return caches.match("./index.html");

            });

        })

    );

});
