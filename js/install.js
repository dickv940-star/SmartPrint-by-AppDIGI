/*
=========================================================
 SmartPrint by AppDIGI
 PWA Install Manager
 Version 5.1
=========================================================
*/

"use strict";

let deferredPrompt = null;

// =====================================================
// LABEL PRINTER CONNECTION FIX
// =====================================================
// Label printer menggunakan Bluetooth BLE. Sebelumnya
// Print/Connect memanggil Web Serial/COM terlebih dahulu.
// Chrome dapat mengembalikan "An unknown system error has
// occurred" ketika COM/Bluetooth SPP gagal dibuka.
// Untuk mode Label Printer, gunakan Web Bluetooth picker.
// Receipt printer tetap menggunakan Web Serial.
// =====================================================
(function installLabelBluetoothFix() {

    function isLabelPrinter() {
        try {
            if (window.Settings && typeof Settings.get === "function") {
                return String(Settings.get("printerType", "label")).toLowerCase() === "label";
            }
        } catch (e) {}
        return true;
    }

    function patchPrinter() {
        if (!window.Printer || typeof Printer.connectSerialAuto !== "function") {
            return false;
        }

        if (Printer.__smartPrintBleFirstPatched) {
            return true;
        }

        const originalConnectSerialAuto = Printer.connectSerialAuto.bind(Printer);

        Printer.connectSerialAuto = async function (options) {
            if (!isLabelPrinter()) {
                return originalConnectSerialAuto(options || {});
            }

            if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== "function") {
                throw new Error(
                    "Web Bluetooth tidak tersedia. Buka SmartPrint menggunakan Google Chrome/Edge dan pastikan Bluetooth aktif."
                );
            }

            console.log("[SmartPrint] Label Printer: memakai Web Bluetooth, bukan COM/Serial.");

            const connected = await Printer.connect();
            return !!connected;
        };

        Printer.__smartPrintBleFirstPatched = true;
        console.log("[SmartPrint] BLE-first label printer connection enabled.");
        return true;
    }

    patchPrinter();
    window.addEventListener("DOMContentLoaded", patchPrinter, { once: true });
})();

// =====================================================
// INIT
// =====================================================
console.log("INSTALL: Install Manager Ready");

// =====================================================
// BEFORE INSTALL PROMPT
// =====================================================
window.addEventListener("beforeinstallprompt", (event) => {
    console.log("INSTALL: beforeinstallprompt tersedia.");
    event.preventDefault();
    deferredPrompt = event;

    const installBtn = document.getElementById("installBtn");
    if (!installBtn) {
        console.error("INSTALL: installBtn tidak ditemukan.");
        return;
    }

    installBtn.hidden = false;
    installBtn.style.display = "block";
    console.log("INSTALL: Tombol Install ditampilkan.");
});

// =====================================================
// DOM READY
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const installBtn = document.getElementById("installBtn");

    if (!installBtn) {
        console.error("INSTALL: installBtn tidak ditemukan.");
        return;
    }

    console.log("INSTALL: Tombol siap digunakan.");

    installBtn.addEventListener("click", async () => {
        console.log("INSTALL: Tombol diklik.");

        if (!deferredPrompt) {
            console.warn("INSTALL: Prompt tidak tersedia.");
            return;
        }

        deferredPrompt.prompt();
        console.log("INSTALL: Install prompt ditampilkan.");

        const result = await deferredPrompt.userChoice;
        console.log("INSTALL: User Choice =", result.outcome);

        deferredPrompt = null;
        installBtn.hidden = true;
        installBtn.style.display = "none";
    });
});

// =====================================================
// APP INSTALLED
// =====================================================
window.addEventListener("appinstalled", () => {
    console.log("INSTALL: SmartPrint berhasil di-install.");
    deferredPrompt = null;

    const installBtn = document.getElementById("installBtn");
    if (installBtn) {
        installBtn.hidden = true;
        installBtn.style.display = "none";
    }
});
