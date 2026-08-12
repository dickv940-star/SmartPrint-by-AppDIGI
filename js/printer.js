"use strict";

/*
=====================================================
 SmartPrint Printer Manager v4.0
=====================================================

FUNGSI
-----------------------------------------------------
✓ Bluetooth Printer
✓ USB Printer (future)
✓ System Printer (future)
✓ Auto Connect
✓ Manual Connect
✓ Disconnect
✓ Connection Status
✓ Print Routing
✓ ESC / TSPL / ZPL / CPCL
✓ Copies
✓ DPI
✓ Paper Width / Height
✓ Density
✓ Speed
✓ Save Printer Settings

ARSITEKTUR

                 Printer
                Manager
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
   Bluetooth      USB       System
        │          │          │
        ↓          ↓          ↓
   Bluetooth     USB       Windows
    Engine      Engine      Printer

Bluetooth saat ini ACTIVE.
USB dan System Printer disiapkan
untuk tahap berikutnya.
=====================================================
*/


(function () {

    "use strict";


    const PrinterManager = {


        // =================================================
        // DEFAULT SETTINGS
        // =================================================

        printerType: "bluetooth",

        printerName: "",

        language: "TSPL",

        paperWidth: 576,

        paperHeight: 1200,

        dpi: 203,

        copies: 1,

        density: 8,

        speed: 4,

        autoConnect: true,

        cutPaper: false,

        openDrawer: false,


        // =================================================
        // STATE
        // =================================================

        connected: false,

        connecting: false,

        printing: false,

        initialized: false,


        // =================================================
        // INIT
        // =================================================

        async init() {

            if (this.initialized) {

                return;

            }


            console.log(
                "========================================"
            );

            console.log(
                "SmartPrint Printer Manager v4.0"
            );

            console.log(
                "========================================"
            );


            // =============================================
            // LOAD SETTINGS
            // =============================================

            this.loadSettings();


            this.initialized =
                true;


            this.connected =
                false;


            this.updateStatus(
                "disconnected"
            );


            // =============================================
            // AUTO CONNECT
            // =============================================

            if (
                this.autoConnect &&
                this.printerType === "bluetooth"
            ) {

                /*
                Tunggu Bluetooth Engine siap.
                */

                await this.waitForBluetooth();


                try {

                    const result =
                        await this.autoConnect();


                    if (result) {

                        console.log(
                            "Printer Auto Connected"
                        );

                    }

                }

                catch (error) {

                    console.warn(
                        "Auto Connect gagal:",
                        error
                    );

                }

            }


            console.log(
                "Printer Manager initialized."
            );

        },


        // =================================================
        // WAIT BLUETOOTH
        // =================================================

        async waitForBluetooth(
            timeout = 5000
        ) {

            const start =
                Date.now();


            while (
                typeof Bluetooth ===
                "undefined"
            ) {

                if (
                    Date.now() - start >
                    timeout
                ) {

                    console.warn(
                        "Bluetooth Engine tidak ditemukan."
                    );

                    return false;

                }


                await this.sleep(
                    100
                );

            }


            return true;

        },


        // =================================================
        // CONNECT
        // =================================================

        async connect() {

            if (this.connecting) {

                console.warn(
                    "Printer sedang connecting."
                );

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                // =========================================
                // BLUETOOTH
                // =========================================

                if (
                    this.printerType ===
                    "bluetooth"
                ) {

                    await this.waitForBluetooth();


                    if (
                        typeof Bluetooth ===
                        "undefined"
                    ) {

                        throw new Error(
                            "Bluetooth Engine tidak ditemukan."
                        );

                    }


                    const result =
                        await Bluetooth.connect();


                    if (!result) {

                        throw new Error(
                            "Bluetooth connection gagal."
                        );

                    }


                    this.connected =
                        Bluetooth.isConnected();


                    if (
                        Bluetooth.getDeviceName
                    ) {

                        this.printerName =
                            Bluetooth.getDeviceName();

                    }

                }


                // =========================================
                // USB
                // =========================================

                else if (
                    this.printerType ===
                    "usb"
                ) {

                    if (
                        typeof USBPrinter ===
                        "undefined"
                    ) {

                        throw new Error(
                            "USB Printer Engine belum tersedia."
                        );

                    }


                    if (
                        typeof USBPrinter.connect !==
                        "function"
                    ) {

                        throw new Error(
                            "USBPrinter.connect() belum tersedia."
                        );

                    }


                    this.connected =
                        await USBPrinter.connect();

                }


                // =========================================
                // SYSTEM PRINTER
                // =========================================

                else if (
                    this.printerType ===
                    "system"
                ) {

                    if (
                        typeof SystemPrinter ===
                        "undefined"
                    ) {

                        throw new Error(
                            "System Printer Engine belum tersedia."
                        );

                    }


                    if (
                        typeof SystemPrinter.connect !==
                        "function"
                    ) {

                        throw new Error(
                            "SystemPrinter.connect() belum tersedia."
                        );

                    }


                    this.connected =
                        await SystemPrinter.connect();

                }


                else {

                    throw new Error(
                        "Printer type tidak didukung: " +
                        this.printerType
                    );

                }


                if (!this.connected) {

                    throw new Error(
                        "Printer tidak berhasil terhubung."
                    );

                }


                this.updateStatus(
                    "connected"
                );


                this.saveSettings();


                console.log(
                    "Printer Connected:",
                    this.printerName
                );


                return true;

            }

            catch (error) {

                console.error(
                    "Printer Connect Error:",
                    error
                );


                this.connected =
                    false;


                this.updateStatus(
                    "error"
                );


                return false;

            }

            finally {

                this.connecting =
                    false;

            }

        },


        // =================================================
        // AUTO CONNECT
        // =================================================

        async autoConnect() {

            if (
                this.printerType !==
                "bluetooth"
            ) {

                return false;

            }


            await this.waitForBluetooth();


            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                return false;

            }


            try {

                console.log(
                    "Printer Auto Connect..."
                );


                const result =
                    await Bluetooth.autoConnect();


                this.connected =
                    !!result;


                if (
                    this.connected &&
                    Bluetooth.getDeviceName
                ) {

                    this.printerName =
                        Bluetooth.getDeviceName();

                }


                this.updateStatus(
                    this.connected
                        ? "connected"
                        : "disconnected"
                );


                if (this.connected) {

                    this.saveSettings();

                }


                return this.connected;

            }

            catch (error) {

                console.warn(
                    "Printer Auto Connect Error:",
                    error
                );


                this.connected =
                    false;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            // =============================================
            // BLUETOOTH
            // =============================================

            if (
                this.printerType ===
                "bluetooth"
            ) {

                if (
                    typeof Bluetooth ===
                    "undefined"
                ) {

                    return false;

                }


                this.connected =
                    Bluetooth.isConnected();


                return this.connected;

            }


            // =============================================
            // USB
            // =============================================

            if (
                this.printerType ===
                "usb"
            ) {

                if (
                    typeof USBPrinter !==
                    "undefined" &&
                    typeof USBPrinter.isConnected ===
                    "function"
                ) {

                    return USBPrinter.isConnected();

                }


                return false;

            }


            // =============================================
            // SYSTEM
            // =============================================

            if (
                this.printerType ===
                "system"
            ) {

                if (
                    typeof SystemPrinter !==
                    "undefined" &&
                    typeof SystemPrinter.isConnected ===
                    "function"
                ) {

                    return SystemPrinter.isConnected();

                }


                return false;

            }


            return false;

        },


        // =================================================
        // DISCONNECT
        // =================================================

        disconnect() {

            console.log(
                "Printer Disconnect"
            );


            try {

                if (
                    this.printerType ===
                    "bluetooth"
                ) {

                    if (
                        typeof Bluetooth !==
                        "undefined"
                    ) {

                        Bluetooth.disconnect();

                    }

                }


                else if (
                    this.printerType ===
                    "usb"
                ) {

                    if (
                        typeof USBPrinter !==
                        "undefined" &&
                        typeof USBPrinter.disconnect ===
                        "function"
                    ) {

                        USBPrinter.disconnect();

                    }

                }


                else if (
                    this.printerType ===
                    "system"
                ) {

                    if (
                        typeof SystemPrinter !==
                        "undefined" &&
                        typeof SystemPrinter.disconnect ===
                        "function"
                    ) {

                        SystemPrinter.disconnect();

                    }

                }

            }

            catch (error) {

                console.error(
                    "Printer Disconnect Error:",
                    error
                );

            }


            this.connected =
                false;


            this.updateStatus(
                "disconnected"
            );

        },


        // =================================================
        // PRINT
        // =================================================

        async print(canvas) {

            if (this.printing) {

                throw new Error(
                    "Printer sedang mencetak."
                );

            }


            if (!canvas) {

                throw new Error(
                    "Canvas tidak tersedia."
                );

            }


            if (
                !this.isConnected()
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            this.printing =
                true;


            this.updateStatus(
                "printing"
            );


            try {

                let result;


                // =========================================
                // ESC / ESC POS
                // =========================================

                if (
                    this.language ===
                    "ESC"
                ) {

                    if (
                        typeof ESCpos ===
                        "undefined"
                    ) {

                        throw new Error(
                            "ESCpos Engine tidak ditemukan."
                        );

                    }


                    result =
                        await ESCpos.print(
                            canvas,
                            this
                        );

                }


                // =========================================
                // TSPL
                // =========================================

                else if (
                    this.language ===
                    "TSPL"
                ) {

                    if (
                        typeof TSPL ===
                        "undefined"
                    ) {

                        throw new Error(
                            "TSPL Engine tidak ditemukan."
                        );

                    }


                    result =
                        await TSPL.print(
                            canvas,
                            this
                        );

                }


                // =========================================
                // ZPL
                // =========================================

                else if (
                    this.language ===
                    "ZPL"
                ) {

                    if (
                        typeof ZPL ===
                        "undefined"
                    ) {

                        throw new Error(
                            "ZPL Engine tidak ditemukan."
                        );

                    }


                    result =
                        await ZPL.print(
                            canvas,
                            this
                        );

                }


                // =========================================
                // CPCL
                // =========================================

                else if (
                    this.language ===
                    "CPCL"
                ) {

                    if (
                        typeof CPCL ===
                        "undefined"
                    ) {

                        throw new Error(
                            "CPCL Engine tidak ditemukan."
                        );

                    }


                    result =
                        await CPCL.print(
                            canvas,
                            this
                        );

                }


                else {

                    throw new Error(
                        "Printer language tidak didukung: " +
                        this.language
                    );

                }


                this.updateStatus(
                    "connected"
                );


                return result;

            }

            catch (error) {

                console.error(
                    "Print Error:",
                    error
                );


                this.updateStatus(
                    "connected"
                );


                throw error;

            }

            finally {

                this.printing =
                    false;

            }

        },


        // =================================================
        // SET PRINTER TYPE
        // =================================================

        setPrinterType(type) {

            const allowedTypes = [

                "bluetooth",

                "usb",

                "system"

            ];


            if (
                !allowedTypes.includes(
                    type
                )
            ) {

                console.warn(
                    "Printer type tidak valid:",
                    type
                );

                return false;

            }


            if (
                this.connected
            ) {

                this.disconnect();

            }


            this.printerType =
                type;


            this.saveSettings();


            console.log(
                "Printer Type:",
                type
            );


            return true;

        },


        // =================================================
        // SET PRINTER NAME
        // =================================================

        setPrinterName(name) {

            this.printerName =
                String(
                    name || ""
                );


            this.saveSettings();

        },


        // =================================================
        // SET LANGUAGE
        // =================================================

        setLanguage(language) {

            this.language =
                String(
                    language || "TSPL"
                )
                .toUpperCase();


            this.saveSettings();


            console.log(
                "Printer Language:",
                this.language
            );

        },


        // =================================================
        // SET PAPER
        // =================================================

        setPaper(width, height) {

            this.paperWidth =
                Number(width) ||
                576;


            if (
                height !== undefined
            ) {

                this.paperHeight =
                    Number(height) ||
                    1200;

            }


            this.saveSettings();

        },


        // =================================================
        // SET DPI
        // =================================================

        setDPI(dpi) {

            this.dpi =
                Number(dpi) ||
                203;


            this.saveSettings();

        },


        // =================================================
        // SET COPIES
        // =================================================

        setCopies(copies) {

            this.copies =
                Math.max(
                    1,
                    Number(copies) || 1
                );


            this.saveSettings();

        },


        // =================================================
        // SET DENSITY
        // =================================================

        setDensity(density) {

            this.density =
                Math.max(
                    0,
                    Number(density) || 0
                );


            this.saveSettings();

        },


        // =================================================
        // SET SPEED
        // =================================================

        setSpeed(speed) {

            this.speed =
                Math.max(
                    1,
                    Number(speed) || 1
                );


            this.saveSettings();

        },


        // =================================================
        // SET AUTO CONNECT
        // =================================================

        setAutoConnect(enabled) {

            this.autoConnect =
                Boolean(
                    enabled
                );


            this.saveSettings();

        },


        // =================================================
        // STATUS
        // =================================================

        updateStatus(state) {

            const status =
                document.getElementById(
                    "printerStatus"
                );


            const dot =
                document.querySelector(
                    ".dot"
                );


            let text =
                "No Printer";


            let connected =
                false;


            switch (state) {

                case "connecting":

                    text =
                        "Connecting...";

                    break;


                case "connected":

                    text =
                        "Printer Connected";

                    connected =
                        true;

                    break;


                case "printing":

                    text =
                        "Printing...";

                    connected =
                        true;

                    break;


                case "error":

                    text =
                        "Printer Error";

                    break;


                case "disconnected":

                default:

                    text =
                        "No Printer";

                    break;

            }


            if (status) {

                status.textContent =
                    text;

            }


            if (dot) {

                dot.classList.toggle(
                    "connected",
                    connected
                );

            }

        },


        // =================================================
        // LOAD SETTINGS
        // =================================================

        loadSettings() {

            try {

                const raw =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_SETTINGS"
                    );


                if (!raw) {

                    return;

                }


                const settings =
                    JSON.parse(
                        raw
                    );


                if (
                    settings.printerType
                ) {

                    this.printerType =
                        settings.printerType;

                }


                if (
                    settings.printerName !==
                    undefined
                ) {

                    this.printerName =
                        settings.printerName;

                }


                if (
                    settings.language
                ) {

                    this.language =
                        settings.language;

                }


                if (
                    settings.paperWidth
                ) {

                    this.paperWidth =
                        Number(
                            settings.paperWidth
                        );

                }


                if (
                    settings.paperHeight
                ) {

                    this.paperHeight =
                        Number(
                            settings.paperHeight
                        );

                }


                if (
                    settings.dpi
                ) {

                    this.dpi =
                        Number(
                            settings.dpi
                        );

                }


                if (
                    settings.copies
                ) {

                    this.copies =
                        Number(
                            settings.copies
                        );

                }


                if (
                    settings.density !==
                    undefined
                ) {

                    this.density =
                        Number(
                            settings.density
                        );

                }


                if (
                    settings.speed !==
                    undefined
                ) {

                    this.speed =
                        Number(
                            settings.speed
                        );

                }


                if (
                    settings.autoConnect !==
                    undefined
                ) {

                    this.autoConnect =
                        Boolean(
                            settings.autoConnect
                        );

                }


                if (
                    settings.cutPaper !==
                    undefined
                ) {

                    this.cutPaper =
                        Boolean(
                            settings.cutPaper
                        );

                }


                if (
                    settings.openDrawer !==
                    undefined
                ) {

                    this.openDrawer =
                        Boolean(
                            settings.openDrawer
                        );

                }

            }

            catch (error) {

                console.warn(
                    "Printer settings gagal dibaca:",
                    error
                );

            }

        },


        // =================================================
        // SAVE SETTINGS
        // =================================================

        saveSettings() {

            try {

                localStorage.setItem(

                    "SMARTPRINT_PRINTER_SETTINGS",

                    JSON.stringify({

                        printerType:
                            this.printerType,

                        printerName:
                            this.printerName,

                        language:
                            this.language,

                        paperWidth:
                            this.paperWidth,

                        paperHeight:
                            this.paperHeight,

                        dpi:
                            this.dpi,

                        copies:
                            this.copies,

                        density:
                            this.density,

                        speed:
                            this.speed,

                        autoConnect:
                            this.autoConnect,

                        cutPaper:
                            this.cutPaper,

                        openDrawer:
                            this.openDrawer

                    })

                );

            }

            catch (error) {

                console.warn(
                    "Printer settings gagal disimpan:",
                    error
                );

            }

        },


        // =================================================
        // GET INFO
        // =================================================

        getInfo() {

            return {

                type:
                    this.printerType,

                name:
                    this.printerName,

                language:
                    this.language,

                paperWidth:
                    this.paperWidth,

                paperHeight:
                    this.paperHeight,

                dpi:
                    this.dpi,

                copies:
                    this.copies,

                density:
                    this.density,

                speed:
                    this.speed,

                connected:
                    this.isConnected(),

                autoConnect:
                    this.autoConnect

            };

        },


        // =================================================
        // SLEEP
        // =================================================

        sleep(ms) {

            return new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        ms
                    )
            );

        }

    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.Printer =
        PrinterManager;


    window.PrinterManager =
        PrinterManager;


    // =====================================================
    // INIT
    // =====================================================

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setTimeout(
                () => {

                    PrinterManager.init();

                },
                700
            );

        }
    );


    console.log(
        "SmartPrint Printer Manager v4.0 Ready"
    );

})();
