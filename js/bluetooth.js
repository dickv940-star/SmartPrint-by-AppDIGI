/*
=========================================================
SmartPrint by AppDIGI
Bluetooth Engine v4.0
=========================================================

FEATURES
---------------------------------------------------------
✓ Web Bluetooth Detection
✓ Secure Context Detection
✓ Bluetooth Device Picker
✓ GATT Connection
✓ Automatic Service Detection
✓ Automatic Write Characteristic Detection
✓ 18F0 Thermal Printer Service
✓ FFE0 / FFE1 Fallback
✓ Connect
✓ Disconnect
✓ isConnected
✓ Send Data
✓ Chunk Data
✓ Test Connection
✓ Diagnostic
✓ Device Information
✓ Connection Status
✓ Disconnect Detection
✓ Printer Status UI
✓ Compatible with Printer Manager v3.0
=========================================================
*/

"use strict";


(function () {


    // =================================================
    // BLUETOOTH ENGINE
    // =================================================

    const BluetoothManager = {


        // =================================================
        // CORE
        // =================================================

        device: null,

        server: null,

        service: null,

        characteristic: null,


        // =================================================
        // CONNECTION STATE
        // =================================================

        connected: false,

        connecting: false,


        // =================================================
        // PRINTER SERVICE UUID
        // =================================================

        SERVICE_UUID:
            "000018f0-0000-1000-8000-00805f9b34fb",


        // =================================================
        // COMMON THERMAL PRINTER SERVICES
        // =================================================

        SERVICE_UUIDS: [

            "000018f0-0000-1000-8000-00805f9b34fb",

            "0000ffe0-0000-1000-8000-00805f9b34fb",

            "49535343-fe7d-4ae5-8fa9-9fafd205e455",

            "0000ae30-0000-1000-8000-00805f9b34fb"

        ],


        // =================================================
        // COMMON WRITE CHARACTERISTICS
        // =================================================

        CHARACTERISTIC_UUIDS: [

            "00002af1-0000-1000-8000-00805f9b34fb",

            "0000ffe1-0000-1000-8000-00805f9b34fb",

            "49535343-8841-43f4-a8d4-ecbe34729bb3",

            "0000ae01-0000-1000-8000-00805f9b34fb"

        ],


        // =================================================
        // CHUNK SIZE
        // =================================================

        chunkSize: 180,


        // =================================================
        // DEVICE NAME
        // =================================================

        deviceName: "",


        // =================================================
        // INIT
        // =================================================

        init() {

            console.log(
                "========================================"
            );

            console.log(
                "SmartPrint Bluetooth Engine v4.0"
            );

            console.log(
                "========================================"
            );


            this.updateStatus(false);


            return true;

        },


        // =================================================
        // CHECK WEB BLUETOOTH
        // =================================================

        isSupported() {

            return (
                typeof navigator !== "undefined" &&
                "bluetooth" in navigator
            );

        },


        // =================================================
        // CHECK SECURE CONTEXT
        // =================================================

        isSecureContext() {

            return (
                typeof window !== "undefined" &&
                window.isSecureContext === true
            );

        },


        // =================================================
        // CHECK CONNECTION
        // =================================================

        isConnected() {

            if (!this.connected) {

                return false;

            }


            if (!this.device) {

                this.connected = false;

                return false;

            }


            if (
                this.device.gatt &&
                !this.device.gatt.connected
            ) {

                this.connected = false;

                return false;

            }


            if (!this.server) {

                this.connected = false;

                return false;

            }


            return true;

        },


        // =================================================
        // CONNECT
        // =================================================

        async connect() {

            console.log(
                "----------------------------------------"
            );

            console.log(
                "BLUETOOTH CONNECT"
            );

            console.log(
                "----------------------------------------"
            );


            // ---------------------------------------------
            // SECURE CONTEXT
            // ---------------------------------------------

            if (!this.isSecureContext()) {

                console.error(
                    "Web Bluetooth membutuhkan HTTPS."
                );

                this.updateStatus(false);

                return false;

            }


            // ---------------------------------------------
            // WEB BLUETOOTH
            // ---------------------------------------------

            if (!this.isSupported()) {

                console.error(
                    "Web Bluetooth tidak didukung browser."
                );

                this.updateStatus(false);

                return false;

            }


            // ---------------------------------------------
            // ALREADY CONNECTED
            // ---------------------------------------------

            if (this.isConnected()) {

                console.log(
                    "Printer sudah terhubung."
                );

                return true;

            }


            // ---------------------------------------------
            // PREVENT DOUBLE CONNECT
            // ---------------------------------------------

            if (this.connecting) {

                console.warn(
                    "Connection sedang berlangsung."
                );

                return false;

            }


            this.connecting = true;


            try {


                // =========================================
                // REQUEST DEVICE
                // =========================================

                console.log(
                    "Opening Bluetooth Device Picker..."
                );


                this.device =
                    await navigator.bluetooth.requestDevice({

                        acceptAllDevices: true,

                        optionalServices: [

                            this.SERVICE_UUID,

                            "0000ffe0-0000-1000-8000-00805f9b34fb",

                            "0000ffe1-0000-1000-8000-00805f9b34fb",

                            "49535343-fe7d-4ae5-8fa9-9fafd205e455",

                            "0000ae30-0000-1000-8000-00805f9b34fb"

                        ]

                    });


                // =========================================
                // DEVICE CHECK
                // =========================================

                if (!this.device) {

                    console.warn(
                        "Tidak ada device yang dipilih."
                    );

                    this.updateStatus(false);

                    return false;

                }


                this.deviceName =
                    this.device.name ||
                    "Bluetooth Printer";


                console.log(
                    "Device Selected:",
                    this.deviceName
                );


                // =========================================
                // DISCONNECT EVENT
                // =========================================

                this.device.removeEventListener(
                    "gattserverdisconnected",
                    this.handleDisconnect
                );


                this.device.addEventListener(
                    "gattserverdisconnected",
                    this.handleDisconnect.bind(this)
                );


                // =========================================
                // GATT CONNECT
                // =========================================

                console.log(
                    "Connecting GATT..."
                );


                this.server =
                  await device.gatt.connect();

console.log("Printer Connected");

localStorage.setItem(
    "SmartPrint_LastPrinter",
    JSON.stringify({
        name: device.name,
        id: device.id
    })
);


                if (!this.server) {

                    throw new Error(
                        "GATT Server tidak tersedia."
                    );

                }


                console.log(
                    "GATT Connected"
                );


                // =========================================
                // FIND SERVICE
                // =========================================

                this.service =
                    await this.findService();


                if (!this.service) {

                    throw new Error(
                        "Bluetooth Service printer tidak ditemukan."
                    );

                }


                console.log(
                    "Service Found:",
                    this.service.uuid
                );


                // =========================================
                // FIND CHARACTERISTIC
                // =========================================

                this.characteristic =
                    await this.findCharacteristic(
                        this.service
                    );


                if (!this.characteristic) {

                    throw new Error(
                        "Write Characteristic printer tidak ditemukan."
                    );

                }


                console.log(
                    "Write Characteristic Found:",
                    this.characteristic.uuid
                );


                // =========================================
                // VERIFY WRITE
                // =========================================

                const properties =
                    this.characteristic.properties;


                if (
                    !properties.write &&
                    !properties.writeWithoutResponse
                ) {

                    throw new Error(
                        "Characteristic tidak mendukung WRITE."
                    );

                }


                // =========================================
                // CONNECTED
                // =========================================

                this.connected = true;


                this.updateStatus(
                    true,
                    this.deviceName
                );


                console.log(
                    "========================================"
                );

                console.log(
                    "BLUETOOTH CONNECTED"
                );

                console.log(
                    "Device:",
                    this.deviceName
                );

                console.log(
                    "Service:",
                    this.service.uuid
                );

                console.log(
                    "Characteristic:",
                    this.characteristic.uuid
                );

                console.log(
                    "========================================"
                );


                return true;


            }

            catch (error) {


                // =========================================
                // USER CANCEL
                // =========================================

                if (
                    error &&
                    error.name === "NotFoundError"
                ) {

                    console.warn(
                        "Bluetooth Device Picker dibatalkan."
                    );


                    this.connected = false;

                    this.updateStatus(false);


                    return false;

                }


                // =========================================
                // OTHER ERROR
                // =========================================

                console.error(
                    "Bluetooth Connect Error:",
                    error
                );


                this.connected = false;


                this.updateStatus(false);


                return false;


            }

            finally {

                this.connecting = false;

            }

        },


        // =================================================
        // FIND SERVICE
        // =================================================

        async findService() {


            if (!this.server) {

                return null;

            }


            // ---------------------------------------------
            // TRY MAIN SERVICE
            // ---------------------------------------------

            for (
                const uuid of this.SERVICE_UUIDS
            ) {

                try {

                    console.log(
                        "Trying Service:",
                        uuid
                    );


                    const service =
                        await this.server.getPrimaryService(
                            uuid
                        );


                    if (service) {

                        return service;

                    }

                }

                catch (error) {

                    console.log(
                        "Service not found:",
                        uuid
                    );

                }

            }


            // ---------------------------------------------
            // DISCOVER ALL SERVICES
            // ---------------------------------------------

            try {

                console.log(
                    "Discovering Primary Services..."
                );


                const services =
                    await this.server.getPrimaryServices();


                console.log(
                    "Services Found:",
                    services.length
                );


                for (
                    const service of services
                ) {

                    console.log(
                        "Service:",
                        service.uuid
                    );


                    try {

                        const chars =
                            await service.getCharacteristics();


                        for (
                            const characteristic
                            of chars
                        ) {

                            const p =
                                characteristic.properties;


                            if (
                                p.write ||
                                p.writeWithoutResponse
                            ) {

                                console.log(
                                    "Writable Service Found:",
                                    service.uuid
                                );


                                return service;

                            }

                        }

                    }

                    catch (error) {

                        console.warn(
                            "Characteristic scan failed:",
                            service.uuid
                        );

                    }

                }

            }

            catch (error) {

                console.warn(
                    "Primary service discovery failed:",
                    error
                );

            }


            return null;

        },


        // =================================================
        // FIND CHARACTERISTIC
        // =================================================

        async findCharacteristic(service) {


            if (!service) {

                return null;

            }


            // ---------------------------------------------
            // GET CHARACTERISTICS
            // ---------------------------------------------

            const chars =
                await service.getCharacteristics();


            console.log(
                "Characteristics Found:",
                chars.length
            );


            // ---------------------------------------------
            // PRINT CHARACTERISTICS
            // ---------------------------------------------

            chars.forEach(
                characteristic => {

                    console.log(
                        "Characteristic:",
                        characteristic.uuid,
                        characteristic.properties
                    );

                }
            );


            // ---------------------------------------------
            // TRY KNOWN UUID
            // ---------------------------------------------

            for (
                const uuid of this.CHARACTERISTIC_UUIDS
            ) {

                const found =
                    chars.find(
                        c =>
                            c.uuid.toLowerCase() ===
                            uuid.toLowerCase()
                    );


                if (found) {

                    if (
                        found.properties.write ||
                        found.properties.writeWithoutResponse
                    ) {

                        return found;

                    }

                }

            }


            // ---------------------------------------------
            // FIND WRITE
            // ---------------------------------------------

            const writable =
                chars.find(
                    c =>
                        c.properties.write ||
                        c.properties.writeWithoutResponse
                );


            if (writable) {

                return writable;

            }


            return null;

        },


        // =================================================
        // SEND DATA
        // =================================================

        async send(data) {


            if (!this.isConnected()) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            if (!this.characteristic) {

                throw new Error(
                    "Write Characteristic tidak tersedia."
                );

            }


            // ---------------------------------------------
            // CONVERT DATA
            // ---------------------------------------------

            let bytes;


            if (data instanceof Uint8Array) {

                bytes = data;

            }

            else if (
                data instanceof ArrayBuffer
            ) {

                bytes =
                    new Uint8Array(data);

            }

            else if (
                Array.isArray(data)
            ) {

                bytes =
                    new Uint8Array(data);

            }

            else if (
                typeof data === "string"
            ) {

                bytes =
                    new TextEncoder().encode(data);

            }

            else {

                throw new Error(
                    "Format data Bluetooth tidak didukung."
                );

            }


            console.log(
                "Sending:",
                bytes.length,
                "bytes"
            );


            // ---------------------------------------------
            // CHUNK
            // ---------------------------------------------

            for (
                let i = 0;
                i < bytes.length;
                i += this.chunkSize
            ) {


                if (!this.isConnected()) {

                    throw new Error(
                        "Printer terputus saat proses pengiriman."
                    );

                }


                const chunk =
                    bytes.slice(
                        i,
                        Math.min(
                            i + this.chunkSize,
                            bytes.length
                        )
                    );


                // -----------------------------------------
                // WRITE WITHOUT RESPONSE
                // -----------------------------------------

                if (
                    this.characteristic.properties
                        .writeWithoutResponse &&
                    typeof this.characteristic
                        .writeValueWithoutResponse ===
                        "function"
                ) {

                    await this.characteristic
                        .writeValueWithoutResponse(
                            chunk
                        );

                }


                // -----------------------------------------
                // WRITE WITH RESPONSE
                // -----------------------------------------

                else if (
                    this.characteristic.properties.write
                ) {

                    await this.characteristic
                        .writeValue(
                            chunk
                        );

                }

                else {

                    throw new Error(
                        "Characteristic tidak mendukung WRITE."
                    );

                }


                // -----------------------------------------
                // SMALL DELAY
                // -----------------------------------------

                await this.delay(10);

            }


            console.log(
                "Bluetooth Send Complete"
            );


            return true;

        },


        // =================================================
        // TEST CONNECTION
        // =================================================

        async testConnection() {


            console.log(
                "========================================"
            );

            console.log(
                "BLUETOOTH TEST CONNECTION"
            );

            console.log(
                "========================================"
            );


            if (!this.isConnected()) {

                console.error(
                    "Printer belum terhubung."
                );


                return {

                    success: false,

                    message:
                        "Printer belum terhubung."

                };

            }


            try {


                /*
                -----------------------------------------
                TEST DATA
                -----------------------------------------
                */

                const testText =
                    "\n" +
                    "SMARTPRINT TEST\n" +
                    "Bluetooth Connection OK\n" +
                    "\n";


                const data =
                    new TextEncoder().encode(
                        testText
                    );


                await this.send(data);


                console.log(
                    "TEST CONNECTION SUCCESS"
                );


                return {

                    success: true,

                    message:
                        "Data test berhasil dikirim.",

                    device:
                        this.deviceName

                };


            }
// Simpan printer terakhir
localStorage.setItem(
    "SmartPrint_LastPrinter",
    JSON.stringify({
        name: device.name,
        id: device.id
    })
);

console.log(
    "Printer saved:",
    device.name
);
            catch (error) {


                console.error(
                    "TEST CONNECTION FAILED",
                    error
                );


                return {

                    success: false,

                    message:
                        error.message,

                    error:
                        error

                };

            }

        },


        // =================================================
        // DIAGNOSTIC
        // =================================================

        async diagnostic() {


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT BLUETOOTH DIAGNOSTIC"
            );

            console.log(
                "========================================"
            );


            const result = {

                secureContext:
                    this.isSecureContext(),

                webBluetooth:
                    this.isSupported(),

                device: null,

                deviceName: "",

                gatt: false,

                services: [],

                characteristic: null,

                connected:
                    this.isConnected(),

                error: null

            };


            console.log(
                "Secure Context:",
                result.secureContext
            );


            console.log(
                "Web Bluetooth:",
                result.webBluetooth
            );


            // ---------------------------------------------
            // BASIC CHECK
            // ---------------------------------------------

            if (!result.secureContext) {

                result.error =
                    "Halaman bukan Secure Context.";

                console.warn(
                    result.error
                );

                return result;

            }


            if (!result.webBluetooth) {

                result.error =
                    "Web Bluetooth tidak tersedia.";

                console.warn(
                    result.error
                );

                return result;

            }


            // ---------------------------------------------
            // EXISTING CONNECTION
            // ---------------------------------------------

            if (
                this.device &&
                this.server
            ) {


                result.device =
                    this.device.id;


                result.deviceName =
                    this.device.name ||
                    "";


                result.gatt =
                    this.device.gatt.connected;


                if (this.server) {


                    try {

                        const services =
                            await this.server
                                .getPrimaryServices();


                        result.services =
                            services.map(
                                service =>
                                    service.uuid
                            );

                    }

                    catch (error) {

                        console.warn(
                            "Service diagnostic failed:",
                            error
                        );

                    }

                }


                if (this.characteristic) {

                    result.characteristic =
                        this.characteristic.uuid;

                }


                console.log(
                    "DIAGNOSTIC RESULT:",
                    result
                );


                return result;

            }


            // ---------------------------------------------
            // NO CONNECTION
            // ---------------------------------------------

            /*
            ------------------------------------------------
            Diagnostic tidak memaksa requestDevice().
            Gunakan Connect untuk memilih printer.

            Ini mencegah diagnostic terus menghasilkan:
            NotFoundError:
            User cancelled requestDevice chooser.
            ------------------------------------------------
            */


            result.error =
                "Belum ada printer yang terhubung. Klik Connect Printer terlebih dahulu.";


            console.warn(
                result.error
            );


            console.log(
                "DIAGNOSTIC RESULT:",
                result
            );


            return result;

        },


        // =================================================
        // GET DEVICE
        // =================================================

        getDevice() {

            return this.device;

        },


        // =================================================
        // GET CHARACTERISTIC
        // =================================================

        getCharacteristic() {

            return this.characteristic;

        },


        // =================================================
        // GET SERVICE
        // =================================================

        getService() {

            return this.service;

        },


        // =================================================
        // DISCONNECT
        // =================================================

        disconnect() {


            console.log(
                "----------------------------------------"
            );

            console.log(
                "BLUETOOTH DISCONNECT"
            );

            console.log(
                "----------------------------------------"
            );


            try {


                if (
                    this.device &&
                    this.device.gatt
                ) {

                    if (
                        this.device.gatt.connected
                    ) {

                        this.device.gatt.disconnect();

                    }

                }

            }

            catch (error) {

                console.error(
                    "Bluetooth Disconnect Error:",
                    error
                );

            }


            this.connected = false;

            this.server = null;

            this.service = null;

            this.characteristic = null;


            this.updateStatus(false);


            console.log(
                "Bluetooth Disconnected"
            );


            return true;

        },


        // =================================================
        // HANDLE DISCONNECT
        // =================================================

        handleDisconnect(event) {


            console.warn(
                "Bluetooth Device Disconnected"
            );


            this.connected = false;

            this.server = null;

            this.service = null;

            this.characteristic = null;


            this.updateStatus(false);


            /*
            -----------------------------------------
            Sync Printer Manager
            -----------------------------------------
            */

            if (
                window.Printer
            ) {

                window.Printer.connected =
                    false;

            }


            /*
            -----------------------------------------
            App Status
            -----------------------------------------
            */

            if (
                window.App &&
                typeof window.App
                    .updatePrinterStatus ===
                    "function"
            ) {

                window.App.updatePrinterStatus(
                    false
                );

            }

        },


        // =================================================
        // UPDATE STATUS
        // =================================================

        updateStatus(
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
                            this.deviceName ||
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


            /*
            -----------------------------------------
            Sync Printer Manager
            -----------------------------------------
            */

            if (
                window.Printer
            ) {

                window.Printer.connected =
                    connected;

            }


            /*
            -----------------------------------------
            Sync App
            -----------------------------------------
            */

            if (
                window.App &&
                typeof window.App
                    .updatePrinterStatus ===
                    "function"
            ) {

                window.App.updatePrinterStatus(

                    connected,

                    name ||
                    this.deviceName ||
                    ""

                );

            }

        },


        // =================================================
        // DELAY
        // =================================================

        delay(ms) {

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
    // GLOBAL EXPORT
    // =====================================================

    window.Bluetooth =
        BluetoothManager;


    // =====================================================
    // INITIALIZE
    // =====================================================

    BluetoothManager.init();


    console.log(
        "SmartPrint Bluetooth Engine v4.0 Ready"
    );


})();
