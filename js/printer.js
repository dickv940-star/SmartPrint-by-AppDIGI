/* =========================================================
   SMARTPRINT PRINTER MANAGER
   Version 4.3.0
   AppDIGI
   =========================================================

   Tugas:
   - Mengatur printer
   - Bridge ke Bluetooth Engine v5.8.0
   - Mengatur bahasa printer
   - Mengatur ukuran kertas
   - Mengirim RAW Uint8Array
   - TSPL / ESC-POS / ZPL / CPCL
   - Status koneksi
   - Tidak menganggap connected sebelum transport siap

   Dependency:
   - settings.js
   - bluetooth.js
   - escpos.js
   - tspl.js
   - zpl.js
   - cpcl.js

   ========================================================= */

(function (window) {

    "use strict";

    /* =====================================================
       GLOBAL
       ===================================================== */

    const VERSION = "4.5.0";

    const LOG_PREFIX = "[SmartPrint Printer]";

    const DEFAULTS = {

        language: "ESC",

        paperWidth: 100,
        paperHeight: 150,

        labelWidth: 100,
        labelHeight: 150,

        dpi: 203,

        canvasWidth: 799,
        canvasHeight: 1199,

        transparentBackground: true,

        copies: 1,

        density: 8,

        speed: 4,

        gap: 2,

        marginLeft: 0,
        marginTop: 0,

        rotate: 0

    };


    /* =====================================================
       STATE
       ===================================================== */

    let state = {

        initialized: false,

        bluetoothEventsAttached: false,

        connected: false,

        connecting: false,

        disconnecting: false,

        language: DEFAULTS.language,

        paperWidth: DEFAULTS.paperWidth,

        paperHeight: DEFAULTS.paperHeight,

        labelWidth: DEFAULTS.labelWidth,

        labelHeight: DEFAULTS.labelHeight,

        dpi: DEFAULTS.dpi,

        canvasWidth: DEFAULTS.canvasWidth,

        canvasHeight: DEFAULTS.canvasHeight,

        transparentBackground:
            DEFAULTS.transparentBackground,

        device: null,

        server: null,

        service: null,

        characteristic: null,

        writeCharacteristic: null,

        notifyCharacteristic: null,

        deviceName: "",

        deviceId: "",

        transport: null,

        lastError: null,

        lastConnectedAt: null,

        lastDisconnectedAt: null

    };


    /* =====================================================
       LOGGING
       ===================================================== */

    function log() {

        const args = Array.prototype.slice.call(arguments);

        args.unshift(LOG_PREFIX);

        console.log.apply(console, args);

    }


    function warn() {

        const args = Array.prototype.slice.call(arguments);

        args.unshift(LOG_PREFIX);

        console.warn.apply(console, args);

    }


    function error() {

        const args = Array.prototype.slice.call(arguments);

        args.unshift(LOG_PREFIX);

        console.error.apply(console, args);

    }


    /* =====================================================
       SETTINGS
       ===================================================== */

    function getSettingsObject() {

        try {

            if (
                window.Settings &&
                typeof window.Settings.getAll === "function"
            ) {

                return window.Settings.getAll() || {};

            }

        } catch (e) {

            warn(
                "Settings.getAll() gagal:",
                e
            );

        }


        try {

            if (
                window.Settings &&
                typeof window.Settings.get === "function"
            ) {

                return window.Settings.get() || {};

            }

        } catch (e) {

            warn(
                "Settings.get() gagal:",
                e
            );

        }


        try {

            const raw =
                localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );

            if (raw) {

                return JSON.parse(raw) || {};

            }

        } catch (e) {

            warn(
                "Gagal membaca SMARTPRINT_SETTINGS:",
                e
            );

        }


        return {};

    }


    function syncSettings() {

        const settings = getSettingsObject();


        state.language =
            settings.printLanguage ||
            settings.language ||
            settings.printerLanguage ||
            state.language ||
            DEFAULTS.language;


        state.paperWidth = numberValue(

            settings.paperWidth,

            settings.width,

            DEFAULTS.paperWidth

        );


        state.paperHeight = numberValue(

            settings.paperHeight,

            settings.height,

            DEFAULTS.paperHeight

        );


        state.labelWidth = numberValue(

            settings.labelWidth,

            DEFAULTS.labelWidth

        );


        state.labelHeight = numberValue(

            settings.labelHeight,

            DEFAULTS.labelHeight

        );


        state.dpi = numberValue(

            settings.dpi,

            DEFAULTS.dpi

        );


        state.canvasWidth = numberValue(

            settings.canvasWidth,

            DEFAULTS.canvasWidth

        );


        state.canvasHeight = numberValue(

            settings.canvasHeight,

            DEFAULTS.canvasHeight

        );


        if (
            typeof settings.transparentBackground ===
            "boolean"
        ) {

            state.transparentBackground =
                settings.transparentBackground;

        }


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
            "Label:",
            state.labelWidth +
            " x " +
            state.labelHeight +
            " mm"
        );

        log(
            "DPI:",
            state.dpi
        );

        log(
            "Transparent background:",
            state.transparentBackground
        );

    }


    function numberValue() {

        const args =
            Array.prototype.slice.call(arguments);

        const fallback =
            args[args.length - 1];

        for (
            let i = 0;
            i < args.length - 1;
            i++
        ) {

            const value =
                Number(args[i]);

            if (
                Number.isFinite(value) &&
                value > 0
            ) {

                return value;

            }

        }

        return fallback;

    }


    /* =====================================================
       LANGUAGE
       ===================================================== */

    function normalizeLanguage(value) {

        if (!value) {

            return DEFAULTS.language;

        }


        const v =
            String(value)
                .trim()
                .toUpperCase();


        if (
            v === "ESC" ||
            v === "ESCPOS" ||
            v === "ESC/POS" ||
            v === "ESC-POS"
        ) {

            return "ESC";

        }


        if (v === "TSPL") {

            return "TSPL";

        }


        if (v === "ZPL") {

            return "ZPL";

        }


        if (v === "CPCL") {

            return "CPCL";

        }


        return v;

    }


    function setLanguage(language) {

        state.language =
            normalizeLanguage(language);


        log(
            "Printer language changed:",
            state.language
        );


        return state.language;

    }


    function getLanguage() {

        return state.language;

    }


    /* =====================================================
       PAPER
       ===================================================== */

    function setPaper(width, height) {

        const w =
            Number(width);

        const h =
            Number(height);


        if (
            Number.isFinite(w) &&
            w > 0
        ) {

            state.paperWidth = w;

        }


        if (
            Number.isFinite(h) &&
            h > 0
        ) {

            state.paperHeight = h;

        }


        log(
            "Paper:",
            state.paperWidth +
            " x " +
            state.paperHeight +
            " mm"
        );


        return {

            width: state.paperWidth,

            height: state.paperHeight

        };

    }


    function setLabelSize(width, height) {

        const w =
            Number(width);

        const h =
            Number(height);


        if (
            Number.isFinite(w) &&
            w > 0
        ) {

            state.labelWidth = w;

        }


        if (
            Number.isFinite(h) &&
            h > 0
        ) {

            state.labelHeight = h;

        }


        return {

            width: state.labelWidth,

            height: state.labelHeight

        };

    }


    /* =====================================================
       DPI CONVERSION
       ===================================================== */

    function mmToDots(mm) {

        return Math.round(

            Number(mm) *
            state.dpi /
            25.4

        );

    }


    function dotsToMm(dots) {

        return (

            Number(dots) *
            25.4 /
            state.dpi

        );

    }


    /* =====================================================
       UINT8 NORMALIZATION
       ===================================================== */

    function toUint8Array(data) {

        if (!data) {

            return new Uint8Array(0);

        }


        if (
            data instanceof Uint8Array
        ) {

            return data;

        }


        if (
            data instanceof ArrayBuffer
        ) {

            return new Uint8Array(data);

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


        if (Array.isArray(data)) {

            return new Uint8Array(data);

        }


        if (typeof data === "string") {

            return new TextEncoder().encode(data);

        }


        throw new TypeError(
            "Data printer tidak didukung."
        );

    }


    /* =====================================================
       BLUETOOTH ENGINE
       ===================================================== */

    function getBluetooth() {

        if (window.Bluetooth) {

            return window.Bluetooth;

        }


        if (window.SmartPrintBluetooth) {

            return window.SmartPrintBluetooth;

        }


        return null;

    }


    /* =====================================================
       FIND VALUE IN RESULT
       ===================================================== */

    function extractDevice(result) {

        if (!result) {

            return null;

        }


        if (
            result.device
        ) {

            return result.device;

        }


        if (
            result.bluetoothDevice
        ) {

            return result.bluetoothDevice;

        }


        if (
            result.bleDevice
        ) {

            return result.bleDevice;

        }


        if (
            result instanceof BluetoothDevice
        ) {

            return result;

        }


        return null;

    }


    function extractServer(result) {

        if (!result) {

            return null;

        }


        if (result.server) {

            return result.server;

        }


        if (
            result.gattServer
        ) {

            return result.gattServer;

        }


        if (
            result.device &&
            result.device.gatt
        ) {

            try {

                if (
                    result.device.gatt.connected
                ) {

                    return result.device.gatt;

                }

            } catch (e) {}

        }


        if (
            state.device &&
            state.device.gatt
        ) {

            try {

                if (
                    state.device.gatt.connected
                ) {

                    return state.device.gatt;

                }

            } catch (e) {}

        }


        return null;

    }


    /* =====================================================
       CHARACTERISTIC DETECTION
       ===================================================== */

    const WRITE_CHARACTERISTIC_NAMES = [

        "write",

        "writeWithoutResponse",

        "tx",

        "output",

        "printer",

        "characteristic"

    ];


    const KNOWN_SERVICE_UUIDS = [

        "0000ffe0-0000-1000-8000-00805f9b34fb",

        "0000ffe5-0000-1000-8000-00805f9b34fb",

        "0000fff0-0000-1000-8000-00805f9b34fb",

        "0000ff00-0000-1000-8000-00805f9b34fb",

        "000018f0-0000-1000-8000-00805f9b34fb",

        "000018ff-0000-1000-8000-00805f9b34fb",

        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"

    ];


    const KNOWN_CHARACTERISTIC_UUIDS = [

        "0000ffe1-0000-1000-8000-00805f9b34fb",

        "0000ffe9-0000-1000-8000-00805f9b34fb",

        "0000ff01-0000-1000-8000-00805f9b34fb",

        "0000ff02-0000-1000-8000-00805f9b34fb",

        "6e400002-b5a3-f393-e0a9-e50e24dcca9e"

    ];


    async function discoverCharacteristic(server) {

        if (!server) {

            return null;

        }


        log(
            "Mencari service dan WRITE characteristic..."
        );


        /* ---------------------------------------------
           1. Coba known services
           --------------------------------------------- */

        for (
            let i = 0;
            i < KNOWN_SERVICE_UUIDS.length;
            i++
        ) {

            const serviceUUID =
                KNOWN_SERVICE_UUIDS[i];


            try {

                const service =
                    await server.getPrimaryService(
                        serviceUUID
                    );


                if (!service) {

                    continue;

                }


                log(
                    "Service ditemukan:",
                    serviceUUID
                );


                const characteristic =
                    await findWritableCharacteristic(
                        service
                    );


                if (characteristic) {

                    state.service =
                        service;

                    state.writeCharacteristic =
                        characteristic;

                    state.characteristic =
                        characteristic;


                    log(
                        "WRITE characteristic ditemukan:",
                        characteristic.uuid
                    );


                    return characteristic;

                }

            } catch (e) {

                /* Service tidak tersedia.
                   Lanjut ke service berikutnya. */

            }

        }


        /* ---------------------------------------------
           2. Coba semua primary services
           --------------------------------------------- */

        try {

            if (
                typeof server.getPrimaryServices ===
                "function"
            ) {

                const services =
                    await server.getPrimaryServices();


                log(
                    "Jumlah primary service:",
                    services.length
                );


                for (
                    let i = 0;
                    i < services.length;
                    i++
                ) {

                    const service =
                        services[i];


                    log(
                        "Inspect service:",
                        service.uuid
                    );


                    const characteristic =
                        await findWritableCharacteristic(
                            service
                        );


                    if (characteristic) {

                        state.service =
                            service;

                        state.writeCharacteristic =
                            characteristic;

                        state.characteristic =
                            characteristic;


                        log(
                            "WRITE characteristic ditemukan:",
                            characteristic.uuid
                        );


                        return characteristic;

                    }

                }

            }

        } catch (e) {

            warn(
                "getPrimaryServices gagal:",
                e
            );

        }


        return null;

    }


    async function findWritableCharacteristic(service) {

        if (!service) {

            return null;

        }


        try {

            const characteristics =
                await service.getCharacteristics();


            for (
                let i = 0;
                i < characteristics.length;
                i++
            ) {

                const c =
                    characteristics[i];


                const props =
                    c.properties || {};


                log(
                    "Characteristic:",
                    c.uuid,
                    props
                );


                if (
                    props.write ||
                    props.writeWithoutResponse
                ) {

                    return c;

                }

            }


            /* -----------------------------------------
               Fallback berdasarkan UUID
               ----------------------------------------- */

            for (
                let i = 0;
                i < characteristics.length;
                i++
            ) {

                const c =
                    characteristics[i];


                const uuid =
                    String(c.uuid)
                        .toLowerCase();


                if (
                    KNOWN_CHARACTERISTIC_UUIDS
                        .some(function (known) {

                            return uuid ===
                                known.toLowerCase();

                        })
                ) {

                    return c;

                }

            }

        } catch (e) {

            warn(
                "Gagal membaca characteristics:",
                e
            );

        }


        return null;

    }


    async function connect() {

        if (state.connecting) {
            warn("Connection sedang berlangsung.");
            return getStatus();
        }

        const Bluetooth = getBluetooth();

        if (!Bluetooth) {
            state.lastError = "Bluetooth Engine tidak tersedia.";
            error(state.lastError);
            return false;
        }

        try {

            if (
                typeof Bluetooth.isConnected === "function" &&
                Bluetooth.isConnected()
            ) {
                syncFromBluetooth();
                return getStatus();
            }

            state.connecting = true;
            state.lastError = null;

            log("========================================");
            log("SMARTPRINT PRINTER CONNECT v" + VERSION);
            log("Transport owner: Bluetooth Engine");
            log("========================================");

            let result = false;

            if (typeof Bluetooth.connectUser === "function") {
                result = await Bluetooth.connectUser();
            } else if (typeof Bluetooth.connect === "function") {
                result = await Bluetooth.connect();
            } else if (typeof Bluetooth.connectBLE === "function") {
                result = await Bluetooth.connectBLE();
            } else {
                throw new Error(
                    "Bluetooth Engine tidak mempunyai API connect."
                );
            }

            if (!result) {

                log("BLE printer tidak terhubung.");
                log("Mencoba Bluetooth Classic / COM via Web Serial...");

                if (typeof Bluetooth.connectSerial === "function") {
                    result = await Bluetooth.connectSerial({
                        baudRate: 9600
                    });
                }

                if (!result) {
                    state.connected = false;
                    state.connecting = false;
                    state.lastError = "BLE tidak terhubung dan COM/Serial juga belum dipilih.";
                    return false;
                }
            }

            if (!syncFromBluetooth()) {
                throw new Error(
                    "Bluetooth connect selesai tetapi status printer belum connected."
                );
            }

            state.connecting = false;
            state.lastError = null;
            state.lastConnectedAt = new Date().toISOString();
            dispatchStatusEvent("connected");

            return true;

        } catch (e) {

            state.connected = false;
            state.connecting = false;
            state.lastError =
                e && e.message ? e.message : String(e);

            error("Printer connection error:", e);
            dispatchStatusEvent("error");
            return false;
        }
    }


    /* =====================================================
       CONNECT BLUETOOTH COM / SERIAL
       ===================================================== */

    async function connectSerial(options) {

        const Bluetooth = getBluetooth();

        if (!Bluetooth || typeof Bluetooth.connectSerial !== "function") {
            state.lastError = "Web Serial / Bluetooth COM tidak tersedia.";
            return false;
        }

        state.connecting = true;
        state.lastError = null;

        try {
            const result = await Bluetooth.connectSerial(options || { baudRate: 9600 });

            if (!result) {
                state.connected = false;
                return false;
            }

            syncFromBluetooth();
            state.connected = true;
            state.connecting = false;
            state.transport = "SERIAL";
            state.lastConnectedAt = new Date().toISOString();
            dispatchStatusEvent("connected");
            return true;

        } catch (e) {
            state.connected = false;
            state.lastError = e && e.message ? e.message : String(e);
            error("Serial connection error:", e);
            dispatchStatusEvent("error");
            return false;
        } finally {
            state.connecting = false;
        }
    }


    /* =====================================================
       DISCONNECT
       ===================================================== */

    async function disconnect() {

        if (state.disconnecting) return false;
        state.disconnecting = true;

        try {
            const Bluetooth = getBluetooth();
            if (
                Bluetooth &&
                typeof Bluetooth.disconnect === "function"
            ) {
                await Bluetooth.disconnect();
            }
        } catch (e) {
            warn("Bluetooth.disconnect():", e);
        } finally {
            state.connected = false;
            state.connecting = false;
            state.disconnecting = false;
            state.server = null;
            state.service = null;
            state.characteristic = null;
            state.writeCharacteristic = null;
            state.notifyCharacteristic = null;
            state.transport = null;
            state.lastDisconnectedAt = new Date().toISOString();
            dispatchStatusEvent("disconnected");
        }

        return true;
    }


    /* =====================================================
       CONNECTION STATUS
       ===================================================== */

    function isConnected() {

        const Bluetooth = getBluetooth();
        if (!Bluetooth) return false;

        try {
            state.connected =
                typeof Bluetooth.isConnected === "function" &&
                Bluetooth.isConnected() === true;

            if (!state.connected) state.transport = null;
            return state.connected;

        } catch (e) {
            state.connected = false;
            state.transport = null;
            return false;
        }
    }


    function getStatus() {

        return {
            version: VERSION,
            connected: isConnected(),
            connecting: state.connecting,
            deviceName: state.deviceName,
            deviceId: state.deviceId,
            language: state.language,
            paperWidth: state.paperWidth,
            paperHeight: state.paperHeight,
            labelWidth: state.labelWidth,
            labelHeight: state.labelHeight,
            dpi: state.dpi,
            canvasWidth: state.canvasWidth,
            canvasHeight: state.canvasHeight,
            transparentBackground: state.transparentBackground,
            transport: state.transport,
            characteristic:
                state.writeCharacteristic
                    ? state.writeCharacteristic.uuid
                    : null,
            error: state.lastError
        };
    }


    /* =====================================================
       DEVICE NAME
       =====================================================

    /* =====================================================
       DEVICE NAME
       ===================================================== */

    function getDeviceName() {

        return (
            state.deviceName ||
            ""
        );

    }


    function getDevice() {

        return state.device;

    }


    /* =====================================================
       RAW WRITE
       ===================================================== */

    async function writeGATT(data) {

        const characteristic =
            state.writeCharacteristic;


        if (!characteristic) {

            throw new Error(
                "WRITE characteristic tidak tersedia."
            );

        }


        const bytes =
            toUint8Array(data);


        if (!bytes.length) {

            return true;

        }


        const maxChunk =
            180;


        for (
            let offset = 0;
            offset < bytes.length;
            offset += maxChunk
        ) {

            const chunk =
                bytes.slice(
                    offset,
                    Math.min(
                        offset + maxChunk,
                        bytes.length
                    )
                );


            if (
                characteristic.writeValueWithoutResponse
            ) {

                await characteristic
                    .writeValueWithoutResponse(
                        chunk
                    );

            }

            else if (
                characteristic.writeValue
            ) {

                await characteristic
                    .writeValue(
                        chunk
                    );

            }

            else {

                throw new Error(
                    "Characteristic tidak mendukung write."
                );

            }


            /* Beri jeda kecil untuk BLE printer
               agar buffer tidak penuh. */

            await delay(8);

        }


        return true;

    }


    /* =====================================================
       RAW SEND
       ===================================================== */

    async function sendRaw(data) {

        const Bluetooth = getBluetooth();

        if (!Bluetooth) {
            throw new Error("Bluetooth Engine tidak tersedia.");
        }

        let connected = false;

        try {
            connected =
                typeof Bluetooth.isConnected === "function" &&
                Bluetooth.isConnected() === true;
        } catch (e) {}

        if (!connected) {
            state.connected = false;
            state.transport = null;
            throw new Error("Printer belum terhubung.");
        }

        const bytes = toUint8Array(data);
        if (!bytes.length) return true;

        if (typeof Bluetooth.sendRaw !== "function") {
            throw new Error(
                "Bluetooth Engine tidak mempunyai sendRaw()."
            );
        }

        log(
            "Mengirim RAW melalui Bluetooth Engine:",
            bytes.length,
            "bytes"
        );

        const result = await Bluetooth.sendRaw(bytes);
        return result !== false;
    }


    /* =====================================================
       TEXT SEND
       =====================================================
    /* =====================================================
       TEXT SEND
       ===================================================== */

    async function sendText(text) {

        const encoder =
            new TextEncoder();


        return await sendRaw(
            encoder.encode(
                String(text)
            )
        );

    }


    /* =====================================================
       PRINTER COMMAND
       ===================================================== */

    async function sendCommand(command) {

        return await sendText(
            command
        );

    }


    /* =====================================================
       ESC/POS
       ===================================================== */

    async function printESC(data) {

        let bytes =
            data;


        if (
            window.ESCPos &&
            typeof window.ESCPos.render ===
                "function"
        ) {

            try {

                bytes =
                    await window.ESCPos.render(
                        data
                    );

            } catch (e) {

                warn(
                    "ESCPos.render gagal, menggunakan RAW:",
                    e
                );

            }

        }


        return await sendRaw(
            bytes
        );

    }


    /* =====================================================
       TSPL
       ===================================================== */

    async function printTSPL(data) {

        let bytes =
            data;


        if (
            window.TSPL &&
            typeof window.TSPL.render ===
                "function"
        ) {

            try {

                bytes =
                    await window.TSPL.render(
                        data
                    );

            } catch (e) {

                warn(
                    "TSPL.render gagal, menggunakan RAW:",
                    e
                );

            }

        }


        return await sendRaw(
            bytes
        );

    }


    /* =====================================================
       ZPL
       ===================================================== */

    async function printZPL(data) {

        let bytes =
            data;


        if (
            window.ZPL &&
            typeof window.ZPL.render ===
                "function"
        ) {

            try {

                bytes =
                    await window.ZPL.render(
                        data
                    );

            } catch (e) {

                warn(
                    "ZPL.render gagal, menggunakan RAW:",
                    e
                );

            }

        }


        return await sendRaw(
            bytes
        );

    }


    /* =====================================================
       CPCL
       ===================================================== */

    async function printCPCL(data) {

        let bytes =
            data;


        if (
            window.CPCL &&
            typeof window.CPCL.render ===
                "function"
        ) {

            try {

                bytes =
                    await window.CPCL.render(
                        data
                    );

            } catch (e) {

                warn(
                    "CPCL.render gagal, menggunakan RAW:",
                    e
                );

            }

        }


        return await sendRaw(
            bytes
        );

    }


    /* =====================================================
       UNIVERSAL PRINT
       ===================================================== */

    async function print(data, options) {

        options =
            options || {};


        if (!isConnected()) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        const language =
            normalizeLanguage(

                options.language ||
                state.language

            );


        log(
            "Print:",
            language
        );


        switch (language) {

            case "ESC":

                return await printESC(
                    data
                );


            case "TSPL":

                return await printTSPL(
                    data
                );


            case "ZPL":

                return await printZPL(
                    data
                );


            case "CPCL":

                return await printCPCL(
                    data
                );


            default:

                return await sendRaw(
                    data
                );

        }

    }


    /* =====================================================
       TEST PRINT
       ===================================================== */

    async function testPrint() {

        if (!isConnected()) {

            throw new Error(
                "Printer belum terhubung."
            );

        }


        log(
            "Test print:",
            state.language
        );


        switch (state.language) {

            case "TSPL": {

                const width =
                    state.labelWidth;

                const height =
                    state.labelHeight;


                const command =

                    "SIZE " +
                    width +
                    " mm," +
                    height +
                    " mm\r\n" +

                    "GAP " +
                    DEFAULTS.gap +
                    " mm,0 mm\r\n" +

                    "DIRECTION 1\r\n" +

                    "CLS\r\n" +

                    "TEXT 50,50,\"0\",0,1,1,\"SmartPrint TEST\"\r\n" +

                    "TEXT 50,100,\"0\",0,1,1,\"" +
                    width +
                    " x " +
                    height +
                    " mm\"\r\n" +

                    "PRINT 1,1\r\n";


                return await sendText(
                    command
                );

            }


            case "ESC": {

                const bytes =
                    new Uint8Array([

                        0x1B,
                        0x40,

                        0x1B,
                        0x61,
                        0x01,

                    ]);


                const text =
                    "SmartPrint TEST\n" +
                    state.labelWidth +
                    " x " +
                    state.labelHeight +
                    " mm\n\n";


                await sendRaw(
                    bytes
                );


                await sendText(
                    text
                );


                await sendRaw(

                    new Uint8Array([

                        0x0A,
                        0x0A,
                        0x0A

                    ])

                );


                return true;

            }


            case "ZPL": {

                const zpl =

                    "^XA\n" +

                    "^FO50,50\n" +

                    "^A0N,40,40\n" +

                    "^FDSmartPrint TEST^FS\n" +

                    "^FO50,110\n" +

                    "^A0N,30,30\n" +

                    "^FD" +
                    state.labelWidth +
                    " x " +
                    state.labelHeight +
                    " mm^FS\n" +

                    "^XZ\n";


                return await sendText(
                    zpl
                );

            }


            case "CPCL": {

                const width =
                    mmToDots(
                        state.labelWidth
                    );


                const height =
                    mmToDots(
                        state.labelHeight
                    );


                const cpcl =

                    "! 0 " +
                    "200 200 " +
                    height +
                    "1\r\n" +

                    "TEXT 4 0 50 50 " +
                    "SmartPrint TEST\r\n" +

                    "TEXT 4 0 50 100 " +
                    state.labelWidth +
                    " x " +
                    state.labelHeight +
                    " mm\r\n" +

                    "FORM\r\n" +

                    "PRINT\r\n";


                return await sendText(
                    cpcl
                );

            }


            default:

                throw new Error(
                    "Printer language tidak didukung: " +
                    state.language
                );

        }

    }


    /* =====================================================
       STATUS EVENT
       ===================================================== */

    function dispatchStatusEvent(type) {

        try {

            const event =
                new CustomEvent(
                    "smartprint:printer",
                    {

                        detail: {

                            type: type,

                            status:
                                getStatus()

                        }

                    }
                );


            window.dispatchEvent(
                event
            );

        } catch (e) {

            /* Browser lama */

        }

    }


    /* =====================================================
       DELAY
       ===================================================== */

    function delay(ms) {

        return new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    ms
                );

            }
        );

    }


    /* =====================================================
       BLUETOOTH STATE SYNC
       ===================================================== */

    function syncFromBluetooth(detail) {

        const Bluetooth = getBluetooth();
        if (!Bluetooth) return false;

        const source = detail || {};
        let info = null;

        try {
            if (typeof Bluetooth.getInfo === "function") {
                info = Bluetooth.getInfo();
            }
        } catch (e) {}

        if (source.device) state.device = source.device;
        if (source.name) state.deviceName = source.name;
        if (source.id) state.deviceId = source.id;

        if (info) {
            if (info.deviceName) state.deviceName = info.deviceName;
            if (info.deviceId) state.deviceId = info.deviceId;
            if (info.writeCharacteristic) {
                state.writeCharacteristic = {
                    uuid: info.writeCharacteristic
                };
            }
            state.connected = info.connected === true;
            state.transport =
                info.type === "BLE"
                    ? "Bluetooth.sendRaw"
                    : (info.type || null);
        } else {
            try {
                state.connected = Bluetooth.isConnected() === true;
            } catch (e) {
                state.connected = false;
            }
            state.transport =
                state.connected ? "Bluetooth.sendRaw" : null;
        }

        if (!state.connected) {
            state.server = null;
            state.service = null;
            state.characteristic = null;
            state.writeCharacteristic = null;
            state.notifyCharacteristic = null;
            state.transport = null;
        }

        return state.connected;
    }


    function attachBluetoothEvents() {

        if (
            typeof window === "undefined" ||
            state.bluetoothEventsAttached
        ) return;

        state.bluetoothEventsAttached = true;

        window.addEventListener(
            "smartprint-bluetooth-connected",
            function (event) {
                syncFromBluetooth(event.detail);
                state.connecting = false;
                state.lastError = null;
                state.lastConnectedAt = new Date().toISOString();
                dispatchStatusEvent("connected");
            }
        );

        window.addEventListener(
            "smartprint-bluetooth-disconnected",
            function (event) {
                syncFromBluetooth(event.detail);
                state.connected = false;
                state.connecting = false;
                state.transport = null;
                state.writeCharacteristic = null;
                state.notifyCharacteristic = null;
                state.lastDisconnectedAt = new Date().toISOString();
                dispatchStatusEvent("disconnected");
            }
        );

        window.addEventListener(
            "smartprint-bluetooth-error",
            function (event) {
                const d = event.detail || {};
                state.lastError =
                    d.message ||
                    (d.error && d.error.message) ||
                    "Bluetooth connection error";
                state.connecting = false;
                dispatchStatusEvent("error");
            }
        );

        window.addEventListener(
            "smartprint-bluetooth-status",
            function (event) {
                const d = event.detail || {};
                if (d.connected) syncFromBluetooth(d);
                if (d.connected === false && d.type === null) {
                    state.connected = false;
                    state.transport = null;
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function init() {

        if (state.initialized === true) {
            return getStatus();
        }

        try {
            syncSettings();
            attachBluetoothEvents();
            state.initialized = true;

            log("Printer Manager initialized.");
            log("Printer Language:", state.language);
            log("Paper:", state.paperWidth + " x " + state.paperHeight + " mm");
            log("Label:", state.labelWidth + " x " + state.labelHeight + " mm");
            log("DPI:", state.dpi);
            log("Transparent background:", state.transparentBackground);

            return getStatus();

        } catch (e) {
            state.lastError = e && e.message ? e.message : String(e);
            error("Initialization failed:", e);
            return getStatus();
        }
    }


    /* =====================================================
       SETTINGS COMPATIBILITY
       ===================================================== */

    function sync() {

        syncSettings();

        return getStatus();

    }


    function refresh() {

        return sync();

    }


    /* =====================================================
       SET PRINTER
       ===================================================== */

    function setPrinterLanguage(language) {

        return setLanguage(
            language
        );

    }


    function getPrinterLanguage() {

        return getLanguage();

    }


    /* =====================================================
       PRINT CANVAS
       ===================================================== */

    async function printCanvas(canvas, options) {

        options =
            options || {};


        if (!canvas) {

            throw new Error(
                "Canvas tidak tersedia."
            );

        }


        let canvasData;


        try {

            canvasData =
                canvas.toDataURL(
                    "image/png"
                );

        } catch (e) {

            throw new Error(
                "Canvas tidak dapat dibaca."
            );

        }


        /* Jika engine printer mempunyai
           renderer khusus, serahkan ke engine. */

        if (
            state.language === "TSPL" &&
            window.TSPL
        ) {

            if (
                typeof window.TSPL.printCanvas ===
                "function"
            ) {

                const raw =
                    await window.TSPL.printCanvas(
                        canvas,
                        {

                            width:
                                state.labelWidth,

                            height:
                                state.labelHeight,

                            dpi:
                                state.dpi,

                            transparentBackground:
                                state.transparentBackground

                        }
                    );


                return await sendRaw(
                    raw
                );

            }

        }


        /* Fallback:
           canvas PNG tidak langsung dikirim
           ke printer RAW karena printer thermal
           membutuhkan bitmap command. */

        if (
            typeof options.raw ===
            "object"
        ) {

            return await sendRaw(
                options.raw
            );

        }


        throw new Error(
            "Canvas belum mempunyai renderer RAW untuk bahasa printer " +
            state.language +
            ". Gunakan TSPL/ESC-POS engine."
        );

    }


    /* =====================================================
       PRINT RAW IMAGE
       ===================================================== */

    async function printRaw(data) {

        return await sendRaw(
            data
        );

    }


    /* =====================================================
       RESET STATE
       ===================================================== */

    function reset() {

        state.connected =
            false;

        state.connecting =
            false;

        state.device =
            null;

        state.server =
            null;

        state.service =
            null;

        state.characteristic =
            null;

        state.writeCharacteristic =
            null;

        state.notifyCharacteristic =
            null;

        state.deviceName =
            "";

        state.deviceId =
            "";

        state.transport =
            null;

        state.lastError =
            null;

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    const Printer = {

        /* Version */

        version:
            VERSION,

        VERSION:
            VERSION,


        /* Initialization */

        init:
            init,

        initialize:
            init,


        /* Settings */

        sync:
            sync,

        refresh:
            refresh,

        setLanguage:
            setLanguage,

        setPrinterLanguage:
            setPrinterLanguage,

        getLanguage:
            getLanguage,

        getPrinterLanguage:
            getPrinterLanguage,


        setPaper:
            setPaper,

        setLabelSize:
            setLabelSize,


        /* Conversion */

        mmToDots:
            mmToDots,

        dotsToMm:
            dotsToMm,


        /* Connection */

        connect:
            connect,

        connectSerial:
            connectSerial,

        connectBluetoothCOM:
            connectSerial,

        disconnect:
            disconnect,

        isConnected:
            isConnected,


        /* Status */

        getStatus:
            getStatus,

        status:
            getStatus,

        getDevice:
            getDevice,

        getDeviceName:
            getDeviceName,


        /* Transport */

        sendRaw:
            sendRaw,

        write:
            sendRaw,

        send:
            sendRaw,

        sendText:
            sendText,

        sendCommand:
            sendCommand,


        /* Print */

        print:
            print,

        printRaw:
            printRaw,

        printCanvas:
            printCanvas,

        testPrint:
            testPrint,


        /* Individual engines */

        printESC:
            printESC,

        printTSPL:
            printTSPL,

        printZPL:
            printZPL,

        printCPCL:
            printCPCL,


        /* Reset */

        reset:
            reset

    };


    /* =====================================================
       GLOBAL
       ===================================================== */

    window.Printer =
        Printer;


    window.SmartPrintPrinter =
        Printer;


    /* =====================================================
       AUTO INIT
       ===================================================== */

    function boot() {

        try {

            Printer.init();

        } catch (e) {

            error(
                "Printer initialization error:",
                e
            );

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            boot,
            {
                once: true
            }
        );

    }

    else {

        boot();

    }


})(window);


/* =========================================================
   END SMARTPRINT PRINTER MANAGER v4.5.0
   ========================================================= */
