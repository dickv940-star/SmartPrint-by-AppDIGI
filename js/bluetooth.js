"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v2.0
=====================================================

FUNGSI
-----------------------------------------------------
✓ Bluetooth LE printer
✓ Connect printer
✓ Auto reconnect
✓ Reconnect printer terakhir
✓ Disconnect
✓ Connection status
✓ Detect GATT services
✓ Detect write characteristic
✓ Write string / Uint8Array / ArrayBuffer
✓ Chunking data
✓ Delay antar chunk
✓ Simpan printer terakhir
✓ Kompatibel dengan PrinterManager v4
✓ Kompatibel dengan TSPL / ESCpos

ARSITEKTUR

PrinterManager
      ↓
Bluetooth
      ↓
GATT
      ↓
Write Characteristic
      ↓
Bluetooth Printer

CATATAN
-----------------------------------------------------
Browser tetap dapat meminta izin Bluetooth pada
koneksi pertama. Auto reconnect hanya dapat bekerja
untuk device yang sebelumnya sudah diberi izin oleh
browser.
=====================================================
*/

(function () {

    "use strict";


    const Bluetooth = {

        // =================================================
        // CONFIG
        // =================================================

        services: [

            "000018f0-0000-1000-8000-00805f9b34fb",

            "0000ffe0-0000-1000-8000-00805f9b34fb",

            "49535343-fe7d-4ae5-8fa9-9fafd205e455"

        ],


        characteristics: [

            "00002af1-0000-1000-8000-00805f9b34fb",

            "0000ffe1-0000-1000-8000-00805f9b34fb",

            "49535343-8841-43f4-a8d4-ecbe34729bb3"

        ],


        chunkSize: 180,

        delay: 20,


        // =================================================
        // STATE
        // =================================================

        device: null,

        server: null,

        writeCharacteristic: null,

        connected: false,

        connecting: false,

        disconnectListenerAttached: false,


        // =================================================
        // CHECK SUPPORT
        // =================================================

        isSupported() {

            return (
                typeof navigator !== "undefined" &&
                "bluetooth" in navigator
            );

        },


        // =================================================
        // CONNECT
        // =================================================

        async connect() {

            if (this.connecting) {

                console.warn(
                    "Bluetooth connection sedang berjalan."
                );

                return false;

            }


            if (!this.isSupported()) {

                this.setError(
                    "Web Bluetooth tidak didukung browser ini."
                );

                return false;

            }


            this.connecting = true;

            this.updateStatus(
                "connecting"
            );


            try {

                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT BLUETOOTH CONNECT"
                );

                console.log(
                    "========================================"
                );


                // =============================================
                // REQUEST DEVICE
                // =============================================

                const device =
                    await navigator.bluetooth.requestDevice({

                        acceptAllDevices: true,

                        optionalServices:
                            this.services

                    });


                if (!device) {

                    throw new Error(
                        "Printer Bluetooth tidak dipilih."
                    );

                }


                this.device =
                    device;


                this.attachDisconnectEvent();


                // =============================================
                // CONNECT GATT
                // =============================================

                await this.connectGATT();


                // =============================================
                // SAVE PRINTER
                // =============================================

                this.saveDevice();


                this.connected =
                    true;


                this.connecting =
                    false;


                this.updateStatus(
                    "connected"
                );


                console.log(
                    "Bluetooth Connected:",
                    this.device.name || "Unknown Printer"
                );


                return true;

            }

            catch (error) {

                console.error(
                    "Bluetooth Connect Error:",
                    error
                );


                this.connected =
                    false;

                this.connecting =
                    false;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

        },


        // =================================================
        // AUTO CONNECT
        // =================================================

        async autoConnect() {

            console.log(
                "SmartPrint Bluetooth Auto Connect..."
            );


            if (!this.isSupported()) {

                console.warn(
                    "Web Bluetooth tidak tersedia."
                );

                return false;

            }


            /*
            -------------------------------------------------
            getDevices()
            -------------------------------------------------

            Hanya device yang sebelumnya telah diberi
            permission oleh browser yang dapat dikembalikan.
            */

            if (
                typeof navigator.bluetooth.getDevices !==
                "function"
            ) {

                console.warn(
                    "navigator.bluetooth.getDevices() tidak tersedia."
                );

                return false;

            }


            try {

                const devices =
                    await navigator.bluetooth.getDevices();


                if (
                    !devices ||
                    devices.length === 0
                ) {

                    console.log(
                        "Belum ada printer Bluetooth yang tersimpan."
                    );

                    return false;

                }


                const savedId =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_ID"
                    );


                const savedName =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_NAME"
                    );


                let device =
                    null;


                // =============================================
                // PRIORITAS 1 — DEVICE ID
                // =============================================

                if (savedId) {

                    device =
                        devices.find(
                            item =>
                                item.id === savedId
                        );

                }


                // =============================================
                // PRIORITAS 2 — DEVICE NAME
                // =============================================

                if (
                    !device &&
                    savedName
                ) {

                    device =
                        devices.find(
                            item =>
                                item.name === savedName
                        );

                }


                // =============================================
                // FALLBACK
                // =============================================

                if (!device) {

                    device =
                        devices[0];

                }


                if (!device) {

                    return false;

                }


                console.log(
                    "Auto Connect Device:",
                    device.name
                );


                this.device =
                    device;


                this.attachDisconnectEvent();


                // =============================================
                // CONNECT
                // =============================================

                await this.connectGATT();


                this.connected =
                    true;


                this.updateStatus(
                    "connected"
                );


                console.log(
                    "Auto Connected:",
                    this.device.name
                );


                return true;

            }

            catch (error) {

                console.warn(
                    "Bluetooth Auto Connect gagal:",
                    error
                );


                this.connected =
                    false;


                this.server =
                    null;


                this.writeCharacteristic =
                    null;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

        },


        // =================================================
        // CONNECT GATT
        // =================================================

        async connectGATT() {

            if (!this.device) {

                throw new Error(
                    "Bluetooth device tidak tersedia."
                );

            }


            if (!this.device.gatt) {

                throw new Error(
                    "GATT tidak tersedia pada device."
                );

            }


            // =============================================
            // CONNECT
            // =============================================

            if (
                this.device.gatt.connected
            ) {

                console.log(
                    "GATT sudah connected."
                );


                this.server =
                    this.device.gatt;

            }

            else {

                console.log(
                    "Connecting GATT..."
                );


                this.server =
                    await this.device.gatt.connect();

            }


            if (!this.server) {

                throw new Error(
                    "GATT server tidak tersedia."
                );

            }


            // =============================================
            // GET SERVICES
            // =============================================

            const services =
                await this.server.getPrimaryServices();


            console.log(
                "Primary Services:",
                services.length
            );


            this.writeCharacteristic =
                null;


            // =============================================
            // SEARCH SERVICES
            // =============================================

            for (
                const service of services
            ) {

                console.log(
                    "SERVICE:",
                    service.uuid
                );


                let characteristics;


                try {

                    characteristics =
                        await service.getCharacteristics();

                }

                catch (error) {

                    console.warn(
                        "Gagal membaca characteristic:",
                        service.uuid,
                        error
                    );

                    continue;

                }


                // =============================================
                // SEARCH CHARACTERISTICS
                // =============================================

                for (
                    const characteristic
                    of characteristics
                ) {

                    const properties =
                        characteristic.properties;


                    console.log(
                        "CHARACTERISTIC:",
                        characteristic.uuid,
                        properties
                    );


                    const canWrite =
                        properties.write ||
                        properties.writeWithoutResponse;


                    if (!canWrite) {

                        continue;

                    }


                    /*
                    -------------------------------------------------
                    Prioritas characteristic UUID yang dikenal
                    -------------------------------------------------
                    */

                    if (
                        this.characteristics.includes(
                            characteristic.uuid
                        )
                    ) {

                        this.writeCharacteristic =
                            characteristic;

                        break;

                    }


                    /*
                    -------------------------------------------------
                    Fallback:
                    characteristic pertama yang bisa write
                    -------------------------------------------------
                    */

                    if (
                        !this.writeCharacteristic
                    ) {

                        this.writeCharacteristic =
                            characteristic;

                    }

                }


                if (
                    this.writeCharacteristic
                ) {

                    break;

                }

            }


            // =============================================
            // VALIDATE WRITE CHARACTERISTIC
            // =============================================

            if (
                !this.writeCharacteristic
            ) {

                throw new Error(
                    "Bluetooth Write Characteristic tidak ditemukan."
                );

            }


            console.log(
                "WRITE CHARACTERISTIC:",
                this.writeCharacteristic.uuid
            );


            return true;

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            if (!this.device) {

                this.connected =
                    false;

                return false;

            }


            if (!this.device.gatt) {

                this.connected =
                    false;

                return false;

            }


            if (
                !this.device.gatt.connected
            ) {

                this.connected =
                    false;

                return false;

            }


            if (
                !this.writeCharacteristic
            ) {

                this.connected =
                    false;

                return false;

            }


            return (
                this.connected === true
            );

        },


        // =================================================
        // GET DEVICE
        // =================================================

        getDevice() {

            return this.device;

        },


        // =================================================
        // GET DEVICE NAME
        // =================================================

        getDeviceName() {

            if (!this.device) {

                return "";

            }


            return (
                this.device.name ||
                ""
            );

        },


        // =================================================
        // WRITE
        // =================================================

        async write(data) {

            if (
                !this.isConnected()
            ) {

                throw new Error(
                    "Printer Bluetooth belum terhubung."
                );

            }


            if (
                !this.writeCharacteristic
            ) {

                throw new Error(
                    "Write characteristic tidak tersedia."
                );

            }


            let bytes;


            // =============================================
            // STRING
            // =============================================

            if (
                typeof data === "string"
            ) {

                const encoder =
                    new TextEncoder();

                bytes =
                    encoder.encode(
                        data
                    );

            }


            // =============================================
            // UINT8ARRAY
            // =============================================

            else if (
                data instanceof Uint8Array
            ) {

                bytes =
                    data;

            }


            // =============================================
            // ARRAYBUFFER
            // =============================================

            else if (
                data instanceof ArrayBuffer
            ) {

                bytes =
                    new Uint8Array(
                        data
                    );

            }


            else {

                throw new Error(
                    "Format data Bluetooth tidak didukung."
                );

            }


            console.log(
                "Bluetooth Write:",
                bytes.length,
                "bytes"
            );


            // =============================================
            // CHUNKING
            // =============================================

            for (
                let offset = 0;
                offset < bytes.length;
                offset += this.chunkSize
            ) {

                const chunk =
                    bytes.slice(
                        offset,
                        offset + this.chunkSize
                    );


                // =========================================
                // WRITE WITHOUT RESPONSE
                // =========================================

                if (
                    this.writeCharacteristic
                        .properties
                        .writeWithoutResponse &&
                    typeof this.writeCharacteristic
                        .writeValueWithoutResponse ===
                        "function"
                ) {

                    await this.writeCharacteristic
                        .writeValueWithoutResponse(
                            chunk
                        );

                }


                // =========================================
                // WRITE WITH RESPONSE
                // =========================================

                else if (
                    this.writeCharacteristic
                        .properties
                        .write &&
                    typeof this.writeCharacteristic
                        .writeValue ===
                        "function"
                ) {

                    await this.writeCharacteristic
                        .writeValue(
                            chunk
                        );

                }


                else {

                    throw new Error(
                        "Characteristic tidak mendukung write."
                    );

                }


                // =========================================
                // DELAY
                // =========================================

                if (
                    this.delay > 0
                ) {

                    await this.sleep(
                        this.delay
                    );

                }

            }


            console.log(
                "Bluetooth DATA SENT"
            );


            return true;

        },


        // =================================================
        // DISCONNECT
        // =================================================

        disconnect() {

            console.log(
                "Bluetooth Disconnect"
            );


            try {

                if (
                    this.device &&
                    this.device.gatt &&
                    this.device.gatt.connected
                ) {

                    this.device.gatt.disconnect();

                }

            }

            catch (error) {

                console.error(
                    "Bluetooth Disconnect Error:",
                    error
                );

            }


            this.connected =
                false;

            this.server =
                null;

            this.writeCharacteristic =
                null;


            this.updateStatus(
                "disconnected"
            );

        },


        // =================================================
        // DISCONNECT EVENT
        // =================================================

        attachDisconnectEvent() {

            if (!this.device) {

                return;

            }


            if (
                this.disconnectListenerAttached
            ) {

                return;

            }


            this.device.addEventListener(
                "gattserverdisconnected",
                () => {

                    console.warn(
                        "Printer Bluetooth disconnected."
                    );


                    this.connected =
                        false;


                    this.server =
                        null;


                    this.writeCharacteristic =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );

                }
            );


            this.disconnectListenerAttached =
                true;

        },


        // =================================================
        // SAVE DEVICE
        // =================================================

        saveDevice() {

            if (!this.device) {

                return;

            }


            try {

                localStorage.setItem(
                    "SMARTPRINT_PRINTER_NAME",
                    this.device.name || ""
                );


                localStorage.setItem(
                    "SMARTPRINT_PRINTER_ID",
                    this.device.id || ""
                );


                console.log(
                    "Printer saved:",
                    this.device.name
                );

            }

            catch (error) {

                console.warn(
                    "Gagal menyimpan printer.",
                    error
                );

            }

        },


        // =================================================
        // CLEAR SAVED PRINTER
        // =================================================

        clearSavedPrinter() {

            localStorage.removeItem(
                "SMARTPRINT_PRINTER_NAME"
            );


            localStorage.removeItem(
                "SMARTPRINT_PRINTER_ID"
            );


            console.log(
                "Saved printer cleared."
            );

        },


        // =================================================
        // STATUS
        // =================================================

        updateStatus(state) {

            const status =
                document.getElementById(
                    "status"
                );


            const printerStatus =
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


                case "disconnected":

                    text =
                        "No Printer";

                    break;


                case "error":

                    text =
                        "Bluetooth Error";

                    break;

            }


            if (status) {

                status.textContent =
                    text;

            }


            if (printerStatus) {

                printerStatus.textContent =
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
        // ERROR
        // =================================================

        setError(message) {

            console.error(
                "Bluetooth:",
                message
            );


            this.connected =
                false;


            this.connecting =
                false;


            this.updateStatus(
                "error"
            );

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

    window.Bluetooth =
        Bluetooth;


    // =====================================================
    // LEGACY COMPATIBILITY
    // =====================================================

    window.connectPrinter =
        function () {

            return Bluetooth.connect();

        };


    window.sendTSPL =
        function (data) {

            return Bluetooth.write(
                data
            );

        };


    window.disconnectPrinter =
        function () {

            return Bluetooth.disconnect();

        };


    // =====================================================
    // READY
    // =====================================================

    console.log(
        "SmartPrint Bluetooth Engine v2.0 Ready"
    );


})();
