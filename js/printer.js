"use strict";

/*
=====================================================
 SmartPrint Printer Manager v4.2.0
=====================================================

 RESPONSIBILITY
 ----------------------------------------------------
 Printer Manager adalah penghubung antara:

 Settings
     ↓
 Printer Manager
     ↓
 Bluetooth Engine
     ↓
 Physical Printer

 SUPPORTED LANGUAGE
 ----------------------------------------------------
 ESC
 TSPL
 ZPL
 CPCL

 TRANSPORT
 ----------------------------------------------------
 Bluetooth BLE
 Web Serial
 Bridge

 RAW
 ----------------------------------------------------
 Uint8Array

 PAPER
 ----------------------------------------------------
 Mengikuti Settings.

 Default:
 100 x 150 mm
 203 DPI

 TRANSPARENT BACKGROUND
 ----------------------------------------------------
 Background desain tidak dikirim sebagai tinta.

 Ink:
 #000000

=====================================================
*/

(function () {

    "use strict";


    /*
    =================================================
     VERSION
    =================================================
    */

    const VERSION =
        "4.2.0";


    /*
    =================================================
     STATE
    =================================================
    */

    const state = {

        initialized:
            false,

        connected:
            false,

        connecting:
            false,

        language:
            "ESC",

        paperWidth:
            100,

        paperHeight:
            150,

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

        transparentBackground:
            true,

        status:
            "disconnected",

        deviceName:
            "",

        connectionType:
            null,

        lastError:
            null

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
     DISPATCH
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
                        detail: {

                            ...detail,

                            state:
                                getState()

                        }
                    }
                )
            );

        }

        catch (err) {

            warn(
                "Dispatch error:",
                err
            );

        }

    }


    /*
    =================================================
     NORMALIZE LANGUAGE
    =================================================
    */

    function normalizeLanguage(
        language
    ) {

        const value =
            String(
                language ||
                "ESC"
            )
            .trim()
            .toUpperCase();


        if (
            value === "ESCPOS"
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
            "Language tidak dikenal:",
            language,
            "→ ESC"
        );


        return "ESC";

    }


    /*
    =================================================
     NUMBER
    =================================================
    */

    function number(
        value,
        fallback
    ) {

        const n =
            Number(value);


        return Number.isFinite(n)
            ? n
            : fallback;

    }


    /*
    =================================================
     GET SETTINGS
    =================================================
    */

    function readSettings() {

        if (
            typeof window === "undefined" ||
            !window.Settings
        ) {

            return;

        }


        try {

            const settings =
                Settings.getAll();


            if (!settings) {

                return;

            }


            state.language =
                normalizeLanguage(
                    settings.printLanguage ||
                    state.language
                );


            state.paperWidth =
                number(
                    settings.paperWidth,
                    100
                );


            state.paperHeight =
                number(
                    settings.paperHeight,
                    150
                );


            state.dpi =
                number(
                    settings.dpi,
                    203
                );


            state.copies =
                Math.max(
                    1,
                    Math.floor(
                        number(
                            settings.copies,
                            1
                        )
                    )
                );


            state.density =
                number(
                    settings.density,
                    8
                );


            state.speed =
                number(
                    settings.speed,
                    4
                );


            state.cutPaper =
                Boolean(
                    settings.cutPaper
                );


            state.openDrawer =
                Boolean(
                    settings.openDrawer
                );


            if (
                settings.preview &&
                typeof settings.preview ===
                "object"
            ) {

                state.transparentBackground =
                    settings.preview
                        .transparentBackground !== false;

            }

            else {

                state.transparentBackground =
                    true;

            }


        }

        catch (err) {

            warn(
                "Gagal membaca Settings:",
                err
            );

        }

    }


    /*
    =================================================
     SET LANGUAGE
    =================================================
    */

    function setLanguage(
        language,
        options = {}
    ) {

        const value =
            normalizeLanguage(
                language
            );


        state.language =
            value;


        /*
         * Sinkronisasi balik ke Settings.
         *
         * Jangan panggil Settings.setLanguage()
         * di sini karena dapat membuat recursion.
         */

        if (
            !options.silent &&
            typeof window !== "undefined" &&
            window.Settings
        ) {

            try {

                if (
                    typeof Settings.setLanguage ===
                    "function"
                ) {

                    /*
                     * Settings.setLanguage() akan
                     * menyimpan konfigurasi.
                     */

                    Settings.setLanguage(
                        value
                    );

                }

            }

            catch (err) {

                warn(
                    "Gagal sync language ke Settings:",
                    err
                );

            }

        }


        log(
            "Printer Language:",
            value
        );


        dispatch(
            "language",
            {
                language:
                    value
            }
        );


        return value;

    }


    /*
    =================================================
     GET LANGUAGE
    =================================================
    */

    function getLanguage() {

        return state.language;

    }


    /*
    =================================================
     SET PAPER SIZE
    =================================================
    */

    function setPaperSize(
        width,
        height,
        dpi = state.dpi,
        options = {}
    ) {

        state.paperWidth =
            number(
                width,
                100
            );


        state.paperHeight =
            number(
                height,
                150
            );


        state.dpi =
            number(
                dpi,
                203
            );


        log(
            "Paper:",
            state.paperWidth +
            " x " +
            state.paperHeight +
            " mm"
        );


        log(
            "DPI:",
            state.dpi
        );


        dispatch(
            "papersize",
            {

                width:
                    state.paperWidth,

                height:
                    state.paperHeight,

                dpi:
                    state.dpi

            }
        );


        return {

            width:
                state.paperWidth,

            height:
                state.paperHeight,

            dpi:
                state.dpi

        };

    }


    /*
    =================================================
     GET PAPER SIZE
    =================================================
    */

    function getPaperSize() {

        return {

            width:
                state.paperWidth,

            height:
                state.paperHeight,

            dpi:
                state.dpi

        };

    }


    /*
    =================================================
     CONNECTION
    =================================================
    */

    async function connect() {

        if (
            state.connecting
        ) {

            warn(
                "Printer sedang connecting."
            );


            return false;

        }


        /*
         * Jika sudah connected.
         */

        if (
            isConnected()
        ) {

            log(
                "Printer sudah connected."
            );


            updateConnectionInfo();


            return true;

        }


        state.connecting =
            true;


        state.status =
            "connecting";


        state.lastError =
            null;


        dispatch(
            "connecting"
        );


        log(
            "========================================"
        );


        log(
            "PRINTER CONNECT"
        );


        log(
            "========================================"
        );


        try {

            /*
             * Bluetooth adalah transport utama.
             */

            if (
                typeof window !== "undefined" &&
                window.Bluetooth
            ) {

                log(
                    "Bluetooth.connectUser()"
                );


                const result =
                    await Bluetooth.connectUser();


                if (
                    result &&
                    Bluetooth.isConnected()
                ) {

                    state.connected =
                        true;


                    state.status =
                        "connected";


                    updateConnectionInfo();


                    dispatch(
                        "connected",
                        {

                            info:
                                Bluetooth.getInfo()

                        }
                    );


                    log(
                        "========================================"
                    );


                    log(
                        "PRINTER CONNECTED"
                    );


                    log(
                        "========================================"
                    );


                    return true;

                }

            }


            state.connected =
                false;


            state.status =
                "disconnected";


            warn(
                "Printer belum terhubung."
            );


            dispatch(
                "disconnected"
            );


            return false;

        }

        catch (err) {

            state.connected =
                false;


            state.status =
                "error";


            state.lastError =
                err;


            error(
                "Printer connect error:",
                err
            );


            dispatch(
                "error",
                {
                    error:
                        err
                }
            );


            return false;

        }

        finally {

            state.connecting =
                false;


            dispatch(
                "status"
            );

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
     DISCONNECT
    =================================================
    */

    async function disconnect() {

        try {

            if (
                typeof window !== "undefined" &&
                window.Bluetooth
            ) {

                await Bluetooth.disconnect();

            }

        }

        catch (err) {

            warn(
                "Bluetooth disconnect error:",
                err
            );

        }


        state.connected =
            false;


        state.connecting =
            false;


        state.status =
            "disconnected";


        state.deviceName =
            "";


        state.connectionType =
            null;


        dispatch(
            "disconnected"
        );


        return true;

    }


    /*
    =================================================
     IS CONNECTED
    =================================================
    */

    function isConnected() {

        if (
            typeof window !== "undefined" &&
            window.Bluetooth &&
            typeof Bluetooth.isConnected ===
            "function"
        ) {

            try {

                return Boolean(
                    Bluetooth.isConnected()
                );

            }

            catch (err) {}

        }


        return Boolean(
            state.connected
        );

    }


    /*
    =================================================
     UPDATE CONNECTION INFO
    =================================================
    */

    function updateConnectionInfo() {

        if (
            typeof window === "undefined" ||
            !window.Bluetooth
        ) {

            return;

        }


        try {

            const info =
                Bluetooth.getInfo();


            state.connected =
                Boolean(
                    info.connected
                );


            state.deviceName =
                info.deviceName ||
                "";


            state.connectionType =
                info.type ||
                null;


            if (
                state.connected
            ) {

                state.status =
                    "connected";

            }

            else {

                state.status =
                    "disconnected";

            }


            return info;

        }

        catch (err) {

            return null;

        }

    }


    /*
    =================================================
     PRINT RAW
    =================================================
    */

    async function printRaw(
        data
    ) {

        if (
            typeof window === "undefined" ||
            !window.Bluetooth
        ) {

            throw new Error(
                "Bluetooth Engine tidak tersedia."
            );

        }


        if (
            !Bluetooth.isConnected()
        ) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        let bytes;


        if (
            data instanceof Uint8Array
        ) {

            bytes =
                data;

        }

        else if (
            data instanceof ArrayBuffer
        ) {

            bytes =
                new Uint8Array(
                    data
                );

        }

        else if (
            ArrayBuffer.isView(data)
        ) {

            bytes =
                new Uint8Array(
                    data.buffer,
                    data.byteOffset,
                    data.byteLength
                );

        }

        else {

            throw new TypeError(
                "printRaw() membutuhkan Uint8Array."
            );

        }


        if (
            bytes.length === 0
        ) {

            throw new Error(
                "Data printer kosong."
            );

        }


        log(
            "PRINT RAW:",
            bytes.length,
            "bytes"
        );


        try {

            const result =
                await Bluetooth.sendRaw(
                    bytes
                );


            dispatch(
                "print",
                {

                    bytes:
                        bytes.length,

                    language:
                        state.language

                }
            );


            return result;

        }

        catch (err) {

            state.lastError =
                err;


            error(
                "Print RAW gagal:",
                err
            );


            dispatch(
                "error",
                {
                    error:
                        err
                }
            );


            throw err;

        }

    }


    /*
    =================================================
     ALIASES
    =================================================
    */

    async function print(
        data
    ) {

        return await printRaw(
            data
        );

    }


    async function sendRaw(
        data
    ) {

        return await printRaw(
            data
        );

    }


    async function writeRaw(
        data
    ) {

        return await printRaw(
            data
        );

    }


    /*
    =================================================
     TEST PRINT
    =================================================

     Test print sederhana.

     Untuk tahap awal menggunakan ESC/POS.

     Tidak bergantung pada preview.
    =================================================
    */

    async function testPrint() {

        if (
            !isConnected()
        ) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        /*
         * Jika language bukan ESC,
         * test print tetap dikirim sebagai
         * raw text sederhana hanya untuk
         * diagnosis koneksi.
         */

        const encoder =
            new TextEncoder();


        const text =
            "SMARTPRINT by AppDIGI\n" +
            "================================\n" +
            "PRINTER TEST\n" +
            "Language : " +
            state.language +
            "\n" +
            "Paper    : " +
            state.paperWidth +
            " x " +
            state.paperHeight +
            " mm\n" +
            "DPI      : " +
            state.dpi +
            "\n" +
            "Status   : CONNECTED\n" +
            "================================\n\n";


        const textBytes =
            encoder.encode(
                text
            );


        /*
         * ESC/POS:
         *
         * ESC @
         * text
         * LF
         */

        const esc =
            new Uint8Array(
                [
                    0x1B,
                    0x40
                ]
            );


        const lf =
            new Uint8Array(
                [
                    0x0A,
                    0x0A,
                    0x0A
                ]
            );


        const bytes =
            concat(
                esc,
                textBytes,
                lf
            );


        return await printRaw(
            bytes
        );

    }


    /*
    =================================================
     CONCAT
    =================================================
    */

    function concat(
        ...arrays
    ) {

        let total =
            0;


        arrays.forEach(
            array => {

                total +=
                    array.length;

            }
        );


        const result =
            new Uint8Array(
                total
            );


        let offset =
            0;


        arrays.forEach(
            array => {

                result.set(
                    array,
                    offset
                );


                offset +=
                    array.length;

            }
        );


        return result;

    }


    /*
    =================================================
     GET STATUS
    =================================================
    */

    function getStatus() {

        updateConnectionInfo();


        return {

            connected:
                isConnected(),

            connecting:
                state.connecting,

            status:
                state.status,

            language:
                state.language,

            paperWidth:
                state.paperWidth,

            paperHeight:
                state.paperHeight,

            dpi:
                state.dpi,

            deviceName:
                state.deviceName,

            connectionType:
                state.connectionType,

            transparentBackground:
                state.transparentBackground,

            lastError:
                state.lastError

        };

    }


    /*
    =================================================
     GET INFO
    =================================================
    */

    function getInfo() {

        const status =
            getStatus();


        let bluetoothInfo =
            null;


        if (
            typeof window !== "undefined" &&
            window.Bluetooth &&
            typeof Bluetooth.getInfo ===
            "function"
        ) {

            try {

                bluetoothInfo =
                    Bluetooth.getInfo();

            }

            catch (err) {}

        }


        return {

            version:
                VERSION,

            ...status,

            bluetooth:
                bluetoothInfo

        };

    }


    /*
    =================================================
     GET STATE
    =================================================
    */

    function getState() {

        return {

            ...state

        };

    }


    /*
    =================================================
     SYNC SETTINGS
    =================================================
    */

    function syncSettings() {

        readSettings();


        log(
            "Printer Language:",
            state.language
        );


        log(
            "Paper:",
            state.paperWidth +
            " x " +
            state.paperHeight +
            " mm"
        );


        log(
            "DPI:",
            state.dpi
        );


        log(
            "Transparent background:"
        );


        log(
            state.transparentBackground
                ? "YES - background tidak dikirim"
                : "NO"
        );


        return getState();

    }


    /*
    =================================================
     HANDLE BLUETOOTH CONNECTED
    =================================================
    */

    function handleBluetoothConnected(
        event
    ) {

        state.connected =
            true;


        state.connecting =
            false;


        state.status =
            "connected";


        updateConnectionInfo();


        const info =
            event &&
            event.detail
                ? event.detail
                : {};


        log(
            "========================================"
        );


        log(
            "PRINTER CONNECTED"
        );


        log(
            "Device:",
            state.deviceName ||
            (
                info.device &&
                info.device.name
            ) ||
            "(unknown)"
        );


        log(
            "Connection:",
            state.connectionType ||
            "BLE"
        );


        log(
            "Status: READY"
        );


        log(
            "========================================"
        );


        dispatch(
            "connected",
            {
                info:
                    getInfo()
            }
        );

    }


    /*
    =================================================
     HANDLE BLUETOOTH CONNECTING
    =================================================
    */

    function handleBluetoothConnecting() {

        state.connecting =
            true;


        state.status =
            "connecting";


        dispatch(
            "connecting"
        );

    }


    /*
    =================================================
     HANDLE BLUETOOTH DISCONNECTED
    =================================================
    */

    function handleBluetoothDisconnected() {

        state.connected =
            false;


        state.connecting =
            false;


        state.status =
            "disconnected";


        state.deviceName =
            "";


        state.connectionType =
            null;


        log(
            "Printer Disconnected"
        );


        dispatch(
            "disconnected"
        );

    }


    /*
    =================================================
     HANDLE BLUETOOTH STATUS
    =================================================
    */

    function handleBluetoothStatus() {

        updateConnectionInfo();


        dispatch(
            "status"
        );

    }


    /*
    =================================================
     INITIALIZE
    =================================================
    */

    function init() {

        if (
            state.initialized
        ) {

            return true;

        }


        syncSettings();


        /*
         * Bluetooth events.
         */

        window.addEventListener(
            "smartprint-bluetooth-connected",
            handleBluetoothConnected
        );


        window.addEventListener(
            "smartprint-bluetooth-connecting",
            handleBluetoothConnecting
        );


        window.addEventListener(
            "smartprint-bluetooth-disconnected",
            handleBluetoothDisconnected
        );


        window.addEventListener(
            "smartprint-bluetooth-status",
            handleBluetoothStatus
        );


        /*
         * Jika Bluetooth sudah connected
         * sebelum Printer init.
         */

        setTimeout(
            function () {

                updateConnectionInfo();

            },
            100
        );


        state.initialized =
            true;


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
            state.language
        );


        log(
            "Paper:",
            state.paperWidth +
            " x " +
            state.paperHeight +
            " mm"
        );


        log(
            "DPI:",
            state.dpi
        );


        log(
            "Transparent background:"
        );


        log(
            state.transparentBackground
                ? "YES - background tidak dikirim"
                : "NO"
        );


        log(
            "Printer Manager initialized."
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

        state,

        init,

        connect,

        connectBluetooth,

        disconnect,

        isConnected,

        setLanguage,

        getLanguage,

        setPaperSize,

        getPaperSize,

        print,

        printRaw,

        sendRaw,

        writeRaw,

        testPrint,

        getStatus,

        getInfo,

        getState,

        syncSettings

    };


    /*
    =================================================
     GLOBAL
    =================================================
    */

    window.Printer =
        Printer;


    window.PrinterManager =
        Printer;


    window.SmartPrintPrinter =
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
     DOM READY
    =================================================
    */

    function start() {

        setTimeout(
            function () {

                Printer.init();

            },
            100
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once:
                    true
            }
        );

    }

    else {

        start();

    }


})();
