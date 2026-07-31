/*
=========================================================
 SmartPrint by AppDIGI
 PWA Install Manager
 Version 5.0
=========================================================
*/

"use strict";


let deferredPrompt = null;


// =====================================================
// INIT
// =====================================================

console.log(
    "INSTALL: Install Manager Ready"
);


// =====================================================
// BEFORE INSTALL PROMPT
// =====================================================

window.addEventListener(
    "beforeinstallprompt",
    (event) => {

        console.log(
            "INSTALL: beforeinstallprompt tersedia."
        );


        /*
        =================================================
        Jangan tampilkan browser mini-infobar.
        Kita menggunakan tombol Install sendiri.
        =================================================
        */

        event.preventDefault();


        deferredPrompt =
            event;


        const installBtn =
            document.getElementById(
                "installBtn"
            );


        if (!installBtn) {

            console.error(
                "INSTALL: installBtn tidak ditemukan."
            );

            return;

        }


        installBtn.hidden =
            false;


        installBtn.style.display =
            "block";


        console.log(
            "INSTALL: Tombol Install ditampilkan."
        );

    }
);


// =====================================================
// DOM READY
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const installBtn =
            document.getElementById(
                "installBtn"
            );


        if (!installBtn) {

            console.error(
                "INSTALL: installBtn tidak ditemukan."
            );

            return;

        }


        console.log(
            "INSTALL: Tombol siap digunakan."
        );


        // =============================================
        // CLICK
        // =============================================

        installBtn.addEventListener(
            "click",
            async () => {

                console.log(
                    "INSTALL: Tombol diklik."
                );


                /*
                =========================================
                Pastikan prompt tersedia
                =========================================
                */

                if (!deferredPrompt) {

                    console.warn(
                        "INSTALL: Prompt tidak tersedia."
                    );


                    /*
                    -------------------------------------
                    Browser sudah tidak memberikan prompt.
                    -------------------------------------
                    */

                    return;

                }


                /*
                =========================================
                Tampilkan dialog Install
                =========================================
                */

                deferredPrompt.prompt();


                console.log(
                    "INSTALL: Install prompt ditampilkan."
                );


                /*
                =========================================
                Tunggu pilihan user
                =========================================
                */

                const result =
                    await deferredPrompt.userChoice;


                console.log(
                    "INSTALL: User Choice =",
                    result.outcome
                );


                /*
                =========================================
                Prompt hanya bisa digunakan sekali.
                =========================================
                */

                deferredPrompt =
                    null;


                /*
                =========================================
                Sembunyikan tombol
                =========================================
                */

                installBtn.hidden =
                    true;


                installBtn.style.display =
                    "none";

            }
        );

    }
);


// =====================================================
// APP INSTALLED
// =====================================================

window.addEventListener(
    "appinstalled",
    () => {

        console.log(
            "INSTALL: SmartPrint berhasil di-install."
        );


        deferredPrompt =
            null;


        const installBtn =
            document.getElementById(
                "installBtn"
            );


        if (installBtn) {

            installBtn.hidden =
                true;

            installBtn.style.display =
                "none";

        }

    }
);
