/*
=========================================================
 SmartPrint by AppDIGI
 Bluetooth Engine v3.0
 BLE Diagnostic + Printer Connection + Test Connection
=========================================================
*/

"use strict";


const Bluetooth = {

    // =================================================
    // STATE
    // =================================================

    device: null,

    server: null,

    service: null,

    characteristic: null,

    connected: false,

    lastDiagnostic: null,


    // =================================================
    // KNOWN PRINTER SERVICES
    // =================================================

    SERVICE_UUIDS: [

        "000018f0-0000-1000-8000-00805f9b34fb",

        "0000ffe0-0000-1000-8000-00805f9b34fb",

        "0000ff00-0000-1000-8000-00805f9b34fb"

    ],


    // =================================================
    // INIT
    // =================================================

    init() {

        console.log(
            "========================================"
        );

        console.log(
            "SmartPrint Bluetooth Engine v3.0"
        );

        console.log(
            "========================================"
        );


        this.createDiagnosticUI();

        this.bindButtons();

        this.updateStatus(false);

    },


    // =================================================
    // WEB BLUETOOTH SUPPORT
    // =================================================

    isSupported() {

        return (
            typeof navigator !== "undefined" &&
            "bluetooth" in navigator
        );

    },


    // =================================================
    // CREATE UI
    // =================================================

    createDiagnosticUI() {

        /*
        Jangan membuat UI berulang.
        */

        if (
            document.getElementById(
                "bluetoothTools"
            )
        ) {

            return;

        }


        const panel =
            document.querySelector(
                ".panel"
            );


        if (!panel) {

            console.warn(
                "Bluetooth UI: panel printer tidak ditemukan."
            );

            return;

        }


        const box =
            document.createElement(
                "div"
            );


        box.id =
            "bluetoothTools";


        box.className =
            "bluetooth-tools";


        box.innerHTML = `

            <div class="bluetooth-tools-title">
                Bluetooth
            </div>

            <button
                type="button"
                id="bluetoothDiagnosticBtn">

                🔎 Diagnostic

            </button>

            <button
                type="button"
                id="bluetoothTestBtn">

                🧪 Test Connection

            </button>

            <button
                type="button"
                id="bluetoothDisconnectBtn">

                🔌 Disconnect

            </button>

            <div
                id="bluetoothDiagnosticResult"
                class="bluetooth-diagnostic-result">

                Bluetooth belum diperiksa.

            </div>

        `;


        panel.appendChild(box);

    },


    // =================================================
    // BIND BUTTONS
    // =================================================

    bindButtons() {

        const connectBtn =
            document.getElementById(
                "connectBtn"
            );


        const diagnosticBtn =
            document.getElementById(
                "bluetoothDiagnosticBtn"
            );


        const testBtn =
            document.getElementById(
                "bluetoothTestBtn"
            );


        const disconnectBtn =
            document.getElementById(
                "bluetoothDisconnectBtn"
            );


        // ---------------------------------------------
        // CONNECT
        // ---------------------------------------------

        if (connectBtn) {

            connectBtn.addEventListener(
                "click",
                async () => {

                    await this.connect();

                }
            );

        }


        // ---------------------------------------------
        // DIAGNOSTIC
        // ---------------------------------------------

        if (diagnosticBtn) {

            diagnosticBtn.addEventListener(
                "click",
                async () => {

                    await this.diagnostic();

                }
            );

        }


        // ---------------------------------------------
        // TEST
        // ---------------------------------------------

        if (testBtn) {

            testBtn.addEventListener(
                "click",
                async () => {

                    await this.testConnection();

                }
            );

        }


        // ---------------------------------------------
        // DISCONNECT
        // ---------------------------------------------

        if (disconnectBtn) {

            disconnectBtn.addEventListener(
                "click",
                () => {

                    this.disconnect();

                }
            );

        }

    },


    // =================================================
    // CONNECT
    // =================================================

    async connect() {

        try {

            console.log(
                "----------------------------------------"
            );

            console.log(
                "BLUETOOTH CONNECT"
            );

            console.log(
                "----------------------------------------"
            );


            if (!this.isSupported()) {

                this.showDiagnostic(
                    "❌ Web Bluetooth tidak didukung browser.",
                    "error"
                );

                throw new Error(
                    "Web Bluetooth tidak didukung."
                );

            }


            console.log(
                "Opening Bluetooth Device Picker..."
            );


            /*
            Penting:

            acceptAllDevices digunakan untuk diagnostic
            karena kita belum mengetahui UUID BLE printer.
            */

            this.device =
                await navigator.bluetooth.requestDevice({

                    acceptAllDevices: true,

                    optionalServices:
                        this.SERVICE_UUIDS

                });


            if (!this.device) {

                return false;

            }


            console.log(
                "Device selected:"
            );

            console.log(
                "Name:",
                this.device.name ||
                "(Unnamed)"
            );

            console.log(
                "ID:",
                this.device.id
            );


            this.showDiagnostic(
                "🔵 Device dipilih: " +
                (
                    this.device.name ||
                    "Unnamed Device"
                ),
                "info"
            );


            // -----------------------------------------
            // DISCONNECT EVENT
            // -----------------------------------------

            this.device.addEventListener(
                "gattserverdisconnected",
                () => {

                    console.warn(
                        "Printer disconnected."
                    );

                    this.connected = false;

                    this.server = null;

                    this.service = null;

                    this.characteristic = null;

                    this.updateStatus(false);

                    this.showDiagnostic(
                        "⚠ Printer disconnected.",
                        "warning"
                    );

                }
            );


            // -----------------------------------------
            // GATT
            // -----------------------------------------

            if (!this.device.gatt) {

                throw new Error(
                    "Device tidak memiliki GATT."
                );

            }


            console.log(
                "Connecting GATT..."
            );


            this.server =
                await this.device.gatt.connect();


            if (
                !this.server ||
                !this.server.connected
            ) {

                throw new Error(
                    "GATT gagal terhubung."
                );

            }


            console.log(
                "GATT Connected."
            );


            // -----------------------------------------
            // FIND SERVICES
            // -----------------------------------------

            const services =
                await this.server.getPrimaryServices();


            console.log(
                "Primary Services:",
                services.length
            );


            if (!services.length) {

                throw new Error(
                    "Tidak ada Primary Service."
                );

            }


            this.service = null;

            this.characteristic = null;


            // -----------------------------------------
            // SCAN SERVICES
            // -----------------------------------------

            for (
                const service
                of services
            ) {

                console.log(
                    "SERVICE:",
                    service.uuid
                );


                let chars;


                try {

                    chars =
                        await service.getCharacteristics();

                } catch (error) {

                    console.warn(
                        "Cannot read characteristics:",
                        service.uuid,
                        error
                    );

                    continue;

                }


                for (
                    const char
                    of chars
                ) {

                    console.log(
                        " CHARACTERISTIC:",
                        char.uuid
                    );

                    console.log(
                        " PROPERTIES:",
                        char.properties
                    );


                    const writable =

                        char.properties.write ||

                        char.properties.writeWithoutResponse;


                    if (
                        writable &&
                        !this.characteristic
                    ) {

                        this.service =
                            service;

                        this.characteristic =
                            char;

                    }

                }

            }


            // -----------------------------------------
            // NO WRITE CHARACTERISTIC
            // -----------------------------------------

            if (!this.characteristic) {

                console.warn(
                    "GATT connected tetapi WRITE characteristic tidak ditemukan."
                );


                this.connected = false;

                this.updateStatus(false);


                this.showDiagnostic(
                    "⚠ BLE device terhubung, tetapi WRITE characteristic tidak ditemukan.",
                    "warning"
                );


                return false;

            }


            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------

            this.connected = true;


            this.updateStatus(true);


            console.log(
                "========================================"
            );

            console.log(
                "PRINTER CONNECTED"
            );

            console.log(
                "Printer:",
                this.device.name
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


            this.showDiagnostic(
                "✅ Printer Connected: " +
                (
                    this.device.name ||
                    "Unnamed"
                ),
                "success"
            );


            return true;


        } catch (error) {


            console.error(
                "Bluetooth Connect Error:",
                error
            );


            this.connected = false;


            this.updateStatus(false);


            if (
                error.name ===
                "NotFoundError"
            ) {

                this.showDiagnostic(
                    "⚠ Tidak ada perangkat dipilih atau perangkat BLE tidak tersedia.",
                    "warning"
                );


                return false;

            }


            this.showDiagnostic(
                "❌ " +
                (
                    error.message ||
                    "Bluetooth connection error."
                ),
                "error"
            );


            return false;

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

            webBluetooth: false,

            secureContext: false,

            device: null,

            gatt: false,

            services: [],

            writableCharacteristics: [],

            possibleClassic: false,

            message: ""

        };


        // ---------------------------------------------
        // SECURE CONTEXT
        // ---------------------------------------------

        result.secureContext =
            window.isSecureContext;


        console.log(
            "Secure Context:",
            result.secureContext
        );


        if (!result.secureContext) {

            result.message =
                "HTTPS diperlukan untuk Web Bluetooth.";

            this.lastDiagnostic =
                result;

            this.showDiagnostic(
                "❌ HTTPS / Secure Context tidak tersedia.",
                "error"
            );

            return result;

        }


        // ---------------------------------------------
        // WEB BLUETOOTH
        // ---------------------------------------------

        result.webBluetooth =
            this.isSupported();


        console.log(
            "Web Bluetooth:",
            result.webBluetooth
        );


        if (!result.webBluetooth) {

            result.message =
                "Browser tidak mendukung Web Bluetooth.";

            this.lastDiagnostic =
                result;

            this.showDiagnostic(
                "❌ Browser tidak mendukung Web Bluetooth.",
                "error"
            );

            return result;

        }


        // ---------------------------------------------
        // REQUEST DEVICE
        // ---------------------------------------------

        try {

            this.showDiagnostic(
                "🔎 Membuka Bluetooth Diagnostic...",
                "info"
            );


            const device =
                await navigator.bluetooth.requestDevice({

                    acceptAllDevices: true,

                    optionalServices:
                        this.SERVICE_UUIDS

                });


            result.device =
                device;


            console.log(
                "Device:",
                device.name ||
                "Unnamed"
            );


            // -----------------------------------------
            // DISCONNECT LISTENER
            // -----------------------------------------

            device.addEventListener(
                "gattserverdisconnected",
                () => {

                    console.log(
                        "Diagnostic device disconnected."
                    );

                }
            );


            // -----------------------------------------
            // GATT CONNECT
            // -----------------------------------------

            if (
                device.gatt
            ) {

                try {

                    const server =
                        await device.gatt.connect();


                    result.gatt =
                        server.connected;


                    console.log(
                        "GATT Connected:",
                        result.gatt
                    );


                    if (result.gatt) {

                        const services =
                            await server.getPrimaryServices();


                        for (
                            const service
                            of services
                        ) {

                            result.services.push(
                                service.uuid
                            );


                            console.log(
                                "Service:",
                                service.uuid
                            );


                            let chars = [];


                            try {

                                chars =
                                    await service.getCharacteristics();

                            } catch {

                                continue;

                            }


                            for (
                                const char
                                of chars
                            ) {

                                const writable =

                                    char.properties.write ||

                                    char.properties.writeWithoutResponse;


                                if (writable) {

                                    result.writableCharacteristics.push({

                                        service:
                                            service.uuid,

                                        characteristic:
                                            char.uuid,

                                        properties:
                                            char.properties

                                    });

                                }

                            }

                        }

                    }

                } catch (error) {

                    console.warn(
                        "GATT diagnostic failed:",
                        error
                    );

                }

            }


            // -----------------------------------------
            // DETERMINE RESULT
            // -----------------------------------------

            if (
                result.gatt &&
                result.writableCharacteristics.length
            ) {

                result.message =
                    "BLE printer terdeteksi dan memiliki WRITE characteristic.";


                this.showDiagnostic(
                    "✅ BLE Printer terdeteksi dan siap diuji.",
                    "success"
                );

            }

            else if (
                result.gatt
            ) {

                result.message =
                    "BLE device terhubung tetapi WRITE characteristic tidak ditemukan.";


                this.showDiagnostic(
                    "⚠ BLE terdeteksi tetapi WRITE characteristic tidak ditemukan.",
                    "warning"
                );

            }

            else {

                result.possibleClassic =
                    true;


                result.message =
                    "Perangkat tidak dapat digunakan melalui GATT. Kemungkinan Bluetooth Classic/SPP atau perangkat tidak kompatibel.";


                this.showDiagnostic(
                    "⚠ Tidak dapat terhubung melalui BLE/GATT. Kemungkinan Bluetooth Classic/SPP.",
                    "warning"
                );

            }


            // -----------------------------------------
            // DISCONNECT DIAGNOSTIC
            // -----------------------------------------

            try {

                if (
                    device.gatt &&
                    device.gatt.connected
                ) {

                    device.gatt.disconnect();

                }

            } catch {}



        } catch (error) {


            console.error(
                "Diagnostic Error:",
                error
            );


            if (
                error.name ===
                "NotFoundError"
            ) {

                result.message =
                    "Tidak ada perangkat BLE kompatibel yang ditemukan atau dipilih.";

                result.possibleClassic =
                    true;


                this.showDiagnostic(
                    "⚠ Tidak ada perangkat BLE kompatibel. Printer mungkin Bluetooth Classic/SPP.",
                    "warning"
                );

            }

            else {

                result.message =
                    error.message;


                this.showDiagnostic(
                    "❌ Diagnostic gagal: " +
                    error.message,
                    "error"
                );

            }

        }


        this.lastDiagnostic =
            result;


        console.log(
            "DIAGNOSTIC RESULT:",
            result
        );


        return result;

    },


    // =================================================
    // TEST CONNECTION
    // =================================================

    async testConnection() {

        console.log(
            "----------------------------------------"
        );

        console.log(
            "BLUETOOTH TEST CONNECTION"
        );

        console.log(
            "----------------------------------------"
        );


        if (
            !this.isConnected()
        ) {

            this.showDiagnostic(
                "⚠ Printer belum terhubung. Hubungkan printer terlebih dahulu.",
                "warning"
            );


            console.warn(
                "Test Connection: printer not connected."
            );


            return false;

        }


        try {

            const testData =
                new Uint8Array([

                    0x1B,
                    0x40

                ]);


            console.log(
                "Sending ESC/POS initialization..."
            );


            await this.send(
                testData
            );


            console.log(
                "Test data sent successfully."
            );


            this.showDiagnostic(
                "✅ Connection OK. Data berhasil dikirim ke printer.",
                "success"
            );


            return true;


        } catch (error) {


            console.error(
                "Test Connection Error:",
                error
            );


            this.showDiagnostic(
                "❌ Test Connection gagal: " +
                error.message,
                "error"
            );


            return false;

        }

    },


    // =================================================
    // SEND
    // =================================================

    async send(data) {

        if (
            !this.isConnected()
        ) {

            throw new Error(
                "Printer Bluetooth belum terhubung."
            );

        }


        if (!data) {

            throw new Error(
                "Data print kosong."
            );

        }


        let buffer;


        // ---------------------------------------------
        // ARRAY BUFFER
        // ---------------------------------------------

        if (
            data instanceof ArrayBuffer
        ) {

            buffer =
                new Uint8Array(data);

        }


        // ---------------------------------------------
        // UINT8ARRAY
        // ---------------------------------------------

        else if (
            data instanceof Uint8Array
        ) {

            buffer =
                data;

        }


        // ---------------------------------------------
        // ARRAY
        // ---------------------------------------------

        else if (
            Array.isArray(data)
        ) {

            buffer =
                new Uint8Array(data);

        }


        else {

            throw new Error(
                "Format data Bluetooth tidak valid."
            );

        }


        console.log(
            "Sending:",
            buffer.length,
            "bytes"
        );


        const chunkSize =
            180;


        for (
            let i = 0;
            i < buffer.length;
            i += chunkSize
        ) {

            const chunk =
                buffer.slice(
                    i,
                    i + chunkSize
                );


            // -----------------------------------------
            // WRITE WITHOUT RESPONSE
            // -----------------------------------------

            if (
                this.characteristic
                    .properties
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
                this.characteristic
                    .properties
                    .write &&
                typeof this.characteristic
                    .writeValueWithResponse ===
                    "function"
            ) {

                await this.characteristic
                    .writeValueWithResponse(
                        chunk
                    );

            }


            // -----------------------------------------
            // LEGACY
            // -----------------------------------------

            else {

                await this.characteristic
                    .writeValue(
                        chunk
                    );

            }


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        10
                    )
            );

        }


        console.log(
            "Bluetooth data sent."
        );

    },


    // =================================================
    // DISCONNECT
    // =================================================

    disconnect() {

        console.log(
            "Disconnecting printer..."
        );


        try {

            if (
                this.device &&
                this.device.gatt &&
                this.device.gatt.connected
            ) {

                this.device.gatt.disconnect();

            }

        } catch (error) {

            console.error(
                "Disconnect error:",
                error
            );

        }


        this.connected = false;

        this.server = null;

        this.service = null;

        this.characteristic = null;


        this.updateStatus(false);


        this.showDiagnostic(
            "Printer disconnected.",
            "info"
        );

    },


    // =================================================
    // STATUS
    // =================================================

    updateStatus(connected) {

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
                    ? "Printer Connected"
                    : "No Printer";

        }


        if (dot) {

            dot.classList.toggle(
                "connected",
                connected
            );

        }

    },


    // =================================================
    // SHOW DIAGNOSTIC
    // =================================================

    showDiagnostic(
        message,
        type = "info"
    ) {

        const box =
            document.getElementById(
                "bluetoothDiagnosticResult"
            );


        if (!box) {

            console.log(
                "Bluetooth Diagnostic:",
                message
            );

            return;

        }


        box.textContent =
            message;


        box.dataset.type =
            type;

    },


    // =================================================
    // IS CONNECTED
    // =================================================

    isConnected() {

        return (

            this.connected === true &&

            !!this.device &&

            !!this.device.gatt &&

            this.device.gatt.connected === true &&

            !!this.characteristic

        );

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
    // GET DIAGNOSTIC
    // =================================================

    getDiagnostic() {

        return this.lastDiagnostic;

    }

};


// =====================================================
// GLOBAL
// =====================================================

window.Bluetooth =
    Bluetooth;


// =====================================================
// AUTO INIT
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        Bluetooth.init();

    }
);
