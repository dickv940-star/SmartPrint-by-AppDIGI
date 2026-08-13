"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.2
=====================================================

 FIX v5.2
 ----------------------------------------------------
 ✓ BLE Web Bluetooth
 ✓ Bluetooth Classic via Web Serial / COM
 ✓ Local Bridge
 ✓ Auto reconnect BLE
 ✓ Saved printer
 ✓ GATT discovery
 ✓ Write characteristic detection
 ✓ BLE chunking
 ✓ Serial chunking
 ✓ Bridge chunking
 ✓ ESC / TSPL / ZPL / CPCL raw data
 ✓ PrinterManager v4 compatible
 ✓ Legacy connectPrinter()
 ✓ Cancel picker bukan error
 ✓ NO automatic BLE → Serial fallback
 ✓ requestPort() hanya dari user gesture
 ✓ requestDevice() hanya dari user gesture
 ✓ autoConnect() tidak membuka picker
=====================================================
*/

(function () {

    const Bluetooth = {

        // =================================================
        // CONFIG
        // =================================================

        version: "5.2.0",

        mode: "auto",

        bridgeURL: "ws://127.0.0.1:8765",

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
        // CONNECT
        // =================================================

        async connect() {

            /*
            IMPORTANT

            Jangan melakukan:

            BLE → Serial

            secara otomatis.

            requestPort() membutuhkan user gesture.
            */

            if (this.connecting) {

                console.warn(
                    "Bluetooth connection sedang berjalan."
                );

                return false;

            }


            this.connecting = true;

            this.updateStatus("connecting");


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT BLUETOOTH ENGINE v5.2"
            );

            console.log(
                "========================================"
            );

            console.log(
                "Capabilities:",
                this.getCapabilities()
            );


            try {

                /*
                =============================================
                MODE BLE
                =============================================
                */

                if (this.mode === "ble") {

                    return await this.finishUserConnect(
                        await this.connectBLE()
                    );

                }


                /*
                =============================================
                MODE SERIAL
                =============================================

                Dipanggil hanya jika tombol memang meminta
                Serial / COM.
                */

                if (this.mode === "serial") {

                    return await this.finishUserConnect(
                        await this.connectSerial()
                    );

                }


                /*
                =============================================
                MODE BRIDGE
                =============================================
                */

                if (this.mode === "bridge") {

                    return await this.finishUserConnect(
                        await this.connectBridge()
                    );

                }


                /*
                =============================================
                AUTO MODE
                =============================================

                AUTO MODE HANYA BLE.

                Tidak boleh memanggil requestPort()
                karena autoConnect tidak memiliki
                user gesture.
                */

                if (
                    this.mode === "auto" &&
                    this.isBluetoothSupported()
                ) {

                    console.log(
                        "AUTO MODE → Web Bluetooth BLE"
                    );

                    const result =
                        await this.connectBLE();


                    if (result) {

                        this.connecting = false;

                        return true;

                    }


                    /*
                    BLE dibatalkan / gagal.

                    STOP.

                    Jangan mencoba requestPort().
                    */

                    console.log(
                        "BLE tidak terhubung."
                    );

                    console.log(
                        "Serial harus dipilih melalui koneksi manual."
                    );

                    this.connecting = false;

                    this.updateStatus(
                        "disconnected"
                    );

                    return false;

                }


                this.connecting = false;

                this.updateStatus(
                    "disconnected"
                );

                return false;

            }

            catch (error) {

                console.error(
                    "Bluetooth Connect Error:",
                    error
                );


                this.resetConnectionState();


                if (
                    error &&
                    (
                        error.name === "NotFoundError" ||
                        error.name === "AbortError"
                    )
                ) {

                    console.warn(
                        "Pemilihan perangkat dibatalkan."
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

                this.connecting = false;

            }

        },


        // =================================================
        // USER CONNECT
        // =================================================

        async connectUser(type = "auto") {

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
                "SMARTPRINT USER CONNECT v5.2"
            );

            console.log(
                "TYPE:",
                type
            );

            console.log(
                "========================================"
            );


            try {

                /*
                =============================================
                BLE
                =============================================
                */

                if (type === "ble") {

                    const result =
                        await this.connectBLE();


                    this.connecting = false;

                    return result;

                }


                /*
                =============================================
                SERIAL
                =============================================

                requestPort() HARUS dipanggil langsung
                dalam event klik.

                Jangan melalui autoConnect().
                */

                if (type === "serial") {

                    console.log(
                        "USER → Web Serial / Bluetooth COM"
                    );


                    const result =
                        await this.connectSerial();


                    this.connecting = false;

                    return result;

                }


                /*
                =============================================
                BRIDGE
                =============================================
                */

                if (type === "bridge") {

                    const result =
                        await this.connectBridge();


                    this.connecting = false;

                    return result;

                }


                /*
                =============================================
                AUTO USER

                Untuk kompatibilitas tombol lama.

                Prioritas:
                BLE saja.

                TIDAK fallback ke Serial.
                =============================================
                */

                const result =
                    await this.connectBLE();


                this.connecting = false;

                return result;

            }

            catch (error) {

                console.error(
                    "User Bluetooth Connect Error:",
                    error
                );


                this.resetConnectionState();


                if (
                    error &&
                    (
                        error.name === "NotFoundError" ||
                        error.name === "AbortError"
                    )
                ) {

                    console.warn(
                        "Pemilihan printer dibatalkan."
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

                this.connecting = false;

            }

        },


        // =================================================
        // FINISH USER CONNECT
        // =================================================

        async finishUserConnect(result) {

            this.connecting = false;

            if (result) {

                this.updateStatus(
                    "connected"
                );

            }
            else {

                this.updateStatus(
                    "disconnected"
                );

            }

            return !!result;

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

                        acceptAllDevices: true,

                        optionalServices:
                            this.services

                    });

            }

            catch (error) {

                if (
                    error &&
                    (
                        error.name === "NotFoundError" ||
                        error.name === "AbortError"
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
                device.name || "Unknown"
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


            /*
            =============================================
            PASS 1

            Cari characteristic yang dikenal.
            =============================================
            */

            for (
                const service of services
            ) {

                let characteristics = [];


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

                    const properties =
                        characteristic.properties || {};


                    const canWrite =
                        properties.write ||
                        properties.writeWithoutResponse;


                    if (!canWrite) {

                        continue;

                    }


                    console.log(
                        "CHARACTERISTIC:",
                        characteristic.uuid,
                        properties
                    );


                    if (
                        this.characteristics.includes(
                            characteristic.uuid.toLowerCase()
                        )
                    ) {

                        this.writeCharacteristic =
                            characteristic;

                        break;

                    }

                }


                if (
                    this.writeCharacteristic
                ) {

                    break;

                }

            }


            /*
            =============================================
            PASS 2

            Jika characteristic khusus tidak ditemukan,
            gunakan characteristic write pertama.
            =============================================
            */

            if (
                !this.writeCharacteristic
            ) {

                for (
                    const service of services
                ) {

                    let characteristics = [];


                    try {

                        characteristics =
                            await service.getCharacteristics();

                    }

                    catch (_) {

                        continue;

                    }


                    for (
                        const characteristic
                        of characteristics
                    ) {

                        const properties =
                            characteristic.properties || {};


                        if (
                            properties.write ||
                            properties.writeWithoutResponse
                        ) {

                            this.writeCharacteristic =
                                characteristic;

                            break;

                        }

                    }


                    if (
                        this.writeCharacteristic
                    ) {

                        break;

                    }

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

                /*
                IMPORTANT:

                requestPort() HARUS berasal dari
                user gesture.

                Fungsi ini jangan dipanggil oleh
                autoConnect().
                */

                port =
                    await navigator.serial.requestPort();

            }

            catch (error) {

                if (
                    error &&
                    (
                        error.name === "NotFoundError" ||
                        error.name === "AbortError"
                    )
                ) {

                    console.warn(
                        "Serial device picker dibatalkan."
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


            this.transport =
                "serial";


            this.deviceName =
                "Bluetooth Serial Printer";


            this.connected =
                true;


            this.saveDevice();


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


            console.log(
                "Connecting SmartPrint Bridge:",
                this.bridgeURL
            );


            return new Promise(
                resolve => {

                    let finished = false;


                    const finish =
                        result => {

                            if (finished) {

                                return;

                            }


                            finished = true;

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


                            this.saveDevice();


                            this.updateStatus(
                                "connected"
                            );


                            console.log(
                                "SmartPrint Bridge Connected."
                            );


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


            let savedTransport = null;


            try {

                savedTransport =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_TRANSPORT"
                    );

            }

            catch (_) {}


            /*
            =============================================
            BLE AUTO CONNECT

            getDevices() tidak membutuhkan picker.
            =============================================
            */

            if (
                savedTransport === "ble" &&
                this.isBluetoothSupported() &&
                typeof navigator.bluetooth.getDevices ===
                "function"
            ) {

                try {

                    const devices =
                        await navigator.bluetooth.getDevices();


                    const savedId =
                        localStorage.getItem(
                            "SMARTPRINT_PRINTER_ID"
                        );


                    const savedName =
                        localStorage.getItem(
                            "SMARTPRINT_PRINTER_NAME"
                        );


                    let device = null;


                    if (savedId) {

                        device =
                            devices.find(
                                item =>
                                    item.id === savedId
                            );

                    }


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


                    if (device) {

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

                    this.resetConnectionState();

                }

            }


            /*
            =============================================
            BRIDGE AUTO CONNECT

            Aman karena tidak membutuhkan picker.
            =============================================
            */

            if (
                savedTransport === "bridge"
            ) {

                try {

                    const result =
                        await this.connectBridge(true);


                    if (result) {

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
            =============================================
            SERIAL

            JANGAN requestPort().

            Browser membutuhkan user gesture.
            =============================================
            */

            if (
                savedTransport === "serial"
            ) {

                console.log(
                    "Saved Bluetooth Classic printer ditemukan."
                );

                console.log(
                    "Serial Auto Connect dilewati."
                );

                console.log(
                    "Menunggu tombol Connect."
                );

            }


            return false;

        },


        // =================================================
        // RECONNECT
        // =================================================

        async reconnect() {

            if (
                this.transport === "ble" &&
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

                    this.connecting =
                        false;

                }

            }


            if (
                this.transport === "bridge"
            ) {

                return this.connectBridge();

            }


            if (
                this.transport === "serial"
            ) {

                console.warn(
                    "Serial reconnect membutuhkan tombol user."
                );

                return false;

            }


            return false;

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            if (!this.connected) {

                return false;

            }


            if (
                this.transport === "ble"
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


            if (
                this.transport === "serial"
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


            if (
                this.transport === "bridge"
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
                    this.toUint8Array(data);


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
                    this.transport === "ble"
                ) {

                    await this.writeBLE(bytes);

                }

                else if (
                    this.transport === "serial"
                ) {

                    await this.writeSerial(bytes);

                }

                else if (
                    this.transport === "bridge"
                ) {

                    await this.writeBridge(bytes);

                }

                else {

                    throw new Error(
                        "Transport tidak dikenal."
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

                return new Uint8Array(data);

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

            if (
                !this.port
            ) {

                throw new Error(
                    "Serial port tidak tersedia."
                );

            }


            if (
                !this.port.writable
            ) {

                throw new Error(
                    "Serial port tidak dapat ditulis."
                );

            }


            if (
                !this.writer
            ) {

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


                const end =
                    Math.min(
                        offset + this.chunkSize,
                        bytes.length
                    );


                const percent =
                    Math.round(
                        (end / bytes.length) * 100
                    );


                console.log(
                    "Serial Print:",
                    percent + "%"
                );

            }


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

        },


        // =================================================
        // GET DEVICE
        // =================================================

        getDevice() {

            if (
                this.transport === "ble"
            ) {

                return this.device;

            }


            if (
                this.transport === "serial"
            ) {

                return this.port;

            }


            if (
                this.transport === "bridge"
            ) {

                return this.bridge;

            }


            return null;

        },


        // =================================================
        // DEVICE NAME
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
        // TRANSPORT
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


            try {

                if (
                    this.device &&
                    this.device.gatt &&
                    this.device.gatt.connected
                ) {

                    this.device.gatt.disconnect();

                }

            }

            catch (_) {}


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

                    await this.port.close();

                }

            }

            catch (error) {

                console.warn(
                    "Serial disconnect:",
                    error
                );

            }


            try {

                if (
                    this.bridge
                ) {

                    this.bridge.close();

                }

            }

            catch (_) {}


            this.resetConnectionState();


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
        // RESET
        // =================================================

        resetConnectionState() {

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

                    localStorage.setItem(
                        "SMARTPRINT_PRINTER_NAME",
                        this.device.name || ""
                    );


                    localStorage.setItem(
                        "SMARTPRINT_PRINTER_ID",
                        this.device.id || ""
                    );

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
        // CLEAR SAVED
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

            catch (_) {}


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
        "========================================"
    );

    console.log(
        "SmartPrint Bluetooth Engine v5.2 Ready"
    );

    console.log(
        "Transport: BLE + Serial + Classic Bridge"
    );

    console.log(
        "========================================"
    );

})();
