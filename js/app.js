"use strict";

/*
=====================================================
 SmartPrint by AppDIGI
 Application Controller
=====================================================
*/

class SmartPrint {

    constructor() {

        console.log("==================================");
        console.log("SmartPrint by AppDIGI");
        console.log("Starting Application...");
        console.log("==================================");

        this.file = null;
        this.fileType = null;
        this.toastTimer = null;

        this.init();
    }


    // ==========================================
    // INIT
    // ==========================================

    init() {

        try {

            if (
                typeof Settings !== "undefined"
            ) {

                Settings.load();
                Settings.sync();

            }


            if (
                typeof Preview !== "undefined"
            ) {

                Preview.init();

            }


            this.bindUI();

            this.bindShortcut();

            this.registerServiceWorker();

            console.log(
                "SmartPrint Ready"
            );

        }

        catch (e) {

            console.error(
                "Initialization Error",
                e
            );

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
            document.getElementById(
                "connectBtn"
            );


        if (connect) {

            connect.addEventListener(
                "click",
                async () => {

                    try {

                        const result =
                            await Printer.connect();


                        if (result) {

                            this.showToast(
                                "Printer Connected"
                            );

                        }

                    }

                    catch (e) {

                        console.error(
                            "Printer Connect Error",
                            e
                        );

                        this.showToast(
                            "Printer gagal dihubungkan"
                        );

                    }

                }
            );

        }


        const print =
            document.getElementById(
                "printBtn"
            );


        if (print) {

            print.addEventListener(
                "click",
                async () => {

                    await this.print();

                }
            );

        }

    }


    // ==========================================
    // FILE
    // ==========================================

    bindFile() {

        const input =
            document.getElementById(
                "fileInput"
            );


        if (!input) {

            return;

        }


        input.addEventListener(
            "change",
            async (e) => {

                const file =
                    e.target.files[0];


                if (!file) {

                    return;

                }


                await this.openFile(
                    file
                );

            }
        );

    }


    // ==========================================
    // OPEN FILE
    // ==========================================

    async openFile(file) {

        try {

            this.file =
                file;


            // ======================================
            // IMAGE
            // ======================================

            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                this.fileType =
                    "image";


                if (
                    typeof Preview !==
                    "undefined" &&
                    typeof Preview.loadImage ===
                    "function"
                ) {

                    await Preview.loadImage(
                        file
                    );

                }


                console.log(
                    "Image Loaded"
                );


                this.showToast(
                    "Image berhasil dimuat"
                );


                return;

            }


            // ======================================
            // PDF
            // ======================================

            if (
                file.type ===
                "application/pdf"
            ) {

                this.fileType =
                    "pdf";


                if (
                    typeof PDFEngine ===
                    "undefined"
                ) {

                    throw new Error(
                        "PDF Engine tidak ditemukan."
                    );

                }


                const pdf =
                    await PDFEngine.load(
                        file
                    );


                const page =
                    await pdf.getPage(
                        1
                    );


                const viewport =
                    page.getViewport({
                        scale: 2
                    });


                const canvas =
                    document.createElement(
                        "canvas"
                    );


                const ctx =
                    canvas.getContext(
                        "2d"
                    );


                canvas.width =
                    viewport.width;


                canvas.height =
                    viewport.height;


                await page.render({

                    canvasContext:
                        ctx,

                    viewport:
                        viewport

                }).promise;


                if (
                    typeof Preview !==
                    "undefined" &&
                    typeof Preview.setCanvas ===
                    "function"
                ) {

                    Preview.setCanvas(
                        canvas
                    );

                }


                console.log(
                    "PDF Preview Loaded"
                );


                this.showToast(
                    "PDF berhasil dimuat"
                );


                return;

            }


            // ======================================
            // UNSUPPORTED
            // ======================================

            this.file =
                null;


            this.fileType =
                null;


            alert(
                "Format file tidak didukung."
            );

        }

        catch (error) {

            console.error(
                "Open File Error",
                error
            );


            alert(
                error.message ||
                "Gagal membuka file."
            );

        }

    }


    // ==========================================
    // PREVIEW
    // ==========================================

    bindPreview() {

        const zoomIn =
            document.getElementById(
                "zoomIn"
            );


        if (zoomIn) {

            zoomIn.onclick =
                () => {

                    if (
                        typeof Preview !==
                        "undefined"
                    ) {

                        Preview.zoomIn();

                    }

                };

        }


        const zoomOut =
            document.getElementById(
                "zoomOut"
            );


        if (zoomOut) {

            zoomOut.onclick =
                () => {

                    if (
                        typeof Preview !==
                        "undefined"
                    ) {

                        Preview.zoomOut();

                    }

                };

        }


        const rotateLeft =
            document.getElementById(
                "rotateLeft"
            );


        if (rotateLeft) {

            rotateLeft.onclick =
                () => {

                    if (
                        typeof Preview !==
                        "undefined"
                    ) {

                        Preview.rotateLeft();

                    }

                };

        }


        const rotateRight =
            document.getElementById(
                "rotateRight"
            );


        if (rotateRight) {

            rotateRight.onclick =
                () => {

                    if (
                        typeof Preview !==
                        "undefined"
                    ) {

                        Preview.rotateRight();

                    }

                };

        }


        const reset =
            document.getElementById(
                "resetPreview"
            );


        if (reset) {

            reset.onclick =
                () => {

                    if (
                        typeof Preview !==
                        "undefined"
                    ) {

                        Preview.reset();

                    }

                };

        }

    }


    // ==========================================
    // DRAG & DROP
    // ==========================================

    bindDragDrop() {

        const preview =
            document.getElementById(
                "preview"
            );


        if (!preview) {

            return;

        }


        preview.addEventListener(
            "dragover",
            e => {

                e.preventDefault();

                preview.classList.add(
                    "dragover"
                );

            }
        );


        preview.addEventListener(
            "dragleave",
            () => {

                preview.classList.remove(
                    "dragover"
                );

            }
        );


        preview.addEventListener(
            "drop",
            async e => {

                e.preventDefault();


                preview.classList.remove(
                    "dragover"
                );


                const file =
                    e.dataTransfer.files[0];


                if (!file) {

                    return;

                }


                await this.openFile(
                    file
                );

            }
        );

    }


    // ==========================================
    // SETTINGS
    // ==========================================

    bindSettings() {

        if (
            typeof Settings ===
            "undefined"
        ) {

            return;

        }


        // ======================================
        // PRINT MODE
        // ======================================

        const mode =
            document.getElementById(
                "printMode"
            );


        if (mode) {

            mode.value =
                Settings.get(
                    "printLanguage"
                ) || "ESC";


            mode.addEventListener(
                "change",
                () => {

                    Settings.set(
                        "printLanguage",
                        mode.value
                    );


                    if (
                        typeof Printer !==
                        "undefined" &&
                        typeof Printer.setLanguage ===
                        "function"
                    ) {

                        Printer.setLanguage(
                            mode.value
                        );

                    }

                }
            );

        }


        // ======================================
        // PAPER
        // ======================================

        const paper =
            document.getElementById(
                "paperSize"
            );


        if (paper) {

            paper.addEventListener(
                "change",
                () => {

                    const value =
                        paper.value;


                    switch (value) {

                        case "58":

                            Settings.set(
                                "paperWidth",
                                58
                            );

                            Settings.set(
                                "canvasWidth",
                                384
                            );

                            break;


                        case "80":

                            Settings.set(
                                "paperWidth",
                                80
                            );

                            Settings.set(
                                "canvasWidth",
                                576
                            );

                            break;


                        case "100":

                            Settings.set(
                                "paperWidth",
                                100
                            );

                            Settings.set(
                                "canvasWidth",
                                800
                            );

                            break;


                        default:

                            Settings.set(
                                "paperWidth",
                                80
                            );

                            Settings.set(
                                "canvasWidth",
                                576
                            );

                            break;

                    }


                    if (
                        typeof Preview !==
                        "undefined"
                    ) {

                        if (
                            typeof Preview.updateSize ===
                            "function"
                        ) {

                            Preview.updateSize();

                        }


                        if (
                            typeof Preview.render ===
                            "function"
                        ) {

                            Preview.render();

                        }

                    }

                }
            );

        }


        // ======================================
        // DENSITY
        // ======================================

        const density =
            document.getElementById(
                "density"
            );


        if (density) {

            density.value =
                Settings.get(
                    "density"
                );


            density.addEventListener(
                "input",
                () => {

                    Settings.set(
                        "density",
                        parseInt(
                            density.value,
                            10
                        )
                    );

                }
            );

        }


        // ======================================
        // COPIES
        // ======================================

        const copies =
            document.getElementById(
                "copies"
            );


        if (copies) {

            copies.value =
                Settings.get(
                    "copies"
                );


            copies.addEventListener(
                "change",
                () => {

                    Settings.set(
                        "copies",
                        Math.max(
                            1,
                            parseInt(
                                copies.value,
                                10
                            ) || 1
                        )
                    );

                }
            );

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


            if (
                typeof Preview ===
                "undefined"
            ) {

                throw new Error(
                    "Preview Engine tidak ditemukan."
                );

            }


            const canvas =
                Preview.getCanvas();


            if (!canvas) {

                alert(
                    "Preview belum siap."
                );

                return;

            }


            if (
                typeof Printer ===
                "undefined"
            ) {

                throw new Error(
                    "Printer Manager tidak ditemukan."
                );

            }


            // ======================================
            // CHECK CONNECTION
            // ======================================

            if (
                typeof Printer.isConnected ===
                "function"
            ) {

                if (
                    !Printer.isConnected()
                ) {

                    this.showToast(
                        "Menghubungkan printer..."
                    );


                    const connected =
                        await Printer.connect();


                    if (!connected) {

                        throw new Error(
                            "Printer belum terhubung."
                        );

                    }

                }

            }


            // ======================================
            // PRINT
            // ======================================

            await Printer.print(
                canvas
            );


            console.log(
                "Print Success"
            );


            this.showToast(
                "Print berhasil"
            );

        }

        catch (error) {

            console.error(
                "===================="
            );

            console.error(
                error
            );

            console.error(
                error.name
            );

            console.error(
                error.message
            );

            console.error(
                error.stack
            );

            console.error(
                "===================="
            );


            alert(
                error.message ||
                "Print gagal."
            );

        }

    }


    // ==========================================
    // UPDATE PRINTER STATUS
    // ==========================================

    updatePrinterStatus(
        connected,
        name = ""
    ) {

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
                    ? (
                        name ||
                        "Printer Connected"
                    )
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

        console.log(
            message
        );


        const toast =
            document.getElementById(
                "toast"
            );


        if (!toast) {

            return;

        }


        toast.textContent =
            message;


        toast.classList.add(
            "show"
        );


        clearTimeout(
            this.toastTimer
        );


        this.toastTimer =
            setTimeout(
                () => {

                    toast.classList.remove(
                        "show"
                    );

                },
                3000
            );

    }


    // ==========================================
    // KEYBOARD SHORTCUT
    // ==========================================

    bindShortcut() {

        window.addEventListener(
            "keydown",
            async e => {

                // ==================================
                // CTRL + P
                // ==================================

                if (
                    e.ctrlKey &&
                    e.key.toLowerCase() === "p"
                ) {

                    e.preventDefault();

                    await this.print();

                }


                // ==================================
                // CTRL + O
                // ==================================

                if (
                    e.ctrlKey &&
                    e.key.toLowerCase() === "o"
                ) {

                    e.preventDefault();


                    const input =
                        document.getElementById(
                            "fileInput"
                        );


                    if (input) {

                        input.click();

                    }

                }


                // ==================================
                // ESC
                // ==================================

                if (
                    e.key === "Escape"
                ) {

                    if (
                        typeof Preview !==
                        "undefined" &&
                        typeof Preview.reset ===
                        "function"
                    ) {

                        Preview.reset();

                    }

                }

            }
        );

    }


    // ==========================================
    // SERVICE WORKER
    // ==========================================

    registerServiceWorker() {

        if (
            !(
                "serviceWorker" in
                navigator
            )
        ) {

            return;

        }


        window.addEventListener(
            "load",
            () => {

                navigator.serviceWorker
                    .register("sw.js")

                    .then(
                        reg => {

                            console.log(
                                "Service Worker Registered",
                                reg.scope
                            );

                        }
                    )

                    .catch(
                        err => {

                            console.error(
                                "Service Worker Error",
                                err
                            );

                        }
                    );

            }
        );

    }


    // ==========================================
    // REFRESH UI
    // ==========================================

    refresh() {

        if (
            typeof Preview !==
            "undefined"
        ) {

            if (
                typeof Preview.render ===
                "function"
            ) {

                Preview.render();

            }

        }

    }


    // ==========================================
    // DESTROY
    // ==========================================

    destroy() {

        console.log(
            "Closing SmartPrint"
        );


        this.file =
            null;


        this.fileType =
            null;

    }

}


// =================================================
// START APPLICATION
// =================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        window.App =
            new SmartPrint();

    }
);
