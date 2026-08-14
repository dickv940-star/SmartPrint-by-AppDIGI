"use strict";

/*
=========================================================
 SmartPrint Printer Manager v4.2.0
=========================================================

 TARGET
 --------------------------------------------------------
 Bluetooth BLE Thermal / Label Printer

 TRANSPORT
 --------------------------------------------------------
 Bluetooth.sendRaw(Uint8Array)

 SUPPORTED
 --------------------------------------------------------
 ESC/POS
 TSPL
 ZPL
 CPCL

 DESIGN
 --------------------------------------------------------
 - Tidak membatasi nama printer
 - Tidak melakukan device compatibility filtering
 - Semua BLE device yang dipilih user diteruskan
   ke Bluetooth Engine
 - Printer dianggap compatible jika BLE berhasil connect
   dan WRITE characteristic ditemukan
 - Paper size mengikuti Settings
 - Background transparan
 - Hanya pixel tinta hitam yang dikirim
=========================================================
*/


(function () {

    "use strict";


    /*
    =====================================================
     VERSION
    =====================================================
    */

    const VERSION = "4.2.0";


    /*
    =====================================================
     STATE
    =====================================================
    */

    let initialized = false;

    let connecting = false;

    let connected = false;

    let language = "ESC";

    let printerName = "";

    let printerType = "BLE";

    let lastError = null;


    /*
    =====================================================
     DEFAULT CONFIG
    =====================================================
    */

    const DEFAULTS = {

        language: "ESC",

        paperWidth: 100,

        paperHeight: 150,

        labelWidth: 100,

        labelHeight: 150,

        gap: 2,

        marginLeft: 0,

        marginTop: 0,

        dpi: 203,

        canvasWidth: 799,

        canvasHeight: 1199,

        copies: 1,

        density: 8,

        speed: 4,

        transparentBackground: true,

        cutPaper: false,

        openDrawer: false

    };


    /*
    =====================================================
     CONFIG
    =====================================================
    */

    let config = {

        ...DEFAULTS

    };


    /*
    =====================================================
     LOG
    =====================================================
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
    =====================================================
     EVENT
    =====================================================
    */

    function dispatch(
        name,
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-printer-" + name,
                    {
                        detail
                    }
                )
            );

        }

        catch (e) {}

    }


    /*
    =====================================================
     SETTINGS READER
    =====================================================
    */

    function readSettings() {

        try {

            if (
                window.Settings &&
                typeof Settings.get === "function"
            ) {

                const s =
                    Settings.get();

                if (s) {

                    applySettings(s);

                    return config;

                }

            }

        }

        catch (e) {

            warn(
                "Settings.get() gagal:",
                e
            );

        }


        /*
         * Coba properti langsung.
         */

        try {

            if (
                window.Settings
            ) {

                applySettings(
                    Settings
                );

            }

        }

        catch (e) {}


        return config;

    }


    /*
    =====================================================
     APPLY SETTINGS
    =====================================================
    */

    function applySettings(
        settings
    ) {

        if (
            !settings ||
            typeof settings !== "object"
        ) {

            return config;

        }


        const source =
            settings.settings ||
            settings.config ||
            settings;


        const fields = [

            "language",
            "printLanguage",

            "paperWidth",
            "paperHeight",

            "labelWidth",
            "labelHeight",

            "gap",

            "marginLeft",
            "marginTop",

            "dpi",

            "canvasWidth",
            "canvasHeight",

            "copies",

            "density",
            "speed",

            "transparentBackground",

            "cutPaper",
            "openDrawer"

        ];


        for (
            const key of fields
        ) {

            if (
                source[key] !== undefined &&
                source[key] !== null
            ) {

                if (
                    key === "printLanguage"
                ) {

                    language =
                        String(
                            source[key]
                        ).toUpperCase();

                    continue;

                }


                config[key] =
                    source[key];

            }

        }


        /*
         * Jika language tersedia.
         */

        if (
            source.language !== undefined
        ) {

            language =
                String(
                    source.language
                ).toUpperCase();

        }


        /*
         * Jika printLanguage tersedia.
         */

        if (
            source.printLanguage !== undefined
        ) {

            language =
                String(
                    source.printLanguage
                ).toUpperCase();

        }


        /*
         * Label size menjadi prioritas
         * apabila tersedia.
         */

        if (
            source.labelWidth !== undefined
        ) {

            config.paperWidth =
                Number(
                    source.labelWidth
                );

        }


        if (
            source.labelHeight !== undefined
        ) {

            config.paperHeight =
                Number(
                    source.labelHeight
                );

        }


        /*
         * Pastikan angka valid.
         */

        config.paperWidth =
            numberOr(
                config.paperWidth,
                DEFAULTS.paperWidth
            );


        config.paperHeight =
            numberOr(
                config.paperHeight,
                DEFAULTS.paperHeight
            );


        config.dpi =
            numberOr(
                config.dpi,
                DEFAULTS.dpi
            );


        config.canvasWidth =
            numberOr(
                config.canvasWidth,
                DEFAULTS.canvasWidth
            );


        config.canvasHeight =
            numberOr(
                config.canvasHeight,
                DEFAULTS.canvasHeight
            );


        return config;

    }


    /*
    =====================================================
     NUMBER
    =====================================================
    */

    function numberOr(
        value,
        fallback
    ) {

        const n =
            Number(value);


        if (
            Number.isFinite(n)
        ) {

            return n;

        }


        return fallback;

    }


    /*
    =====================================================
     SET LANGUAGE
    =====================================================
    */

    function setLanguage(
        value
    ) {

        const next =
            String(
                value ||
                "ESC"
            )
            .trim()
            .toUpperCase();


        const supported = [

            "ESC",
            "ESCPOS",
            "TSPL",
            "ZPL",
            "CPCL"

        ];


        if (
            !supported.includes(
                next
            )
        ) {

            warn(
                "Printer language tidak dikenal:",
                next,
                "→ ESC"
            );


            language =
                "ESC";

        }

        else {

            language =
                next;

        }


        config.language =
            language;


        config.printLanguage =
            language;


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
    =====================================================
     GET LANGUAGE
    =====================================================
    */

    function getLanguage() {

        return language;

    }


    /*
    =====================================================
     SET PAPER
    =====================================================
    */

    function setPaperSize(
        width,
        height
    ) {

        const w =
            numberOr(
                width,
                config.paperWidth
            );


        const h =
            numberOr(
                height,
                config.paperHeight
            );


        config.paperWidth =
            w;


        config.paperHeight =
            h;


        config.labelWidth =
            w;


        config.labelHeight =
            h;


        log(
            "Paper:",
            w,
            "x",
            h,
            "mm"
        );


        dispatch(
            "paper",
            {
                width: w,
                height: h
            }
        );


        return {

            width: w,

            height: h

        };

    }


    /*
    =====================================================
     GET PAPER
    =====================================================
    */

    function getPaperSize() {

        return {

            width:
                config.paperWidth,

            height:
                config.paperHeight,

            dpi:
                config.dpi,

            canvasWidth:
                config.canvasWidth,

            canvasHeight:
                config.canvasHeight

        };

    }


    /*
    =====================================================
     SYNC
    =====================================================
    */

    function sync() {

        readSettings();

        setLanguage(
            language ||
            config.language ||
            "ESC"
        );


        /*
         * Jangan memaksa 80mm.
         *
         * Paper mengikuti Settings.
         */

        setPaperSize(

            config.labelWidth ||
            config.paperWidth ||
            DEFAULTS.paperWidth,

            config.labelHeight ||
            config.paperHeight ||
            DEFAULTS.paperHeight

        );


        log(
            "========================================"
        );


        log(
            "Printer Manager v" +
            VERSION
        );


        log(
            "Printer Language:",
            language
        );


        log(
            "Paper:",
            config.paperWidth,
            "x",
            config.paperHeight,
            "mm"
        );


        log(
            "DPI:",
            config.dpi
        );


        log(
            "Transparent background:"
        );


        log(
            config.transparentBackground
                ? "YES - background tidak dikirim"
                : "NO"
        );


        log(
            "========================================"
        );


        dispatch(
            "sync",
            {
                config:
                    {
                        ...config
                    }
            }
        );


        return true;

    }


    /*
    =====================================================
     BLUETOOTH EVENT
    =====================================================
    */

    function attachBluetoothEvents() {

        if (
            window.__SMARTPRINT_PRINTER_BT_EVENTS__
        ) {

            return;

        }


        window.__SMARTPRINT_PRINTER_BT_EVENTS__ =
            true;


        window.addEventListener(
            "smartprint-bluetooth-connected",
            function (event) {

                connected =
                    true;


                lastError =
                    null;


                const detail =
                    event.detail ||
                    {};


                if (
                    detail.device
                ) {

                    printerName =
                        detail.device.name ||
                        "";

                }


                printerType =
                    detail.type ||
                    "BLE";


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
                    printerType
                );


                log(
                    "========================================"
                );


                dispatch(
                    "connected",
                    {
                        name:
                            printerName,

                        type:
                            printerType,

                        device:
                            detail.device ||
                            null
                    }
                );

            }
        );


        window.addEventListener(
            "smartprint-bluetooth-disconnected",
            function () {

                connected =
                    false;


                log(
                    "Printer disconnected."
                );


                dispatch(
                    "disconnected"
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
                    detail.connected !==
                    undefined
                ) {

                    connected =
                        Boolean(
                            detail.connected
                        );

                }


                dispatch(
                    "status",
                    {
                        connected
                    }
                );

            }
        );

    }


    /*
    =====================================================
     BLUETOOTH AVAILABLE
    =====================================================
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
    =====================================================
     IS CONNECTED
    =====================================================
    */

    function isConnected() {

        const bt =
            getBluetooth();


        if (
            bt &&
            typeof bt.isConnected === "function"
        ) {

            try {

                return Boolean(
                    bt.isConnected()
                );

            }

            catch (e) {}

        }


        return connected;

    }


    /*
    =====================================================
     CONNECT
    =====================================================

     PENTING:

     Printer Manager TIDAK mencari nama printer.

     Printer Manager TIDAK menentukan compatible
     berdasarkan name.

     Semua keputusan BLE diberikan kepada
     Bluetooth Engine.

    =====================================================
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
            "connecting"
        );


        log(
            "========================================"
        );


        log(
            "SMARTPRINT PRINTER CONNECT v" +
            VERSION
        );


        log(
            "========================================"
        );


        try {

            sync();


            const bt =
                getBluetooth();


            if (
                !bt
            ) {

                throw new Error(
                    "Bluetooth Engine tidak tersedia."
                );

            }


            /*
             * PRIORITAS:
             *
             * connectUser()
             *
             * karena tombol Connect adalah
             * user action.
             *
             * connectUser() boleh membuka picker.
             */

            let result =
                false;


            if (
                typeof bt.connectUser ===
                "function"
            ) {

                log(
                    "Bluetooth.connectUser()"
                );


                result =
                    await bt.connectUser();

            }


            /*
             * Fallback API lama.
             */

            else if (
                typeof bt.connectBLE ===
                "function"
            ) {

                log(
                    "Bluetooth.connectBLE()"
                );


                result =
                    await bt.connectBLE();

            }


            else if (
                typeof bt.connect ===
                "function"
            ) {

                log(
                    "Bluetooth.connect()"
                );


                result =
                    await bt.connect();

            }


            else {

                throw new Error(
                    "Bluetooth Engine tidak memiliki API connect."
                );

            }


            /*
             * User membatalkan picker.
             *
             * JANGAN menyebut
             * NO COMPATIBLE DEVICE FOUND.
             */

            if (
                result === false
            ) {

                connected =
                    false;


                log(
                    "Printer connection dibatalkan atau gagal."
                );


                dispatch(
                    "cancelled"
                );


                return false;

            }


            /*
             * Pastikan status aktual.
             */

            const actualConnected =
                isConnected();


            if (
                !actualConnected
            ) {

                throw new Error(
                    "Bluetooth device dipilih tetapi belum terhubung."
                );

            }


            connected =
                true;


            /*
             * Ambil info printer.
             */

            try {

                if (
                    typeof bt.getInfo ===
                    "function"
                ) {

                    const info =
                        bt.getInfo();


                    if (
                        info
                    ) {

                        printerName =
                            info.deviceName ||
                            info.name ||
                            printerName;


                        printerType =
                            info.type ||
                            "BLE";

                    }

                }

            }

            catch (e) {}


            log(
                "========================================"
            );


            log(
                "PRINTER CONNECTED"
            );


            log(
                "Printer:",
                printerName ||
                "(BLE device)"
            );


            log(
                "Type:",
                printerType
            );


            log(
                "Paper:",
                config.paperWidth,
                "x",
                config.paperHeight,
                "mm"
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
                    name:
                        printerName,

                    type:
                        printerType,

                    paper:
                        getPaperSize()
                }
            );


            return true;

        }

        catch (err) {

            lastError =
                err;


            connected =
                false;


            /*
             * Jangan gunakan pesan
             * NO COMPATIBLE DEVICE FOUND.
             *
             * Tampilkan error sebenarnya.
             */

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


            dispatch(
                "status",
                {
                    connected:
                        isConnected()
                }
            );

        }

    }


    /*
    =====================================================
     CONNECT NEW
    =====================================================
    */

    async function connectNew() {

        if (
            connecting
        ) {

            return false;

        }


        connecting =
            true;


        dispatch(
            "connecting"
        );


        try {

            sync();


            const bt =
                getBluetooth();


            if (
                !bt
            ) {

                throw new Error(
                    "Bluetooth Engine tidak tersedia."
                );

            }


            let result =
                false;


            if (
                typeof bt.connectBLENew ===
                "function"
            ) {

                result =
                    await bt.connectBLENew();

            }

            else if (
                typeof bt.connectBLE ===
                "function"
            ) {

                result =
                    await bt.connectBLE();

            }

            else if (
                typeof bt.connectUser ===
                "function"
            ) {

                result =
                    await bt.connectUser();

            }

            else {

                throw new Error(
                    "Bluetooth Engine tidak memiliki API BLE."
                );

            }


            if (
                !result
            ) {

                connected =
                    false;


                return false;

            }


            connected =
                isConnected();


            return connected;

        }

        catch (err) {

            lastError =
                err;


            error(
                "Connect New error:",
                err
            );


            dispatch(
                "error",
                {
                    error:
                        err,

                    message:
                        err.message ||
                        String(err)
                }
            );


            return false;

        }

        finally {

            connecting =
                false;

            dispatch(
                "status",
                {
                    connected:
                        isConnected()
                }
            );

        }

    }


    /*
    =====================================================
     CONNECT BLE
    =====================================================
    */

    async function connectBLE() {

        return await connect();

    }


    /*
    =====================================================
     CONNECT SERIAL
    =====================================================
    */

    async function connectSerial() {

        const bt =
            getBluetooth();


        if (
            !bt ||
            typeof bt.connectSerial !==
            "function"
        ) {

            error(
                "Bluetooth Engine Web Serial tidak tersedia."
            );


            return false;

        }


        try {

            const result =
                await bt.connectSerial();


            if (
                result
            ) {

                connected =
                    true;


                printerType =
                    "SERIAL";


                dispatch(
                    "connected",
                    {
                        type:
                            "SERIAL"
                    }
                );

            }


            return Boolean(
                result
            );

        }

        catch (err) {

            lastError =
                err;


            error(
                "Serial connect error:",
                err
            );


            return false;

        }

    }


    /*
    =====================================================
     CONNECT BRIDGE
    =====================================================
    */

    async function connectBridge(
        url
    ) {

        const bt =
            getBluetooth();


        if (
            !bt ||
            typeof bt.connectBridge !==
            "function"
        ) {

            error(
                "Bluetooth Bridge tidak tersedia."
            );


            return false;

        }


        try {

            const result =
                await bt.connectBridge(
                    url
                );


            if (
                result
            ) {

                connected =
                    true;


                printerType =
                    "BRIDGE";


                dispatch(
                    "connected",
                    {
                        type:
                            "BRIDGE"
                    }
                );

            }


            return Boolean(
                result
            );

        }

        catch (err) {

            lastError =
                err;


            error(
                "Bridge connect error:",
                err
            );


            return false;

        }

    }


    /*
    =====================================================
     DISCONNECT
    =====================================================
    */

    async function disconnect() {

        const bt =
            getBluetooth();


        try {

            if (
                bt &&
                typeof bt.disconnect ===
                "function"
            ) {

                await bt.disconnect();

            }

        }

        catch (err) {

            warn(
                "Disconnect error:",
                err
            );

        }


        connected =
            false;


        printerName =
            "";


        dispatch(
            "disconnected"
        );


        return true;

    }


    /*
    =====================================================
     RAW SEND
    =====================================================
    */

    async function sendRaw(
        data
    ) {

        if (
            !(data instanceof Uint8Array)
        ) {

            if (
                data instanceof ArrayBuffer
            ) {

                data =
                    new Uint8Array(
                        data
                    );

            }

            else if (
                ArrayBuffer.isView(
                    data
                )
            ) {

                data =
                    new Uint8Array(
                        data.buffer,
                        data.byteOffset,
                        data.byteLength
                    );

            }

            else {

                throw new TypeError(
                    "Printer.sendRaw() membutuhkan Uint8Array."
                );

            }

        }


        if (
            data.length === 0
        ) {

            return false;

        }


        const bt =
            getBluetooth();


        if (
            !bt ||
            typeof bt.sendRaw !==
            "function"
        ) {

            throw new Error(
                "Bluetooth.sendRaw() tidak tersedia."
            );

        }


        if (
            !isConnected()
        ) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        log(
            "SEND RAW:",
            data.length,
            "bytes"
        );


        try {

            const result =
                await bt.sendRaw(
                    data
                );


            dispatch(
                "sent",
                {
                    bytes:
                        data.length
                }
            );


            return result !== false;

        }

        catch (err) {

            lastError =
                err;


            error(
                "Printer sendRaw error:",
                err
            );


            dispatch(
                "error",
                {
                    error:
                        err,

                    message:
                        err.message ||
                        String(err)
                }
            );


            throw err;

        }

    }


    /*
    =====================================================
     SEND
    =====================================================
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


    async function raw(
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
    =====================================================
     PRINT BYTES
    =====================================================
    */

    async function printBytes(
        bytes
    ) {

        return await sendRaw(
            bytes
        );

    }


    /*
    =====================================================
     TEXT
    =====================================================
    */

    async function printText(
        text
    ) {

        const value =
            String(
                text === undefined
                    ? ""
                    : text
            );


        /*
         * ASCII / UTF-8.
         *
         * Untuk printer thermal dasar.
         */

        const encoder =
            new TextEncoder();


        const bytes =
            encoder.encode(
                value
            );


        return await sendRaw(
            bytes
        );

    }


    /*
    =====================================================
     TEST PRINT
    =====================================================

     Tes dasar:

     - teks hitam
     - tidak ada background putih
     - newline
     - feed

    =====================================================
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
         * ESC/POS basic test.
         */

        const bytes =
            new Uint8Array([

                0x1B,
                0x40,

                0x1B,
                0x61,
                0x01,

                0x53,
                0x6D,
                0x61,
                0x72,
                0x74,
                0x50,
                0x72,
                0x69,
                0x6E,
                0x74,

                0x0A,

                0x1B,
                0x61,
                0x00,

                0x0A,
                0x0A,
                0x0A

            ]);


        return await sendRaw(
            bytes
        );

    }


    /*
    =====================================================
     GET INFO
    =====================================================
    */

    function getInfo() {

        const bt =
            getBluetooth();


        let btInfo =
            null;


        try {

            if (
                bt &&
                typeof bt.getInfo ===
                "function"
            ) {

                btInfo =
                    bt.getInfo();

            }

        }

        catch (e) {}


        return {

            version:
                VERSION,

            initialized,

            connecting,

            connected:
                isConnected(),

            language,

            printerName,

            printerType,

            paperWidth:
                config.paperWidth,

            paperHeight:
                config.paperHeight,

            labelWidth:
                config.labelWidth,

            labelHeight:
                config.labelHeight,

            dpi:
                config.dpi,

            canvasWidth:
                config.canvasWidth,

            canvasHeight:
                config.canvasHeight,

            transparentBackground:
                config.transparentBackground,

            lastError:
                lastError
                    ? (
                        lastError.message ||
                        String(lastError)
                    )
                    : null,

            bluetooth:
                btInfo

        };

    }


    /*
    =====================================================
     GET CONFIG
    =====================================================
    */

    function getConfig() {

        return {

            ...config,

            language

        };

    }


    /*
    =====================================================
     INIT
    =====================================================
    */

    function init() {

        if (
            initialized
        ) {

            return true;

        }


        attachBluetoothEvents();


        sync();


        initialized =
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
            language
        );


        log(
            "Paper:",
            config.paperWidth,
            "x",
            config.paperHeight,
            "mm"
        );


        log(
            "DPI:",
            config.dpi
        );


        log(
            "Transparent background:"
        );


        log(
            config.transparentBackground
                ? "YES - background tidak dikirim"
                : "NO"
        );


        log(
            "Printer Manager initialized."
        );


        dispatch(
            "ready",
            {
                version:
                    VERSION,

                config:
                    getConfig()
            }
        );


        return true;

    }


    /*
    =====================================================
     PUBLIC API
    =====================================================
    */

    const Printer = {

        version:
            VERSION,

        config,

        init,

        sync,

        connect,

        connectNew,

        connectBLE,

        connectSerial,

        connectBridge,

        disconnect,

        isConnected,

        sendRaw,

        send,

        write,

        raw,

        printRaw,

        printBytes,

        printText,

        testPrint,

        setLanguage,

        getLanguage,

        setPaperSize,

        getPaperSize,

        getConfig,

        getInfo

    };


    /*
    =====================================================
     GLOBAL
    =====================================================
    */

    window.Printer =
        Printer;


    window.SmartPrintPrinter =
        Printer;


    window.PrinterManager =
        Printer;


    /*
    =====================================================
     START
    =====================================================
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
