/*
=========================================================
SmartPrint by AppDIGI
Main Application Controller
Version 2.0
=========================================================
*/

"use strict";

class SmartPrint {

    constructor() {

        console.log("==================================");
        console.log("SmartPrint by AppDIGI");
        console.log("Starting Application...");
        console.log("==================================");

        this.file = null;
        this.fileType = null;

        this.init();
    }

    // ==========================================
    // INIT
    // ==========================================

    init() {

        try {

            if (typeof Settings !== "undefined") {
                Settings.load();
                Settings.sync();
            }

            if (typeof Preview !== "undefined") {
                Preview.init();
            }

            this.bindUI();

            this.registerServiceWorker();

            console.log("SmartPrint Ready");

        } catch (e) {

            console.error("Initialization Error", e);

        }

    }

    // ==========================================
    // UI
    // ==========================================

    bindUI() {

        this.bindPrinter();

        this.bindFile();

        this.bindPreview();

        this.bindSettings();

        this.bindDragDrop();

    }

    // ==========================================
    // PRINTER BUTTONS
    // ==========================================

    bindPrinter() {

        const connect =
            document.getElementById("connectBtn");

        if (connect) {

            connect.addEventListener("click", async () => {

                try {

                    await Printer.connect();

                }

                catch (e) {

                    console.error(e);

                    alert("Printer gagal dihubungkan");

                }

            });

        }

        const print =
            document.getElementById("printBtn");

        if (print) {

            print.addEventListener("click", async () => {

                await this.print();

            });

        }

    }

    // ==========================================
    // FILE
    // ==========================================

    bindFile() {

        const input =
            document.getElementById("fileInput");

        if (!input) return;

        input.addEventListener(

            "change",

            e => {

                const file =
                    e.target.files[0];

                if (!file) return;

                this.openFile(file);

            }

        );

    }

    async openFile(file) {

        this.file = file;

        if (file.type.startsWith("image")) {

            this.fileType = "image";

            Preview.loadImage(file);

            console.log("Image Loaded");

            return;

        }

       if (file.type === "application/pdf") {

    this.fileType = "pdf";

    const pdf = await PDFEngine.load(file);

    const page = await pdf.getPage(1);

    const viewport = page.getViewport({
        scale: 2
    });

    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;

    Preview.setCanvas(canvas);

    console.log("PDF Preview Loaded");

    return;
}

        alert("Format file tidak didukung");

    }

    // ==========================================
    // PREVIEW
    // ==========================================

    bindPreview() {

        const zoomIn =
            document.getElementById("zoomIn");

        if (zoomIn) {

            zoomIn.onclick = () => {

                Preview.zoomIn();

            };

        }

        const zoomOut =
            document.getElementById("zoomOut");

        if (zoomOut) {

            zoomOut.onclick = () => {

                Preview.zoomOut();

            };

        }

        const rotateLeft =
            document.getElementById("rotateLeft");

        if (rotateLeft) {

            rotateLeft.onclick = () => {

                Preview.rotateLeft();

            };

        }

        const rotateRight =
            document.getElementById("rotateRight");

        if (rotateRight) {

            rotateRight.onclick = () => {

                Preview.rotateRight();

            };

        }

        const reset =
            document.getElementById("resetPreview");

        if (reset) {

            reset.onclick = () => {

                Preview.reset();

            };

        }

    }
     // ==========================================
    // DRAG & DROP
    // ==========================================

    bindDragDrop() {

        const preview =
            document.getElementById("preview");

        if (!preview) return;

        preview.addEventListener("dragover", e => {

            e.preventDefault();

            preview.classList.add("dragover");

        });

        preview.addEventListener("dragleave", () => {

            preview.classList.remove("dragover");

        });

        preview.addEventListener("drop", e => {

            e.preventDefault();

            preview.classList.remove("dragover");

            const file = e.dataTransfer.files[0];

            if (!file) return;

            this.openFile(file);

        });

    }

    // ==========================================
    // SETTINGS
    // ==========================================

    bindSettings() {

        const mode =
            document.getElementById("printMode");

        if (mode) {

            mode.value =
                Settings.get("printLanguage");

            mode.addEventListener("change", () => {

                Settings.set(
                    "printLanguage",
                    mode.value
                );

            });

        }

        const paper =
            document.getElementById("paperSize");

        if (paper) {

            paper.addEventListener("change", () => {

                const value = paper.value;

                switch (value) {

                    case "58":

                        Settings.set("paperWidth",58);
                        Settings.set("canvasWidth",384);
                        break;

                    case "80":

                        Settings.set("paperWidth",80);
                        Settings.set("canvasWidth",576);
                        break;

                    default:

                        Settings.set("paperWidth",100);
                        Settings.set("canvasWidth",800);

                }

                Preview.updateSize();
                Preview.render();

            });

        }

        const density =
            document.getElementById("density");

        if (density) {

            density.value =
                Settings.get("density");

            density.addEventListener("input", () => {

                Settings.set(
                    "density",
                    parseInt(density.value)
                );

            });

        }

        const copies =
            document.getElementById("copies");

        if (copies) {

            copies.value =
                Settings.get("copies");

            copies.addEventListener("change", () => {

                Settings.set(
                    "copies",
                    parseInt(copies.value)
                );

            });

        }

    }

    // ==========================================
    // PRINT
    // ==========================================

    async print() {

        try {

            if (!this.file) {

                alert(
                    "Silakan pilih gambar atau PDF terlebih dahulu."
                );

                return;

            }

            const canvas =
                Preview.getCanvas();

            if (!canvas) {

                alert(
                    "Preview belum siap."
                );

                return;

            }

            await Printer.print(canvas);

            console.log(
                "Print Success"
            );

        }

       catch (error) {

    console.error("====================");
    console.error(error);
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);
    console.error("====================");

    alert(error.message);

}

    // ==========================================
    // UPDATE STATUS
    // ==========================================

    updatePrinterStatus(
        connected,
        name = ""
    ) 

        const status =
            document.getElementById(
                "printerStatus"
            );

        const dot =
            document.querySelector(
                ".dot"
            );

        if (status) {

            status.textContent =
                connected
                ? (name || "Printer Connected")
                : "No Printer";

        }

        if (dot) {

            dot.classList.toggle(
                "connected",
                connected
            );

        }

    }

    // ==========================================
    // TOAST
    // ==========================================

    showToast(message) {

        console.log(message);

        const toast =
            document.getElementById("toast");

        if (!toast) return;

        toast.textContent = message;

        toast.classList.add("show");

        clearTimeout(this.toastTimer);

        this.toastTimer = setTimeout(() => {

            toast.classList.remove("show");

        },3000);

    }
     // ==========================================
    // KEYBOARD SHORTCUT
    // ==========================================

    bindShortcut() {

        window.addEventListener("keydown", async (e) => {

            // Ctrl + P
            if (e.ctrlKey && e.key.toLowerCase() === "p") {

                e.preventDefault();

                await this.print();

            }

            // Ctrl + O
            if (e.ctrlKey && e.key.toLowerCase() === "o") {

                e.preventDefault();

                const input =
                    document.getElementById("fileInput");

                if (input) {

                    input.click();

                }

            }

            // ESC
            if (e.key === "Escape") {

                Preview.reset();

            }

        });

    }

    // ==========================================
    // SERVICE WORKER
    // ==========================================

    registerServiceWorker() {

        if (!("serviceWorker" in navigator))
            return;

        window.addEventListener("load", () => {

            navigator.serviceWorker
                .register("sw.js")

                .then(reg => {

                    console.log(
                        "Service Worker Registered",
                        reg.scope
                    );

                })

                .catch(err => {

                    console.error(
                        "Service Worker Error",
                        err
                    );

                });

        });

    }

    // ==========================================
    // REFRESH UI
    // ==========================================

    refresh() {

        if (typeof Preview !== "undefined") {

            Preview.render();

        }

    }

    // ==========================================
    // DESTROY
    // ==========================================

    destroy() {

        console.log("Closing SmartPrint");

        this.file = null;

        this.fileType = null;

    }

}

/* ==========================================
   START APPLICATION
========================================== */

window.addEventListener("DOMContentLoaded", () => {

    window.App = new SmartPrint();

});
