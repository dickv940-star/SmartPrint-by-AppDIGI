"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.0
=====================================================

 TRANSPORT
 ----------------------------------------------------
 ✓ BLE / Web Bluetooth
 ✓ Bluetooth Classic / SPP via Web Serial COM
 ✓ Bluetooth Classic via Local Bridge
 ✓ Auto reconnect BLE
 ✓ Auto reconnect Bridge
 ✓ Manual user connection
 ✓ Saved printer
 ✓ GATT discovery
 ✓ Write characteristic detection
 ✓ Chunking
 ✓ Delay
 ✓ ESC / TSPL / ZPL / CPCL compatible
 ✓ PrinterManager compatible
 ✓ Legacy connectPrinter() compatible

 IMPORTANT
 ----------------------------------------------------
 Web Bluetooth
   → BLE / GATT ONLY

 Bluetooth Classic / SPP
   Windows
     → Web Serial / COM

 Android / Classic Bluetooth
     → SmartPrint Local Bridge

 requestDevice()
 requestPort()

 HARUS dipanggil dari user gesture.

 Auto Connect:
   → Tidak membuka picker.
   → Hanya menggunakan saved permission/device.
=====================================================
*/

(function () {

    "use strict";


    const Bluetooth = {

        // =================================================
        // CONFIG
        // =================================================

        version: "5.0.0",

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

        initialized: false,


        // =================================================
        // INIT
        // =================================================

        init() {

            if (this.initialized) {

                return;

            }

            this.initialized = true;

            console.log(
                "========================================"
            );

            console.log(
                "SmartPrint Bluetooth Engine v5.0"
            );

            console.log(
                "========================================"
            );

            console.log(
                "Capabilities:",
                this.getCapabilities()
            );

        },


        // =================================================
        // CAPABILITIES
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
        // AUTO CONNECT
        // =================================================

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

                /*
                =================================================
                MODE AUTO
                =================================================
                */

                if (this.mode === "auto") {

                    /*
                    ---------------------------------------------
                    1. RESTORE SAVED BLE
                    ---------------------------------------------
                    */

                    const ble =
                        await this.autoConnectBLE();

                    if (ble) {

                        return true;

                    }


                    /*
                    ---------------------------------------------
                    2. RESTORE BRIDGE
                    ---------------------------------------------
                    */

                    const bridge =
                        await this.autoConnectBridge();

                    if (bridge) {

                        return true;

                    }


                    /*
                    ---------------------------------------------
                    3. SERIAL
                    ---------------------------------------------
                    */

                    /*
                    Web Serial requestPort()
                    TIDAK BOLEH otomatis.

                    User harus memanggil:

                    Bluetooth.connectUser()

                    */

                    console.log(
                        "Serial menunggu koneksi manual."
                    );


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                /*
                =================================================
                MANUAL MODE
                =================================================
                */

                if (this.mode === "ble") {

                    return await this.connectBLE();

                }


                if (this.mode === "serial") {

                    console.warn(
                        "Serial harus menggunakan connectUser()."
                    );

                    return false;

                }


                if (this.mode === "bridge") {

                    return await this.connectBridge();

                }


                throw new Error(
                    "Mode Bluetooth tidak dikenal: " +
                    this.mode
                );

            }

            catch (error) {

                console.error(
                    "Bluetooth Connect Error:",
                    error
                );


                this.handleConnectionError(
                    error
                );


                return false;

            }

            finally {

                this.connecting =
                    false;

            }

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


            try {

                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT USER CONNECT v5"
                );

                console.log(
                    "========================================"
                );


                /*
                =================================================
                1. BLE
                =================================================
                */

                if (
                    this.isBluetoothSupported()
                ) {

                    console.log(
                        "User Connect → BLE"
                    );


                    const ble =
                        await this.connectBLE();


                    if (ble) {

                        this.saveDevice();

                        return true;

                    }

                }


                /*
                =================================================
                2. SERIAL
                =================================================
                */

                if (
                    this.isSerialSupported()
                ) {

                    console.log(
                        "User Connect → Serial / COM"
                    );


                    const serial =
                        await this.connectSerial();


                    if (serial) {

                        this.saveDevice();

                        return true;

                    }

                }


                /*
                =================================================
                3. BRIDGE
                =================================================
                */

                if (
                    this.isBridgeSupported()
                ) {

                    console.log(
                        "User Connect → Local Bridge"
                    );


                    const bridge =
                        await this.connectBridge();


                    if (bridge) {

                        this.saveDevice();

                        return true;

                    }

                }


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

            catch (error) {

                console.error(
                    "User Connect Error:",
                    error
                );


                this.handleConnectionError(
                    error
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


            let device;


            try {

                device =
                    await navigator.bluetooth.requestDevice({

                        acceptAllDevices: true,

                        optionalServices:
                            this.services

                    });

            }

            catch (error) {

                if (
                    error &&
                    error.name === "NotFoundError"
                ) {

                    console.warn(
                        "BLE picker dibatalkan."
                    );

                    this.updateStatus(
                        "disconnected"
                    );

                    return false;

                }


                throw error;

            }


            if (!device) {

                return false;

            }


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
        // BLE AUTO CONNECT
        // =================================================

        async autoConnectBLE() {

            if (
                !this.isBluetoothSupported()
            ) {

                return false;

            }


            if (
                typeof navigator.bluetooth.getDevices !==
                "function"
            ) {

                return false;

            }


            const savedTransport =
                this.getSaved(
                    "SMARTPRINT_PRINTER_TRANSPORT"
                );


            if (
                savedTransport &&
                savedTransport !== "ble"
            ) {

                return false;

            }


            try {

                const devices =
                    await navigator.bluetooth.getDevices();


                if (
                    !devices ||
                    !devices.length
                ) {

                    return false;

                }


                const savedID =
                    this.getSaved(
                        "SMARTPRINT_PRINTER_ID"
                    );


                const savedName =
                    this.getSaved(
                        "SMARTPRINT_PRINTER_NAME"
                    );


                let device = null;


                /*
                ---------------------------------------------
                PRIORITAS ID
                ---------------------------------------------
                */

                if (savedID) {

                    device =
                        devices.find(
                            item =>
                                item.id === savedID
                        );

                }


                /*
                ---------------------------------------------
                FALLBACK NAME
                ---------------------------------------------
                */

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


                if (!device) {

                    return false;

                }


                console.log(
                    "BLE Saved Device:",
                    device.name
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
                    this.deviceName
                );


                return true;

            }

            catch (error) {

                console.warn(
                    "BLE Auto Connect gagal:",
                    error
                );


                this.connected =
                    false;


                return false;

            }

        },


        // =================================================
        // GATT CONNECT
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


            /*
            =================================================
            SERVICE DISCOVERY
            =================================================
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
                    PRIORITAS CHARACTERISTIC DIKENAL
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
                    FALLBACK
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


            let port;


            try {

                /*
                IMPORTANT:
                requestPort harus dipanggil
                langsung dari user gesture.
                */

                port =
                    await navigator.serial.requestPort();

            }

            catch (error) {

                if (
                    error &&
                    error.name === "NotFoundError"
                ) {

                    console.warn(
                        "Serial picker dibatalkan."
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


            this.port =
                port;


            this.writer =
                port.writable
                    ? port.writable.getWriter()
                    : null;


            if (!this.writer) {

                await port.close();

                this.port =
                    null;

                throw new Error(
                    "Serial writer tidak tersedia."
                );

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


            /*
            Jangan membuka bridge kedua
            jika sudah connected.
            */

            if (
                this.bridge &&
                this.bridge.readyState ===
                WebSocket.OPEN
            ) {

                this.bridgeConnected =
                    true;

                this.connected =
                    true;

                this.transport =
                    "bridge";

                return true;

            }


            if (!silent) {

                console.log(
                    "Connecting SmartPrint Bridge:",
                    this.bridgeURL
                );

            }


            return new Promise(
                resolve => {

                    let finished =
                        false;

                    let socket =
                        null;

                    let timeout =
                        null;


                    const finish =
                        result => {

                            if (finished) {

                                return;

                            }


                            finished =
                                true;


                            if (timeout) {

                                clearTimeout(
                                    timeout
                                );

                            }


                            resolve(
                                result
                            );

                        };


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


                    socket.binaryType =
                        "arraybuffer";


                    timeout =
                        setTimeout(
                            () => {

                                try {

                                    socket.close();

                                }

                                catch (_) {}


                                if (!silent) {

                                    console.warn(
                                        "SmartPrint Bridge timeout."
                                    );

                                }


                                finish(false);

                            },
                            this.bridgeTimeout
                        );


                    socket.onopen =
                        () => {

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

                            if (!silent) {

                                console.warn(
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
                                this.bridge ===
                                socket
                            ) {

                                this.bridge =
                                    null;

                            }


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
        // BRIDGE AUTO CONNECT
        // =================================================

        async autoConnectBridge() {

            if (
                !this.isBridgeSupported()
            ) {

                return false;

            }


            const savedTransport =
                this.getSaved(
                    "SMARTPRINT_PRINTER_TRANSPORT"
                );


            if (
                savedTransport !== "bridge"
            ) {

                return false;

            }


            try {

                return await this.connectBridge(
                    true
                );

            }

            catch (error) {

                console.warn(
                    "Bridge Auto Connect gagal:",
                    error
                );

                return false;

            }

        },


        // =================================================
        // RECONNECT
        // =================================================

        async reconnect() {

            if (this.connecting) {

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                /*
                =================================================
                BLE
                =================================================
                */

                if (
                    this.transport === "ble" &&
                    this.device
                ) {

                    try {

                        await this.connectGATT();


                        this.connected =
                            true;


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


                /*
                =================================================
                BRIDGE
                =================================================
                */

                if (
                    this.transport === "bridge"
                ) {

                    return await this.connectBridge(
                        true
                    );

                }


                /*
                =================================================
                SAVED TRANSPORT
                =================================================
                */

                const result =
                    await this.connect();


                return result;

            }

            finally {

                this.connecting =
                    false;

            }

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            /*
            ---------------------------------------------
            BLE
            ---------------------------------------------
            */

            if (
                this.transport === "ble"
            ) {

                const state =
                    !!(
                        this.connected &&
                        this.device &&
                        this.device.gatt &&
                        this.device.gatt.connected &&
                        this.writeCharacteristic
                    );


                this.connected =
                    state;


                return state;

            }


            /*
            ---------------------------------------------
            SERIAL
            ---------------------------------------------
            */

            if (
                this.transport === "serial"
            ) {

                const state =
                    !!(
                        this.connected &&
                        this.port &&
                        this.port.writable &&
                        this.writer
                    );


                this.connected =
                    state;


                return state;

            }


            /*
            ---------------------------------------------
            BRIDGE
            ---------------------------------------------
            */

            if (
                this.transport === "bridge"
            ) {

                const state =
                    !!(
                        this.connected &&
                        this.bridge &&
                        this.bridge.readyState ===
                        WebSocket.OPEN
                    );


                this.connected =
                    state;


                return state;

            }


            return false;

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


            if (this.writing) {

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


                switch (
                    this.transport
                ) {

                    case "ble":

                        await this.writeBLE(
                            bytes
                        );

                        break;


                    case "serial":

                        await this.writeSerial(
                            bytes
                        );

                        break;


                    case "bridge":

                        await this.writeBridge(
                            bytes
                        );

                        break;


                    default:

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
                typeof data === "string"
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
                    "BLE Write Characteristic tidak tersedia."
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
                        offset + this.chunkSize
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

            }


            console.log(
                "Serial data sent:",
                bytes.length,
                "bytes"
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
                        offset + this.chunkSize
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


            return true;

        },


        // =================================================
        // DISCONNECT
        // =================================================

        async disconnect() {

            console.log(
                "SmartPrint Bluetooth Disconnect"
            );


            /*
            =================================================
            BLE
            =================================================
            */

            try {

                this.removeDisconnectListener();


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


            /*
            =================================================
            SERIAL
            =================================================
            */

            try {

                if (this.writer) {

                    try {

                        this.writer.releaseLock();

                    }

                    catch (_) {}


                    this.writer =
                        null;

                }


                if (this.port) {

                    await this.port.close();

                }

            }

            catch (error) {

                console.warn(
                    "Serial disconnect:",
                    error
                );

            }


            /*
            =================================================
            BRIDGE
            =================================================
            */

            try {

                if (this.bridge) {

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

            if (!this.device) {

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

                if (this.device) {

                    localStorage.setItem(
                        "SMARTPRINT_PRINTER_ID",
                        this.device.id || ""
                    );


                    if (this.device.name) {

                        localStorage.setItem(
                            "SMARTPRINT_PRINTER_NAME",
                            this.device.name
                        );

                    }

                }


                if (this.deviceName) {

                    localStorage.setItem(
                        "SMARTPRINT_PRINTER_NAME",
                        this.deviceName
                    );

                }


                if (this.transport) {

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
        // GET DEVICE
        // =================================================

        getDevice() {

            switch (
                this.transport
            ) {

                case "ble":

                    return this.device;

                case "serial":

                    return this.port;

                case "bridge":

                    return this.bridge;

                default:

                    return null;

            }

        },


        // =================================================
        // GET DEVICE NAME
        // =================================================

        getDeviceName() {

            if (this.deviceName) {

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


                case "error":

                    text =
                        "Bluetooth Error";

                    break;


                case "disconnected":

                default:

                    text =
                        "No Printer";

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
        // ERROR HANDLER
        // =================================================

        handleConnectionError(error) {

            this.connected =
                false;


            if (
                error &&
                error.name ===
                "NotFoundError"
            ) {

                console.warn(
                    "Pemilihan printer dibatalkan pengguna."
                );


                this.updateStatus(
                    "disconnected"
                );


                return;

            }


            console.error(
                "SmartPrint Bluetooth:",
                error
            );


            this.updateStatus(
                "error"
            );

        },


        // =================================================
        // LOCAL STORAGE GET
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
    // INIT
    // =====================================================

    Bluetooth.init();


    console.log(
        "SmartPrint Bluetooth Engine v5.0 Ready"
    );

    console.log(
        "Transport: BLE + Serial + Classic Bridge"
    );

})();
