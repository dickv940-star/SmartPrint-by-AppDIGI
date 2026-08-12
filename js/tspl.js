"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v2.0
 TSPL / Bluetooth LE
=====================================================

Fungsi:
- Connect printer
- Auto reconnect
- Reconnect setelah disconnect
- Is connected
- Disconnect
- Write data
- Cari service otomatis
- Cari characteristic write otomatis
- Chunking data
- Simpan informasi printer
- Kompatibel dengan PrinterManager
=====================================================
*/

(function () {

    const Bluetooth = {

        // =========================================
        // CONFIG
        // =========================================

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


        // =========================================
        // STATE
        // =========================================

        device: null,

        server: null,

        writeCharacteristic: null,

        connected: false,

        connecting: false,


        // =========================================
        // CONNECT
        // =========================================

        async connect() {

            if (this.connecting) {

                console.warn(
                    "Bluetooth connection sedang berjalan."
                );

                return false;

            }


            this.connecting = true;

            this.updateStatus(
                "connecting"
            );


            try {

                console.log(
                    "----------------------------------------"
                );

                console.log(
                    "SMARTPRINT BLUETOOTH CONNECT"
                );

                console.log(
                    "----------------------------------------"
                );


                if (
                    !navigator.bluetooth
                ) {

                    throw new Error(
                        "Web Bluetooth tidak didukung browser ini."
                    );

                }


                /*
                =========================================
                REQUEST DEVICE
                =========================================
                */

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


                /*
                =========================================
                CONNECT GATT
                =========================================
                */

                await this.connectGATT();


                /*
                =========================================
                SAVE DEVICE INFO
                =========================================
                */

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
                    this.device.name
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
                    "error"
                );


                return false;

            }

        },


        // =========================================
        // AUTO CONNECT
        // =========================================

        async autoConnect() {

            console.log(
                "Bluetooth Auto Connect..."
            );


            if (
                !navigator.bluetooth
            ) {

                console.warn(
                    "Web Bluetooth tidak tersedia."
                );

                return false;

            }


            /*
            =========================================
            GET PREVIOUSLY AUTHORIZED DEVICES
            =========================================

            Tidak semua browser mendukung API ini.
            */

            if (
                typeof navigator.bluetooth.getDevices
                !== "function"
            ) {

                console.warn(
                    "navigator.bluetooth.getDevices() tidak tersedia."
                );

                this.updateStatus(
                    "disconnected"
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
                        "Tidak ada printer yang tersimpan."
                    );

                    this.updateStatus(
                        "disconnected"
                    );

                    return false;

                }


                /*
                =========================================
                PILIH DEVICE TERAKHIR
                =========================================
                */

                const savedName =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_NAME"
                    );


                let device =
                    null;


                if (savedName) {

                    device =
                        devices.find(
                            item =>
                                item.name === savedName
                        );

                }


                /*
                Jika printer terakhir tidak ditemukan,
                gunakan device pertama.
                */

                if (!device) {

                    device =
                        devices[0];

                }


                this.device =
                    device;


                this.attachDisconnectEvent();


                /*
                =========================================
                CONNECT
                =========================================
                */

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
                    "Auto Connect gagal:",
                    error
                );


                this.connected =
                    false;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

        },


        // =========================================
        // CONNECT GATT
        // =========================================

        async connectGATT() {

            if (!this.device) {

                throw new Error(
                    "Bluetooth device tidak tersedia."
                );

            }


            if (
                this.device.gatt &&
                this.device.gatt.connected
            ) {

                console.log(
                    "GATT sudah connected."
                );

            }
            else {

                this.server =
                    await this.device.gatt.connect();

            }


            if (!this.server) {

                this.server =
                    this.device.gatt;

            }


            /*
            =========================================
            GET SERVICES
            =========================================
            */

            const services =
                await this.server.getPrimaryServices();


            this.writeCharacteristic =
                null;


            /*
            =========================================
            SEARCH WRITE CHARACTERISTIC
            =========================================
            */

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
                        "Tidak dapat membaca characteristic:",
                        service.uuid
                    );

                    continue;

                }


                for (
                    const characteristic
                    of characteristics
                ) {

                    console.log(
                        "CHAR:",
                        characteristic.uuid,
                        characteristic.properties
                    );


                    const properties =
                        characteristic.properties;


                    if (
                        properties.write ||
                        properties.writeWithoutResponse
                    ) {

                        /*
                        Jika UUID dikenal,
                        prioritaskan characteristic tersebut.
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
                        Jika belum ada,
                        gunakan characteristic write pertama.
                        */

                        if (
                            !this.writeCharacteristic
                        ) {

                            this.writeCharacteristic =
                                characteristic;

                        }

                    }

                }


                if (
                    this.writeCharacteristic
                ) {

                    break;

                }

            }


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

        },


        // =========================================
        // IS CONNECTED
        // =========================================

        isConnected() {

            if (!this.device) {

                return false;

            }


            if (
                this.device.gatt &&
                !this.device.gatt.connected
            ) {

                this.connected =
                    false;

                return false;

            }


            return (
                this.connected === true &&
                this.writeCharacteristic !== null
            );

        },


        // =========================================
        // GET DEVICE
        // =========================================

        getDevice() {

            return this.device;

        },


        // =========================================
        // WRITE DATA
        // =========================================

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


            /*
            =========================================
            STRING
            =========================================
            */

            if (
                typeof data === "string"
            ) {

                const encoder =
                    new TextEncoder();

                bytes =
                    encoder.encode(data);

            }


            /*
            =========================================
            UINT8ARRAY
            =========================================
            */

            else if (
                data instanceof Uint8Array
            ) {

                bytes =
                    data;

            }


            /*
            =========================================
            ARRAYBUFFER
            =========================================
            */

            else if (
                data instanceof ArrayBuffer
            ) {

                bytes =
                    new Uint8Array(data);

            }


            else {

                throw new Error(
                    "Format data Bluetooth tidak didukung."
                );

            }


            /*
            =========================================
            CHUNK DATA
            =========================================
            */

            for (
                let i = 0;
                i < bytes.length;
                i += this.chunkSize
            ) {

                const chunk =
                    bytes.slice(
                        i,
                        i + this.chunkSize
                    );


                /*
                =========================================
                WRITE WITHOUT RESPONSE
                =========================================
                */

                if (
                    this.writeCharacteristic
                        .properties
                        .writeWithoutResponse &&
                    typeof this.writeCharacteristic
                        .writeValueWithoutResponse
                        === "function"
                ) {

                    await this.writeCharacteristic
                        .writeValueWithoutResponse(
                            chunk
                        );

                }


                /*
                =========================================
                WRITE WITH RESPONSE
                =========================================
                */

                else {

                    await this.writeCharacteristic
                        .writeValue(
                            chunk
                        );

                }


                /*
                =========================================
                PRINTER DELAY
                =========================================
                */

                await this.sleep(
                    this.delay
                );

            }


            console.log(
                "Bluetooth DATA SENT:",
                bytes.length,
                "bytes"
            );


            return true;

        },


        // =========================================
        // DISCONNECT
        // =========================================

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


        // =========================================
        // DISCONNECT EVENT
        // =========================================

        attachDisconnectEvent() {

            if (!this.device) {

                return;

            }


            /*
            Hindari listener ganda
            */

            if (
                this.device.__smartprintDisconnectAttached
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


            this.device.__smartprintDisconnectAttached =
                true;

        },


        // =========================================
        // SAVE DEVICE
        // =========================================

        saveDevice() {

            if (!this.device) {

                return;

            }


            localStorage.setItem(
                "SMARTPRINT_PRINTER_NAME",
                this.device.name || ""
            );


            localStorage.setItem(
                "SMARTPRINT_PRINTER_ID",
                this.device.id || ""
            );


            console.log(
                "Printer information saved."
            );

        },


        // =========================================
        // STATUS
        // =========================================

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


        // =========================================
        // SLEEP
        // =========================================

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


    /*
    =========================================
    GLOBAL
    =========================================
    */

    window.Bluetooth =
        Bluetooth;


    /*
    =========================================
    LEGACY COMPATIBILITY
    =========================================
    */

    window.connectPrinter =
        () => Bluetooth.connect();


    window.sendTSPL =
        command =>
            Bluetooth.write(command);


    window.disconnectPrinter =
        () =>
            Bluetooth.disconnect();


    /*
    =========================================
    AUTO CONNECT
    =========================================

    Kita tidak langsung menjalankan autoConnect
    sebelum halaman selesai.
    */

    document.addEventListener(
        "DOMContentLoaded",
        async () => {

            console.log(
                "SmartPrint Bluetooth Engine v2.0 Ready"
            );


            /*
            Tunggu sebentar supaya
            PrinterManager dan UI selesai load.
            */

            setTimeout(
                async () => {

                    await Bluetooth.autoConnect();

                },
                500
            );

        }
    );

})();
