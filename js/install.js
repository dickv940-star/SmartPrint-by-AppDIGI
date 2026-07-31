"use strict";

let deferredPrompt = null;

document.addEventListener("DOMContentLoaded", () => {

    const installBtn = document.getElementById("installBtn");

    if (!installBtn) {
        console.warn("Install button tidak ditemukan.");
        return;
    }

    // Awalnya sembunyikan tombol
    installBtn.hidden = true;

    // =========================================
    // BEFORE INSTALL PROMPT
    // =========================================

    window.addEventListener("beforeinstallprompt", (e) => {

        console.log("PWA Install Prompt tersedia.");

        e.preventDefault();

        deferredPrompt = e;

        installBtn.hidden = false;

    });


    // =========================================
    // INSTALL BUTTON
    // =========================================

    installBtn.addEventListener("click", async () => {

        if (!deferredPrompt) {

            console.warn(
                "Install prompt belum tersedia."
            );

            return;

        }

        try {

            deferredPrompt.prompt();

            const result =
                await deferredPrompt.userChoice;

            console.log(
                "Install result:",
                result.outcome
            );

        }
        catch (error) {

            console.error(
                "Install error:",
                error
            );

        }

        deferredPrompt = null;

        installBtn.hidden = true;

    });


    // =========================================
    // APP SUDAH TERINSTALL
    // =========================================

    window.addEventListener(
        "appinstalled",
        () => {

            console.log(
                "RAWbt berhasil di-install."
            );

            deferredPrompt = null;

            installBtn.hidden = true;

        }
    );

});
