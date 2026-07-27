/*
=================================================
 SmartPrint by AppDIGI
 Service Worker
 Version 1.0
=================================================
*/

const CACHE_NAME = "smartprint-v1";


const APP_FILES = [

"./",

"./index.html",

"./manifest.json",


"./css/style.css",
"./css/responsive.css",


"./js/app.js",
"./js/printer.js",
"./js/escpos.js",
"./js/tspl.js",
"./js/zpl.js",
"./js/cpcl.js",


"./assets/logo.png"

];




// INSTALL

self.addEventListener(
"install",
event => {

console.log(
"SmartPrint Service Worker Installed"
);


event.waitUntil(

caches.open(CACHE_NAME)

.then(cache => {

return cache.addAll(APP_FILES);

})

);


self.skipWaiting();


});






// ACTIVATE

self.addEventListener(
"activate",
event => {


console.log(
"SmartPrint Service Worker Active"
);



event.waitUntil(

caches.keys()

.then(keys => {


return Promise.all(

keys.map(key => {


if(
key !== CACHE_NAME
){

return caches.delete(key);

}


})

);


})


);



self.clients.claim();


});







// FETCH CACHE FIRST

self.addEventListener(
"fetch",
event => {


event.respondWith(


caches.match(event.request)

.then(response => {


return response || fetch(event.request);


})


);



});
