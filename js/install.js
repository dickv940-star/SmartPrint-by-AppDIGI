/*
=========================================================
 SmartPrint by AppDIGI
 PWA Install Manager + BLE DIRECT USER-GESTURE FIX
 Version 5.2
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
(function installDirectBLEFlow() {

    function isLabelPrinter() {
        try {
            if (window.Settings && typeof Settings.get === "function") {
                return String(Settings.get("printerType", "label")).toLowerCase() === "label";
            }
        } catch (e) {}
        return true;
    }

    function hasBLE() {
        return !!(
            navigator.bluetooth &&
            typeof navigator.bluetooth.requestDevice === "function"
        );
    }

    async function connectBLEFromGesture() {
        if (!hasBLE()) {
            throw new Error(
                "Web Bluetooth tidak tersedia. Gunakan Google Chrome/Edge dan aktifkan Bluetooth Windows."
            );
        }

        /* Call directly from the user gesture. */
        if (window.Bluetooth && typeof Bluetooth.connectUser === "function") {
            return !!(await Bluetooth.connectUser());
        }

        if (window.Printer && typeof Printer.connect === "function") {
            return !!(await Printer.connect());
        }

        throw new Error("Bluetooth Engine SmartPrint tidak tersedia.");
    }

    async function handleConnectClick(event) {
        if (!isLabelPrinter()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        try {
            console.log("[SmartPrint BLE] Connect button -> direct BLE picker");
            const result = await connectBLEFromGesture();
            if (window.App && typeof App.showToast === "function") {
                App.showToast(result ? "BLE Printer Connected" : "Printer tidak terhubung");
            }
        } catch (e) {
            console.error("[SmartPrint BLE] Connect error:", e);
            alert(e && e.message ? e.message : "Gagal menghubungkan printer Bluetooth.");
        }
    }

    async function handlePrintClick(event) {
        if (!isLabelPrinter()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        try {
            if (!window.Printer) {
                throw new Error("Printer Manager tidak tersedia.");
            }

            /*
             * Start BLE permission flow immediately from this click.
             * Do not call Web Serial/COM first.
             */
            if (!Printer.isConnected || !Printer.isConnected()) {
                if (window.App && typeof App.showToast === "function") {
                    App.showToast("Pilih printer Bluetooth...");
                }

                const connected = await connectBLEFromGesture();
                if (!connected) {
                    throw new Error("Printer Bluetooth belum terhubung.");
                }
            }

            const canvas =
                window.Preview && typeof Preview.getCanvas === "function"
                    ? Preview.getCanvas()
                    : null;

            if (!canvas) {
                throw new Error("Preview belum siap.");
            }

            await Printer.print(canvas);

            if (window.App && typeof App.showToast === "function") {
                App.showToast("Print berhasil");
            }
        } catch (e) {
            console.error("[SmartPrint BLE] Print error:", e);
            alert(e && e.message ? e.message : "Print gagal.");
        }
    }

    function installHandlers() {
        const connect = document.getElementById("connectBtn");
        const print = document.getElementById("printBtn");

        /* Capture phase runs before the old app.js click handler. */
        if (connect && !connect.__smartprintDirectBLE) {
            connect.addEventListener("click", handleConnectClick, true);
            connect.__smartprintDirectBLE = true;
        }

        if (print && !print.__smartprintDirectBLE) {
            print.addEventListener("click", handlePrintClick, true);
            print.__smartprintDirectBLE = true;
        }

        console.log("[SmartPrint BLE] Direct user-gesture BLE flow ready.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installHandlers, { once: true });
    } else {
        installHandlers();
    }
})();

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
