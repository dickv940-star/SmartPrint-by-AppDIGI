"use strict";

/*
==========================================================
 SmartPrint Printer Manager v4.2.0
 by AppDIGI
==========================================================

 PURPOSE
 ---------------------------------------------------------
 Printer Manager untuk SmartPrint.

 TARGET
 ---------------------------------------------------------
 - Bluetooth BLE
 - Web Serial
 - Bridge
 - RAW Uint8Array
 - TSPL
 - ESC/POS
 - Text
 - Barcode
 - QR Code
 - Image
 - Adaptive Paper / Label Size
 - Transparent Background
 - Black Ink Objects

 IMPORTANT
 ---------------------------------------------------------
 Printer Manager TIDAK mengatur Preview Engine.

 Preview hanya menghasilkan object/data.
 Printer Manager bertugas mengubah object menjadi
 printer command.

 PAPER
 ---------------------------------------------------------
 Ukuran kertas/label TIDAK dikunci.

 Dibaca dari:
    Settings.labelWidth
    Settings.labelHeight
    Settings.paperWidth
    Settings.paperHeight
    Settings.dpi

 Contoh:
    100 x 150 mm
    58 x 40 mm
    80 x 50 mm
    dll.

 TRANSPARENT PRINT
 ---------------------------------------------------------
 Background putih TIDAK dikirim.

 Hanya object yang mempunyai data yang dicetak.

 DEFAULT COLOR
 ---------------------------------------------------------
 Black / #000000

 TRANSPORT
 ---------------------------------------------------------
 Bluetooth.sendRaw(Uint8Array)

 Compatible dengan:
 SmartPrint Bluetooth Engine v5.7.0

==========================================================
*/


(function () {

    "use strict";


    /*
    ======================================================
     VERSION
    ======================================================
    */

    const VERSION = "4.2.0";


    /*
    ======================================================
     CONSTANT
    ======================================================
    */

    const MM_PER_INCH = 25.4;


    /*
    ======================================================
     STATE
    ======================================================
    */

    let initialized = false;

    let printing = false;

    let connected = false;

    let currentLanguage = "ESC";

    let currentPrinter = null;

    let lastJob = null;


    /*
    ======================================================
     DEFAULT SETTINGS
    ======================================================
    */

    const DEFAULT_SETTINGS = {

        appName:
            "SmartPrint by AppDIGI",

        version:
            VERSION,

        language:
            "id",

        /*
         * Printer
         */

        printerName:
            "",

        printLanguage:
            "ESC",

        paperWidth:
            80,

        paperHeight:
            150,

        labelWidth:
            100,

        labelHeight:
            150,

        gap:
            2,

        marginLeft:
            0,

        marginTop:
            0,

        dpi:
            203,

        copies:
            1,

        density:
            8,

        speed:
            4,

        cutPaper:
            false,

        openDrawer:
            false,

        rotate:
            0,

        /*
         * Barcode
         */

        barcodeType:
            "CODE128",

        barcodeWidth:
            2,

        barcodeHeight:
            50,

        barcodeHumanReadable:
            true,

        /*
         * QR
         */

        qrSize:
            100,

        qrErrorCorrection:
            "M"

    };


    /*
    ======================================================
     LOG
    ======================================================
    */

    function log() {

        console.log(
            "[SmartPrint Printer]",
            ...arguments
        );

    }


    function warn() {

        console.warn(
            "[SmartPrint Printer]",
            ...arguments
        );

    }


    function error() {

        console.error(
            "[SmartPrint Printer]",
            ...arguments
        );

    }


    /*
    ======================================================
     STORAGE
    ======================================================
    */

    function readSettings() {

        let result = {};

        try {

            const raw =
                localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );

            if (raw) {

                result =
                    JSON.parse(raw);

            }

        }

        catch (err) {

            warn(
                "Gagal membaca SMARTPRINT_SETTINGS:",
                err
            );

        }


        return Object.assign(
            {},
            DEFAULT_SETTINGS,
            result || {}
        );

    }


    function saveSettings(settings) {

        try {

            localStorage.setItem(
                "SMARTPRINT_SETTINGS",
                JSON.stringify(
                    settings
                )
            );

            return true;

        }

        catch (err) {

            warn(
                "Gagal menyimpan settings:",
                err
            );

            return false;

        }

    }


    /*
    ======================================================
     SETTINGS
    ======================================================
    */

    function getSettings() {

        const settings =
            readSettings();

        /*
         * Normalisasi nilai.
         */

        settings.labelWidth =
            positiveNumber(
                settings.labelWidth,
                settings.paperWidth || 80
            );

        settings.labelHeight =
            positiveNumber(
                settings.labelHeight,
                settings.paperHeight || 150
            );

        settings.paperWidth =
            positiveNumber(
                settings.paperWidth,
                settings.labelWidth
            );

        settings.paperHeight =
            positiveNumber(
                settings.paperHeight,
                settings.labelHeight
            );

        settings.dpi =
            positiveNumber(
                settings.dpi,
                203
            );

        settings.gap =
            nonNegativeNumber(
                settings.gap,
                0
            );

        settings.marginLeft =
            nonNegativeNumber(
                settings.marginLeft,
                0
            );

        settings.marginTop =
            nonNegativeNumber(
                settings.marginTop,
                0
            );

        settings.copies =
            Math.max(
                1,
                Math.floor(
                    positiveNumber(
                        settings.copies,
                        1
                    )
                )
            );


        return settings;

    }


    function updateSettings(
        values
    ) {

        const current =
            getSettings();

        const next =
            Object.assign(
                {},
                current,
                values || {}
            );

        saveSettings(
            next
        );

        return getSettings();

    }


    /*
    ======================================================
     NUMBER HELPERS
    ======================================================
    */

    function positiveNumber(
        value,
        fallback
    ) {

        const number =
            Number(value);

        if (
            Number.isFinite(number) &&
            number > 0
        ) {

            return number;

        }

        return Number(
            fallback
        ) || 1;

    }


    function nonNegativeNumber(
        value,
        fallback
    ) {

        const number =
            Number(value);

        if (
            Number.isFinite(number) &&
            number >= 0
        ) {

            return number;

        }

        return Number(
            fallback
        ) || 0;

    }


    /*
    ======================================================
     PAPER SIZE
    ======================================================
    */

    function getPaperSize() {

        const settings =
            getSettings();

        /*
         * Untuk label printer,
         * labelWidth / labelHeight
         * menjadi prioritas.
         */

        const width =
            positiveNumber(
                settings.labelWidth,
                settings.paperWidth
            );

        const height =
            positiveNumber(
                settings.labelHeight,
                settings.paperHeight
            );

        return {

            width,
            height,

            dpi:
                positiveNumber(
                    settings.dpi,
                    203
                ),

            gap:
                nonNegativeNumber(
                    settings.gap,
                    0
                ),

            marginLeft:
                nonNegativeNumber(
                    settings.marginLeft,
                    0
                ),

            marginTop:
                nonNegativeNumber(
                    settings.marginTop,
                    0
                )

        };

    }


    /*
    ======================================================
     MM -> DOT
    ======================================================
    */

    function mmToDots(
        mm,
        dpi
    ) {

        return Math.round(
            Number(mm) *
            Number(dpi) /
            MM_PER_INCH
        );

    }


    /*
    ======================================================
     DOT -> MM
    ======================================================
    */

    function dotsToMm(
        dots,
        dpi
    ) {

        return (
            Number(dots) *
            MM_PER_INCH /
            Number(dpi)
        );

    }


    /*
    ======================================================
     PAPER DOT SIZE
    ======================================================
    */

    function getPaperDots() {

        const paper =
            getPaperSize();

        return {

            width:
                mmToDots(
                    paper.width,
                    paper.dpi
                ),

            height:
                mmToDots(
                    paper.height,
                    paper.dpi
                ),

            dpi:
                paper.dpi

        };

    }


    /*
    ======================================================
     PAPER INFO
    ======================================================
    */

    function getPaperInfo() {

        const paper =
            getPaperSize();

        const dots =
            getPaperDots();

        return {

            widthMm:
                paper.width,

            heightMm:
                paper.height,

            dpi:
                paper.dpi,

            widthDots:
                dots.width,

            heightDots:
                dots.height,

            gapMm:
                paper.gap,

            marginLeftMm:
                paper.marginLeft,

            marginTopMm:
                paper.marginTop

        };

    }


    /*
    ======================================================
     LANGUAGE
    ======================================================
    */

    function normalizeLanguage(
        language
    ) {

        const value =
            String(
                language ||
                ""
            )
            .trim()
            .toUpperCase();


        if (
            value === "TSPL"
        ) {

            return "TSPL";

        }


        if (
            value === "ZPL"
        ) {

            return "ZPL";

        }


        if (
            value === "CPCL"
        ) {

            return "CPCL";

        }


        if (
            value === "ESC" ||
            value === "ESC/POS" ||
            value === "ESCPOS"
        ) {

            return "ESC";

        }


        return "ESC";

    }


    function getPrinterLanguage() {

        const settings =
            getSettings();

        return normalizeLanguage(
            settings.printLanguage
        );

    }


    function setPrinterLanguage(
        language
    ) {

        const normalized =
            normalizeLanguage(
                language
            );

        currentLanguage =
            normalized;

        updateSettings({

            printLanguage:
                normalized

        });


        log(
            "Printer Language:",
            normalized
        );


        return normalized;

    }


    /*
    ======================================================
     UINT8 NORMALIZATION
    ======================================================
    */

    function normalizeBytes(
        data
    ) {

        if (
            data instanceof Uint8Array
        ) {

            return data;

        }


        if (
            data instanceof ArrayBuffer
        ) {

            return new Uint8Array(
                data
            );

        }


        if (
            ArrayBuffer.isView(data)
        ) {

            return new Uint8Array(
                data.buffer,
                data.byteOffset,
                data.byteLength
            );

        }


        if (
            Array.isArray(data)
        ) {

            return new Uint8Array(
                data
            );

        }


        throw new TypeError(
            "Printer: data harus Uint8Array, ArrayBuffer, TypedArray, atau Array."
        );

    }


    /*
    ======================================================
     CONCAT BYTES
    ======================================================
    */

    function concatBytes() {

        const arrays =
            Array.prototype
                .slice
                .call(
                    arguments
                )
                .map(
                    normalizeBytes
                );


        let total =
            0;


        arrays.forEach(
            item => {

                total +=
                    item.length;

            }
        );


        const result =
            new Uint8Array(
                total
            );


        let offset =
            0;


        arrays.forEach(
            item => {

                result.set(
                    item,
                    offset
                );

                offset +=
                    item.length;

            }
        );


        return result;

    }


    /*
    ======================================================
     TEXT ENCODING
    ======================================================
    */

    function textBytes(
        text
    ) {

        const value =
            String(
                text === undefined ||
                text === null
                    ? ""
                    : text
            );


        /*
         * Printer thermal biasanya
         * menggunakan UTF-8 hanya pada
         * printer yang mendukungnya.

         * Untuk command ASCII,
         * gunakan TextEncoder.
         */

        if (
            typeof TextEncoder !==
            "undefined"
        ) {

            return new TextEncoder()
                .encode(
                    value
                );

        }


        const bytes =
            new Uint8Array(
                value.length
            );


        for (
            let i = 0;
            i < value.length;
            i++
        ) {

            bytes[i] =
                value.charCodeAt(i) &
                0xff;

        }


        return bytes;

    }


    function ascii(
        text
    ) {

        return textBytes(
            text
        );

    }


    /*
    ======================================================
     STRING REPEAT
    ======================================================
    */

    function repeat(
        character,
        count
    ) {

        return new Array(
            Math.max(
                0,
                Number(count) || 0
            ) + 1
        )
        .join(
            character
        );

    }


    /*
    ======================================================
     CLAMP
    ======================================================
    */

    function clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );

    }


    /*
    ======================================================
     COLOR
    ======================================================
    */

    function normalizeColor(
        color
    ) {

        if (
            !color
        ) {

            return "#000000";

        }


        const value =
            String(
                color
            )
            .trim()
            .toUpperCase();


        if (
            value ===
            "BLACK"
        ) {

            return "#000000";

        }


        if (
            value ===
            "WHITE"
        ) {

            return "#FFFFFF";

        }


        if (
            /^#[0-9A-F]{6}$/
            .test(
                value
            )
        ) {

            return value;

        }


        if (
            /^#[0-9A-F]{3}$/
            .test(
                value
            )
        ) {

            return "#" +
                value[1] +
                value[1] +
                value[2] +
                value[2] +
                value[3] +
                value[3];

        }


        return "#000000";

    }


    function isBlack(
        color
    ) {

        return (
            normalizeColor(
                color
            ) ===
            "#000000"
        );

    }


    /*
    ======================================================
     TRANSPARENT BACKGROUND
    ======================================================
    */

    function isTransparentBackground(
        object
    ) {

        if (
            !object
        ) {

            return true;

        }


        const background =
            object.background ||
            object.fill ||
            object.color;


        if (
            !background
        ) {

            return true;

        }


        const value =
            String(
                background
            )
            .trim()
            .toLowerCase();


        return (
            value === "transparent" ||
            value === "none" ||
            value === "null"
        );

    }


    /*
    ======================================================
     OBJECT BLACK CHECK
    ======================================================
    */

    function shouldPrintObject(
        object
    ) {

        if (
            !object
        ) {

            return false;

        }


        if (
            object.visible === false
        ) {

            return false;

        }


        /*
         * Locked object tetap dicetak.
         */

        /*
         * Background putih tidak dicetak.
         */

        if (
            object.isBackground === true
        ) {

            return false;

        }


        if (
            object.type ===
            "background"
        ) {

            return false;

        }


        return true;

    }


    /*
    ======================================================
     OBJECT POSITION
    ======================================================
    */

    function objectNumber(
        object,
        key,
        fallback
    ) {

        if (
            !object
        ) {

            return fallback;

        }


        const value =
            Number(
                object[key]
            );


        return Number.isFinite(
            value
        )
            ? value
            : fallback;

    }


    function getObjectX(
        object
    ) {

        return objectNumber(
            object,
            "x",
            0
        );

    }


    function getObjectY(
        object
    ) {

        return objectNumber(
            object,
            "y",
            0
        );

    }


    function getObjectWidth(
        object
    ) {

        return objectNumber(
            object,
            "width",
            0
        );

    }


    function getObjectHeight(
        object
    ) {

        return objectNumber(
            object,
            "height",
            0
        );

    }


    function getObjectRotation(
        object
    ) {

        return objectNumber(
            object,
            "rotation",
            0
        );

    }


    /*
    ======================================================
     GET OBJECT TYPE
    ======================================================
    */

    function getObjectType(
        object
    ) {

        if (
            !object
        ) {

            return "";

        }


        return String(
            object.type ||
            object.objectType ||
            object.kind ||
            ""
        )
        .trim()
        .toLowerCase();

    }


    /*
    ======================================================
     OBJECT TEXT
    ======================================================
    */

    function getObjectText(
        object
    ) {

        if (
            !object
        ) {

            return "";

        }


        return String(
            object.text !== undefined
                ? object.text
                : object.value !== undefined
                    ? object.value
                    : object.content !== undefined
                        ? object.content
                        : ""
        );

    }


    /*
    ======================================================
     OBJECT DATA
    ======================================================
    */

    function getObjectData(
        object
    ) {

        if (
            !object
        ) {

            return null;

        }


        return (
            object.data ||
            object.src ||
            object.imageData ||
            object.url ||
            null
        );

    }


    /*
    ======================================================
     SCALE
    ======================================================
    */

    function getScale(
        object
    ) {

        if (
            !object
        ) {

            return 1;

        }


        const scale =
            Number(
                object.scale
            );


        return (
            Number.isFinite(
                scale
            ) &&
            scale > 0
        )
            ? scale
            : 1;

    }


    /*
    ======================================================
     OBJECT TO DOT RECT
    ======================================================
    */

    function objectToDots(
        object
    ) {

        const paper =
            getPaperSize();


        const x =
            mmToDots(
                getObjectX(object),
                paper.dpi
            );


        const y =
            mmToDots(
                getObjectY(object),
                paper.dpi
            );


        const width =
            mmToDots(
                getObjectWidth(object),
                paper.dpi
            );


        const height =
            mmToDots(
                getObjectHeight(object),
                paper.dpi
            );


        return {

            x,
            y,
            width,
            height,

            rotation:
                getObjectRotation(
                    object
                )

        };

    }


    /*
    ======================================================
     PRINTER CONNECTION
    ======================================================
    */

    function getBluetooth() {

        if (
            typeof window ===
            "undefined"
        ) {

            return null;

        }


        if (
            window.Bluetooth
        ) {

            return window.Bluetooth;

        }


        if (
            window.SmartPrintBluetooth
        ) {

            return window.SmartPrintBluetooth;

        }


        if (
            window.BluetoothEngine
        ) {

            return window.BluetoothEngine;

        }


        return null;

    }


    /*
    ======================================================
     CHECK BLUETOOTH
    ======================================================
    */

    function hasBluetooth() {

        return Boolean(
            getBluetooth()
        );

    }


    /*
    ======================================================
     CONNECT
    ======================================================
    */

    async function connect() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            throw new Error(
                "SmartPrint Bluetooth Engine tidak ditemukan."
            );

        }


        log(
            "Connecting printer..."
        );


        let result =
            false;


        /*
         * User connection.
         * Ini boleh membuka picker.
         */

        if (
            typeof bluetooth.connectUser ===
            "function"
        ) {

            result =
                await bluetooth.connectUser();

        }

        else if (
            typeof bluetooth.connectBLE ===
            "function"
        ) {

            result =
                await bluetooth.connectBLE();

        }

        else if (
            typeof bluetooth.connect ===
            "function"
        ) {

            result =
                await bluetooth.connect();

        }


        connected =
            Boolean(
                result
            );


        if (
            connected
        ) {

            try {

                currentPrinter =
                    typeof bluetooth.getInfo ===
                    "function"
                        ? bluetooth.getInfo()
                        : null;

            }

            catch (e) {

                currentPrinter =
                    null;

            }


            dispatch(
                "connected",
                {
                    printer:
                        currentPrinter
                }
            );

        }


        return connected;

    }


    /*
    ======================================================
     CONNECT NEW
    ======================================================
    */

    async function connectNew() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            throw new Error(
                "SmartPrint Bluetooth Engine tidak ditemukan."
            );

        }


        if (
            typeof bluetooth.connectBLENew ===
            "function"
        ) {

            const result =
                await bluetooth.connectBLENew();


            connected =
                Boolean(
                    result
                );


            return connected;

        }


        return connect();

    }


    /*
    ======================================================
     AUTO CONNECT
    ======================================================
    */

    async function autoConnect() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            warn(
                "Bluetooth Engine belum tersedia."
            );


            return false;

        }


        if (
            typeof bluetooth.autoConnect !==
            "function"
        ) {

            return false;

        }


        try {

            const result =
                await bluetooth.autoConnect();


            connected =
                Boolean(
                    result
                );


            return connected;

        }

        catch (err) {

            warn(
                "Auto connect gagal:",
                err
            );


            return false;

        }

    }


    /*
    ======================================================
     DISCONNECT
    ======================================================
    */

    async function disconnect() {

        const bluetooth =
            getBluetooth();


        if (
            bluetooth &&
            typeof bluetooth.disconnect ===
            "function"
        ) {

            try {

                await bluetooth.disconnect();

            }

            catch (err) {

                warn(
                    "Disconnect error:",
                    err
                );

            }

        }


        connected =
            false;


        currentPrinter =
            null;


        dispatch(
            "disconnected"
        );


        return true;

    }


    /*
    ======================================================
     CONNECTION STATUS
    ======================================================
    */

    function isConnected() {

        const bluetooth =
            getBluetooth();


        if (
            bluetooth &&
            typeof bluetooth.isConnected ===
            "function"
        ) {

            try {

                return Boolean(
                    bluetooth.isConnected()
                );

            }

            catch (e) {}

        }


        return connected;

    }


    /*
    ======================================================
     PRINTER INFO
    ======================================================
    */

    function getPrinterInfo() {

        const bluetooth =
            getBluetooth();


        let info =
            null;


        if (
            bluetooth &&
            typeof bluetooth.getInfo ===
            "function"
        ) {

            try {

                info =
                    bluetooth.getInfo();

            }

            catch (e) {}

        }


        return {

            connected:
                isConnected(),

            language:
                getPrinterLanguage(),

            paper:
                getPaperInfo(),

            bluetooth:
                info

        };

    }


    /*
    ======================================================
     SEND RAW
    ======================================================
    */

    async function sendRaw(
        data
    ) {

        const bytes =
            normalizeBytes(
                data
            );


        if (
            bytes.length === 0
        ) {

            warn(
                "sendRaw(): data kosong."
            );


            return false;

        }


        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            throw new Error(
                "SmartPrint Bluetooth Engine tidak ditemukan."
            );

        }


        if (
            typeof bluetooth.sendRaw !==
            "function"
        ) {

            throw new Error(
                "Bluetooth.sendRaw() tidak tersedia."
            );

        }


        /*
         * Jangan otomatis connect di sini.
         *
         * sendRaw harus bekerja pada koneksi
         * yang sudah dibuat oleh user / app.
         */

        if (
            typeof bluetooth.isConnected ===
            "function" &&
            !bluetooth.isConnected()
        ) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        return await bluetooth.sendRaw(
            bytes
        );

    }


    /*
    ======================================================
     EVENT
    ======================================================
    */

    function dispatch(
        name,
        detail
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-printer-" +
                    name,
                    {
                        detail:
                            detail || {}
                    }
                )
            );

        }

        catch (e) {}

    }


    /*
    ======================================================
     BLUETOOTH EVENTS
    ======================================================
    */

    function attachBluetoothEvents() {

        if (
            typeof window ===
            "undefined"
        ) {

            return;

        }


        window.addEventListener(
            "smartprint-bluetooth-connected",
            event => {

                connected =
                    true;


                currentPrinter =
                    event.detail ||
                    null;


                dispatch(
                    "connected",
                    event.detail
                );

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-disconnected",
            event => {

                connected =
                    false;


                currentPrinter =
                    null;


                dispatch(
                    "disconnected",
                    event.detail
                );

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-connecting",
            event => {

                dispatch(
                    "connecting",
                    event.detail
                );

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-data",
            event => {

                dispatch(
                    "data",
                    event.detail
                );

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-status",
            event => {

                if (
                    event.detail &&
                    "connected" in
                    event.detail
                ) {

                    connected =
                        Boolean(
                            event.detail.connected
                        );

                }


                dispatch(
                    "status",
                    event.detail
                );

            }
        );

    }


    /*
    ======================================================
     INITIALIZE
    ======================================================
    */

    async function init() {

        if (
            initialized
        ) {

            return true;

        }


        log(
            "========================================"
        );


        log(
            "SmartPrint Printer Manager v" +
            VERSION
        );


        log(
            "========================================"
        );


        const settings =
            getSettings();


        currentLanguage =
            normalizeLanguage(
                settings.printLanguage
            );


        log(
            "Printer Language:",
            currentLanguage
        );


        log(
            "Paper:",
            settings.labelWidth,
            "x",
            settings.labelHeight,
            "mm"
        );


        log(
            "DPI:",
            settings.dpi
        );


        log(
            "Transparent background:"
        );


        log(
            "YES - background tidak dikirim"
        );


        attachBluetoothEvents();


        initialized =
            true;


        /*
         * Auto connect tidak membuka picker.
         */

        setTimeout(
            () => {

                autoConnect()
                    .catch(
                        err =>
                            warn(
                                "AutoConnect:",
                                err
                            )
                    );

            },
            100
        );


        log(
            "Printer Manager initialized."
        );


        return true;

    }


    /*
    ======================================================
     PUBLIC BASIC API
    ======================================================
    */

    const Printer = {

        version:
            VERSION,

        init,

        connect,

        connectNew,

        autoConnect,

        disconnect,

        isConnected,

        sendRaw,

        getSettings,

        updateSettings,

        getPaperSize,

        getPaperDots,

        getPaperInfo,

        getPrinterLanguage,

        setPrinterLanguage,

        getPrinterInfo,

        mmToDots,

        dotsToMm,

        objectToDots

    };


    /*
    ======================================================
     GLOBAL
    ======================================================
    */

    window.Printer =
        Printer;


    window.SmartPrintPrinter =
        Printer;


    window.PrinterManager =
        Printer;


    /*
    ======================================================
     READY LOG
    ======================================================
    */

    console.log(
        "========================================"
    );


    console.log(
        "SmartPrint Printer Manager v" +
        VERSION +
        " Ready"
    );


    console.log(
        "========================================"
    );


    /*
    ======================================================
     DOM READY
    ======================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                setTimeout(
                    () => {

                        Printer.init();

                    },
                    150
                );

            },
            {
                once:
                    true
            }
        );

    }

    else {

        setTimeout(
            () => {

                Printer.init();

            },
            150
        );

    }


})();
