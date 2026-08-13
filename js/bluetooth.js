"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.3
=====================================================

 SUPPORT
 ----------------------------------------------------
 ✓ Bluetooth LE / Web Bluetooth
 ✓ Bluetooth Classic / SPP via Windows COM
 ✓ Web Serial
 ✓ Android / Classic Bluetooth via Local Bridge
 ✓ Auto reconnect
 ✓ Saved printer
 ✓ Connection status
 ✓ GATT service discovery
 ✓ Write characteristic detection
 ✓ BLE chunking
 ✓ Serial chunking
 ✓ Bridge chunking
 ✓ ESC/POS
 ✓ TSPL
 ✓ ZPL
 ✓ CPCL
 ✓ PrinterManager v4.1
 ✓ Legacy connectPrinter()
 ✓ Legacy sendTSPL()
 ✓ Legacy disconnectPrinter()

 IMPORTANT
 ----------------------------------------------------
 Web Bluetooth:
   BLE / GATT ONLY

 Bluetooth Classic:
   Windows → Web Serial / COM
   Android → Local Bridge

 Web Serial requestPort():
   HARUS dipanggil dari user gesture.

 AUTO CONNECT:
   Tidak pernah memanggil requestDevice()
   Tidak pernah memanggil requestPort()

 USER CONNECT:
   Dipanggil langsung dari tombol Connect.

=====================================================
*/

(function () {

    "use strict";


    // =================================================
    // ENGINE
    // =================================================

    const Bluetooth = {


        // =================================================
        // CONFIG
        // =================================================

        version: "5.3.0",

        mode: "auto",

        bridgeURL:
            "ws://127.0.0.1:8765",


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


        serialBaudRate: 9600,

        serialDataBits: 8,

        serialStopBits: 1,

        serialParity: "none",


        bridgeTimeout: 3000,


        // =================================================
        // STATE
        // =================================================

        device: null,

        server: null,

        writeCharacteristic: null,

        port: null,

        reader: null,

        writer: null,

        bridge: null,

        bridgeConnected: false,

        connected: false,

        connecting: false,

        writing: false,

        transport: null,

        deviceName: "",

        disconnectHandler: null,


        // =================================================
        // SUPPORT
        // =================================================

        isBluetoothSupported() {

            return (

                typeof navigator !== "undefined" &&

                "bluetooth" in navigator

            );

        },


        isSerialSupported() {

            return (

                typeof navigator !== "undefined" &&

                "serial" in navigator

            );

        },


        isBridgeSupported() {

            return (

                typeof WebSocket !== "undefined"

            );

        },


        getCapabilities() {

            return {

                bluetooth:
                    this.isBluetoothSupported(),

                serial:
                    this.isSerialSupported(),

                bridge:
                    this.isBridgeSupported()

            };

        },


        // =================================================
        // USER ACTIVATION
        // =================================================

        hasUserActivation() {

            try {

                return (

                    navigator.userActivation &&

                    navigator.userActivation.isActive

                );

            }

            catch (_) {

                return false;

            }

        },


        // =================================================
        // CONNECT
        // =================================================
        /*
        -------------------------------------------------
        IMPORTANT

        PrinterManager.connect() menggunakan method ini.

        Untuk mencegah masalah Web Serial:

        connect() TIDAK melakukan fallback:

        BLE → Serial

        setelah BLE picker selesai.

        Untuk koneksi tombol gunakan connectUser().
        -------------------------------------------------
        */

        async connect() {

            return this.connectUser();

        },


        // =================================================
        // USER CONNECT
        // =================================================

        async connectUser() {

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


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT BLUETOOTH USER CONNECT v5.3"
            );

            console.log(
                "========================================"
            );

            console.log(
                "Capabilities:",
                this.getCapabilities()
            );


            try {

                const savedTransport =
                    this.getSavedTransport();


                /*
                =================================================
                PRIORITAS TRANSPORT TERSIMPAN
                =================================================
                */


                // =============================================
                // SAVED SERIAL
                // =============================================

                if (
                    savedTransport ===
                    "serial"
                ) {

                    console.log(
                        "Saved transport: SERIAL"
                    );


                    /*
                    requestPort HARUS dipanggil
                    langsung dari user gesture.
                    */

                    const result =
                        await this.connectSerial();


                    if (result) {

                        this.saveDevice();

                        return true;

                    }


                    return false;

                }


                // =============================================
                // SAVED BLE
                // =============================================

                if (
                    savedTransport ===
                    "ble"
                ) {

                    console.log(
                        "Saved transport: BLE"
                    );


                    const result =
                        await this.connectBLE();


                    if (result) {

                        this.saveDevice();

                        return true;

                    }


                    return false;

                }


                // =============================================
                // SAVED BRIDGE
                // =============================================

                if (
                    savedTransport ===
                    "bridge"
                ) {

                    console.log(
                        "Saved transport: BRIDGE"
                    );


                    const result =
                        await this.connectBridge();


                    if (result) {

                        this.saveDevice();

                        return true;

                    }


                    return false;

                }


                /*
                =================================================
                BELUM ADA TRANSPORT TERSIMPAN

                Gunakan BLE sebagai pilihan pertama.

                JIKA USER MEMBATALKAN BLE:
                langsung selesai.

                JANGAN memanggil requestPort()
                setelah await requestDevice().
                =================================================
                */


                if (
                    this.isBluetoothSupported()
                ) {

                    console.log(
                        "No saved transport."
                    );

                    console.log(
                        "User Connect → BLE"
                    );


                    const ble =
                        await this.connectBLE();


                    if (ble) {

                        this.saveDevice();

                        return true;

                    }


                    console.log(
                        "BLE tidak terhubung."
                    );

                    console.log(
                        "Gunakan tombol Connect Serial "
                        + "untuk printer Bluetooth Classic / COM."
                    );


                    return false;

                }


                // =============================================
                // SERIAL
                // =============================================

                if (
                    this.isSerialSupported()
                ) {

                    return await this.connectSerial();

                }


                // =============================================
                // BRIDGE
                // =============================================

                if (
                    this.isBridgeSupported()
                ) {

                    return await this.connectBridge();

                }


                throw new Error(
                    "Tidak ada transport Bluetooth yang tersedia."
                );

            }

            catch (error) {

                console.error(
                    "Bluetooth User Connect Error:",
                    error
                );


                this.resetRuntimeState();


                if (
                    error &&
                    error.name ===
                    "NotFoundError"
                ) {

                    console.warn(
                        "Pemilihan perangkat dibatalkan pengguna."
                    );


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                if (
                    error &&
                    error.name ===
                    "AbortError"
                ) {

                    console.warn(
                        "Pemilihan perangkat dibatalkan pengguna."
                    );


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.updateStatus(
                    "error"
                );


                return false;

            }

            finally {

                this.connecting =
                    false;

            }

        },


        // =================================================
        // BLE CONNECT
        // =================================================

        async connectBLE() {

            if (
                !this.isBluetoothSupported()
            ) {

                console.warn(
                    "Web Bluetooth tidak tersedia."
                );

                return false;

            }


            console.log(
                "SMARTPRINT BLE CONNECT"
            );


            let device;


            try {

                device =
                    await navigator.bluetooth.requestDevice({

                        acceptAllDevices:
                            true,

                        optionalServices:
                            this.services

                    });

            }

            catch (error) {

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
                        "BLE device picker dibatalkan."
                    );


                    return false;

                }


                throw error;

            }


            if (!device) {

                return false;

            }


            console.log(
                "BLE Device:",
                device.name ||
                "Unknown"
            );


            this.removeDisconnectListener();


            this.device =
                device;


            this.deviceName =
                device.name ||
                "BLE Printer";


            this.transport =
                "ble";


            this.attachDisconnectEvent();


            await this.connectGATT();


            this.connected =
                true;


            this.saveDevice();


            this.updateStatus(
                "connected"
            );


            console.log(
                "BLE Connected:",
                this.deviceName
            );


            return true;

        },


        // =================================================
        // GATT
        // =================================================

        async connectGATT() {

            if (!this.device) {

                throw new Error(
                    "BLE device tidak tersedia."
                );

            }


            if (!this.device.gatt) {

                throw new Error(
                    "GATT tidak tersedia."
                );

            }


            console.log(
                "Connecting GATT..."
            );


            this.server =
                this.device.gatt.connected

                    ? this.device.gatt

                    : await this.device.gatt.connect();


            if (!this.server) {

                throw new Error(
                    "GATT server tidak tersedia."
                );

            }


            const services =
                await this.server.getPrimaryServices();


            console.log(
                "Primary Services:",
                services.length
            );


            this.writeCharacteristic =
                null;


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
                        "Gagal membaca characteristics:",
                        error
                    );

                    continue;

                }


                for (
                    const characteristic
                    of characteristics
                ) {

                    console.log(
                        "CHARACTERISTIC:",
                        characteristic.uuid,
                        characteristic.properties
                    );


                    const canWrite =

                        characteristic.properties.write ||

                        characteristic.properties.writeWithoutResponse;


                    if (!canWrite) {

                        continue;

                    }


                    /*
                    -----------------------------------------
                    Prioritaskan characteristic yang dikenal
                    -----------------------------------------
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
                    -----------------------------------------
                    Fallback characteristic write pertama
                    -----------------------------------------
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


            if (
                !this.writeCharacteristic
            ) {

                throw new Error(
                    "BLE Write Characteristic tidak ditemukan."
                );

            }


            console.log(
                "WRITE CHARACTERISTIC:",
                this.writeCharacteristic.uuid
            );


            return true;

        },


        // =================================================
        // SERIAL CONNECT
        // =================================================

        async connectSerial() {

            if (
                !this.isSerialSupported()
            ) {

                console.warn(
                    "Web Serial tidak tersedia."
                );

                return false;

            }


            /*
            =================================================
            CRITICAL

            requestPort() HARUS dipanggil langsung dari
            event user.

            Jangan menunggu BLE.
            Jangan setTimeout.
            Jangan dipanggil autoConnect().
            =================================================
            */

            if (
                !this.hasUserActivation()
            ) {

                console.error(
                    "Serial requestPort() membutuhkan user gesture."
                );


                this.updateStatus(
                    "error"
                );


                return false;

            }


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT SERIAL / BLUETOOTH CLASSIC"
            );

            console.log(
                "========================================"
            );


            let port;


            try {

                port =
                    await navigator.serial.requestPort();

            }

            catch (error) {

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
                        "Serial device picker dibatalkan."
                    );


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                throw error;

            }


            if (!port) {

                return false;

            }


            /*
            -----------------------------------------------
            Jika port sudah terbuka, jangan open lagi.
            -----------------------------------------------
            */

            if (
                !port.readable &&
                !port.writable
            ) {

                await port.open({

                    baudRate:
                        this.serialBaudRate,

                    dataBits:
                        this.serialDataBits,

                    stopBits:
                        this.serialStopBits,

                    parity:
                        this.serialParity

                });

            }


            this.port =
                port;


            /*
            -----------------------------------------------
            Writer
            -----------------------------------------------
            */

            if (
                this.port.writable
            ) {

                this.writer =
                    this.port.writable.getWriter();

            }


            this.transport =
                "serial";


            this.deviceName =
                "Bluetooth Serial Printer";


            this.connected =
                true;


            this.updateStatus(
                "connected"
            );


            this.saveDevice();


            console.log(
                "Serial Printer Connected."
            );


            return true;

        },


        // =================================================
        // BRIDGE CONNECT
        // =================================================

        async connectBridge(
            silent = false
        ) {

            if (
                !this.isBridgeSupported()
            ) {

                return false;

            }


            console.log(
                "Connecting SmartPrint Bridge:",
                this.bridgeURL
            );


            return new Promise(
                resolve => {

                    let finished =
                        false;


                    const finish =
                        result => {

                            if (
                                finished
                            ) {

                                return;

                            }


                            finished =
                                true;


                            resolve(
                                result
                            );

                        };


                    let socket;


                    try {

                        socket =
                            new WebSocket(
                                this.bridgeURL
                            );

                    }

                    catch (error) {

                        if (!silent) {

                            console.error(
                                "Bridge Error:",
                                error
                            );

                        }


                        finish(false);

                        return;

                    }


                    const timeout =
                        setTimeout(
                            () => {

                                try {

                                    socket.close();

                                }

                                catch (_) {}


                                if (!silent) {

                                    console.warn(
                                        "SmartPrint Bridge tidak tersedia."
                                    );

                                }


                                finish(false);

                            },
                            this.bridgeTimeout
                        );


                    socket.binaryType =
                        "arraybuffer";


                    socket.onopen =
                        () => {

                            clearTimeout(
                                timeout
                            );


                            console.log(
                                "SmartPrint Bridge Connected."
                            );


                            this.bridge =
                                socket;


                            this.bridgeConnected =
                                true;


                            this.transport =
                                "bridge";


                            this.deviceName =
                                "Bluetooth Classic Bridge";


                            this.connected =
                                true;


                            this.updateStatus(
                                "connected"
                            );


                            this.saveDevice();


                            finish(true);

                        };


                    socket.onerror =
                        error => {

                            clearTimeout(
                                timeout
                            );


                            if (!silent) {

                                console.error(
                                    "Bridge Error:",
                                    error
                                );

                            }


                            finish(false);

                        };


                    socket.onclose =
                        () => {

                            this.bridgeConnected =
                                false;


                            if (
                                this.transport ===
                                "bridge"
                            ) {

                                this.connected =
                                    false;


                                this.updateStatus(
                                    "disconnected"
                                );

                            }

                        };

                }
            );

        },


        // =================================================
        // AUTO CONNECT
        // =================================================

        async autoConnect() {

            console.log(
                "SmartPrint Bluetooth Auto Connect..."
            );


            const savedTransport =
                this.getSavedTransport();


            /*
            =================================================
            BLE
            =================================================
            */

            if (
                savedTransport ===
                "ble"
            ) {

                if (
                    this.isBluetoothSupported() &&
                    typeof navigator.bluetooth.getDevices ===
                    "function"
                ) {

                    try {

                        const devices =
                            await navigator.bluetooth.getDevices();


                        const savedId =
                            this.getSaved(
                                "SMARTPRINT_PRINTER_ID"
                            );


                        const savedName =
                            this.getSaved(
                                "SMARTPRINT_PRINTER_NAME"
                            );


                        let device =
                            null;


                        if (savedId) {

                            device =
                                devices.find(
                                    item =>
                                        item.id ===
                                        savedId
                                );

                        }


                        if (
                            !device &&
                            savedName
                        ) {

                            device =
                                devices.find(
                                    item =>
                                        item.name ===
                                        savedName
                                );

                        }


                        if (device) {

                            console.log(
                                "BLE Saved Device:",
                                device.name ||
                                "Unknown"
                            );


                            this.device =
                                device;


                            this.deviceName =
                                device.name ||
                                "BLE Printer";


                            this.transport =
                                "ble";


                            this.removeDisconnectListener();


                            this.attachDisconnectEvent();


                            await this.connectGATT();


                            this.connected =
                                true;


                            this.updateStatus(
                                "connected"
                            );


                            console.log(
                                "BLE Auto Connected:",
                                this.getDeviceName()
                            );


                            return true;

                        }

                    }

                    catch (error) {

                        console.warn(
                            "BLE Auto Connect gagal:",
                            error
                        );

                    }

                }

            }


            /*
            =================================================
            BRIDGE
            =================================================
            */

            if (
                savedTransport ===
                "bridge"
            ) {

                try {

                    const result =
                        await this.connectBridge(
                            true
                        );


                    if (result) {

                        console.log(
                            "Bridge Auto Connected."
                        );


                        return true;

                    }

                }

                catch (error) {

                    console.warn(
                        "Bridge Auto Connect gagal:",
                        error
                    );

                }

            }


            /*
            =================================================
            SERIAL

            JANGAN requestPort().

            Karena tidak ada user gesture.
            =================================================
            */

            if (
                savedTransport ===
                "serial"
            ) {

                console.log(
                    "Saved Bluetooth Classic printer ditemukan."
                );


                console.log(
                    "Serial Auto Connect dilewati."
                );


                console.log(
                    "Menunggu tombol Connect manual."
                );


                /*
                ---------------------------------------------
                Coba port yang sudah mendapat permission.
                getPorts() tidak membuka picker.
                ---------------------------------------------
                */

                if (
                    this.isSerialSupported() &&
                    typeof navigator.serial.getPorts ===
                    "function"
                ) {

                    try {

                        const ports =
                            await navigator.serial.getPorts();


                        if (
                            ports.length === 1
                        ) {

                            const port =
                                ports[0];


                            try {

                                await this.openSavedSerialPort(
                                    port
                                );


                                if (
                                    this.connected
                                ) {

                                    console.log(
                                        "Saved Serial port auto-connected."
                                    );


                                    return true;

                                }

                            }

                            catch (error) {

                                console.warn(
                                    "Saved Serial port gagal dibuka:",
                                    error
                                );

                            }

                        }

                    }

                    catch (error) {

                        console.warn(
                            "getPorts() gagal:",
                            error
                        );

                    }

                }

            }


            console.log(
                "Tidak ada printer yang dapat auto-connect."
            );


            return false;

        },


        // =================================================
        // OPEN SAVED SERIAL PORT
        // =================================================

        async openSavedSerialPort(
            port
        ) {

            if (!port) {

                return false;

            }


            if (
                !port.readable &&
                !port.writable
            ) {

                await port.open({

                    baudRate:
                        this.serialBaudRate,

                    dataBits:
                        this.serialDataBits,

                    stopBits:
                        this.serialStopBits,

                    parity:
                        this.serialParity

                });

            }


            this.port =
                port;


            if (
                port.writable
            ) {

                this.writer =
                    port.writable.getWriter();

            }


            this.transport =
                "serial";


            this.deviceName =
                "Bluetooth Serial Printer";


            this.connected =
                true;


            this.updateStatus(
                "connected"
            );


            return true;

        },


        // =================================================
        // RECONNECT
        // =================================================

        async reconnect() {

            if (
                this.transport ===
                "ble" &&
                this.device
            ) {

                try {

                    this.connecting =
                        true;


                    this.updateStatus(
                        "connecting"
                    );


                    await this.connectGATT();


                    this.connected =
                        true;


                    this.connecting =
                        false;


                    this.updateStatus(
                        "connected"
                    );


                    return true;

                }

                catch (error) {

                    console.warn(
                        "BLE reconnect gagal:",
                        error
                    );

                }

            }


            if (
                this.transport ===
                "bridge"
            ) {

                return this.connectBridge();

            }


            if (
                this.transport ===
                "serial"
            ) {

                console.warn(
                    "Serial reconnect membutuhkan koneksi user."
                );


                return false;

            }


            return false;

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            if (
                !this.connected
            ) {

                return false;

            }


            // =============================================
            // BLE
            // =============================================

            if (
                this.transport ===
                "ble"
            ) {

                if (
                    !this.device ||
                    !this.device.gatt ||
                    !this.device.gatt.connected ||
                    !this.writeCharacteristic
                ) {

                    this.connected =
                        false;


                    return false;

                }

            }


            // =============================================
            // SERIAL
            // =============================================

            if (
                this.transport ===
                "serial"
            ) {

                if (
                    !this.port ||
                    !this.port.writable ||
                    !this.writer
                ) {

                    this.connected =
                        false;


                    return false;

                }

            }


            // =============================================
            // BRIDGE
            // =============================================

            if (
                this.transport ===
                "bridge"
            ) {

                if (
                    !this.bridge ||
                    this.bridge.readyState !==
                    WebSocket.OPEN
                ) {

                    this.connected =
                        false;


                    return false;

                }

            }


            return true;

        },


        // =================================================
        // WRITE
        // =================================================

        async write(data) {

            if (
                !this.isConnected()
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            if (
                this.writing
            ) {

                throw new Error(
                    "Printer sedang menerima data."
                );

            }


            this.writing =
                true;


            try {

                const bytes =
                    this.toUint8Array(
                        data
                    );


                console.log(
                    "SmartPrint Bluetooth Write:",
                    bytes.length,
                    "bytes",
                    "transport:",
                    this.transport
                );


                this.updateStatus(
                    "printing"
                );


                if (
                    this.transport ===
                    "ble"
                ) {

                    await this.writeBLE(
                        bytes
                    );

                }

                else if (
                    this.transport ===
                    "serial"
                ) {

                    await this.writeSerial(
                        bytes
                    );

                }

                else if (
                    this.transport ===
                    "bridge"
                ) {

                    await this.writeBridge(
                        bytes
                    );

                }

                else {

                    throw new Error(
                        "Transport Bluetooth tidak dikenal."
                    );

                }


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
        // DATA CONVERSION
        // =================================================

        toUint8Array(data) {

            if (
                typeof data ===
                "string"
            ) {

                return new TextEncoder()
                    .encode(data);

            }


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


            throw new Error(
                "Format data Bluetooth tidak didukung."
            );

        },


        // =================================================
        // BLE WRITE
        // =================================================

        async writeBLE(bytes) {

            if (
                !this.writeCharacteristic
            ) {

                throw new Error(
                    "BLE write characteristic tidak tersedia."
                );

            }


            const characteristic =
                this.writeCharacteristic;


            for (
                let offset = 0;
                offset < bytes.length;
                offset += this.chunkSize
            ) {

                const chunk =
                    bytes.slice(
                        offset,
                        offset +
                        this.chunkSize
                    );


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

                }

                else if (
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

                }

                else {

                    throw new Error(
                        "BLE characteristic tidak mendukung write."
                    );

                }


                if (
                    this.delay > 0
                ) {

                    await this.sleep(
                        this.delay
                    );

                }

            }

        },


        // =================================================
        // SERIAL WRITE
        // =================================================

        async writeSerial(bytes) {

            if (!this.port) {

                throw new Error(
                    "Serial port tidak tersedia."
                );

            }


            if (!this.port.writable) {

                throw new Error(
                    "Serial port tidak dapat ditulis."
                );

            }


            if (!this.writer) {

                this.writer =
                    this.port.writable.getWriter();

            }


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT SERIAL WRITE"
            );

            console.log(
                "Bytes:",
                bytes.length
            );

            console.log(
                "Chunk:",
                this.chunkSize
            );

            console.log(
                "Delay:",
                this.delay,
                "ms"
            );

            console.log(
                "========================================"
            );


            for (
                let offset = 0;
                offset < bytes.length;
                offset += this.chunkSize
            ) {

                const end =
                    Math.min(
                        offset +
                        this.chunkSize,
                        bytes.length
                    );


                const chunk =
                    bytes.slice(
                        offset,
                        end
                    );


                await this.writer.write(
                    chunk
                );


                if (
                    this.delay > 0
                ) {

                    await this.sleep(
                        this.delay
                    );

                }


                if (
                    offset === 0 ||
                    offset % 10000 <
                    this.chunkSize ||
                    end >= bytes.length
                ) {

                    const percent =
                        Math.round(
                            (
                                end /
                                bytes.length
                            ) * 100
                        );


                    console.log(
                        "Serial Print:",
                        percent + "%",
                        end,
                        "/",
                        bytes.length
                    );

                }

            }


            console.log(
                "SERIAL DATA SENT"
            );


            return true;

        },


        // =================================================
        // BRIDGE WRITE
        // =================================================

        async writeBridge(bytes) {

            if (
                !this.bridge ||
                this.bridge.readyState !==
                WebSocket.OPEN
            ) {

                throw new Error(
                    "SmartPrint Bridge tidak terhubung."
                );

            }


            for (
                let offset = 0;
                offset < bytes.length;
                offset += this.chunkSize
            ) {

                const chunk =
                    bytes.slice(
                        offset,
                        offset +
                        this.chunkSize
                    );


                this.bridge.send(
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

        },


        // =================================================
        // GET DEVICE
        // =================================================

        getDevice() {

            if (
                this.transport ===
                "ble"
            ) {

                return this.device;

            }


            if (
                this.transport ===
                "serial"
            ) {

                return this.port;

            }


            if (
                this.transport ===
                "bridge"
            ) {

                return this.bridge;

            }


            return null;

        },


        // =================================================
        // GET DEVICE NAME
        // =================================================

        getDeviceName() {

            if (
                this.deviceName
            ) {

                return this.deviceName;

            }


            if (
                this.device &&
                this.device.name
            ) {

                return this.device.name;

            }


            return "";

        },


        // =================================================
        // GET TRANSPORT
        // =================================================

        getTransport() {

            return this.transport;

        },


        // =================================================
        // DISCONNECT
        // =================================================

        async disconnect() {

            console.log(
                "SmartPrint Bluetooth Disconnect"
            );


            // =============================================
            // BLE
            // =============================================

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

                console.warn(
                    "BLE disconnect:",
                    error
                );

            }


            // =============================================
            // SERIAL
            // =============================================

            try {

                if (
                    this.writer
                ) {

                    try {

                        this.writer.releaseLock();

                    }

                    catch (_) {}


                    this.writer =
                        null;

                }


                if (
                    this.port
                ) {

                    try {

                        await this.port.close();

                    }

                    catch (error) {

                        console.warn(
                            "Serial port close:",
                            error
                        );

                    }

                }

            }

            catch (error) {

                console.warn(
                    "Serial disconnect:",
                    error
                );

            }


            // =============================================
            // BRIDGE
            // =============================================

            try {

                if (
                    this.bridge
                ) {

                    this.bridge.close();

                }

            }

            catch (error) {

                console.warn(
                    "Bridge disconnect:",
                    error
                );

            }


            this.resetRuntimeState();


            this.updateStatus(
                "disconnected"
            );

        },


        // =================================================
        // DISCONNECT EVENT
        // =================================================

        attachDisconnectEvent() {

            if (
                !this.device
            ) {

                return;

            }


            this.removeDisconnectListener();


            this.disconnectHandler =
                () => {

                    console.warn(
                        "BLE Printer disconnected."
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

                };


            this.device.addEventListener(
                "gattserverdisconnected",
                this.disconnectHandler
            );

        },


        // =================================================
        // REMOVE LISTENER
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

            catch (_) {}


            this.disconnectHandler =
                null;

        },


        // =================================================
        // RESET RUNTIME
        // =================================================

        resetRuntimeState() {

            this.connected =
                false;

            this.connecting =
                false;

            this.writing =
                false;

            this.server =
                null;

            this.writeCharacteristic =
                null;

            this.writer =
                null;

            this.port =
                null;

            this.bridge =
                null;

            this.bridgeConnected =
                false;

            this.transport =
                null;

        },


        // =================================================
        // SAVE DEVICE
        // =================================================

        saveDevice() {

            try {

                if (
                    this.device
                ) {

                    if (
                        this.device.name
                    ) {

                        localStorage.setItem(
                            "SMARTPRINT_PRINTER_NAME",
                            this.device.name
                        );

                    }


                    if (
                        this.device.id
                    ) {

                        localStorage.setItem(
                            "SMARTPRINT_PRINTER_ID",
                            this.device.id
                        );

                    }

                }


                if (
                    this.deviceName
                ) {

                    localStorage.setItem(
                        "SMARTPRINT_PRINTER_NAME",
                        this.deviceName
                    );

                }


                if (
                    this.transport
                ) {

                    localStorage.setItem(
                        "SMARTPRINT_PRINTER_TRANSPORT",
                        this.transport
                    );

                }

            }

            catch (error) {

                console.warn(
                    "Gagal menyimpan printer:",
                    error
                );

            }

        },


        // =================================================
        // CLEAR SAVED PRINTER
        // =================================================

        clearSavedPrinter() {

            try {

                localStorage.removeItem(
                    "SMARTPRINT_PRINTER_NAME"
                );

                localStorage.removeItem(
                    "SMARTPRINT_PRINTER_ID"
                );

                localStorage.removeItem(
                    "SMARTPRINT_PRINTER_TRANSPORT"
                );

            }

            catch (error) {

                console.warn(
                    "Gagal menghapus printer:",
                    error
                );

            }


            console.log(
                "Saved printer cleared."
            );

        },


        // =================================================
        // GET SAVED
        // =================================================

        getSaved(key) {

            try {

                return localStorage.getItem(
                    key
                );

            }

            catch (_) {

                return null;

            }

        },


        // =================================================
        // GET SAVED TRANSPORT
        // =================================================

        getSavedTransport() {

            return this.getSaved(
                "SMARTPRINT_PRINTER_TRANSPORT"
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


            if (
                status
            ) {

                status.textContent =
                    text;

            }


            if (
                printerStatus
            ) {

                printerStatus.textContent =
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


        // =================================================
        // ERROR
        // =================================================

        setError(message) {

            console.error(
                "SmartPrint Bluetooth:",
                message
            );


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
    // LEGACY
    // =====================================================

    window.connectPrinter =
        function () {

            return Bluetooth.connectUser();

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
        "========================================"
    );

    console.log(
        "SmartPrint Bluetooth Engine v5.3 Ready"
    );

    console.log(
        "Transport: BLE + Serial + Classic Bridge"
    );

    console.log(
        "========================================"
    );

})();
