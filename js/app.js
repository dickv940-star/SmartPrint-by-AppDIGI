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

        this.bindPrinterStatusEvents();

        this.bindFile();

        this.bindPreview();

        this.bindSettings();

        this.bindNavigation();

        this.bindDragDrop();

    }


    // ==========================================
    // NAVIGATION
    // ==========================================

    bindNavigation() {

        const activate = (id) => {
            document.querySelectorAll(".sidebar .menu").forEach(btn => {
                btn.classList.toggle("active", btn.id === id);
            });
        };

        const closeEditor = () => {
            if (window.LabelEditor && typeof LabelEditor.close === "function") {
                LabelEditor.close();
            }
        };

        const home = document.getElementById("homeBtn");
        if (home) {
            home.addEventListener("click", () => {
                activate("homeBtn");
                closeEditor();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        const file = document.getElementById("fileBtn");
        if (file) {
            file.addEventListener("click", () => {
                activate("fileBtn");
                closeEditor();
                const input = document.getElementById("fileInput");
                if (input) input.click();
            });
        }

        const label = document.getElementById("labelBtn");
        if (label) {
            label.addEventListener("click", () => {
                activate("labelBtn");
                if (window.LabelEditor && typeof LabelEditor.open === "function") {
                    LabelEditor.open();
                }
            });
        }

        const barcode = document.getElementById("barcodeBtn");
        if (barcode) {
            barcode.addEventListener("click", () => {
                activate("barcodeBtn");
                if (window.LabelEditor && typeof LabelEditor.open === "function") {
                    LabelEditor.open();
                    LabelEditor.addBarcode();
                }
            });
        }

        const qr = document.getElementById("qrBtn");
        if (qr) {
            qr.addEventListener("click", () => {
                activate("qrBtn");
                if (window.LabelEditor && typeof LabelEditor.open === "function") {
                    LabelEditor.open();
                    LabelEditor.addQR();
                }
            });
        }

        const settings = document.getElementById("settingBtn");
        if (settings) {
            settings.addEventListener("click", () => {
                activate("settingBtn");
                closeEditor();
                const panel = document.querySelector(".panel");
                if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }

        const mobile = {
            navHome: "homeBtn",
            navFile: "fileBtn",
            navLabel: "labelBtn",
            navQR: "qrBtn",
            navSetting: "settingBtn"
        };

        Object.keys(mobile).forEach(navId => {
            const nav = document.getElementById(navId);
            const targetId = mobile[navId];
            if (nav) {
                nav.addEventListener("click", () => {
                    const target = document.getElementById(targetId);
                    if (target) target.click();
                });
            }
        });

    }


    // ==========================================
    // PAPER / SIDE PANEL ALIGNMENT
    // ==========================================

    bindPaperAlignment() {

        const container = document.querySelector(".container");
        const canvas = document.getElementById("previewCanvas");

        if (!container) return;

        let frame = 0;

        const clearAlignment = () => {
            container.style.removeProperty("--paper-align-top");
            container.style.removeProperty("--paper-align-height");
            container.classList.remove("paper-aligned");
        };

        const sync = () => {

            cancelAnimationFrame(frame);

            frame = requestAnimationFrame(() => {

                if (window.innerWidth <= 1100) {
                    clearAlignment();
                    return;
                }

                const paper = document.getElementById("previewCanvas");

                if (!paper) {
                    clearAlignment();
                    return;
                }

                const containerRect = container.getBoundingClientRect();
                const paperRect = paper.getBoundingClientRect();
                const styles = getComputedStyle(container);
                const paddingTop = parseFloat(styles.paddingTop) || 0;

                const top =
                    Math.max(
                        0,
                        paperRect.top - containerRect.top - paddingTop
                    );

                const height =
                    Math.max(
                        1,
                        paperRect.height
                    );

                container.style.setProperty(
                    "--paper-align-top",
                    Math.round(top) + "px"
                );

                container.style.setProperty(
                    "--paper-align-height",
                    Math.round(height) + "px"
                );

                container.classList.add("paper-aligned");
            });
        };

        const observe = () => {

            const paper = document.getElementById("previewCanvas");

            if (paper && typeof ResizeObserver !== "undefined") {
                const ro = new ResizeObserver(sync);
                ro.observe(paper);
                ro.observe(container);
                this._paperAlignmentObserver = ro;
            }

            window.addEventListener("resize", sync, { passive: true });
            window.addEventListener("scroll", sync, { passive: true });

            sync();
        };

        observe();

        /* Preview.init() creates/recreates #previewCanvas before this
           method normally runs. If another module recreates it later,
           retry once on the next frame. */
        setTimeout(sync, 100);
        setTimeout(sync, 500);
    }


    // ==========================================
    // PRINTER BUTTONS
    // ==========================================

    bindPrinter() {

        const isLabelPrinter = () => {
            try {
                return String(
                    Settings && typeof Settings.get === "function"
                        ? Settings.get("printerType", "label")
                        : "label"
                ).toLowerCase() === "label";
            } catch (e) {
                return true;
            }
        };

        const connect = document.getElementById("connectBtn");

        if (connect) {
            connect.addEventListener("click", async () => {
                try {
                    if (isLabelPrinter()) {
                        if (typeof Bluetooth === "undefined" ||
                            typeof Bluetooth.connectUser !== "function") {
                            throw new Error("Web Bluetooth Engine tidak tersedia.");
                        }

                        this.showToast("Pilih printer Bluetooth...");
                        const result = await Bluetooth.connectUser();

                        if (!result) {
                            const info = typeof Bluetooth.getInfo === "function"
                                ? Bluetooth.getInfo() : {};
                            throw new Error(info.lastError || "Printer Bluetooth belum terhubung.");
                        }

                        this.showToast("BLE Printer Connected");
                    } else {
                        const result = await Printer.connectSerialAuto({ baudRate: 9600 });
                        if (result) this.showToast("Bluetooth COM Connected");
                        else this.showToast("COM printer tidak dipilih");
                    }
                } catch (e) {
                    console.error("[SmartPrint] Connect error:", e);
                    this.showToast(e && e.message ? e.message : "Gagal menghubungkan printer");
                }
            });
        }

        // Fallback untuk printer thermal Bluetooth Classic (SPP) yang muncul sebagai COM.
        const connectCOM = document.getElementById("connectCOMBtn");

        if (connectCOM) {
            connectCOM.addEventListener("click", async () => {
                try {
                    if (typeof Printer === "undefined" ||
                        typeof Printer.connectSerialAuto !== "function") {
                        throw new Error("Web Serial / Bluetooth COM tidak tersedia.");
                    }

                    if (!("serial" in navigator)) {
                        throw new Error("Web Serial tidak tersedia. Gunakan Google Chrome/Edge di Windows untuk koneksi Bluetooth Classic/COM.");
                    }

                    this.showToast("Pilih COM printer Bluetooth...");
                    const result = await Printer.connectSerialAuto({ baudRate: 9600 });

                    if (!result) {
                        const info = typeof Printer.getStatus === "function" ? Printer.getStatus() : {};
                        throw new Error(info.lastError || "COM printer tidak dipilih atau gagal dibuka.");
                    }

                    this.showToast("Bluetooth Classic / COM Connected");
                } catch (e) {
                    console.error("[SmartPrint] COM fallback error:", e);
                    this.showToast(e && e.message ? e.message : "Gagal menghubungkan COM printer");
                }
            });
        }

        const connectBLE = document.getElementById("connectBLEBtn");

        if (connectBLE) {
            connectBLE.addEventListener("click", async () => {
                try {
                    const result = await Bluetooth.connectUser();
                    if (result) this.showToast("BLE Printer Connected");
                    else this.showToast("Printer Bluetooth belum terhubung");
                } catch (e) {
                    console.error("[SmartPrint] BLE Connect error:", e);
                    this.showToast(e && e.message ? e.message : "Gagal menghubungkan BLE printer");
                }
            });
        }

        const print = document.getElementById("printBtn");

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
            document.getElementById(
                "fileInput"
            );

        const upload =
            document.getElementById("uploadBtn");

        /* Tombol Pilih File harus benar-benar membuka file picker. */
        if (upload && input) {
            upload.addEventListener("click", () => input.click());
        }

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
                "rotateLeftBtn"
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
                "rotateRightBtn"
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
                "resetPreviewBtn"
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

            mode.value = (String(Settings.get("printLanguage") || "ESC").toUpperCase() === "TSPL") ? "tspl" : "escpos";


            mode.addEventListener(
                "change",
                () => {

                    Settings.set(
                        "printLanguage",
                        mode.value === "tspl" ? "TSPL" : "ESC"
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
                        case "100x150":

                            Settings.set(
                                "paperWidth",
                                100
                            );

                            Settings.set(
                                "paperHeight",
                                150
                            );

                            /* TSPL target exact: 799 x 1199 dots @ 203 DPI */
                            Settings.set(
                                "canvasWidth",
                                799
                            );

                            Settings.set(
                                "canvasHeight",
                                1199
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
        // PRINTER CLASS
        // ======================================

        const printerType = document.getElementById("printerType");
        if (printerType) {
            const savedType = Settings.get("printerType", "label");
            printerType.value = savedType;
            printerType.addEventListener("change", () => {
                Settings.set("printerType", printerType.value);
                const modeEl = document.getElementById("printMode");
                const paperEl = document.getElementById("paperSize");
                if (printerType.value === "label") {
                    if (modeEl) modeEl.value = "tspl";
                    if (paperEl) paperEl.value = "100x150";
                    Settings.set({
                        printLanguage: "TSPL",
                        paperWidth: 100,
                        paperHeight: 150,
                        labelWidth: 100,
                        labelHeight: 150,
                        canvasWidth: 799,
                        canvasHeight: 1199
                    });
                }
                this.showToast(printerType.value === "label" ? "Mode TSPL • Label 100×150" : "Printer receipt dipilih");
            });
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

            const hasLabelObjects =
                window.LabelEditor &&
                Array.isArray(LabelEditor.objects) &&
                LabelEditor.objects.length > 0;

            if (!this.file && !hasLabelObjects) {
                alert("Tambahkan objek label atau pilih gambar/PDF terlebih dahulu.");
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

            const isLabelPrinter = (() => {
                try {
                    return String(
                        Settings && typeof Settings.get === "function"
                            ? Settings.get("printerType", "label")
                            : "label"
                    ).toLowerCase() === "label";
                } catch (e) {
                    return true;
                }
            })();

            /*
             * Label printer = BLE only.
             * Receipt/COM printer = Web Serial only.
             * Never let an already-open COM port satisfy a label
             * printer connection check.
             */
            // Label printer mendukung BLE maupun Bluetooth Classic/COM.
            // COM tidak lagi dianggap salah hanya karena printer type = label.
            const connectionReady = isLabelPrinter
                ? (
                    (
                        typeof Bluetooth !== "undefined" &&
                        (
                            (typeof Bluetooth.isBLEConnected === "function" && Bluetooth.isBLEConnected()) ||
                            (typeof Bluetooth.getConnectionType === "function" && Bluetooth.getConnectionType() === "BLE")
                        )
                    ) ||
                    (
                        typeof Printer !== "undefined" &&
                        typeof Printer.isConnected === "function" &&
                        Printer.isConnected()
                    )
                )
                : (
                    typeof Printer.isConnected === "function" &&
                    Printer.isConnected()
                );

            if (!connectionReady) {

                this.showToast(
                    isLabelPrinter
                        ? "Pilih printer Bluetooth..."
                        : "Pilih printer COM..."
                );

                let connected = false;

                if (isLabelPrinter) {
                    if (typeof Bluetooth === "undefined" ||
                        typeof Bluetooth.connectUser !== "function") {
                        throw new Error("Web Bluetooth Engine tidak tersedia.");
                    }

                    connected = await Bluetooth.connectUser();
                } else if (typeof Printer.connectSerialAuto === "function") {
                    connected = await Printer.connectSerialAuto({ baudRate: 9600 });
                } else {
                    connected = await Printer.connect();
                }

                if (!connected) {
                    throw new Error(
                        isLabelPrinter
                            ? "Printer Bluetooth belum terhubung."
                            : "Printer COM belum terhubung."
                    );
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
        name = "",
        type = ""
    ) {

        const status = document.getElementById("printerStatus");
        const typeLabel = document.getElementById("printerStatusType");
        const dot = document.querySelector(".dot");
        const info = document.getElementById("printerInfo");
        const infoTitle = document.getElementById("printerInfoTitle");
        const infoDetail = document.getElementById("printerInfoDetail");
        const connect = document.getElementById("connectBtn");

        const isOnline = !!connected;
        const title = name || (type === "SERIAL" ? "Bluetooth / COM" : "Printer Connected");
        const detail = isOnline
            ? (type === "SERIAL" ? "Bluetooth Classic • Web Serial • COM siap digunakan" : (type || "Printer") + " terhubung")
            : "Printer belum terhubung";

        if (status) status.textContent = isOnline ? title : "Tidak Terhubung";
        if (typeLabel) typeLabel.textContent = detail;
        if (dot) dot.classList.toggle("connected", isOnline);
        if (info) info.classList.toggle("connected", isOnline);
        if (infoTitle) infoTitle.textContent = isOnline ? title : "Tidak terhubung";
        if (infoDetail) infoDetail.textContent = detail;
        if (connect) {
            connect.classList.toggle("connectBtn-connected", isOnline);
            connect.textContent = isOnline ? "✓ Printer Terhubung" : "🔵 Hubungkan Printer";
        }
    }


    syncPrinterStatus() {
        try {
            if (typeof Bluetooth !== "undefined" && typeof Bluetooth.isConnected === "function") {
                const connected = Bluetooth.isConnected();
                const type = typeof Bluetooth.getConnectionType === "function"
                    ? Bluetooth.getConnectionType() : "";
                const name = typeof Bluetooth.getDeviceName === "function"
                    ? Bluetooth.getDeviceName() : "";
                this.updatePrinterStatus(connected, name, type);
                return;
            }
        } catch (e) {
            console.warn("Printer status sync:", e);
        }
        this.updatePrinterStatus(false);
    }


    bindPrinterStatusEvents() {
        const sync = (event) => {
            const d = event && event.detail ? event.detail : {};
            this.updatePrinterStatus(
                d.connected !== false,
                d.name || (d.type === "SERIAL" ? "Bluetooth / COM" : ""),
                d.type || ""
            );
        };
        window.addEventListener("smartprint-bluetooth-connected", sync);
        window.addEventListener("smartprint-bluetooth-status", sync);
        window.addEventListener("smartprint-bluetooth-disconnected", () => this.updatePrinterStatus(false));
        this.syncPrinterStatus();
        setTimeout(() => this.syncPrinterStatus(), 500);
        setTimeout(() => this.syncPrinterStatus(), 1500);
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
                    .register("sw.js?v=6.6.0")

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
