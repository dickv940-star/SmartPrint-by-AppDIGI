"use strict";

/*
=====================================================
 SmartPrint Printer Manager v4.2.0
=====================================================

 PURPOSE
 ----------------------------------------------------
 Central printer manager.

 CONNECTION
 ----------------------------------------------------
 Bluetooth Engine
      ↓
 Bluetooth.connectUser()
      ↓
 Printer Manager
      ↓
 Printer Language Engine
      ↓
 RAW Uint8Array
      ↓
 Printer

 SUPPORTED
 ----------------------------------------------------
 BLE
 Serial
 Bridge

 LANGUAGES
 ----------------------------------------------------
 ESC
 ESCPOS
 TSPL
 ZPL
 CPCL

 DEFAULT
 ----------------------------------------------------
 Label     : 100 x 150 mm
 DPI       : 203
 Foreground: BLACK
 Background: TRANSPARENT

 IMPORTANT
 ----------------------------------------------------
 Printer.connect()
 Printer.connectBluetooth()
 Printer.connectBLE()
 Printer.disconnect()

 Printer.setLanguage()
 Printer.getLanguage()

 Printer.print()
 Printer.printRaw()
 Printer.sendRaw()

 Printer.isConnected()
 Printer.getStatus()
 Printer.getInfo()

=====================================================
*/

(function () {

    const VERSION =
        "4.2.0";


    /*
    =================================================
     STATE
    =================================================
    */

    let language =
        "ESC";


    let connected =
        false;


    let connecting =
        false;


    let printerName =
        "";


    let connectionType =
        null;


    let lastError =
        null;


    let printBusy =
        false;


    /*
    =================================================
     CONFIG
    =================================================
    */

    const CONFIG = {

        dpi:
            203,

        paperWidth:
            100,

        paperHeight:
            150,

        labelWidth:
            100,

        labelHeight:
            150,

        transparentBackground:
            true,

        foreground:
            "#000000",

        background:
            "transparent",

        copies:
            1

    };


    /*
    =================================================
     LOG
    =================================================
    */

    function log(...args) {

        console.log(
            "[SmartPrint Printer]",
            ...args
        );

    }


    function warn(...args) {

        console.warn(
            "[SmartPrint Printer]",
            ...args
        );

    }


    function error(...args) {

        console.error(
            "[SmartPrint Printer]",
            ...args
        );

    }


    /*
    =================================================
     EVENT
    =================================================
    */

    function dispatch(
        name,
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-printer-" +
                    name,
                    {
                        detail:
                            Object.assign(
                                {
                                    version:
                                        VERSION
                                },
                                detail
                            )
                    }
                )
            );

        }

        catch (e) {}

    }


    /*
    =================================================
     NORMALIZE LANGUAGE
    =================================================
    */

    function normalizeLanguage(
        value
    ) {

        value =
            String(
                value ||
                "ESC"
            ).toUpperCase();


        if (
            value === "ESCPOS"
        ) {

            return "ESC";

        }


        if (
            value === "ESC/POS"
        ) {

            return "ESC";

        }


        if (
            [
                "ESC",
                "TSPL",
                "ZPL",
                "CPCL"
            ].includes(value)
        ) {

            return value;

        }


        warn(
            "Unknown printer language:",
            value,
            "→ ESC"
        );


        return "ESC";

    }


    /*
    =================================================
     SET LANGUAGE
    =================================================
    */

    function setLanguage(
        value
    ) {

        language =
            normalizeLanguage(
                value
            );


        log(
            "Printer Language:",
            language
        );


        dispatch(
            "language",
            {
                language
            }
        );


        return language;

    }


    /*
    =================================================
     GET LANGUAGE
    =================================================
    */

    function getLanguage() {

        return language;

    }


    /*
    =================================================
     LOAD SETTINGS
    =================================================
    */

    function loadSettings() {

        let settings =
            null;


        if (
            window.Settings &&
            typeof window.Settings.getAll ===
            "function"
        ) {

            try {

                settings =
                    window.Settings.getAll();

            }

            catch (e) {}

        }


        if (
            settings
        ) {

            if (
                settings.printLanguage
            ) {

                language =
                    normalizeLanguage(
                        settings.printLanguage
                    );

            }


            if (
                settings.printerName
            ) {

                printerName =
                    settings.printerName;

            }


            if (
                settings.dpi
            ) {

                CONFIG.dpi =
                    Number(
                        settings.dpi
                    );

            }


            if (
                settings.labelWidth
            ) {

                CONFIG.labelWidth =
                    Number(
                        settings.labelWidth
                    );

            }


            if (
                settings.labelHeight
            ) {

                CONFIG.labelHeight =
                    Number(
                        settings.labelHeight
                    );

            }


            if (
                settings.paperWidth
            ) {

                CONFIG.paperWidth =
                    Number(
                        settings.paperWidth
                    );

            }


            if (
                settings.paperHeight
            ) {

                CONFIG.paperHeight =
                    Number(
                        settings.paperHeight
                    );

            }


            CONFIG.transparentBackground =
                settings.transparentBackground !==
                false;

        }

    }


    /*
    =================================================
     UINT8
    =================================================
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
            "Printer data harus Uint8Array."
        );

    }


    /*
    =================================================
     BLUETOOTH
    =================================================
    */

    function getBluetooth() {

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


        return null;

    }


    /*
    =================================================
     UPDATE CONNECTION STATUS
    =================================================
    */

    function updateConnectionStatus() {

        const bluetooth =
            getBluetooth();


        if (
            bluetooth &&
            typeof bluetooth.isConnected ===
            "function"
        ) {

            try {

                connected =
                    Boolean(
                        bluetooth.isConnected()
                    );

            }

            catch (e) {

                connected =
                    false;

            }


            if (
                typeof bluetooth.getConnectionType ===
                "function"
            ) {

                try {

                    connectionType =
                        bluetooth.getConnectionType();

                }

                catch (e) {}

            }


            if (
                typeof bluetooth.getDeviceName ===
                "function"
            ) {

                try {

                    printerName =
                        bluetooth.getDeviceName() ||
                        printerName ||
                        "";

                }

                catch (e) {}

            }

        }


        dispatch(
            "status",
            {
                connected,
                connectionType,
                printerName,
                language
            }
        );


        return connected;

    }


    /*
    =================================================
     BLUETOOTH EVENTS
    =================================================
    */

    function installBluetoothEvents() {

        window.addEventListener(
            "smartprint-bluetooth-connected",
            function (event) {

                connected =
                    true;


                const detail =
                    event.detail ||
                    {};


                const device =
                    detail.device;


                if (
                    device &&
                    device.name
                ) {

                    printerName =
                        device.name;

                }


                connectionType =
                    detail.type ||
                    "BLE";


                lastError =
                    null;


                log(
                    "========================================"
                );


                log(
                    "PRINTER CONNECTED"
                );


                log(
                    "Name:",
                    printerName ||
                    "(unknown)"
                );


                log(
                    "Type:",
                    connectionType
                );


                log(
                    "Language:",
                    language
                );


                log(
                    "========================================"
                );


                dispatch(
                    "connected",
                    {
                        connected:
                            true,

                        printerName,

                        connectionType,

                        language,

                        device
                    }
                );


                updateConnectionStatus();

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-disconnected",
            function () {

                connected =
                    false;


                connectionType =
                    null;


                log(
                    "Printer disconnected."
                );


                dispatch(
                    "disconnected",
                    {
                        connected:
                            false
                    }
                );


                updateConnectionStatus();

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-connecting",
            function () {

                dispatch(
                    "connecting"
                );

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-status",
            function (event) {

                const detail =
                    event.detail ||
                    {};


                if (
                    typeof detail.connected !==
                    "undefined"
                ) {

                    connected =
                        Boolean(
                            detail.connected
                        );

                }


                updateConnectionStatus();

            }
        );

    }


    /*
    =================================================
     CONNECT
    =================================================
    */

    async function connect() {

        if (
            connecting
        ) {

            warn(
                "Printer sedang connecting."
            );


            return false;

        }


        connecting =
            true;


        lastError =
            null;


        dispatch(
            "connecting",
            {
                connected:
                    false
            }
        );


        try {

            loadSettings();


            const bluetooth =
                getBluetooth();


            if (!bluetooth) {

                throw new Error(
                    "Bluetooth Engine tidak ditemukan."
                );

            }


            /*
             * PENTING:
             *
             * connectUser() digunakan untuk
             * tombol Connect Printer.
             *
             * Ini boleh membuka Bluetooth picker.
             */

            let result =
                false;


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


            /*
             * Ambil status aktual dari
             * Bluetooth Engine.
             */

            updateConnectionStatus();


            if (
                !result ||
                !connected
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            log(
                "Printer connected successfully."
            );


            dispatch(
                "connected",
                {
                    connected:
                        true,

                    printerName,

                    connectionType,

                    language
                }
            );


            return true;

        }

        catch (err) {

            lastError =
                err;


            connected =
                false;


            error(
                "Printer connect error:",
                err
            );


            dispatch(
                "error",
                {
                    error:
                        err,
                    message:
                        err &&
                        err.message
                            ? err.message
                            : String(err)
                }
            );


            return false;

        }

        finally {

            connecting =
                false;


            updateConnectionStatus();

        }

    }


    /*
    =================================================
     CONNECT BLUETOOTH
    =================================================
    */

    async function connectBluetooth() {

        return await connect();

    }


    /*
    =================================================
     CONNECT BLE
    =================================================
    */

    async function connectBLE() {

        return await connect();

    }


    /*
    =================================================
     CONNECT NEW
    =================================================
    */

    async function connectNew() {

        if (
            connecting
        ) {

            return false;

        }


        connecting =
            true;


        try {

            const bluetooth =
                getBluetooth();


            if (!bluetooth) {

                throw new Error(
                    "Bluetooth Engine tidak ditemukan."
                );

            }


            let result =
                false;


            if (
                typeof bluetooth.connectBLENew ===
                "function"
            ) {

                result =
                    await bluetooth.connectBLENew();

            }

            else if (
                typeof bluetooth.connectUser ===
                "function"
            ) {

                result =
                    await bluetooth.connectUser();

            }


            updateConnectionStatus();


            return Boolean(
                result &&
                connected
            );

        }

        catch (err) {

            lastError =
                err;


            error(
                "Connect new printer error:",
                err
            );


            return false;

        }

        finally {

            connecting =
                false;

        }

    }


    /*
    =================================================
     DISCONNECT
    =================================================
    */

    async function disconnect() {

        try {

            const bluetooth =
                getBluetooth();


            if (
                bluetooth &&
                typeof bluetooth.disconnect ===
                "function"
            ) {

                await bluetooth.disconnect();

            }


            connected =
                false;


            connectionType =
                null;


            dispatch(
                "disconnected"
            );


            return true;

        }

        catch (err) {

            error(
                "Printer disconnect error:",
                err
            );


            return false;

        }

    }


    /*
    =================================================
     IS CONNECTED
    =================================================
    */

    function isConnected() {

        updateConnectionStatus();


        return Boolean(
            connected
        );

    }


    /*
    =================================================
     GET STATUS
    =================================================
    */

    function getStatus() {

        updateConnectionStatus();


        return {

            connected:
                connected,

            printerName:
                printerName,

            connectionType:
                connectionType,

            language:
                language,

            busy:
                printBusy,

            error:
                lastError
                    ? lastError.message ||
                      String(lastError)
                    : null

        };

    }


    /*
    =================================================
     GET INFO
    =================================================
    */

    function getInfo() {

        loadSettings();

        updateConnectionStatus();


        const bluetooth =
            getBluetooth();


        let bluetoothInfo =
            null;


        if (
            bluetooth &&
            typeof bluetooth.getInfo ===
            "function"
        ) {

            try {

                bluetoothInfo =
                    bluetooth.getInfo();

            }

            catch (e) {}

        }


        return {

            version:
                VERSION,

            language:
                language,

            connected:
                connected,

            printerName:
                printerName,

            connectionType:
                connectionType,

            dpi:
                CONFIG.dpi,

            paperWidth:
                CONFIG.paperWidth,

            paperHeight:
                CONFIG.paperHeight,

            labelWidth:
                CONFIG.labelWidth,

            labelHeight:
                CONFIG.labelHeight,

            transparentBackground:
                CONFIG.transparentBackground,

            bluetooth:
                bluetoothInfo

        };

    }


    /*
    =================================================
     RAW SEND
    =================================================
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


        if (!bluetooth) {

            throw new Error(
                "Bluetooth Engine tidak tersedia."
            );

        }


        if (
            !isConnected()
        ) {

            throw new Error(
                "Printer belum terhubung."
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


        return await bluetooth.sendRaw(
            bytes
        );

    }


    /*
    =================================================
     SEND
    =================================================
    */

    async function send(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    async function write(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    async function printRaw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     GET ENGINE
    =================================================
    */

    function getEngine() {

        switch (
            language
        ) {

            case "TSPL":

                return window.TSPL ||
                    window.Tspl ||
                    null;


            case "ZPL":

                return window.ZPL ||
                    window.Zpl ||
                    null;


            case "CPCL":

                return window.CPCL ||
                    window.Cpcl ||
                    null;


            case "ESC":

            default:

                return window.ESCPos ||
                    window.ESCPOS ||
                    window.EscPos ||
                    null;

        }

    }


    /*
    =================================================
     BUILD RAW
    =================================================
    */

    async function buildRaw(
        job
    ) {

        /*
         * Jika job sudah Uint8Array,
         * langsung gunakan.
         */

        if (
            job instanceof Uint8Array ||
            job instanceof ArrayBuffer ||
            ArrayBuffer.isView(job)
        ) {

            return normalizeBytes(
                job
            );

        }


        /*
         * Jika engine memiliki method
         * build / encode / generate.
         */

        const engine =
            getEngine();


        if (!engine) {

            throw new Error(
                "Printer engine tidak ditemukan untuk language: " +
                language
            );

        }


        if (
            typeof engine.build ===
            "function"
        ) {

            return normalizeBytes(
                await engine.build(
                    job
                )
            );

        }


        if (
            typeof engine.encode ===
            "function"
        ) {

            return normalizeBytes(
                await engine.encode(
                    job
                )
            );

        }


        if (
            typeof engine.generate ===
            "function"
        ) {

            return normalizeBytes(
                await engine.generate(
                    job
                )
            );

        }


        if (
            typeof engine.render ===
            "function"
        ) {

            return normalizeBytes(
                await engine.render(
                    job
                )
            );

        }


        throw new Error(
            "Engine " +
            language +
            " tidak memiliki build/encode/generate/render."
        );

    }


    /*
    =================================================
     PRINT
    =================================================
    */

    async function print(
        job
    ) {

        if (
            printBusy
        ) {

            throw new Error(
                "Printer sedang mencetak."
            );

        }


        printBusy =
            true;


        dispatch(
            "printing",
            {
                connected:
                    isConnected()
            }
        );


        try {

            if (
                !isConnected()
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            /*
             * Jika job berupa RAW,
             * langsung kirim.
             */

            if (
                job instanceof Uint8Array ||
                job instanceof ArrayBuffer ||
                ArrayBuffer.isView(job)
            ) {

                return await sendRaw(
                    job
                );

            }


            /*
             * Build menggunakan engine.
             */

            const raw =
                await buildRaw(
                    job
                );


            return await sendRaw(
                raw
            );

        }

        finally {

            printBusy =
                false;


            dispatch(
                "printed"
            );

        }

    }


    /*
    =================================================
     PRINT TEXT
    =================================================
    */

    async function printText(
        text
    ) {

        text =
            String(
                text === undefined
                    ? ""
                    : text
            );


        /*
         * ESC/POS dasar.
         *
         * Ini hanya fallback sederhana.
         */

        if (
            language === "ESC"
        ) {

            const encoder =
                new TextEncoder();


            const body =
                encoder.encode(
                    text +
                    "\n"
                );


            const init =
                new Uint8Array([
                    0x1B,
                    0x40
                ]);


            const feed =
                new Uint8Array([
                    0x0A,
                    0x0A,
                    0x0A
                ]);


            const raw =
                new Uint8Array(
                    init.length +
                    body.length +
                    feed.length
                );


            raw.set(
                init,
                0
            );


            raw.set(
                body,
                init.length
            );


            raw.set(
                feed,
                init.length +
                body.length
            );


            return await sendRaw(
                raw
            );

        }


        throw new Error(
            "printText() fallback hanya tersedia untuk ESC."
        );

    }


    /*
    =================================================
     PRINT TEST
    =================================================
    */

    async function testPrint() {

        const text =
            "SmartPrint by AppDIGI\n" +
            "====================\n" +
            "PRINTER TEST\n" +
            "Language: " +
            language +
            "\n" +
            "Paper: " +
            CONFIG.paperWidth +
            " x " +
            CONFIG.paperHeight +
            " mm\n" +
            "DPI: " +
            CONFIG.dpi +
            "\n" +
            "BLACK INK / TRANSPARENT BG\n\n";


        return await printText(
            text
        );

    }


    /*
    =================================================
     SET PAPER
    =================================================
    */

    function setPaperSize(
        width,
        height
    ) {

        width =
            Number(width);

        height =
            Number(height);


        if (
            !width ||
            !height
        ) {

            return false;

        }


        CONFIG.paperWidth =
            width;

        CONFIG.paperHeight =
            height;

        CONFIG.labelWidth =
            width;

        CONFIG.labelHeight =
            height;


        if (
            window.Settings &&
            typeof window.Settings.setLabelSize ===
            "function"
        ) {

            window.Settings.setLabelSize(
                width,
                height
            );

        }


        dispatch(
            "paper",
            {
                width,
                height
            }
        );


        return true;

    }


    /*
    =================================================
     GET PAPER
    =================================================
    */

    function getPaperSize() {

        loadSettings();


        return {

            width:
                CONFIG.paperWidth,

            height:
                CONFIG.paperHeight,

            labelWidth:
                CONFIG.labelWidth,

            labelHeight:
                CONFIG.labelHeight,

            dpi:
                CONFIG.dpi

        };

    }


    /*
    =================================================
     INIT
    =================================================
    */

    function init() {

        loadSettings();

        installBluetoothEvents();

        updateConnectionStatus();


        log(
            "========================================"
        );


        log(
            "SmartPrint Printer Manager v" +
            VERSION +
            " Ready"
        );


        log(
            "========================================"
        );


        log(
            "Printer Language:",
            language
        );


        log(
            "Paper:",
            CONFIG.paperWidth +
            " x " +
            CONFIG.paperHeight +
            " mm"
        );


        log(
            "Label:",
            CONFIG.labelWidth +
            " x " +
            CONFIG.labelHeight +
            " mm"
        );


        log(
            "DPI:",
            CONFIG.dpi
        );


        log(
            "Transparent background:"
        );


        log(
            CONFIG.transparentBackground
                ? "YES - background tidak dikirim"
                : "NO"
        );


        log(
            "Printer Manager initialized."
        );


        dispatch(
            "ready",
            {
                language,
                paper:
                    getPaperSize()
            }
        );


        return true;

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    const Printer = {

        version:
            VERSION,

        config:
            CONFIG,

        init,

        connect,

        connectBluetooth,

        connectBLE,

        connectNew,

        disconnect,

        setLanguage,

        getLanguage,

        setPaperSize,

        getPaperSize,

        isConnected,

        getStatus,

        getInfo,

        sendRaw,

        send,

        write,

        printRaw,

        print,

        printText,

        testPrint,

        buildRaw

    };


    /*
    =================================================
     GLOBAL
    =================================================
    */

    window.Printer =
        Printer;


    window.SmartPrintPrinter =
        Printer;


    window.PrinterManager =
        Printer;


    /*
    =================================================
     READY
    =================================================
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
    =================================================
     INIT
    =================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                setTimeout(
                    init,
                    50
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
            init,
            50
        );

    }

})();
