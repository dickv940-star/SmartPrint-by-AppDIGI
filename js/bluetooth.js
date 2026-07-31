/*
=========================================================
SmartPrint by AppDIGI
Bluetooth Engine v3.0
BLE Printer Engine
=========================================================
*/

"use strict";


const Bluetooth = {

    device: null,

    server: null,

    service: null,

    characteristic: null,

    connected: false,


    // =================================================
    // CHECK SUPPORT
    // =================================================

    isSupported() {

        if (!navigator.bluetooth) {

            console.error(
                "Web Bluetooth tidak didukung browser ini."
            );

            this.updateStatus(false);

            return false;

        }

        console.log(
            "Bluetooth API tersedia."
        );

        return true;

    },


    // =================================================
    // CONNECT
    // =================================================

    async connect() {

        try {

            console.log(
                "================================"
            );

            console.log(
                "SmartPrint Bluetooth"
            );

            console.log(
                "Searching Bluetooth Printer..."
            );

            console.log(
                "================================"
            );


            // -----------------------------------------
            // CHECK API
            // -----------------------------------------

            if (!this.isSupported()) {

                throw new Error(
                    "Web Bluetooth tidak didukung browser."
                );

            }


            // -----------------------------------------
            // RESET CONNECTION
            // -----------------------------------------

            this.service = null;

            this.characteristic = null;


            // -----------------------------------------
            // REQUEST DEVICE
            // -----------------------------------------

            console.log(
                "Membuka Bluetooth Device Picker..."
            );


            this.device =
                await navigator.bluetooth.requestDevice({

                    acceptAllDevices: true,

                    optionalServices: [
                        "000018f0-0000-1000-8000-00805f9b34fb",
                        "0000ffe0-0000-1000-8000-00805f9b34fb",
                        "0000ff00-0000-1000-8000-00805f9b34fb"
                    ]

                });


            if (!this.device) {

                console.warn(
                    "Tidak ada device dipilih."
                );

                return false;

            }


            console.log(
                "Device dipilih:"
            );

            console.log(
                "Name:",
                this.device.name
            );

            console.log(
                "ID:",
                this.device.id
            );


            // -----------------------------------------
            // DISCONNECT EVENT
            // -----------------------------------------

            this.device.addEventListener(
                "gattserverdisconnected",
                () => {

                    console.warn(
                        "Printer Bluetooth disconnected."
                    );

                    this.connected = false;

                    this.server = null;

                    this.service = null;

                    this.characteristic = null;

                    this.updateStatus(false);

                }
            );


            // -----------------------------------------
            // CHECK GATT
            // -----------------------------------------

            if (!this.device.gatt) {

                throw new Error(
                    "Device tidak menyediakan GATT."
                );

            }


            // -----------------------------------------
            // CONNECT GATT
            // -----------------------------------------

            console.log(
                "Connecting GATT..."
            );


            this.server =
                await this.device.gatt.connect();


            if (!this.server.connected) {

                throw new Error(
                    "GATT gagal terhubung."
                );

            }


            console.log(
                "GATT Connected."
            );


            // -----------------------------------------
            // GET SERVICES
            // -----------------------------------------

            console.log(
                "Mencari Primary Services..."
            );


            const services =
                await this.server.getPrimaryServices();


            if (!services.length) {

                throw new Error(
                    "Tidak ada Primary Service ditemukan."
                );

            }


            console.log(
                "Jumlah Service:",
                services.length
            );


            // -----------------------------------------
            // SCAN ALL SERVICES
            // -----------------------------------------

            for (
                const service
                of services
            ) {

                console.log(
                    "SERVICE:",
                    service.uuid
                );


                let characteristics = [];


                try {

                    characteristics =
                        await service.getCharacteristics();

                } catch (error) {

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

                    console.log(
                        "  CHARACTERISTIC:",
                        characteristic.uuid
                    );


                    console.log(
                        "  PROPERTIES:",
                        characteristic.properties
                    );


                    // ---------------------------------
                    // FIND WRITE CHARACTERISTIC
                    // ---------------------------------

                    const canWrite =

                        characteristic.properties.write ||

                        characteristic.properties.writeWithoutResponse;


                    if (
                        canWrite &&
                        !this.characteristic
                    ) {

                        this.service =
                            service;

                        this.characteristic =
                            characteristic;


                        console.log(
                            "================================"
                        );

                        console.log(
                            "WRITE CHARACTERISTIC FOUND"
                        );

                        console.log(
                            "Service:",
                            service.uuid
                        );

                        console.log(
                            "Characteristic:",
                            characteristic.uuid
                        );

                        console.log(
                            "Properties:",
                            characteristic.properties
                        );

                        console.log(
                            "================================"
                        );

                    }

                }

            }


            // -----------------------------------------
            // CHECK WRITE CHARACTERISTIC
            // -----------------------------------------

            if (!this.characteristic) {

                console.error(
                    "Tidak ditemukan characteristic WRITE."
                );


                throw new Error(
                    "Printer terhubung tetapi tidak ditemukan Bluetooth WRITE characteristic."
                );

            }


            // -----------------------------------------
            // CONNECTED
            // -----------------------------------------

            this.connected = true;

            this.updateStatus(true);


            console.log(
                "================================"
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
                "================================"
            );


            return true;


        } catch (error) {


            console.error(
                "================================"
            );

            console.error(
                "BLUETOOTH ERROR"
            );

            console.error(
                error
            );

            console.error(
                "Name:",
                error.name
            );

            console.error(
                "Message:",
                error.message
            );

            console.error(
                "================================"
            );


            this.connected = false;

            this.updateStatus(false);


            // User cancel
            if (
                error.name ===
                "NotFoundError"
            ) {

                console.log(
                    "Bluetooth device picker dibatalkan."
                );

                return false;

            }


            return false;

        }

    },


    // =================================================
    // SEND
    // =================================================

    async send(data) {

        if (
            !this.device ||
            !this.server ||
            !this.connected ||
            !this.characteristic
        ) {

            throw new Error(
                "Printer Bluetooth belum terhubung."
            );

        }


        if (
            !this.server.connected
        ) {

            throw new Error(
                "GATT server sudah disconnect."
            );

        }


        if (!data) {

            throw new Error(
                "Data print kosong."
            );

        }


        // -----------------------------------------
        // CONVERT DATA
        // -----------------------------------------

        let buffer;


        if (
            data instanceof Uint8Array
        ) {

            buffer = data;

        }

        else if (
            data instanceof ArrayBuffer
        ) {

            buffer =
                new Uint8Array(data);

        }

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
            "Sending bytes:",
            buffer.length
        );


        // -----------------------------------------
        // CHUNK
        // -----------------------------------------

        const chunkSize = 180;


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


            // -------------------------------------
            // WRITE WITHOUT RESPONSE
            // -------------------------------------

            if (
                this.characteristic
                    .properties
                    .writeWithoutResponse &&
                this.characteristic
                    .writeValueWithoutResponse
            ) {

                await this.characteristic
                    .writeValueWithoutResponse(
                        chunk
                    );

            }

            // -------------------------------------
            // WRITE WITH RESPONSE
            // -------------------------------------

            else if (
                this.characteristic
                    .properties
                    .write &&
                this.characteristic
                    .writeValueWithResponse
            ) {

                await this.characteristic
                    .writeValueWithResponse(
                        chunk
                    );

            }

            // -------------------------------------
            // OLD API
            // -------------------------------------

            else {

                await this.characteristic
                    .writeValue(
                        chunk
                    );

            }


            // Small delay
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
                "Disconnect Error:",
                error
            );

        }


        this.connected = false;

        this.server = null;

        this.service = null;

        this.characteristic = null;

        this.updateStatus(false);

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
    // IS CONNECTED
    // =================================================

    isConnected() {

        return (
            this.connected &&
            this.device &&
            this.device.gatt &&
            this.device.gatt.connected
        );

    }

};


window.Bluetooth =
    Bluetooth;
