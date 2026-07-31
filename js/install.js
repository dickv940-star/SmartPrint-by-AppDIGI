/*
=========================================================
SmartPrint by AppDIGI
PWA Install Manager v2.0
=========================================================
*/

"use strict";

let deferredPrompt = null;

document.addEventListener("DOMContentLoaded", () => {

    const installBtn =
        document.getElementById("installBtn");

    if (!installBtn) {

        console.error(
            "INSTALL: tombol #installBtn tidak ditemukan."
        );

        return;
    }

    console.log(
        "INSTALL: Install Manager Ready"
    );


    // =========================================
    // DEFAULT
    // =========================================

    installBtn.hidden = true;


    // =========================================
    // BEFORE INSTALL PROMPT
    // =========================================

    window.addEventListener(
        "beforeinstallprompt",
        (event) => {

            console.log(
                "INSTALL: beforeinstallprompt tersedia."
            );

            event.preventDefault();

            deferredPrompt = event;

            installBtn.hidden = false;

            console.log(
                "INSTALL: Tombol Install ditampilkan."
            );

        }
    );


    // =========================================
    // INSTALL BUTTON
    // =========================================

    installBtn.addEventListener(
        "click",
        async () => {

            console.log(
                "INSTALL: Tombol ditekan."
            );


            if (!deferredPrompt) {

                console.warn(
                    "INSTALL: Install prompt belum tersedia."
                );

                return;
            }


            deferredPrompt.prompt();


            const result =
                await deferredPrompt.userChoice;


            console.log(
                "INSTALL RESULT:",
                result.outcome
            );


            deferredPrompt = null;

            installBtn.hidden = true;

        }
    );


    // =========================================
    // APP INSTALLED
    // =========================================

    window.addEventListener(
        "appinstalled",
        () => {

            console.log(
                "INSTALL: Aplikasi berhasil di-install."
            );

            deferredPrompt = null;

            installBtn.hidden = true;

        }
    );

});
