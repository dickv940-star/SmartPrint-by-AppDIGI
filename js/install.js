"use strict";

let deferredPrompt = null;

const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {

    e.preventDefault();

    deferredPrompt = e;

    if (installBtn) {
        installBtn.style.display = "block";
    }

});

if (installBtn) {

    installBtn.addEventListener("click", async () => {

        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const result = await deferredPrompt.userChoice;

        if (result.outcome === "accepted") {

            console.log("SmartPrint berhasil diinstall");

        }

        deferredPrompt = null;

        installBtn.style.display = "none";

    });

}

window.addEventListener("appinstalled", () => {

    console.log("SmartPrint Installed");

    if (installBtn) {
        installBtn.style.display = "none";
    }

});
