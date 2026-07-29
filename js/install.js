"use strict";

let deferredPrompt = null;

window.addEventListener("DOMContentLoaded", () => {

    const installBtn = document.getElementById("installBtn");

    if (!installBtn) return;

    installBtn.style.display = "block";

    installBtn.addEventListener("click", async () => {

        if (!deferredPrompt) {

            alert("Aplikasi belum siap untuk di-install.");

            return;

        }

        deferredPrompt.prompt();

        const result = await deferredPrompt.userChoice;

        console.log(result.outcome);

        deferredPrompt = null;

        installBtn.style.display = "none";

    });

});

window.addEventListener("beforeinstallprompt", (e) => {

    console.log("PWA Install Ready");

    e.preventDefault();

    deferredPrompt = e;

});
window.addEventListener("beforeinstallprompt", (e) => {

    console.log("beforeinstallprompt FIRED");

    e.preventDefault();

    deferredPrompt = e;

});
