"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.4
=====================================================

 SUPPORT
 ----------------------------------------------------
 ✓ Web Bluetooth BLE
 ✓ Web Serial / COM
 ✓ Local Bridge
 ✓ RAW Uint8Array
 ✓ TSPL
 ✓ ESC/POS
 ✓ ZPL
 ✓ CPCL
 ✓ Printer Manager v4.1
 ✓ TSPL Engine v5.3

 IMPORTANT
 ----------------------------------------------------
 Bluetooth.connectUser()
    -> USER GESTURE

 Bluetooth.connectBLE()
    -> BLE USER CONNECT

 Bluetooth.connectSerial()
    -> Web Serial USER CONNECT

 Bluetooth.connectBridge()
    -> Local HTTP Bridge

 Bluetooth.sendRaw()
    -> RAW Uint8Array

 Bluetooth.autoConnect()
    -> hanya mencoba koneksi yang
       sebelumnya sudah tersimpan / bonded

 DATA
 ----------------------------------------------------
 RAW Uint8Array
 Tidak Base64
 Tidak TextEncoder ulang
 Tidak mengubah bitmap

 BLE
 ----------------------------------------------------
 Service / Characteristic dapat:
 - dikonfigurasi
 - dideteksi otomatis
 - menggunakan UUID umum printer

 SERIAL
 ----------------------------------------------------
 Baudrate default : 9600
 Data bits        : 8
 Stop bits        : 1
 Parity           : none

=====================================================
*/


(function () {

    "use strict";


    const VERSION = "5.4";


    /*
    =================================================
     ENGINE
    =================================================
    */

    const BluetoothEngine = {


        version: VERSION,


        /*
        =================================================
         STATE
        =================================================
        */

        connected: false,

        connecting: false,

        transport: null,

        device: null,

        server: null,

        service: null,

        characteristic: null,

        port: null,

        reader: null,

        writer: null,

        bridgeURL: "",

        deviceName: "",


        /*
        =================================================
         CONFIG
        =================================================
        */

        config: {

            /*
             * BLE
             */

            ble:

            {

                /*
                 * Common Nordic UART
                 */

                serviceUUID:
                    "6e400001-b5a3-f393-e0a9-e50e24dcca9e",

                writeUUID:
                    "6e400002-b5a3-f393-e0a9-e50e24dcca9e",

                notifyUUID:
                    "6e400003-b5a3-f393-e0a9-e50e24dcca9e",


                /*
                 * Common thermal printer UUIDs
                 */

                services: [

                    "6e400001-b5a3-f393-e0a9-e50e24dcca9e",

                    "0000ffe0-0000-1000-8000-00805f9b34fb",

                    "0000ff00-0000-1000-8000-00805f9b34fb",

                    "0000ae30-0000-1000-8000-00805f9b34fb"

                ],

                characteristics: [

                    "6e400002-b5a3-f393-e0a9-e50e24dcca9e",

                    "0000ffe1-0000-1000-8000-00805f9b34fb",

                    "0000ff02-0000-1000-8000-00805f9b34fb",

                    "0000ae01-0000-1000-8000-00805f9b34fb"

                ],

                chunkSize:
                    180

            },


            /*
             * SERIAL
             */

            serial:

            {

                baudRate:
                    9600,

                dataBits:
                    8,

                stopBits:
                    1,

                parity:
                    "none",

                bufferSize:
                    4096,

                flowControl:
                    "none"

            },


            /*
             * BRIDGE
             */

            bridge:

            {

                url:
                    "",

                endpoint:
                    "/print"

            }

        },


        /*
        =================================================
         INIT
        =================================================
        */

        init() {

            console.log(
                "========================================"
            );

            console.log(
                "SmartPrint Bluetooth Engine v" +
                VERSION
            );

            console.log(
                "========================================"
            );


            this.loadSettings();


            this.installDisconnectHandler();


            return true;

        },


        /*
        =================================================
         LOAD SETTINGS
        =================================================
        */

        loadSettings() {

            try {

                const raw =
                    localStorage.getItem(
                        "SMARTPRINT_BLUETOOTH_SETTINGS"
                    );


                if (!raw) {

                    return;

                }


                const saved =
                    JSON.parse(raw);


                if (
                    saved.bridgeURL
                ) {

                    this.bridgeURL =
                        saved.bridgeURL;

                }


                if (
                    saved.deviceName
                ) {

                    this.deviceName =
                        saved.deviceName;

                }


                if (
                    saved.ble
                ) {

                    Object.assign(
                        this.config.ble,
                        saved.ble
                    );

                }


                if (
                    saved.serial
                ) {

                    Object.assign(
                        this.config.serial,
                        saved.serial
                    );

                }


            }

            catch (error) {

                console.warn(
                    "Bluetooth settings gagal dibaca:",
                    error
                );

            }

        },


        /*
        =================================================
         SAVE SETTINGS
        =================================================
        */

        saveSettings() {

            try {

                localStorage.setItem(

                    "SMARTPRINT_BLUETOOTH_SETTINGS",

                    JSON.stringify({

                        deviceName:
                            this.deviceName,

                        bridgeURL:
                            this.bridgeURL,

                        ble:
                            this.config.ble,

                        serial:
                            this.config.serial

                    })

                );

            }

            catch (error) {

                console.warn(
                    "Bluetooth settings gagal disimpan:",
                    error
                );

            }

        },


        /*
        =================================================
         USER CONNECT
        =================================================
        */

        async connectUser() {

            if (
                this.connecting
            ) {

                return false;

            }


            /*
             * Prioritas:

             * 1. BLE
             *
             * Jika user ingin memilih
             * printer BLE.
             */

            return await this.connectBLE();

        },


        /*
        =================================================
         BLE CONNECT
        =================================================
        */

        async connectBLE() {

            if (
                !navigator.bluetooth
            ) {

                throw new Error(
                    "Web Bluetooth tidak tersedia di browser ini."
                );

            }


            if (
                this.connecting
            ) {

                return false;

            }


            this.connecting =
                true;


            try {

                console.log(
                    "Bluetooth BLE: membuka printer picker..."
                );


                /*
                 * =========================================
                 * REQUEST DEVICE
                 *
                 * Harus dipanggil dari user gesture.
                 * =========================================
                 */

                const device =
                    await navigator.bluetooth.requestDevice({

                        /*
                         * acceptAllDevices membuat kompatibilitas
                         * lebih luas untuk printer thermal.
                         */

                        acceptAllDevices:
                            true,


                        optionalServices:
                            this.config.ble.services

                    });


                if (!device) {

                    return false;

                }


                this.device =
                    device;


                this.deviceName =
                    device.name ||
                    "Bluetooth Printer";


                /*
                 * =========================================
                 * DEVICE DISCONNECT EVENT
                 * =========================================
                 */

                try {

                    device.removeEventListener(
                        "gattserverdisconnected",
                        this.handleDisconnected
                    );

                }

                catch (e) {}


                device.addEventListener(
                    "gattserverdisconnected",
                    this.handleDisconnected
                );


                /*
                 * =========================================
                 * CONNECT GATT
                 * =========================================
                 */

                console.log(
                    "Bluetooth BLE: connecting GATT..."
                );


                const server =
                    await device.gatt.connect();


                if (!server) {

                    throw new Error(
                        "GATT server tidak tersedia."
                    );

                }


                this.server =
                    server;


                /*
                 * =========================================
                 * FIND CHARACTERISTIC
                 * =========================================
                 */

                const result =
                    await this.findWriteCharacteristic(
                        server
                    );


                if (!result) {

                    throw new Error(
                        "Characteristic WRITE printer tidak ditemukan."
                    );

                }


                this.service =
                    result.service;


                this.characteristic =
                    result.characteristic;


                this.transport =
                    "ble";


                this.connected =
                    true;


                this.saveSettings();


                console.log(
                    "========================================"
                );

                console.log(
                    "BLE CONNECTED"
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

                this.connected =
                    false;


                this.transport =
                    null;


                /*
                 * User cancel.
                 */

                if (
                    error &&
                    (
                        error.name ===
                        "NotFoundError" ||

                        error.name ===
                        "AbortError"
                    )
                ) {

                    console.warn(
                        "BLE picker dibatalkan pengguna."
                    );


                    return false;

                }


                console.error(
                    "BLE Connect Error:",
                    error
                );


                throw error;

            }

            finally {

                this.connecting =
                    false;

            }

        },


        /*
        =================================================
         FIND WRITE CHARACTERISTIC
        =================================================
        */

        async findWriteCharacteristic(
            server
        ) {

            /*
             * =========================================
             * 1. Coba UUID yang sudah diketahui
             * =========================================
             */

            const services =
                this.config.ble.services;


            const characteristics =
                this.config.ble.characteristics;


            for (
                const serviceUUID of services
            ) {

                try {

                    const service =
                        await server.getPrimaryService(
                            serviceUUID
                        );


                    if (!service) {

                        continue;

                    }


                    /*
                     * Coba characteristic UUID
                     */

                    for (
                        const charUUID
                        of characteristics
                    ) {

                        try {

                            const characteristic =
                                await service.getCharacteristic(
                                    charUUID
                                );


                            if (
                                characteristic &&
                                this.canWrite(
                                    characteristic
                                )
                            ) {

                                return {

                                    service,

                                    characteristic

                                };

                            }

                        }

                        catch (e) {}

                    }


                    /*
                     * =================================
                     * Jika UUID characteristic tidak
                     * cocok, enumerate characteristics.
                     * =================================
                     */

                    try {

                        const chars =
                            await service.getCharacteristics();


                        for (
                            const characteristic
                            of chars
                        ) {

                            if (
                                this.canWrite(
                                    characteristic
                                )
                            ) {

                                return {

                                    service,

                                    characteristic

                                };

                            }

                        }

                    }

                    catch (e) {}

                }

                catch (e) {}

            }


            /*
             * =========================================
             * 2. Enumerate seluruh primary service
             * =========================================
             */

            try {

                const allServices =
                    await server.getPrimaryServices();


                for (
                    const service
                    of allServices
                ) {

                    try {

                        const chars =
                            await service.getCharacteristics();


                        for (
                            const characteristic
                            of chars
                        ) {

                            if (
                                this.canWrite(
                                    characteristic
                                )
                            ) {

                                console.log(
                                    "BLE WRITE CHARACTERISTIC FOUND:",
                                    characteristic.uuid
                                );


                                return {

                                    service,

                                    characteristic

                                };

                            }

                        }

                    }

                    catch (e) {}

                }

            }

            catch (error) {

                console.warn(
                    "BLE service enumeration gagal:",
                    error
                );

            }


            return null;

        },


        /*
        =================================================
         CHARACTERISTIC WRITE CHECK
        =================================================
        */

        canWrite(
            characteristic
        ) {

            if (!characteristic) {

                return false;

            }


            const properties =
                characteristic.properties ||
                {};


            return Boolean(

                properties.write ||

                properties.writeWithoutResponse

            );

        },


        /*
        =================================================
         SEND BLE
        =================================================
        */

        async sendBLE(
            data
        ) {

            if (
                !this.characteristic
            ) {

                throw new Error(
                    "BLE characteristic WRITE belum tersedia."
                );

            }


            const bytes =
                this.toUint8Array(
                    data
                );


            const chunkSize =
                Math.max(
                    20,
                    Number(
                        this.config.ble.chunkSize
                    ) || 180
                );


            const canWriteWithoutResponse =
                Boolean(
                    this.characteristic.properties &&
                    this.characteristic.properties
                        .writeWithoutResponse
                );


            /*
             * =========================================
             * CHUNK RAW DATA
             * =========================================
             */

            for (
                let offset = 0;
                offset < bytes.length;
                offset += chunkSize
            ) {

                const end =
                    Math.min(
                        offset +
                        chunkSize,
                        bytes.length
                    );


                const chunk =
                    bytes.slice(
                        offset,
                        end
                    );


                if (
                    canWriteWithoutResponse &&
                    typeof this.characteristic
                        .writeValueWithoutResponse ===
                    "function"
                ) {

                    await this.characteristic
                        .writeValueWithoutResponse(
                            chunk
                        );

                }

                else if (
                    typeof this.characteristic
                        .writeValueWithResponse ===
                    "function"
                ) {

                    await this.characteristic
                        .writeValueWithResponse(
                            chunk
                        );

                }

                else {

                    await this.characteristic
                        .writeValue(
                            chunk
                        );

                }


                /*
                 * Beri sedikit waktu untuk
                 * printer BLE thermal.
                 */

                if (
                    offset + chunkSize <
                    bytes.length
                ) {

                    await this.sleep(
                        5
                    );

                }

            }


            return true;

        },


        /*
        =================================================
         SERIAL / COM CONNECT
        =================================================
        */

        async connectSerial() {

            if (
                !("serial" in navigator)
            ) {

                throw new Error(
                    "Web Serial tidak tersedia."
                );

            }


            if (
                this.connecting
            ) {

                return false;

            }


            this.connecting =
                true;


            try {

                console.log(
                    "Web Serial: membuka COM picker..."
                );


                /*
                 * PENTING:
                 *
                 * requestPort() harus berasal
                 * dari klik user.
                 */

                const port =
                    await navigator.serial.requestPort();


                if (!port) {

                    return false;

                }


                await port.open({

                    baudRate:
                        this.config.serial.baudRate,

                    dataBits:
                        this.config.serial.dataBits,

                    stopBits:
                        this.config.serial.stopBits,

                    parity:
                        this.config.serial.parity,

                    bufferSize:
                        this.config.serial.bufferSize,

                    flowControl:
                        this.config.serial.flowControl

                });


                this.port =
                    port;


                this.writer =
                    port.writable
                        ? port.writable.getWriter()
                        : null;


                this.transport =
                    "serial";


                this.connected =
                    true;


                this.deviceName =
                    this.getSerialName(
                        port
                    );


                this.saveSettings();


                console.log(
                    "========================================"
                );

                console.log(
                    "SERIAL / COM CONNECTED"
                );

                console.log(
                    "Device:",
                    this.deviceName
                );

                console.log(
                    "Baud:",
                    this.config.serial.baudRate
                );

                console.log(
                    "========================================"
                );


                return true;

            }

            catch (error) {

                this.connected =
                    false;


                this.transport =
                    null;


                if (
                    error &&
                    (
                        error.name ===
                        "NotFoundError" ||

                        error.name ===
                        "AbortError"
                    )
                ) {

                    console.warn(
                        "COM picker dibatalkan pengguna."
                    );


                    return false;

                }


                if (
                    error &&
                    error.name ===
                    "SecurityError"
                ) {

                    console.error(
                        "Web Serial harus dipanggil langsung dari user gesture."
                    );


                    return false;

                }


                console.error(
                    "Serial Connect Error:",
                    error
                );


                throw error;

            }

            finally {

                this.connecting =
                    false;

            }

        },


        /*
        =================================================
         SERIAL NAME
        =================================================
        */

        getSerialName(
            port
        ) {

            try {

                const info =
                    port.getInfo();


                if (
                    info.usbVendorId ||
                    info.usbProductId
                ) {

                    return (
                        "USB Printer " +

                        (
                            info.usbVendorId ||
                            ""
                        ) +

                        ":" +

                        (
                            info.usbProductId ||
                            ""
                        )
                    );

                }

            }

            catch (e) {}


            return "Serial Printer";

        },


        /*
        =================================================
         SEND SERIAL
        =================================================
        */

        async sendSerial(
            data
        ) {

            if (
                !this.port ||
                !this.port.writable
            ) {

                throw new Error(
                    "Serial printer belum terhubung."
                );

            }


            const bytes =
                this.toUint8Array(
                    data
                );


            if (!this.writer) {

                this.writer =
                    this.port.writable.getWriter();

            }


            await this.writer.write(
                bytes
            );


            return true;

        },


        /*
        =================================================
         BRIDGE CONNECT
        =================================================
        */

        async connectBridge(
            url
        ) {

            const bridgeURL =
                String(
                    url ||
                    this.bridgeURL ||
                    this.config.bridge.url ||
                    ""
                ).trim();


            if (!bridgeURL) {

                throw new Error(
                    "Bridge URL belum dikonfigurasi."
                );

            }


            this.bridgeURL =
                bridgeURL;


            /*
             * Test bridge
             *
             * Tidak wajib endpoint khusus.
             * Cukup cek URL dapat diakses.
             */

            try {

                const response =
                    await fetch(
                        bridgeURL,
                        {

                            method:
                                "GET",

                            cache:
                                "no-store"

                        }
                    );


                /*
                 * 404 tetap dianggap bridge
                 * mungkin hidup tetapi endpoint
                 * root tidak tersedia.
                 */

                if (
                    !response &&
                    !response.ok
                ) {

                    throw new Error(
                        "Bridge tidak merespons."
                    );

                }

            }

            catch (error) {

                console.warn(
                    "Bridge test:",
                    error
                );

                /*
                 * Jangan langsung gagal jika
                 * bridge endpoint GET tidak tersedia.
                 *
                 * Kita tetap tandai transport bridge.
                 */

            }


            this.transport =
                "bridge";


            this.connected =
                true;


            this.saveSettings();


            console.log(
                "Bridge Connected:",
                bridgeURL
            );


            return true;

        },


        /*
        =================================================
         SEND BRIDGE
        =================================================
        */

        async sendBridge(
            data
        ) {

            const base =
                String(
                    this.bridgeURL ||
                    this.config.bridge.url ||
                    ""
                ).replace(
                    /\/$/,
                    ""
                );


            if (!base) {

                throw new Error(
                    "Bridge URL belum dikonfigurasi."
                );

            }


            const endpoint =
                base +
                this.config.bridge.endpoint;


            const bytes =
                this.toUint8Array(
                    data
                );


            /*
             * RAW binary body.
             *
             * Bridge menerima
             * application/octet-stream.
             */

            const response =
                await fetch(
                    endpoint,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/octet-stream"

                        },

                        body:
                            bytes

                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    "Bridge print gagal: HTTP " +
                    response.status
                );

            }


            return true;

        },


        /*
        =================================================
         AUTO CONNECT
        =================================================
        */

        async autoConnect() {

            /*
             * Web Bluetooth tidak boleh membuka
             * picker otomatis.
             *
             * Kita hanya bisa reconnect device
             * yang sudah pernah di-grant browser.
             */

            if (
                navigator.bluetooth &&
                typeof navigator.bluetooth
                    .getDevices ===
                "function"
            ) {

                try {

                    const devices =
                        await navigator.bluetooth
                            .getDevices();


                    /*
                     * Jika printer tersimpan,
                     * coba satu per satu.
                     */

                    for (
                        const device
                        of devices
                    ) {

                        if (
                            this.deviceName &&
                            device.name &&
                            device.name !==
                            this.deviceName
                        ) {

                            continue;

                        }


                        try {

                            const server =
                                await device.gatt.connect();


                            this.device =
                                device;

                            this.server =
                                server;

                            this.deviceName =
                                device.name ||
                                this.deviceName ||
                                "Bluetooth Printer";


                            const result =
                                await this
                                    .findWriteCharacteristic(
                                        server
                                    );


                            if (
                                result
                            ) {

                                this.service =
                                    result.service;

                                this.characteristic =
                                    result.characteristic;

                                this.transport =
                                    "ble";

                                this.connected =
                                    true;


                                device.addEventListener(
                                    "gattserverdisconnected",
                                    this.handleDisconnected
                                );


                                console.log(
                                    "BLE Auto Connected:",
                                    this.deviceName
                                );


                                return true;

                            }

                        }

                        catch (error) {

                            console.warn(
                                "Auto reconnect device gagal:",
                                error
                            );

                        }

                    }

                }

                catch (error) {

                    console.warn(
                        "Bluetooth getDevices gagal:",
                        error
                    );

                }

            }


            /*
             * Bridge auto connect
             */

            if (
                this.bridgeURL
            ) {

                try {

                    return await this.connectBridge(
                        this.bridgeURL
                    );

                }

                catch (error) {

                    console.warn(
                        "Bridge auto connect gagal:",
                        error
                    );

                }

            }


            return false;

        },


        /*
        =================================================
         SEND RAW
        =================================================
        */

        async sendRaw(
            data
        ) {

            const bytes =
                this.toUint8Array(
                    data
                );


            if (
                bytes.length === 0
            ) {

                throw new Error(
                    "RAW data kosong."
                );

            }


            /*
             * Pastikan koneksi aktual.
             */

            if (
                !this.connected
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            console.log(
                "Bluetooth Engine RAW:",
                bytes.length,
                "bytes"
            );


            /*
             * BLE
             */

            if (
                this.transport ===
                "ble"
            ) {

                return await this.sendBLE(
                    bytes
                );

            }


            /*
             * SERIAL
             */

            if (
                this.transport ===
                "serial"
            ) {

                return await this.sendSerial(
                    bytes
                );

            }


            /*
             * BRIDGE
             */

            if (
                this.transport ===
                "bridge"
            ) {

                return await this.sendBridge(
                    bytes
                );

            }


            throw new Error(
                "Transport tidak dikenal: " +
                this.transport
            );

        },


        /*
        =================================================
         SEND
        =================================================
        */

        async send(
            data
        ) {

            return await this.sendRaw(
                data
            );

        },


        /*
        =================================================
         WRITE
        =================================================
        */

        async write(
            data
        ) {

            return await this.sendRaw(
                data
            );

        },


        /*
        =================================================
         RAW ALIAS
        =================================================
        */

        async raw(
            data
        ) {

            return await this.sendRaw(
                data
            );

        },


        /*
        =================================================
         WRITE RAW
        =================================================
        */

        async writeRaw(
            data
        ) {

            return await this.sendRaw(
                data
            );

        },


        /*
        =================================================
         PRINT RAW
        =================================================
        */

        async printRaw(
            data
        ) {

            return await this.sendRaw(
                data
            );

        },


        /*
        =================================================
         IS CONNECTED
        =================================================
        */

        isConnected() {

            /*
             * BLE
             */

            if (
                this.transport ===
                "ble"
            ) {

                return Boolean(

                    this.connected &&

                    this.device &&

                    this.device.gatt &&

                    this.device.gatt.connected &&

                    this.characteristic

                );

            }


            /*
             * SERIAL
             */

            if (
                this.transport ===
                "serial"
            ) {

                return Boolean(

                    this.connected &&

                    this.port &&

                    this.port.writable

                );

            }


            /*
             * BRIDGE
             */

            if (
                this.transport ===
                "bridge"
            ) {

                return Boolean(
                    this.connected
                );

            }


            return false;

        },


        /*
        =================================================
         GET DEVICE NAME
        =================================================
        */

        getDeviceName() {

            return (
                this.deviceName ||
                "Bluetooth Printer"
            );

        },


        /*
        =================================================
         DISCONNECT
        =================================================
        */

        async disconnect() {

            console.log(
                "Bluetooth Engine Disconnect"
            );


            /*
             * =========================================
             * BLE
             * =========================================
             */

            if (
                this.device &&
                this.device.gatt
            ) {

                try {

                    if (
                        this.device.gatt.connected
                    ) {

                        this.device.gatt.disconnect();

                    }

                }

                catch (error) {

                    console.warn(
                        "BLE disconnect error:",
                        error
                    );

                }

            }


            /*
             * =========================================
             * SERIAL
             * =========================================
             */

            if (
                this.writer
            ) {

                try {

                    this.writer.releaseLock();

                }

                catch (e) {}

            }


            this.writer =
                null;


            if (
                this.port
            ) {

                try {

                    await this.port.close();

                }

                catch (error) {

                    console.warn(
                        "Serial close error:",
                        error
                    );

                }

            }


            /*
             * =========================================
             * RESET
             * =========================================
             */

            this.connected =
                false;

            this.transport =
                null;

            this.server =
                null;

            this.service =
                null;

            this.characteristic =
                null;

            this.port =
                null;


            console.log(
                "Bluetooth Engine Disconnected"
            );


            return true;

        },


        /*
        =================================================
         DISCONNECT EVENT
        =================================================
        */

        handleDisconnected() {

            console.warn(
                "Bluetooth printer disconnected."
            );


            BluetoothEngine.connected =
                false;


            BluetoothEngine.transport =
                null;


            BluetoothEngine.server =
                null;


            BluetoothEngine.service =
                null;


            BluetoothEngine.characteristic =
                null;


            BluetoothEngine.updatePrinterStatus(
                "disconnected"
            );

        },


        /*
        =================================================
         INSTALL DISCONNECT HANDLER
        =================================================
        */

        installDisconnectHandler() {

            if (
                !("serial" in navigator)
            ) {

                return;

            }


            try {

                navigator.serial.addEventListener(
                    "disconnect",
                    event => {

                        if (
                            BluetoothEngine.port ===
                            event.target
                        ) {

                            BluetoothEngine.handleDisconnected();

                        }

                    }
                );

            }

            catch (error) {

                console.warn(
                    "Serial disconnect listener gagal:",
                    error
                );

            }

        },


        /*
        =================================================
         UPDATE PRINTER STATUS
        =================================================
        */

        updatePrinterStatus(
            state
        ) {

            const status =
                document.getElementById(
                    "printerStatus"
                );


            const globalStatus =
                document.getElementById(
                    "status"
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

                case "connected":

                    text =
                        "Printer Connected";

                    connected =
                        true;

                    break;


                case "connecting":

                    text =
                        "Connecting...";

                    break;


                case "printing":

                    text =
                        "Printing...";

                    connected =
                        true;

                    break;


                case "error":

                    text =
                        "Printer Error";

                    break;


                default:

                    text =
                        "No Printer";

                    break;

            }


            if (
                status
            ) {

                status.textContent =
                    text;

            }


            if (
                globalStatus
            ) {

                globalStatus.textContent =
                    text;

            }


            if (
                dot
            ) {

                dot.classList.toggle(
                    "connected",
                    connected
                );

            }

        },


        /*
        =================================================
         UINT8 CONVERSION
        =================================================
        */

        toUint8Array(
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
                ArrayBuffer.isView(
                    data
                )
            ) {

                return new Uint8Array(
                    data.buffer,
                    data.byteOffset,
                    data.byteLength
                );

            }


            if (
                typeof data ===
                "string"
            ) {

                /*
                 * Hanya untuk compatibility
                 * command string.
                 *
                 * TSPL v5.3 tetap mengirim
                 * RAW Uint8Array.
                 */

                return new TextEncoder()
                    .encode(data);

            }


            if (
                Array.isArray(data)
            ) {

                return new Uint8Array(
                    data
                );

            }


            throw new TypeError(
                "Bluetooth: data harus Uint8Array, ArrayBuffer, Array atau string."
            );

        },


        /*
        =================================================
         SET BLE UUID
        =================================================
         */

        setBLEUUID(
            serviceUUID,
            writeUUID
        ) {

            if (
                serviceUUID
            ) {

                this.config.ble.serviceUUID =
                    serviceUUID;

            }


            if (
                writeUUID
            ) {

                this.config.ble.writeUUID =
                    writeUUID;

            }


            /*
             * Tambahkan ke daftar pencarian.
             */

            if (
                serviceUUID &&
                !this.config.ble.services.includes(
                    serviceUUID
                )
            ) {

                this.config.ble.services.unshift(
                    serviceUUID
                );

            }


            if (
                writeUUID &&
                !this.config.ble.characteristics.includes(
                    writeUUID
                )
            ) {

                this.config.ble.characteristics.unshift(
                    writeUUID
                );

            }


            this.saveSettings();


            return true;

        },


        /*
        =================================================
         SET SERIAL CONFIG
        =================================================
        */

        setSerialConfig(
            options = {}
        ) {

            if (
                options.baudRate
            ) {

                this.config.serial.baudRate =
                    Number(
                        options.baudRate
                    );

            }


            if (
                options.dataBits
            ) {

                this.config.serial.dataBits =
                    Number(
                        options.dataBits
                    );

            }


            if (
                options.stopBits
            ) {

                this.config.serial.stopBits =
                    Number(
                        options.stopBits
                    );

            }


            if (
                options.parity
            ) {

                this.config.serial.parity =
                    options.parity;

            }


            this.saveSettings();


            return this.config.serial;

        },


        /*
        =================================================
         SET BRIDGE
        =================================================
         */

        setBridgeURL(
            url
        ) {

            this.bridgeURL =
                String(
                    url || ""
                ).trim();


            this.config.bridge.url =
                this.bridgeURL;


            this.saveSettings();


            return this.bridgeURL;

        },


        /*
        =================================================
         INFO
        =================================================
        */

        getInfo() {

            return {

                version:
                    this.version,

                connected:
                    this.isConnected(),

                transport:
                    this.transport,

                deviceName:
                    this.deviceName,

                ble:
                    Boolean(
                        this.device
                    ),

                serial:
                    Boolean(
                        this.port
                    ),

                bridge:
                    Boolean(
                        this.bridgeURL
                    ),

                service:
                    this.service
                        ? this.service.uuid
                        : null,

                characteristic:
                    this.characteristic
                        ? this.characteristic.uuid
                        : null

            };

        },


        /*
        =================================================
         SLEEP
        =================================================
        */

        sleep(
            ms
        ) {

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
    =====================================================
     GLOBAL EXPORT
    =====================================================
    */

    window.Bluetooth =
        BluetoothEngine;


    window.BluetoothEngine =
        BluetoothEngine;


    /*
    =====================================================
     INIT
    =====================================================
    */

    BluetoothEngine.init();


    /*
    =====================================================
     READY LOG
    =====================================================
    */

    console.log(
        "SmartPrint Bluetooth Engine v" +
        VERSION +
        " Ready"
    );


    console.log(
        "BLE | Web Serial | Bridge | RAW Uint8Array"
    );

    console.log(
        "API: connectUser() | connectBLE() | connectSerial() | connectBridge() | sendRaw()"
    );

})();
