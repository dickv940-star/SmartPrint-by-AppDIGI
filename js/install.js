window.addEventListener("beforeinstallprompt", (e) => {
    console.log("✅ beforeinstallprompt FIRED");
    e.preventDefault();
    deferredPrompt = e;
});

window.addEventListener("appinstalled", () => {
    console.log("✅ APP INSTALLED");
});

"use strict";

let deferredPrompt = null;

const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {

    console.log("PWA Install Available");

    e.preventDefault();

    deferredPrompt = e;

    installBtn.hidden = false;

});

installBtn.addEventListener("click", async () => {

    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    console.log("Install:", outcome);

    deferredPrompt = null;

    installBtn.hidden = true;

});

window.addEventListener("appinstalled", () => {

    console.log("SmartPrint Installed");

    installBtn.hidden = true;

});
