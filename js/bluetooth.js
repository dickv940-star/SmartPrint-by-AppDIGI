"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v3.0
=====================================================

 FUNGSI
 ✓ Bluetooth LE printer
 ✓ Manual connect
 ✓ Optional auto reconnect
 ✓ Simpan printer terakhir
 ✓ Connection status
 ✓ Detect GATT services
 ✓ Detect write characteristic
 ✓ Prioritas UUID characteristic
 ✓ Write String
 ✓ Write Uint8Array
 ✓ Write ArrayBuffer
 ✓ Chunking
 ✓ Delay antar chunk
 ✓ Disconnect handling
 ✓ Reconnect
 ✓ Compatible PrinterManager v4
 ✓ Compatible TSPL
 ✓ Compatible ESC/POS
 ✓ Compatible ZPL
 ✓ Compatible CPCL

 CATATAN
 Web Bluetooth getDevices() bersifat optional.
 Jika browser tidak mendukungnya, SmartPrint
 tetap dapat connect melalui tombol Connect.
=====================================================
*/

(function () {

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

        writing: false,

        disconnectHandler: null,


        // =================================================
        // SUPPORT
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


                // =========================================
                // DEVICE PICKER
                // =========================================

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


                console.log(
                    "Device Selected:",
                    device.name || "Unknown Printer"
                );


                // =========================================
                // CLEAN OLD DEVICE
                // =========================================

                this.removeDisconnectListener();


                this.device =
                    device;


                this.attachDisconnectEvent();


                // =========================================
                // GATT
                // =========================================

                await this.connectGATT();


                // =========================================
                // SAVE
                // =========================================

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
                    this.getDeviceName()
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


                this.server =
                    null;

                this.writeCharacteristic =
                    null;


                this.updateStatus(
                    "disconnected"
                );


                // User membatalkan picker
                if (
                    error &&
                    error.name ===
                    "NotFoundError"
                ) {

                    console.warn(
                        "Bluetooth device selection dibatalkan."
                    );

                }


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


            // =========================================
            // getDevices OPTIONAL
            // =========================================

            if (
                typeof navigator.bluetooth.getDevices !==
                "function"
            ) {

                console.warn(
                    "navigator.bluetooth.getDevices() tidak tersedia."
                );

                console.log(
                    "Auto Connect dilewati. Menunggu Connect manual."
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
                        "Tidak ada Bluetooth device yang tersimpan."
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


                // =========================================
                // PRIORITY 1 - ID
                // =========================================

                if (savedId) {

                    device =
                        devices.find(
                            item =>
                                item.id === savedId
                        );

                }


                // =========================================
                // PRIORITY 2 - NAME
                // =========================================

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


                // =========================================
                // FALLBACK
                // =========================================

                if (!device) {

                    device =
                        devices[0];

                }


                if (!device) {

                    return false;

                }


                console.log(
                    "Auto Connect Device:",
                    device.name || "Unknown Printer"
                );


                this.removeDisconnectListener();


                this.device =
                    device;


                this.attachDisconnectEvent();


                await this.connectGATT();


                this.connected =
                    true;


                this.updateStatus(
                    "connected"
                );


                console.log(
                    "Auto Connected:",
                    this.getDeviceName()
                );


                return true;

            }

            catch (error) {

                console.warn(
                    "Bluetooth Auto Connect gagal:",
                    error
                );


                this.resetConnectionState();


                return false;

            }

        },


        // =================================================
        // RECONNECT
        // =================================================

        async reconnect() {

            if (!this.device) {

                console.warn(
                    "Tidak ada device untuk reconnect."
                );

                return false;

            }


            if (this.connecting) {

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                console.log(
                    "Bluetooth Reconnecting..."
                );


                await this.connectGATT();


                this.connected =
                    true;


                this.connecting =
                    false;


                this.updateStatus(
                    "connected"
                );


                console.log(
                    "Bluetooth Reconnected:",
                    this.getDeviceName()
                );


                return true;

            }

            catch (error) {

                console.error(
                    "Bluetooth Reconnect Error:",
                    error
                );


                this.connecting =
                    false;


                this.resetConnectionState();


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


            // =========================================
            // CONNECT
            // =========================================

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


            // =========================================
            // SERVICES
            // =========================================

            const services =
                await this.server.getPrimaryServices();


            console.log(
                "Primary Services:",
                services.length
            );


            this.writeCharacteristic =
                null;


            // =========================================
            // SEARCH
            // =========================================

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


                    // =====================================
                    // PRIORITY UUID
                    // =====================================

                    if (
                        this.characteristics.includes(
                            characteristic.uuid
                        )
                    ) {

                        this.writeCharacteristic =
                            characteristic;


                        console.log(
                            "Known Write Characteristic:",
                            characteristic.uuid
                        );


                        break;

                    }


                    // =====================================
                    // FALLBACK
                    // =====================================

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


            // =========================================
            // VALIDATE
            // =========================================

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


            const gattConnected =
                this.device.gatt.connected === true;


            if (!gattConnected) {

                this.connected =
                    false;

                return false;

            }


            if (!this.writeCharacteristic) {

                this.connected =
                    false;

                return false;

            }


            this.connected =
                true;


            return true;

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

            // =========================================
            // CHECK CONNECTION
            // =========================================

            if (!this.isConnected()) {

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


            // =========================================
            // PREVENT MULTIPLE WRITE
            // =========================================

            if (this.writing) {

                throw new Error(
                    "Printer sedang menerima data."
                );

            }


            this.writing =
                true;


            try {

                let bytes;


                // =====================================
                // STRING
                // =====================================

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


                // =====================================
                // UINT8ARRAY
                // =====================================

                else if (
                    data instanceof Uint8Array
                ) {

                    bytes =
                        data;

                }


                // =====================================
                // ARRAYBUFFER
                // =====================================

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


                this.updateStatus(
                    "printing"
                );


                // =====================================
                // CHUNK
                // =====================================

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


                    await this.writeChunk(
                        chunk
                    );


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


                this.connected =
                    true;


                this.updateStatus(
                    "connected"
                );


                return true;

            }

            catch (error) {

                console.error(
                    "Bluetooth Write Error:",
                    error
                );


                this.connected =
                    false;


                this.updateStatus(
                    "error"
                );


                throw error;

            }

            finally {

                this.writing =
                    false;

            }

        },


        // =================================================
        // WRITE CHUNK
        // =================================================

        async writeChunk(chunk) {

            if (
                !this.writeCharacteristic
            ) {

                throw new Error(
                    "Write characteristic tidak tersedia."
                );

            }


            const characteristic =
                this.writeCharacteristic;


            // =========================================
            // WRITE WITHOUT RESPONSE
            // =========================================

            if (
                characteristic.properties
                    .writeWithoutResponse &&
                typeof characteristic
                    .writeValueWithoutResponse ===
                    "function"
            ) {

                await characteristic
                    .writeValueWithoutResponse(
                        chunk
                    );


                return true;

            }


            // =========================================
            // WRITE WITH RESPONSE
            // =========================================

            if (
                characteristic.properties
                    .write &&
                typeof characteristic
                    .writeValue ===
                    "function"
            ) {

                await characteristic
                    .writeValue(
                        chunk
                    );


                return true;

            }


            throw new Error(
                "Characteristic tidak mendukung write."
            );

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


            this.resetConnectionState();


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


            this.removeDisconnectListener();


            this.disconnectHandler =
                () => {

                    console.warn(
                        "Printer Bluetooth disconnected."
                    );


                    this.resetConnectionState();


                    this.updateStatus(
                        "disconnected"
                    );

                };


            this.device.addEventListener(
                "gattserverdisconnected",
                this.disconnectHandler
            );

        },


        // =================================================
        // REMOVE DISCONNECT LISTENER
        // =================================================

        removeDisconnectListener() {

            if (
                !this.device ||
                !this.disconnectHandler
            ) {

                return;

            }


            try {

                this.device.removeEventListener(
                    "gattserverdisconnected",
                    this.disconnectHandler
                );

            }

            catch (error) {

                console.warn(
                    "Gagal melepas disconnect listener:",
                    error
                );

            }


            this.disconnectHandler =
                null;

        },


        // =================================================
        // RESET CONNECTION
        // =================================================

        resetConnectionState() {

            this.connected =
                false;


            this.server =
                null;


            this.writeCharacteristic =
                null;


            this.writing =
                false;

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
                    this.device.name ||
                    "Unknown Printer"
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
        // CLEAR SAVED DEVICE
        // =================================================

        clearSavedPrinter() {

            try {

                localStorage.removeItem(
                    "SMARTPRINT_PRINTER_NAME"
                );


                localStorage.removeItem(
                    "SMARTPRINT_PRINTER_ID"
                );

            }

            catch (error) {

                console.warn(
                    "Gagal menghapus printer tersimpan.",
                    error
                );

            }


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


            this.resetConnectionState();


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
        "SmartPrint Bluetooth Engine v3.0 Ready"
    );

})();
