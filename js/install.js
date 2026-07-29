/*
=================================================
 SmartPrint by AppDIGI
 PWA Install Engine
 Version 3.0
=================================================
*/

"use strict";

let deferredPrompt = null;

document.addEventListener("DOMContentLoaded", () => {

    const installBtn = document.getElementById("installBtn");

    if (!installBtn) {
        console.warn("Install button tidak ditemukan.");
        return;
    }

    // Sembunyikan tombol saat awal
    installBtn.style.display = "none";

    // Jika sudah dijalankan sebagai aplikasi PWA
    if (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
    ) {

        console.log("SmartPrint sudah berjalan sebagai PWA");

        installBtn.innerHTML = "✅ Installed";
        installBtn.disabled = true;
        installBtn.style.display = "block";

        return;
    }

    installBtn.addEventListener("click", async () => {

        console.log("Install Button Click");

        if (!deferredPrompt) {

            alert(
                "Browser belum mengizinkan instalasi.\n\n" +
                "Pastikan:\n" +
                "- Membuka Chrome biasa (bukan Incognito)\n" +
                "- Service Worker aktif\n" +
                "- Manifest valid\n" +
                "- Mengakses melalui HTTPS"
            );

            return;

        }

        deferredPrompt.prompt();

        const choice = await deferredPrompt.userChoice;

        console.log("Install Result :", choice.outcome);

        if (choice.outcome === "accepted") {

            console.log("User menerima instalasi");

        } else {

            console.log("User membatalkan instalasi");

        }

        deferredPrompt = null;

        installBtn.style.display = "none";

    });

});



// =====================================
// Browser siap meng-install
// =====================================

window.addEventListener("beforeinstallprompt", (event) => {

    console.log("=========== PWA READY ===========");

    event.preventDefault();

    deferredPrompt = event;

    const installBtn = document.getElementById("installBtn");

    if (installBtn) {

        installBtn.style.display = "block";

        installBtn.disabled = false;

    }

});



// =====================================
// Setelah berhasil install
// =====================================

window.addEventListener("appinstalled", () => {

    console.log("=========== APP INSTALLED ===========");

    const installBtn = document.getElementById("installBtn");

    if (installBtn) {

        installBtn.innerHTML = "✅ Installed";

        installBtn.disabled = true;

    }

});



// =====================================
// Debug
// =====================================

window.addEventListener("load", () => {

    console.log("=================================");
    console.log("SmartPrint Install Engine Ready");
    console.log("=================================");

    console.log(
        "Standalone:",
        window.matchMedia("(display-mode: standalone)").matches
    );

    console.log(
        "ServiceWorker:",
        "serviceWorker" in navigator
    );

});
