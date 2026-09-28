/*
=========================================================
 SmartPrint by AppDIGI
 PWA Install Manager + BLE DIRECT USER-GESTURE FIX
 Version 5.3
=========================================================
*/

"use strict";

let deferredPrompt = null;

/* =====================================================
   LABEL BLE DIRECT CONNECTION
   =====================================================
   IMPORTANT:
   navigator.bluetooth.requestDevice() must be reached from
   the real user gesture. The old flow went through the Print
   handler and Web Serial first, which could prevent the BLE
   chooser from appearing in the installed PWA.
*/
/* =====================================================
   NOTE
   BLE connection is handled only by app.js + bluetooth.js.
   install.js must not intercept Connect/Print clicks because
   Web Bluetooth requires a clean user-gesture path.
   ===================================================== */

// =====================================================
// INIT
// =====================================================
console.log("INSTALL: Install Manager Ready v5.2");

// =====================================================
// BEFORE INSTALL PROMPT
// =====================================================
window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    const installBtn = document.getElementById("installBtn");
    if (!installBtn) return;

    installBtn.hidden = false;
    installBtn.style.display = "block";
});

// =====================================================
// INSTALL BUTTON
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const installBtn = document.getElementById("installBtn");
    if (!installBtn) return;

    installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        console.log("INSTALL: User Choice =", result.outcome);

        deferredPrompt = null;
        installBtn.hidden = true;
        installBtn.style.display = "none";
    });
});

window.addEventListener("appinstalled", () => {
    console.log("INSTALL: SmartPrint berhasil di-install.");
    deferredPrompt = null;

    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
        installBtn.hidden = true;
        installBtn.style.display = "none";
    }
});
