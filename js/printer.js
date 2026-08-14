"use strict";

/*
=====================================================
 SmartPrint Printer Manager v4.2.0
=====================================================

 PURPOSE
 ----------------------------------------------------
 Central printer manager untuk SmartPrint.

 COMPATIBLE
 ----------------------------------------------------
 Bluetooth Engine v5.7.0
 Settings Manager v4.2.0
 ESC/POS Engine
 TSPL Engine
 ZPL Engine
 CPCL Engine
 Preview Engine

 CONNECTION
 ----------------------------------------------------
 Printer.connect()
      ↓
 Bluetooth.connectUser()
      ↓
 BLE picker
      ↓
 GATT
      ↓
 WRITE characteristic
      ↓
 Printer Connected

 PRINT
 ----------------------------------------------------
 printRaw(Uint8Array)
 sendRaw(Uint8Array)
 print()

 BACKGROUND
 ----------------------------------------------------
 Transparent background.

 Hanya data object yang dikirim.
 Background putih / transparan preview
 tidak dikirim sebagai tinta.

 PAPER
 ----------------------------------------------------
 Mengikuti Settings.

 Default:
 100 x 150 mm
 203 DPI

 LANGUAGE
 ----------------------------------------------------
 ESC
 TSPL
 ZPL
 CPCL

=====================================================
*/


(function () {

    "use strict";


    /*
    =================================================
     VERSION
    =================================================
    */

    const VERSION = "4.2.0";


    /*
    =================================================
     STATE
    =================================================
    */

    let initialized = false;

    let connecting = false;

    let printing = false;

    let printerConnected = false;

    let printerLanguage = "ESC";

    let lastError = null;

    let lastPrintTime = 0;


    /*
    =================================================
     DEFAULT CONFIG
    =================================================
    */

    const CONFIG = {

        language:
            "ESC",

        paperWidth:
            100,

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

        transparentBackground:
            true,

        density:
            8,

        speed:
            4,

        copies:
            1,

        autoConnect:
            true,

        cutPaper:
            false,

        openDrawer:
            false

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
        eventName,
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-printer-" +
                    eventName,
                    {
                        detail
                    }
                )
            );

        }

        catch (e) {}

    }


    /*
    =================================================
     SETTINGS ACCESS
    =================================================
    */

    function getSettings() {

        /*
         * SmartPrint Settings Manager.
         */

        try {

            if (
                window.Settings &&
                typeof window.Settings.get ===
                "function"
            ) {

                const settings =
                    window.Settings.get();

                if (
                    settings &&
                    typeof settings ===
                    "object"
                ) {

                    return settings;

                }

            }

        }

        catch (err) {

            warn(
                "Settings.get() gagal:",
                err
            );

        }


        /*
         * Coba getAll().
         */

        try {

            if (
                window.Settings &&
                typeof window.Settings.getAll ===
                "function"
            ) {

                const settings =
                    window.Settings.getAll();

                if (
                    settings &&
                    typeof settings ===
                    "object"
                ) {

                    return settings;

                }

            }

        }

        catch (err) {}


        /*
         * Coba properties langsung.
         */

        try {

            if (
                window.Settings &&
                window.Settings.settings
            ) {

                return window.Settings.settings;

            }

        }

        catch (err) {}


        /*
         * LocalStorage fallback.
         */

        try {

            const raw =
                localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );


            if (raw) {

                const parsed =
                    JSON.parse(raw);

                if (
                    parsed &&
                    typeof parsed ===
                    "object"
                ) {

                    return parsed;

                }

            }

        }

        catch (err) {

            warn(
                "Tidak dapat membaca SMARTPRINT_SETTINGS."
            );

        }


        return {};

    }


    /*
    =================================================
     SYNC SETTINGS
    =================================================
    */

    function syncSettings() {

        const settings =
            getSettings();


        /*
         * Printer language
         */

        const language =
            settings.printLanguage ||
            settings.languagePrinter ||
            settings.printerLanguage ||
            settings.language ||
            CONFIG.language;


        setLanguageInternal(
            language,
            false
        );


        /*
         * Paper
         */

        CONFIG.paperWidth =
            numberOr(
                settings.paperWidth,
                CONFIG.paperWidth
            );


        CONFIG.paperHeight =
            numberOr(
                settings.paperHeight,
                CONFIG.paperHeight
            );


        /*
         * Label
         */

        CONFIG.labelWidth =
            numberOr(
                settings.labelWidth,
                CONFIG.paperWidth
            );


        CONFIG.labelHeight =
            numberOr(
                settings.labelHeight,
                CONFIG.paperHeight
            );


        CONFIG.gap =
            numberOr(
                settings.gap,
                CONFIG.gap
            );


        CONFIG.marginLeft =
            numberOr(
                settings.marginLeft,
                CONFIG.marginLeft
            );


        CONFIG.marginTop =
            numberOr(
                settings.marginTop,
                CONFIG.marginTop
            );


        /*
         * DPI
         */

        CONFIG.dpi =
            numberOr(
                settings.dpi,
                CONFIG.dpi
            );


        /*
         * Print
         */

        CONFIG.density =
            numberOr(
                settings.density,
                CONFIG.density
            );


        CONFIG.speed =
            numberOr(
                settings.speed,
                CONFIG.speed
            );


        CONFIG.copies =
            Math.max(
                1,
                Math.floor(
                    numberOr(
                        settings.copies,
                        CONFIG.copies
                    )
                )
            );


        /*
         * Boolean settings
         */

        if (
            typeof settings.cutPaper ===
            "boolean"
        ) {

            CONFIG.cutPaper =
                settings.cutPaper;

        }


        if (
            typeof settings.openDrawer ===
            "boolean"
        ) {

            CONFIG.openDrawer =
                settings.openDrawer;

        }


        /*
         * Background harus transparan.
         */

        CONFIG.transparentBackground =
            true;


        log(
            "Printer Language:",
            printerLanguage
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
            "YES - background tidak dikirim"
        );


        return getInfo();

    }


    /*
    =================================================
     NUMBER
    =================================================
    */

    function numberOr(
        value,
        fallback
    ) {

        const number =
            Number(value);


        if (
            Number.isFinite(number)
        ) {

            return number;

        }


        return fallback;

    }


    /*
    =================================================
     LANGUAGE NORMALIZE
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
            value === "ESCPOS" ||
            value === "ESC/POS" ||
            value === "ESC_POS"
        ) {

            return "ESC";

        }


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


        return "ESC";

    }


    /*
    =================================================
     SET LANGUAGE INTERNAL
    =================================================
    */

    function setLanguageInternal(
        language,
        announce = true
    ) {

        printerLanguage =
            normalizeLanguage(
                language
            );


        CONFIG.language =
            printerLanguage;


        if (
            announce
        ) {

            log(
                "Printer language changed:",
                printerLanguage
            );


            dispatch(
                "language",
                {
                    language:
                        printerLanguage
                }
            );

        }


        return printerLanguage;

    }


    /*
    =================================================
     SET LANGUAGE
    =================================================
    */

    function setLanguage(
        language
    ) {

        return setLanguageInternal(
            language,
            true
        );

    }


    /*
    =================================================
     GET LANGUAGE
    =================================================
    */

    function getLanguage() {

        return printerLanguage;

    }


    /*
    =================================================
     GET PAPER
    =================================================
    */

    function getPaperSize() {

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
     MM TO DOT
    =================================================
    */

    function mmToDots(
        mm
    ) {

        return Math.round(
            Number(mm) *
            CONFIG.dpi /
            25.4
        );

    }


    /*
    =================================================
     DOT TO MM
    =================================================
    */

    function dotsToMm(
        dots
    ) {

        return (
            Number(dots) *
            25.4 /
            CONFIG.dpi
        );

    }


    /*
    =================================================
     PAPER DOT SIZE
    =================================================
    */

    function getPaperDots() {

        return {

            width:
                mmToDots(
                    CONFIG.paperWidth
                ),

            height:
                mmToDots(
                    CONFIG.paperHeight
                )

        };

    }


    /*
    =================================================
     LABEL DOT SIZE
    =================================================
    */

    function getLabelDots() {

        return {

            width:
                mmToDots(
                    CONFIG.labelWidth
                ),

            height:
                mmToDots(
                    CONFIG.labelHeight
                )

        };

    }


    /*
    =================================================
     CHECK BLUETOOTH
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


        if (
            window.BluetoothEngine
        ) {

            return window.BluetoothEngine;

        }


        return null;

    }


    /*
    =================================================
     BLUETOOTH CONNECTED
    =================================================
    */

    function isBluetoothConnected() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            return false;

        }


        try {

            if (
                typeof bluetooth.isConnected ===
                "function"
            ) {

                return Boolean(
                    bluetooth.isConnected()
                );

            }

        }

        catch (err) {}


        return false;

    }


    /*
    =================================================
     GET BLUETOOTH INFO
    =================================================
    */

    function getBluetoothInfo() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            return null;

        }


        try {

            if (
                typeof bluetooth.getInfo ===
                "function"
            ) {

                return bluetooth.getInfo();

            }

        }

        catch (err) {}


        return null;

    }


    /*
    =================================================
     CONNECT
    =================================================

     IMPORTANT

     false dari Bluetooth.connectUser()
     TIDAK dianggap exception.

     false dapat berarti:

       - user cancel picker
       - device tidak tersedia
       - connection gagal

     Hanya tampilkan status,
     jangan throw "Printer belum terhubung".

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
                status:
                    "connecting"
            }
        );


        try {

            syncSettings();


            const bluetooth =
                getBluetooth();


            if (
                !bluetooth
            ) {

                throw new Error(
                    "Bluetooth Engine tidak tersedia."
                );

            }


            log(
                "========================================"
            );


            log(
                "PRINTER USER CONNECT"
            );


            log(
                "========================================"
            );


            /*
             * User connection.
             *
             * Ini yang membuka picker.
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

            else {

                throw new Error(
                    "Bluetooth Engine tidak memiliki connectUser()."
                );

            }


            /*
             * User cancel / connection gagal.
             */

            if (
                !result
            ) {

                /*
                 * Jangan membuat exception.
                 */

                printerConnected =
                    false;


                dispatch(
                    "disconnected",
                    {
                        reason:
                            "cancelled_or_failed"
                    }
                );


                dispatch(
                    "status",
                    {
                        connected:
                            false,

                        message:
                            "Printer belum terhubung"

                    }
                );


                log(
                    "Printer belum terhubung."
                );


                return false;

            }


            /*
             * Pastikan benar-benar connected.
             */

            if (
                !isBluetoothConnected()
            ) {

                printerConnected =
                    false;


                warn(
                    "Bluetooth.connectUser() berhasil tetapi BLE belum connected."
                );


                dispatch(
                    "status",
                    {
                        connected:
                            false,

                        message:
                            "Printer belum terhubung"

                    }
                );


                return false;

            }


            /*
             * Ambil info printer.
             */

            const info =
                getBluetoothInfo() ||
                {};


            printerConnected =
                true;


            log(
                "========================================"
            );


            log(
                "PRINTER CONNECTED"
            );


            log(
                "Name:",
                info.deviceName ||
                "Bluetooth Printer"
            );


            log(
                "Type:",
                info.type ||
                "BLE"
            );


            log(
                "Language:",
                printerLanguage
            );


            log(
                "Paper:",
                CONFIG.paperWidth +
                " x " +
                CONFIG.paperHeight +
                " mm"
            );


            log(
                "========================================"
            );


            dispatch(
                "connected",
                {

                    connected:
                        true,

                    type:
                        info.type ||
                        "BLE",

                    deviceName:
                        info.deviceName ||
                        "Bluetooth Printer",

                    deviceId:
                        info.deviceId ||
                        "",

                    language:
                        printerLanguage,

                    paperWidth:
                        CONFIG.paperWidth,

                    paperHeight:
                        CONFIG.paperHeight

                }
            );


            dispatch(
                "status",
                {

                    connected:
                        true,

                    message:
                        "Printer Connected",

                    deviceName:
                        info.deviceName ||
                        "Bluetooth Printer"

                }
            );


            return true;

        }

        catch (err) {

            lastError =
                err;


            printerConnected =
                false;


            /*
             * Cancel picker bukan error fatal.
             */

            if (
                err &&
                (
                    err.name ===
                    "NotFoundError" ||

                    err.name ===
                    "AbortError"
                )
            ) {

                log(
                    "Printer connection cancelled."
                );


                dispatch(
                    "status",
                    {
                        connected:
                            false,

                        message:
                            "Printer belum terhubung"
                    }
                );


                return false;

            }


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


            dispatch(
                "status",
                {

                    connected:
                        false,

                    message:
                        err.message ||
                        "Gagal menghubungkan printer"

                }
            );


            return false;

        }

        finally {

            connecting =
                false;


            dispatch(
                "ready",
                {
                    connected:
                        printerConnected
                }
            );

        }

    }


    /*
    =================================================
     CONNECT NEW
    =================================================
    */

    async function connectNew() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            error(
                "Bluetooth Engine tidak tersedia."
            );


            return false;

        }


        if (
            typeof bluetooth.connectBLENew !==
            "function"
        ) {

            return connect();

        }


        connecting =
            true;


        try {

            const result =
                await bluetooth.connectBLENew();


            if (
                !result ||
                !isBluetoothConnected()
            ) {

                printerConnected =
                    false;


                dispatch(
                    "status",
                    {
                        connected:
                            false,

                        message:
                            "Printer belum terhubung"
                    }
                );


                return false;

            }


            printerConnected =
                true;


            const info =
                getBluetoothInfo() ||
                {};


            dispatch(
                "connected",
                {

                    connected:
                        true,

                    type:
                        "BLE",

                    deviceName:
                        info.deviceName ||
                        "Bluetooth Printer",

                    deviceId:
                        info.deviceId ||
                        ""

                }
            );


            dispatch(
                "status",
                {

                    connected:
                        true,

                    message:
                        "Printer Connected",

                    deviceName:
                        info.deviceName ||
                        "Bluetooth Printer"

                }
            );


            return true;

        }

        catch (err) {

            lastError =
                err;


            printerConnected =
                false;


            error(
                "connectNew error:",
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
     AUTO CONNECT
    =================================================
    */

    async function autoConnect() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            return false;

        }


        try {

            if (
                typeof bluetooth.autoConnect !==
                "function"
            ) {

                return false;

            }


            const result =
                await bluetooth.autoConnect();


            if (
                result &&
                isBluetoothConnected()
            ) {

                printerConnected =
                    true;


                const info =
                    getBluetoothInfo() ||
                    {};


                dispatch(
                    "connected",
                    {

                        connected:
                            true,

                        type:
                            info.type ||
                            "BLE",

                        deviceName:
                            info.deviceName ||
                            "Bluetooth Printer",

                        deviceId:
                            info.deviceId ||
                            ""

                    }
                );


                dispatch(
                    "status",
                    {

                        connected:
                            true,

                        message:
                            "Printer Connected",

                        deviceName:
                            info.deviceName ||
                            "Bluetooth Printer"

                    }
                );


                return true;

            }


            printerConnected =
                false;


            return false;

        }

        catch (err) {

            warn(
                "Printer Auto Connect gagal:",
                err
            );


            printerConnected =
                false;


            return false;

        }

    }


    /*
    =================================================
     CONNECT SERIAL
    =================================================
    */

    async function connectSerial() {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            return false;

        }


        try {

            if (
                typeof bluetooth.connectSerial !==
                "function"
            ) {

                throw new Error(
                    "Bluetooth Engine tidak mendukung Web Serial."
                );

            }


            const result =
                await bluetooth.connectSerial();


            if (
                result
            ) {

                printerConnected =
                    true;


                dispatch(
                    "connected",
                    {

                        connected:
                            true,

                        type:
                            "SERIAL",

                        deviceName:
                            "Serial Printer"

                    }
                );


                dispatch(
                    "status",
                    {

                        connected:
                            true,

                        message:
                            "Printer Connected"

                    }
                );


                return true;

            }


            return false;

        }

        catch (err) {

            lastError =
                err;


            printerConnected =
                false;


            error(
                "Serial connection error:",
                err
            );


            return false;

        }

    }


    /*
    =================================================
     CONNECT BRIDGE
    =================================================
    */

    async function connectBridge(
        url = null
    ) {

        const bluetooth =
            getBluetooth();


        if (
            !bluetooth
        ) {

            return false;

        }


        try {

            if (
                typeof bluetooth.connectBridge !==
                "function"
            ) {

                throw new Error(
                    "Bluetooth Engine tidak mendukung Bridge."
                );

            }


            const result =
                await bluetooth.connectBridge(
                    url
                );


            if (
                result
            ) {

                printerConnected =
                    true;


                dispatch(
                    "connected",
                    {

                        connected:
                            true,

                        type:
                            "BRIDGE",

                        deviceName:
                            "SmartPrint Bridge"

                    }
                );


                dispatch(
                    "status",
                    {

                        connected:
                            true,

                        message:
                            "Printer Connected"

                    }
                );


                return true;

            }


            return false;

        }

        catch (err) {

            lastError =
                err;


            printerConnected =
                false;


            error(
                "Bridge connection error:",
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

        const bluetooth =
            getBluetooth();


        if (
            bluetooth &&
            typeof bluetooth.isConnected ===
            "function"
        ) {

            try {

                printerConnected =
                    Boolean(
                        bluetooth.isConnected()
                    );

            }

            catch (err) {}

        }


        return printerConnected;

    }


    /*
    =================================================
     NORMALIZE BYTES
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
            "Printer data harus Uint8Array, ArrayBuffer, TypedArray, atau Array."
        );

    }


    /*
    =================================================
     SEND RAW
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


        if (
            !bluetooth
        ) {

            throw new Error(
                "Bluetooth Engine tidak tersedia."
            );

        }


        if (
            !bluetooth.isConnected ||
            !bluetooth.isConnected()
        ) {

            printerConnected =
                false;


            throw new Error(
                "Printer belum terhubung."
            );

        }


        if (
            typeof bluetooth.sendRaw !==
            "function"
        ) {

            throw new Error(
                "Bluetooth Engine tidak memiliki sendRaw()."
            );

        }


        log(
            "Sending RAW:",
            bytes.length,
            "bytes"
        );


        try {

            const result =
                await bluetooth.sendRaw(
                    bytes
                );


            if (
                result
            ) {

                lastPrintTime =
                    Date.now();

            }


            return Boolean(
                result
            );

        }

        catch (err) {

            lastError =
                err;


            error(
                "sendRaw error:",
                err
            );


            throw err;

        }

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


    /*
    =================================================
     WRITE
    =================================================
    */

    async function write(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     RAW
    =================================================
    */

    async function raw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     WRITE RAW
    =================================================
    */

    async function writeRaw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     PRINT RAW
    =================================================
    */

    async function printRaw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     PRINT BYTES
    =================================================
    */

    async function printBytes(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     TEXT TO ESC/POS
    =================================================

     Basic fallback.

     Untuk printer ESC/POS:

       Initialize
       Align left
       Text
       New line

    =================================================
    */

    function textToESC(
        text
    ) {

        const encoder =
            new TextEncoder();


        const content =
            String(
                text === undefined ||
                text === null
                    ? ""
                    : text
            );


        const textBytes =
            encoder.encode(
                content
            );


        const result =
            new Uint8Array(
                3 +
                textBytes.length +
                2
            );


        /*
         * ESC @
         */

        result[0] =
            0x1B;


        result[1] =
            0x40;


        /*
         * Text
         */

        result.set(
            textBytes,
            2
        );


        /*
         * Newline
         */

        result[
            2 +
            textBytes.length
        ] =
            0x0A;


        /*
         * Extra newline
         */

        result[
            3 +
            textBytes.length
        ] =
            0x0A;


        return result;

    }


    /*
    =================================================
     PRINT TEXT
    =================================================
    */

    async function printText(
        text
    ) {

        const language =
            normalizeLanguage(
                printerLanguage
            );


        /*
         * Untuk ESC/POS gunakan
         * basic text encoder.
         */

        if (
            language ===
            "ESC"
        ) {

            const bytes =
                textToESC(
                    text
                );


            return await printRaw(
                bytes
            );

        }


        /*
         * Jika engine bahasa printer
         * memiliki text API, coba gunakan.
         */

        try {

            if (
                language === "TSPL" &&
                window.TSPL &&
                typeof window.TSPL.text ===
                "function"
            ) {

                const bytes =
                    await window.TSPL.text(
                        String(text)
                    );


                return await printRaw(
                    bytes
                );

            }

        }

        catch (err) {

            warn(
                "TSPL text fallback:",
                err
            );

        }


        /*
         * Fallback ESC.
         */

        return await printRaw(
            textToESC(
                text
            )
        );

    }


    /*
    =================================================
     PRINT OBJECT
    =================================================

     object dapat berupa:

       Uint8Array
       ArrayBuffer
       String
       Object dengan bytes/raw/data

    =================================================
    */

    async function print(
        payload
    ) {

        if (
            payload === undefined ||
            payload === null
        ) {

            throw new TypeError(
                "Printer.print(): payload kosong."
            );

        }


        /*
         * RAW
         */

        if (
            payload instanceof Uint8Array ||
            payload instanceof ArrayBuffer ||
            ArrayBuffer.isView(payload) ||
            Array.isArray(payload)
        ) {

            return await printRaw(
                payload
            );

        }


        /*
         * String
         */

        if (
            typeof payload ===
            "string"
        ) {

            return await printText(
                payload
            );

        }


        /*
         * Object dengan raw.
         */

        if (
            payload.raw
        ) {

            return await printRaw(
                payload.raw
            );

        }


        /*
         * Object dengan bytes.
         */

        if (
            payload.bytes
        ) {

            return await printRaw(
                payload.bytes
            );

        }


        /*
         * Object dengan data.
         */

        if (
            payload.data
        ) {

            try {

                return await printRaw(
                    payload.data
                );

            }

            catch (err) {}

        }


        /*
         * Object dengan text.
         */

        if (
            typeof payload.text ===
            "string"
        ) {

            return await printText(
                payload.text
            );

        }


        throw new TypeError(
            "Format payload Printer.print() tidak dikenali."
        );

    }


    /*
    =================================================
     PRINT COPIES
    =================================================
    */

    async function printCopies(
        data,
        copies = null
    ) {

        const count =
            Math.max(
                1,
                Math.floor(
                    numberOr(
                        copies,
                        CONFIG.copies
                    )
                )
            );


        let result =
            false;


        for (
            let i = 0;
            i < count;
            i++
        ) {

            result =
                await print(
                    data
                );

        }


        return result;

    }


    /*
    =================================================
     DISCONNECT
    =================================================
    */

    async function disconnect() {

        const bluetooth =
            getBluetooth();


        try {

            if (
                bluetooth &&
                typeof bluetooth.disconnect ===
                "function"
            ) {

                await bluetooth.disconnect();

            }

        }

        catch (err) {

            warn(
                "Printer disconnect error:",
                err
            );

        }


        printerConnected =
            false;


        dispatch(
            "disconnected",
            {
                reason:
                    "manual"
            }
        );


        dispatch(
            "status",
            {
                connected:
                    false,

                message:
                    "Printer Disconnected"

            }
        );


        log(
            "Printer disconnected."
        );


        return true;

    }


    /*
    =================================================
     GET DEVICE
    =================================================
    */

    function getDevice() {

        const bluetooth =
            getBluetooth();


        if (
            bluetooth &&
            typeof bluetooth.getDevice ===
            "function"
        ) {

            return bluetooth.getDevice();

        }


        return null;

    }


    /*
    =================================================
     GET DEVICE NAME
    =================================================
    */

    function getDeviceName() {

        const bluetooth =
            getBluetooth();


        if (
            bluetooth &&
            typeof bluetooth.getDeviceName ===
            "function"
        ) {

            return (
                bluetooth.getDeviceName() ||
                ""
            );

        }


        const info =
            getBluetoothInfo();


        if (
            info &&
            info.deviceName
        ) {

            return info.deviceName;

        }


        return "";

    }


    /*
    =================================================
     GET INFO
    =================================================
    */

    function getInfo() {

        const bluetoothInfo =
            getBluetoothInfo();


        return {

            version:
                VERSION,

            connected:
                isConnected(),

            type:
                bluetoothInfo
                    ? bluetoothInfo.type ||
                      null
                    : null,

            deviceName:
                getDeviceName(),

            deviceId:
                bluetoothInfo
                    ? bluetoothInfo.deviceId ||
                      ""
                    : "",

            language:
                printerLanguage,

            paperWidth:
                CONFIG.paperWidth,

            paperHeight:
                CONFIG.paperHeight,

            labelWidth:
                CONFIG.labelWidth,

            labelHeight:
                CONFIG.labelHeight,

            gap:
                CONFIG.gap,

            dpi:
                CONFIG.dpi,

            paperDots:
                getPaperDots(),

            labelDots:
                getLabelDots(),

            transparentBackground:
                true,

            printing:
                printing,

            connecting:
                connecting,

            lastError:
                lastError
                    ? (
                        lastError.message ||
                        String(lastError)
                    )
                    : null,

            lastPrintTime:
                lastPrintTime

        };

    }


    /*
    =================================================
     STATUS
    =================================================
    */

    function getStatus() {

        return {

            connected:
                isConnected(),

            connecting:
                connecting,

            printing:
                printing,

            language:
                printerLanguage,

            deviceName:
                getDeviceName(),

            message:
                isConnected()
                    ? "Printer Connected"
                    : "Printer belum terhubung"

        };

    }


    /*
    =================================================
     CLEAR ERROR
    =================================================
    */

    function clearError() {

        lastError =
            null;


        return true;

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

        const w =
            Number(width);


        const h =
            Number(height);


        if (
            !Number.isFinite(w) ||
            !Number.isFinite(h) ||
            w <= 0 ||
            h <= 0
        ) {

            throw new Error(
                "Ukuran kertas tidak valid."
            );

        }


        CONFIG.paperWidth =
            w;


        CONFIG.paperHeight =
            h;


        CONFIG.labelWidth =
            w;


        CONFIG.labelHeight =
            h;


        log(
            "Paper changed:",
            w +
            " x " +
            h +
            " mm"
        );


        dispatch(
            "paper",
            {
                width:
                    w,

                height:
                    h
            }
        );


        return getPaperSize();

    }


    /*
    =================================================
     SET LABEL SIZE
    =================================================
    */

    function setLabelSize(
        width,
        height
    ) {

        const w =
            Number(width);


        const h =
            Number(height);


        if (
            !Number.isFinite(w) ||
            !Number.isFinite(h) ||
            w <= 0 ||
            h <= 0
        ) {

            throw new Error(
                "Ukuran label tidak valid."
            );

        }


        CONFIG.labelWidth =
            w;


        CONFIG.labelHeight =
            h;


        return {

            width:
                w,

            height:
                h

        };

    }


    /*
    =================================================
     SET DPI
    =================================================
    */

    function setDPI(
        dpi
    ) {

        const value =
            Number(dpi);


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            throw new Error(
                "DPI tidak valid."
            );

        }


        CONFIG.dpi =
            value;


        return value;

    }


    /*
    =================================================
     INITIALIZE
    =================================================
    */

    async function init() {

        if (
            initialized
        ) {

            /*
             * Tetap sync Settings,
             * karena user mungkin mengubah
             * setting setelah init.
             */

            syncSettings();


            return true;

        }


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


        syncSettings();


        initialized =
            true;


        /*
         * Dengarkan perubahan Bluetooth.
         */

        try {

            window.addEventListener(
                "smartprint-bluetooth-connected",
                handleBluetoothConnected
            );


            window.addEventListener(
                "smartprint-bluetooth-disconnected",
                handleBluetoothDisconnected
            );


            window.addEventListener(
                "smartprint-bluetooth-status",
                handleBluetoothStatus
            );

        }

        catch (err) {}


        /*
         * AutoConnect tidak membuka picker.
         */

        if (
            CONFIG.autoConnect
        ) {

            setTimeout(
                () => {

                    autoConnect();

                },
                200
            );

        }


        log(
            "Printer Manager initialized."
        );


        return true;

    }


    /*
    =================================================
     BLUETOOTH CONNECTED EVENT
    =================================================
    */

    function handleBluetoothConnected(
        event
    ) {

        printerConnected =
            true;


        const detail =
            event &&
            event.detail
                ? event.detail
                : {};


        const info =
            getBluetoothInfo() ||
            {};


        dispatch(
            "connected",
            {

                connected:
                    true,

                type:
                    detail.type ||
                    info.type ||
                    "BLE",

                deviceName:
                    detail.deviceName ||
                    info.deviceName ||
                    "Bluetooth Printer",

                deviceId:
                    detail.deviceId ||
                    info.deviceId ||
                    ""

            }
        );


        dispatch(
            "status",
            {

                connected:
                    true,

                message:
                    "Printer Connected",

                deviceName:
                    detail.deviceName ||
                    info.deviceName ||
                    "Bluetooth Printer"

            }
        );


        log(
            "Printer Connected:",
            detail.deviceName ||
            info.deviceName ||
            "Bluetooth Printer"
        );

    }


    /*
    =================================================
     BLUETOOTH DISCONNECTED EVENT
    =================================================
    */

    function handleBluetoothDisconnected() {

        printerConnected =
            false;


        dispatch(
            "disconnected",
            {
                reason:
                    "bluetooth"
            }
        );


        dispatch(
            "status",
            {

                connected:
                    false,

                message:
                    "Printer Disconnected"

            }
        );


        log(
            "Printer Disconnected."
        );

    }


    /*
    =================================================
     BLUETOOTH STATUS
    =================================================
    */

    function handleBluetoothStatus(
        event
    ) {

        const detail =
            event &&
            event.detail
                ? event.detail
                : {};


        if (
            detail.connected
        ) {

            printerConnected =
                true;

        }

        else if (
            detail.connected ===
            false
        ) {

            printerConnected =
                false;

        }


        dispatch(
            "status",
            {

                connected:
                    printerConnected,

                message:
                    printerConnected
                        ? "Printer Connected"
                        : "Printer belum terhubung"

            }
        );

    }


    /*
    =================================================
     UPDATE SETTINGS
    =================================================
    */

    function updateSettings() {

        return syncSettings();

    }


    /*
    =================================================
     CONFIG GET
    =================================================
    */

    function getConfig() {

        return {

            ...CONFIG,

            language:
                printerLanguage,

            paperDots:
                getPaperDots(),

            labelDots:
                getLabelDots(),

            transparentBackground:
                true

        };

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    const Printer = {

        /*
         * Identity
         */

        version:
            VERSION,


        /*
         * Configuration
         */

        config:
            CONFIG,


        getConfig,


        /*
         * Initialization
         */

        init,


        initialize:
            init,


        /*
         * Settings
         */

        sync:
            syncSettings,

        updateSettings,

        setLanguage,

        getLanguage,


        /*
         * Paper
         */

        setPaperSize,

        setLabelSize,

        setDPI,

        getPaperSize,

        getPaperDots,

        getLabelDots,

        mmToDots,

        dotsToMm,


        /*
         * Connection
         */

        connect,

        connectNew,

        connectBLE:
            connect,

        connectUser:
            connect,

        autoConnect,

        connectSerial,

        connectBridge,

        disconnect,


        /*
         * State
         */

        isConnected,

        getStatus,

        getInfo,

        getDevice,

        getDeviceName,


        /*
         * Printing
         */

        print,

        printText,

        printRaw,

        printBytes,

        printCopies,

        sendRaw,

        send,

        write,

        raw,

        writeRaw,


        /*
         * Error
         */

        clearError,


        /*
         * Status
         */

        get lastError() {

            return lastError;

        }

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
     READY LOG
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
     AUTO INITIALIZE
    =================================================
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
                    100
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
            100
        );

    }


})();
