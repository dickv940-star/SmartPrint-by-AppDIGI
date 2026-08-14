"use strict";

/*
========================================================
 SmartPrint Printer Manager v4.2.0
========================================================

 TUGAS:

 1. Mengatur printer
 2. Menggunakan Bluetooth Engine
 3. Tidak membuat BLE connection sendiri
 4. Mengirim RAW Uint8Array
 5. Mendukung ESC / TSPL / ZPL / CPCL
 6. Status CONNECTED / DISCONNECTED
 7. Paper mengikuti Settings
 8. Background transparan
 9. Tidak mengirim background putih
10. Cocok dengan Bluetooth Engine v5.7.0

 DEPENDENCY:

 Bluetooth
 Settings
 ESCPos
 TSPL
 ZPL
 CPCL

========================================================
*/

(function () {

    "use strict";

    const VERSION = "4.2.0";

    const PREFIX = "[SmartPrint Printer]";


    /*
    ====================================================
     STATE
    ====================================================
    */

    let initialized = false;

    let connecting = false;

    let printing = false;

    let language = "ESC";

    let paperWidth = 80;

    let paperHeight = 150;

    let labelWidth = 100;

    let labelHeight = 150;

    let dpi = 203;

    let transparentBackground = true;

    let copies = 1;


    /*
    ====================================================
     LOG
    ====================================================
    */

    function log() {

        console.log(
            PREFIX,
            ...arguments
        );

    }


    function warn() {

        console.warn(
            PREFIX,
            ...arguments
        );

    }


    function error() {

        console.error(
            PREFIX,
            ...arguments
        );

    }


    /*
    ====================================================
     EVENT
    ====================================================
    */

    function dispatch(
        name,
        detail
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-printer-" + name,
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
    ====================================================
     SETTINGS
    ====================================================
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

                    language =
                        s.printLanguage ||
                        s.language ||
                        language;

                    paperWidth =
                        Number(
                            s.paperWidth ||
                            paperWidth
                        );

                    paperHeight =
                        Number(
                            s.paperHeight ||
                            paperHeight
                        );

                    labelWidth =
                        Number(
                            s.labelWidth ||
                            paperWidth
                        );

                    labelHeight =
                        Number(
                            s.labelHeight ||
                            paperHeight
                        );

                    dpi =
                        Number(
                            s.dpi ||
                            dpi
                        );

                    transparentBackground =
                        s.transparentBackground !==
                        false;

                    copies =
                        Number(
                            s.copies ||
                            1
                        );

                }

            }

        }

        catch (err) {

            warn(
                "Gagal membaca Settings:",
                err
            );

        }


        /*
         * Fallback localStorage.
         */

        try {

            const raw =
                localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );

            if (raw) {

                const s =
                    JSON.parse(raw);

                language =
                    s.printLanguage ||
                    language;

                paperWidth =
                    Number(
                        s.paperWidth ||
                        paperWidth
                    );

                paperHeight =
                    Number(
                        s.paperHeight ||
                        paperHeight
                    );

                labelWidth =
                    Number(
                        s.labelWidth ||
                        labelWidth
                    );

                labelHeight =
                    Number(
                        s.labelHeight ||
                        labelHeight
                    );

                dpi =
                    Number(
                        s.dpi ||
                        dpi
                    );

                if (
                    typeof s.transparentBackground ===
                    "boolean"
                ) {

                    transparentBackground =
                        s.transparentBackground;

                }

                copies =
                    Number(
                        s.copies ||
                        copies
                    );

            }

        }

        catch (e) {}

    }


    /*
    ====================================================
     APPLY SETTINGS
    ====================================================
    */

    function applySettings() {

        readSettings();

        log(
            "Printer Language:",
            language
        );

        log(
            "Paper:",
            paperWidth +
            " x " +
            paperHeight +
            " mm"
        );

        log(
            "Label:",
            labelWidth +
            " x " +
            labelHeight +
            " mm"
        );

        log(
            "DPI:",
            dpi
        );

        log(
            "Transparent background:",
            transparentBackground
        );

    }


    /*
    ====================================================
     SET LANGUAGE
    ====================================================
    */

    function setLanguage(
        value
    ) {

        if (!value) {

            return language;

        }

        language =
            String(value)
            .toUpperCase();

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
    ====================================================
     GET LANGUAGE
    ====================================================
    */

    function getLanguage() {

        return language;

    }


    /*
    ====================================================
     PAPER
    ====================================================
    */

    function setPaper(
        width,
        height
    ) {

        if (
            Number.isFinite(
                Number(width)
            )
        ) {

            paperWidth =
                Number(width);

        }

        if (
            Number.isFinite(
                Number(height)
            )
        ) {

            paperHeight =
                Number(height);

        }

        return {

            width:
                paperWidth,

            height:
                paperHeight

        };

    }


    function getPaper() {

        return {

            width:
                paperWidth,

            height:
                paperHeight

        };

    }


    /*
    ====================================================
     CONNECTION STATUS
    ====================================================
    */

    function isConnected() {

        try {

            if (
                window.Bluetooth &&
                typeof Bluetooth.isConnected ===
                "function"
            ) {

                return Boolean(
                    Bluetooth.isConnected()
                );

            }

        }

        catch (e) {}

        return false;

    }


    /*
    ====================================================
     CONNECTION TYPE
    ====================================================
    */

    function getConnectionType() {

        try {

            if (
                window.Bluetooth &&
                typeof Bluetooth.getConnectionType ===
                "function"
            ) {

                return Bluetooth.getConnectionType();

            }

        }

        catch (e) {}

        return null;

    }


    /*
    ====================================================
     DEVICE
    ====================================================
    */

    function getDevice() {

        try {

            if (
                window.Bluetooth &&
                typeof Bluetooth.getDevice ===
                "function"
            ) {

                return Bluetooth.getDevice();

            }

        }

        catch (e) {}

        return null;

    }


    function getDeviceName() {

        try {

            if (
                window.Bluetooth &&
                typeof Bluetooth.getDeviceName ===
                "function"
            ) {

                return Bluetooth.getDeviceName();

            }

        }

        catch (e) {}

        const device =
            getDevice();

        return (
            device &&
            device.name
        ) || "";

    }


    /*
    ====================================================
     STATUS
    ====================================================
    */

    function getStatus() {

        return {

            connected:
                isConnected(),

            type:
                getConnectionType(),

            device:
                getDeviceName(),

            language:
                language,

            paperWidth:
                paperWidth,

            paperHeight:
                paperHeight,

            labelWidth:
                labelWidth,

            labelHeight:
                labelHeight,

            dpi:
                dpi,

            transparentBackground:
                transparentBackground,

            printing:
                printing

        };

    }


    /*
    ====================================================
     SHOW STATUS
    ====================================================
    */

    function status() {

        const info =
            getStatus();

        log(
            "========================================"
        );

        log(
            "PRINTER STATUS"
        );

        log(
            "Connected:",
            info.connected
        );

        log(
            "Type:",
            info.type
        );

        log(
            "Device:",
            info.device
        );

        log(
            "Language:",
            info.language
        );

        log(
            "Paper:",
            info.paperWidth +
            " x " +
            info.paperHeight +
            " mm"
        );

        log(
            "========================================"
        );

        return info;

    }


    /*
    ====================================================
     CONNECT
    ====================================================
    */

    async function connect() {

        if (connecting) {

            warn(
                "Printer sedang connecting."
            );

            return false;

        }


        if (isConnected()) {

            log(
                "Printer sudah connected:"
            );

            log(
                getDeviceName()
            );

            dispatch(
                "connected",
                getStatus()
            );

            return true;

        }


        if (
            !window.Bluetooth
        ) {

            error(
                "Bluetooth Engine tidak ditemukan."
            );

            dispatch(
                "error",
                {
                    message:
                        "Bluetooth Engine tidak tersedia."
                }
            );

            return false;

        }


        connecting =
            true;


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

        log(
            "Bluetooth.connectUser()"
        );


        try {

            /*
             * PENTING:
             *
             * Jangan memanggil requestDevice()
             * dari printer.js.
             *
             * Bluetooth.js yang mengurus picker.
             */

            const result =
                await Bluetooth.connectUser();


            /*
             * User membatalkan picker.
             */

            if (!result) {

                /*
                 * Jangan menyebut
                 * NO COMPATIBLE DEVICE FOUND.
                 *
                 * Karena belum tentu tidak compatible.
                 */

                if (
                    !isConnected()
                ) {

                    warn(
                        "Printer connection dibatalkan atau gagal."
                    );

                    dispatch(
                        "disconnected",
                        {
                            cancelled:
                                true
                        }
                    );

                    return false;

                }

            }


            /*
             * Verifikasi koneksi sebenarnya.
             */

            if (
                !isConnected()
            ) {

                throw new Error(
                    "Bluetooth.connectUser() selesai tetapi printer belum terhubung."
                );

            }


            const info =
                getStatus();


            log(
                "========================================"
            );

            log(
                "PRINTER CONNECTED"
            );

            log(
                "Name:",
                info.device
            );

            log(
                "Type:",
                info.type
            );

            log(
                "Language:",
                info.language
            );

            log(
                "Paper:",
                info.paperWidth +
                " x " +
                info.paperHeight +
                " mm"
            );

            log(
                "========================================"
            );


            dispatch(
                "connected",
                info
            );


            return true;

        }

        catch (err) {

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
                        err.message ||
                        "Printer connection error."
                }
            );


            return false;

        }

        finally {

            connecting =
                false;

            dispatch(
                "status",
                getStatus()
            );

        }

    }


    /*
    ====================================================
     CONNECT NEW
    ====================================================
    */

    async function connectNew() {

        if (
            !window.Bluetooth
        ) {

            return false;

        }


        if (typeof Bluetooth.connectBLENew !==
            "function") {

            return await connect();

        }


        connecting =
            true;


        dispatch(
            "connecting"
        );


        try {

            log(
                "Membuka BLE picker baru..."
            );


            const result =
                await Bluetooth.connectBLENew();


            if (
                !result ||
                !isConnected()
            ) {

                warn(
                    "Printer baru tidak terhubung."
                );

                return false;

            }


            const info =
                getStatus();


            log(
                "PRINTER CONNECTED:"
            );

            log(
                info.device
            );


            dispatch(
                "connected",
                info
            );


            return true;

        }

        catch (err) {

            error(
                "Connect new error:",
                err
            );

            return false;

        }

        finally {

            connecting =
                false;

            dispatch(
                "status",
                getStatus()
            );

        }

    }


    /*
    ====================================================
     DISCONNECT
    ====================================================
    */

    async function disconnect() {

        try {

            if (
                window.Bluetooth &&
                typeof Bluetooth.disconnect ===
                "function"
            ) {

                await Bluetooth.disconnect();

            }

        }

        catch (err) {

            warn(
                "Disconnect error:",
                err
            );

        }


        dispatch(
            "disconnected"
        );


        dispatch(
            "status",
            getStatus()
        );


        return true;

    }


    /*
    ====================================================
     RAW NORMALIZER
    ====================================================
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
            "Printer: data harus Uint8Array."
        );

    }


    /*
    ====================================================
     SEND RAW
    ====================================================
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


        if (
            !isConnected()
        ) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        if (
            !window.Bluetooth ||
            typeof Bluetooth.sendRaw !==
            "function"
        ) {

            throw new Error(
                "Bluetooth.sendRaw() tidak tersedia."
            );

        }


        log(
            "RAW SEND:",
            bytes.length,
            "bytes"
        );


        return await Bluetooth.sendRaw(
            bytes
        );

    }


    /*
    ====================================================
     SEND TEXT
    ====================================================
    */

    async function sendText(
        text
    ) {

        const value =
            String(
                text == null
                    ? ""
                    : text
            );


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
    ====================================================
     PRINT RAW
    ====================================================
    */

    async function printRaw(
        data
    ) {

        if (printing) {

            warn(
                "Printer sedang printing."
            );

            return false;

        }


        printing =
            true;


        dispatch(
            "printing",
            {
                start:
                    true
            }
        );


        try {

            const bytes =
                normalizeBytes(
                    data
                );


            /*
             * Copies
             */

            const total =
                Math.max(
                    1,
                    Number(copies) || 1
                );


            for (
                let i = 0;
                i < total;
                i++
            ) {

                await sendRaw(
                    bytes
                );

            }


            log(
                "Print selesai."
            );


            dispatch(
                "printed",
                {
                    bytes:
                        bytes.length,
                    copies:
                        total
                }
            );


            return true;

        }

        catch (err) {

            error(
                "Print error:",
                err
            );


            dispatch(
                "print-error",
                {
                    error:
                        err
                }
            );


            return false;

        }

        finally {

            printing =
                false;


            dispatch(
                "printing",
                {
                    start:
                        false
                }
            );

        }

    }


    /*
    ====================================================
     PRINT TEXT TEST
    ====================================================
    */

    async function testText(
        text = "SMARTPRINT TEST"
    ) {

        /*
         * ESC/POS basic test.
         *
         * Jika printer menggunakan TSPL/ZPL,
         * gunakan engine masing-masing.
         */

        if (
            language !== "ESC" &&
            language !== "ESCPOS"
        ) {

            warn(
                "testText() memakai raw text sederhana."
            );

        }


        const encoder =
            new TextEncoder();


        const data = [];


        /*
         * ESC @
         */

        data.push(
            0x1B,
            0x40
        );


        /*
         * Align center
         */

        data.push(
            0x1B,
            0x61,
            0x01
        );


        /*
         * Text
         */

        const textBytes =
            encoder.encode(
                text
            );


        for (
            const b of textBytes
        ) {

            data.push(b);

        }


        data.push(
            0x0A,
            0x0A,
            0x0A
        );


        /*
         * Cut jika printer mendukung.
         */

        data.push(
            0x1D,
            0x56,
            0x00
        );


        return await printRaw(
            new Uint8Array(
                data
            )
        );

    }


    /*
    ====================================================
     PRINT TEST BARCODE
    ====================================================
    */

    async function testBarcode(
        value = "SMARTPRINT123"
    ) {

        const encoder =
            new TextEncoder();


        const data = [];


        /*
         * ESC @
         */

        data.push(
            0x1B,
            0x40
        );


        /*
         * Center
         */

        data.push(
            0x1B,
            0x61,
            0x01
        );


        /*
         * Barcode height
         *
         * GS h 80
         */

        data.push(
            0x1D,
            0x68,
            0x50
        );


        /*
         * Barcode width
         */

        data.push(
            0x1D,
            0x77,
            0x02
        );


        /*
         * HRI below
         */

        data.push(
            0x1D,
            0x48,
            0x02
        );


        /*
         * CODE128
         *
         * GS k 73 n data
         */

        const bytes =
            encoder.encode(
                value
            );


        data.push(
            0x1D,
            0x6B,
            0x49,
            bytes.length
        );


        for (
            const b of bytes
        ) {

            data.push(b);

        }


        data.push(
            0x0A,
            0x0A,
            0x0A
        );


        return await printRaw(
            new Uint8Array(
                data
            )
        );

    }


    /*
    ====================================================
     TEST PRINTER
    ====================================================
    */

    async function testPrinter() {

        if (
            !isConnected()
        ) {

            warn(
                "Printer belum connected."
            );

            return false;

        }


        log(
            "Menjalankan printer test..."
        );


        /*
         * Text terlebih dahulu.
         */

        const textResult =
            await testText(
                "SMARTPRINT"
            );


        if (!textResult) {

            return false;

        }


        return true;

    }


    /*
    ====================================================
     INIT
    ====================================================
    */

    function init() {

        if (initialized) {

            return true;

        }


        initialized =
            true;


        applySettings();


        /*
         * Bluetooth connected event
         */

        window.addEventListener(
            "smartprint-bluetooth-connected",
            function (event) {

                log(
                    "Bluetooth CONNECTED event."
                );


                const info =
                    getStatus();


                dispatch(
                    "connected",
                    info
                );


                dispatch(
                    "status",
                    info
                );

            }
        );


        /*
         * Bluetooth disconnected
         */

        window.addEventListener(
            "smartprint-bluetooth-disconnected",
            function () {

                log(
                    "Bluetooth DISCONNECTED."
                );


                dispatch(
                    "disconnected"
                );


                dispatch(
                    "status",
                    getStatus()
                );

            }
        );


        /*
         * Bluetooth status
         */

        window.addEventListener(
            "smartprint-bluetooth-status",
            function () {

                dispatch(
                    "status",
                    getStatus()
                );

            }
        );


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


        return true;

    }


    /*
    ====================================================
     PUBLIC API
    ====================================================
    */

    const Printer = {

        version:
            VERSION,

        init,

        connect,

        connectNew,

        disconnect,

        isConnected,

        status,

        getStatus,

        getDevice,

        getDeviceName,

        getConnectionType,

        setLanguage,

        getLanguage,

        setPaper,

        getPaper,

        applySettings,

        sendRaw,

        printRaw,

        sendText,

        testText,

        testBarcode,

        testPrinter

    };


    /*
    ====================================================
     GLOBAL
    ====================================================
    */

    window.Printer =
        Printer;


    window.SmartPrintPrinter =
        Printer;


    /*
    ====================================================
     START
    ====================================================
    */

    init();


})();
