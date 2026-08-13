"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.4
=====================================================

 ROLE
 ----------------------------------------------------
 Bluetooth / Serial Transport Layer ONLY

 TIDAK MENANGANI:
 ----------------------------------------------------
 - Preview
 - Canvas
 - Barcode
 - QR
 - TSPL
 - ESC/POS
 - ZPL
 - CPCL

 SUPPORT
 ----------------------------------------------------
 ✓ Web Bluetooth BLE
 ✓ Web Serial
 ✓ RAW Uint8Array
 ✓ ArrayBuffer
 ✓ Binary String
 ✓ Chunked transmission
 ✓ Auto Connect
 ✓ Manual Connect
 ✓ Disconnect
 ✓ Connection Status
 ✓ Printer Manager compatible

 IMPORTANT
 ----------------------------------------------------
 TSPL Engine berada di tspl.js
 Printer Manager berada di printer.js

 FLOW
 ----------------------------------------------------

 TSPL
   ↓
 Uint8Array
   ↓
 PrinterManager
   ↓
 Bluetooth.sendRaw()
   ↓
 Bluetooth transport
   ↓
 Printer

=====================================================
*/


const Bluetooth = (() => {

    const VERSION = "5.4";


    /*
    =================================================
     DEFAULT CONFIG
    =================================================
    */

    const DEFAULTS = {

        chunkSize: 180,

        chunkDelay: 8,

        connectTimeout: 15000,

        writeTimeout: 10000,

        autoConnect: true,

        preferredTransport: "ble"

    };


    /*
    =================================================
     STATE
    =================================================
    */

    const state = {

        connected: false,

        connecting: false,

        transport: null,

        device: null,

        server: null,

        service: null,

        characteristic: null,

        writer: null,

        port: null,

        lastError: null,

        lastTransport: null,

        lastWriteBytes: 0,

        lastWriteTime: 0,

        autoConnected: false

    };


    /*
    =================================================
     EVENT SYSTEM
    =================================================
    */

    const listeners = {

        connect: [],

        disconnect: [],

        error: [],

        data: [],

        status: []

    };


    function emit(
        event,
        data
    ) {

        const list =
            listeners[event];

        if (!list) {

            return;

        }


        for (
            const callback of list
        ) {

            try {

                callback(data);

            } catch (error) {

                console.error(
                    "Bluetooth event error:",
                    error
                );

            }

        }

    }


    function on(
        event,
        callback
    ) {

        if (
            !listeners[event]
        ) {

            throw new Error(
                "Bluetooth: event tidak dikenal: " +
                event
            );

        }


        if (
            typeof callback !==
            "function"
        ) {

            return false;

        }


        listeners[event].push(
            callback
        );


        return true;

    }


    function off(
        event,
        callback
    ) {

        if (
            !listeners[event]
        ) {

            return false;

        }


        const index =
            listeners[event].indexOf(
                callback
            );


        if (
            index !== -1
        ) {

            listeners[event].splice(
                index,
                1
            );

            return true;

        }


        return false;

    }


    /*
    =================================================
     HELPERS
    =================================================
    */

    function num(
        value,
        fallback = 0
    ) {

        const n =
            Number(value);


        return Number.isFinite(n)
            ? n
            : fallback;

    }


    function sleep(
        ms
    ) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    Math.max(
                        0,
                        num(ms)
                    )
                )
        );

    }


    function getConfig(
        options = {}
    ) {

        return {

            chunkSize:
                Math.max(
                    20,
                    Math.floor(
                        num(
                            options.chunkSize,
                            DEFAULTS.chunkSize
                        )
                    )
                ),

            chunkDelay:
                Math.max(
                    0,
                    num(
                        options.chunkDelay,
                        DEFAULTS.chunkDelay
                    )
                ),

            connectTimeout:
                Math.max(
                    1000,
                    num(
                        options.connectTimeout,
                        DEFAULTS.connectTimeout
                    )
                ),

            writeTimeout:
                Math.max(
                    1000,
                    num(
                        options.writeTimeout,
                        DEFAULTS.writeTimeout
                    )
                )

        };

    }


    /*
    =================================================
     STATUS
    =================================================
    */

    function getStatus() {

        return {

            version:
                VERSION,

            connected:
                state.connected,

            connecting:
                state.connecting,

            transport:
                state.transport,

            device:
                state.device
                    ? {
                        id:
                            state.device.id || null,

                        name:
                            state.device.name || null
                    }
                    : null,

            port:
                state.port
                    ? true
                    : false,

            lastTransport:
                state.lastTransport,

            lastWriteBytes:
                state.lastWriteBytes,

            lastWriteTime:
                state.lastWriteTime,

            lastError:
                state.lastError

        };

    }


    function setConnected(
        value,
        transport = null
    ) {

        state.connected =
            value === true;

        state.transport =
            state.connected
                ? transport
                : null;


        emit(
            "status",
            getStatus()
        );

    }


    /*
    =================================================
     DATA NORMALIZER
    =================================================
    */

    function toUint8Array(
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
            ArrayBuffer.isView(data)
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

            const result =
                new Uint8Array(
                    data.length
                );


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                result[i] =
                    data.charCodeAt(i) &
                    0xFF;

            }


            return result;

        }


        if (
            Array.isArray(data)
        ) {

            return new Uint8Array(
                data
            );

        }


        throw new Error(
            "Bluetooth: data harus Uint8Array, ArrayBuffer, View, Array, atau binary string."
        );

    }


    /*
    =================================================
     WEB BLUETOOTH SUPPORT
    =================================================
    */

    function supportedBLE() {

        return (
            typeof navigator !==
            "undefined" &&
            "bluetooth" in navigator
        );

    }


    /*
    =================================================
     BLE DEVICE REQUEST
    =================================================
     */

    async function requestBLEDevice(
        options = {}
    ) {

        if (
            !supportedBLE()
        ) {

            throw new Error(
                "Web Bluetooth tidak tersedia pada browser ini."
            );

        }


        const filters =
            options.filters ||
            null;


        const optionalServices =
            options.optionalServices ||
            [];


        let requestOptions;


        /*
         * User dapat memberikan
         * filter custom dari Printer Manager.
         */

        if (
            Array.isArray(filters) &&
            filters.length
        ) {

            requestOptions = {

                filters,

                optionalServices

            };

        } else {

            /*
             * Tanpa filter:
             *
             * tampilkan device Bluetooth
             * yang tersedia.
             */

            requestOptions = {

                acceptAllDevices: true,

                optionalServices

            };

        }


        const device =
            await navigator.bluetooth.requestDevice(
                requestOptions
            );


        if (!device) {

            throw new Error(
                "Bluetooth: device tidak dipilih."
            );

        }


        return device;

    }


    /*
    =================================================
     FIND WRITE CHARACTERISTIC
    =================================================
     */

    async function findWritableCharacteristic(
        server,
        options = {}
    ) {

        if (!server) {

            throw new Error(
                "Bluetooth: GATT server tidak tersedia."
            );

        }


        /*
         * Jika UUID diberikan,
         * prioritaskan UUID tersebut.
         */

        if (
            options.serviceUUID &&
            options.characteristicUUID
        ) {

            const service =
                await server.getPrimaryService(
                    options.serviceUUID
                );


            const characteristic =
                await service.getCharacteristic(
                    options.characteristicUUID
                );


            return {

                service,

                characteristic

            };

        }


        /*
         * Ambil semua primary services.
         */

        const services =
            await server.getPrimaryServices();


        for (
            const service of services
        ) {

            let characteristics;


            try {

                characteristics =
                    await service.getCharacteristics();

            } catch (error) {

                continue;

            }


            for (
                const characteristic
                of characteristics
            ) {

                const properties =
                    characteristic.properties ||
                    {};


                if (
                    properties.write ||
                    properties.writeWithoutResponse
                ) {

                    return {

                        service,

                        characteristic

                    };

                }

            }

        }


        throw new Error(
            "Bluetooth: tidak ditemukan characteristic WRITE."
        );

    }


    /*
    =================================================
     CONNECT BLE DEVICE
    =================================================
    */

    async function connectBLE(
        device,
        options = {}
    ) {

        if (!device) {

            device =
                await requestBLEDevice(
                    options
                );

        }


        state.connecting =
            true;

        state.lastError =
            null;


        emit(
            "status",
            getStatus()
        );


        try {

            /*
             * Device disconnect event.
             */

            if (
                typeof device.addEventListener ===
                "function"
            ) {

                device.removeEventListener(
                    "gattserverdisconnected",
                    handleDeviceDisconnected
                );


                device.addEventListener(
                    "gattserverdisconnected",
                    handleDeviceDisconnected
                );

            }


            const server =
                await device.gatt.connect();


            const found =
                await findWritableCharacteristic(
                    server,
                    options
                );


            state.device =
                device;

            state.server =
                server;

            state.service =
                found.service;

            state.characteristic =
                found.characteristic;

            state.port =
                null;

            state.writer =
                null;


            const characteristic =
                state.characteristic;


            const properties =
                characteristic.properties ||
                {};


            state.lastTransport =
                properties.writeWithoutResponse
                    ? "ble-writeWithoutResponse"
                    : "ble-write";


            setConnected(
                true,
                "ble"
            );


            state.connecting =
                false;

            state.autoConnected =
                false;


            emit(
                "connect",
                getStatus()
            );


            return getStatus();

        } catch (error) {

            state.connecting =
                false;

            state.connected =
                false;

            state.lastError =
                error;


            emit(
                "error",
                error
            );


            emit(
                "status",
                getStatus()
            );


            throw error;

        }

    }


    /*
    =================================================
     DEVICE DISCONNECTED EVENT
    =================================================
    */

    function handleDeviceDisconnected() {

        state.connected =
            false;

        state.server =
            null;

        state.service =
            null;

        state.characteristic =
            null;

        state.lastTransport =
            null;


        emit(
            "disconnect",
            getStatus()
        );


        emit(
            "status",
            getStatus()
        );

    }


    /*
    =================================================
     WEB SERIAL SUPPORT
    =================================================
    */

    function supportedSerial() {

        return (
            typeof navigator !==
            "undefined" &&
            "serial" in navigator
        );

    }


    /*
    =================================================
     REQUEST SERIAL PORT
    =================================================
    */

    async function requestSerialPort(
        options = {}
    ) {

        if (
            !supportedSerial()
        ) {

            throw new Error(
                "Web Serial tidak tersedia pada browser ini."
            );

        }


        const port =
            await navigator.serial.requestPort(
                options
            );


        return port;

    }


    /*
    =================================================
     CONNECT SERIAL
    =================================================
    */

    async function connectSerial(
        port,
        options = {}
    ) {

        if (!port) {

            port =
                await requestSerialPort(
                    options
                );

        }


        const baudRate =
            Math.max(
                300,
                Math.floor(
                    num(
                        options.baudRate,
                        9600
                    )
                )
            );


        state.connecting =
            true;

        state.lastError =
            null;


        try {

            await port.open({

                baudRate,

                dataBits:
                    options.dataBits || 8,

                stopBits:
                    options.stopBits || 1,

                parity:
                    options.parity || "none",

                flowControl:
                    options.flowControl || "none"

            });


            state.port =
                port;

            state.device =
                null;

            state.server =
                null;

            state.service =
                null;

            state.characteristic =
                null;


            state.lastTransport =
                "serial";


            setConnected(
                true,
                "serial"
            );


            state.connecting =
                false;


            emit(
                "connect",
                getStatus()
            );


            return getStatus();

        } catch (error) {

            state.connecting =
                false;

            state.connected =
                false;

            state.lastError =
                error;


            emit(
                "error",
                error
            );


            throw error;

        }

    }


    /*
    =================================================
     WRITE BLE CHUNK
    =================================================
    */

    async function writeBLEChunk(
        chunk,
        options = {}
    ) {

        const characteristic =
            state.characteristic;


        if (!characteristic) {

            throw new Error(
                "Bluetooth: BLE characteristic belum tersedia."
            );

        }


        const properties =
            characteristic.properties ||
            {};


        /*
         * Prioritas:
         *
         * writeWithoutResponse
         * kemudian write
         */

        if (
            properties.writeWithoutResponse &&
            typeof characteristic.writeValueWithoutResponse ===
            "function"
        ) {

            await characteristic
                .writeValueWithoutResponse(
                    chunk
                );

            return;

        }


        if (
            properties.write &&
            typeof characteristic.writeValue ===
            "function"
        ) {

            await characteristic.writeValue(
                chunk
            );

            return;

        }


        /*
         * Fallback.
         */

        if (
            typeof characteristic.writeValueWithoutResponse ===
            "function"
        ) {

            await characteristic
                .writeValueWithoutResponse(
                    chunk
                );

            return;

        }


        if (
            typeof characteristic.writeValue ===
            "function"
        ) {

            await characteristic.writeValue(
                chunk
            );

            return;

        }


        throw new Error(
            "Bluetooth: characteristic tidak memiliki fungsi WRITE."
        );

    }


    /*
    =================================================
     WRITE SERIAL CHUNK
    =================================================
    */

    async function writeSerialChunk(
        chunk
    ) {

        if (
            !state.port
        ) {

            throw new Error(
                "Bluetooth: Serial port belum tersedia."
            );

        }


        if (
            !state.port.writable
        ) {

            throw new Error(
                "Bluetooth: Serial port tidak writable."
            );

        }


        const writer =
            state.port.writable.getWriter();


        try {

            await writer.write(
                chunk
            );

        } finally {

            writer.releaseLock();

        }

    }


    /*
    =================================================
     WRITE CHUNK
    =================================================
    */

    async function writeChunk(
        chunk,
        options = {}
    ) {

        if (
            state.transport ===
            "ble"
        ) {

            return await writeBLEChunk(
                chunk,
                options
            );

        }


        if (
            state.transport ===
            "serial"
        ) {

            return await writeSerialChunk(
                chunk
            );

        }


        throw new Error(
            "Bluetooth: transport tidak tersedia."
        );

    }


    /*
    =================================================
     SEND RAW
    =================================================
    */

    async function sendRaw(
        data,
        options = {}
    ) {

        if (
            !state.connected
        ) {

            throw new Error(
                "Bluetooth: printer belum terhubung."
            );

        }


        const bytes =
            toUint8Array(
                data
            );


        if (
            bytes.length === 0
        ) {

            return {

                success: true,

                bytes: 0,

                chunks: 0

            };

        }


        const config =
            getConfig(
                options
            );


        const chunkSize =
            Math.max(
                20,
                Math.floor(
                    num(
                        options.chunkSize,
                        config.chunkSize
                    )
                )
            );


        const delay =
            Math.max(
                0,
                num(
                    options.chunkDelay,
                    config.chunkDelay
                )
            );


        let offset = 0;

        let chunks = 0;


        const started =
            performance.now();


        while (
            offset <
            bytes.length
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


            await writeChunk(
                chunk,
                options
            );


            offset =
                end;


            chunks++;


            /*
             * Delay antar chunk.
             *
             * Sangat penting untuk printer
             * BLE yang tidak mampu menerima
             * burst besar.
             */

            if (
                offset <
                bytes.length &&
                delay > 0
            ) {

                await sleep(
                    delay
                );

            }

        }


        const elapsed =
            performance.now() -
            started;


        state.lastWriteBytes =
            bytes.length;

        state.lastWriteTime =
            elapsed;


        const result = {

            success: true,

            bytes:
                bytes.length,

            chunks,

            elapsed,

            transport:
                state.transport

        };


        emit(
            "data",
            result
        );


        return result;

    }


    /*
    =================================================
     ALIASES
    =================================================
    */

    async function send(
        data,
        options = {}
    ) {

        return await sendRaw(
            data,
            options
        );

    }


    async function write(
        data,
        options = {}
    ) {

        return await sendRaw(
            data,
            options
        );

    }


    async function writeRaw(
        data,
        options = {}
    ) {

        return await sendRaw(
            data,
            options
        );

    }


    async function raw(
        data,
        options = {}
    ) {

        return await sendRaw(
            data,
            options
        );

    }


    /*
    =================================================
     CONNECT USER
    =================================================
     Compatibility:
     Printer Manager memanggil:
     Bluetooth.connectUser()
    =================================================
    */

    async function connectUser(
        options = {}
    ) {

        /*
         * Jika sudah connected,
         * langsung return.
         */

        if (
            state.connected
        ) {

            return getStatus();

        }


        /*
         * Default transport:
         * BLE
         */

        const transport =
            String(
                options.transport ||
                options.type ||
                DEFAULTS.preferredTransport
            ).toLowerCase();


        if (
            transport === "serial" ||
            transport === "com"
        ) {

            return await connectSerial(
                options.port || null,
                options
            );

        }


        return await connectBLE(
            options.device || null,
            options
        );

    }


    /*
    =================================================
     CONNECT
    =================================================
    */

    async function connect(
        options = {}
    ) {

        return await connectUser(
            options
        );

    }


    /*
    =================================================
     AUTO CONNECT
    =================================================
    */

    async function autoConnect(
        options = {}
    ) {

        /*
         * Web Bluetooth tidak menyediakan
         * requestDevice tanpa user gesture.
         *
         * Kita hanya dapat reconnect device
         * yang sudah pernah diberikan permission.
         */

        if (
            supportedBLE()
        ) {

            try {

                const devices =
                    await navigator.bluetooth
                        .getDevices();


                if (
                    Array.isArray(devices) &&
                    devices.length
                ) {

                    /*
                     * Gunakan device pertama
                     * yang tersedia.
                     */

                    const device =
                        devices[0];


                    if (
                        device.gatt
                    ) {

                        const result =
                            await connectBLE(
                                device,
                                options
                            );


                        state.autoConnected =
                            true;


                        return result;

                    }

                }

            } catch (error) {

                state.lastError =
                    error;

                console.warn(
                    "Bluetooth.autoConnect():",
                    error
                );

            }

        }


        /*
         * Tidak ada device yang sudah
         * mendapat permission.
         *
         * Jangan membuka chooser otomatis.
         */

        return {

            success: false,

            connected: false,

            reason:
                "NO_PREVIOUSLY_AUTHORIZED_DEVICE"

        };

    }


    /*
    =================================================
     DISCONNECT
    =================================================
    */

    async function disconnect() {

        const oldTransport =
            state.transport;


        try {

            /*
             * BLE
             */

            if (
                state.device &&
                state.device.gatt
            ) {

                try {

                    if (
                        state.device.gatt.connected
                    ) {

                        state.device.gatt.disconnect();

                    }

                } catch (error) {}

            }


            /*
             * Serial
             */

            if (
                state.port
            ) {

                try {

                    if (
                        state.port.readable
                    ) {

                        try {

                            await state.port.close();

                        } catch (error) {}

                    } else {

                        await state.port.close();

                    }

                } catch (error) {}

            }

        } finally {

            state.connected =
                false;

            state.connecting =
                false;

            state.device =
                null;

            state.server =
                null;

            state.service =
                null;

            state.characteristic =
                null;

            state.port =
                null;

            state.writer =
                null;

            state.transport =
                null;

            state.lastTransport =
                null;


            emit(
                "disconnect",
                {

                    transport:
                        oldTransport

                }
            );


            emit(
                "status",
                getStatus()
            );

        }


        return true;

    }


    /*
    =================================================
     CAPABILITIES
    =================================================
    */

    function capabilities() {

        return {

            webBluetooth:
                supportedBLE(),

            webSerial:
                supportedSerial(),

            connected:
                state.connected,

            transport:
                state.transport,

            raw:
                true,

            chunking:
                true

        };

    }


    /*
    =================================================
     DEBUG
    =================================================
    */

    function inspect() {

        return {

            version:
                VERSION,

            defaults:
                {
                    ...DEFAULTS
                },

            state:
                getStatus(),

            capabilities:
                capabilities()

        };

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    return {

        version:
            VERSION,

        defaults:
            DEFAULTS,

        state,

        on,

        off,

        getStatus,

        capabilities,

        inspect,

        supportedBLE,

        supportedSerial,

        requestBLEDevice,

        requestSerialPort,

        connectBLE,

        connectSerial,

        connectUser,

        connect,

        autoConnect,

        disconnect,

        toUint8Array,

        sendRaw,

        send,

        write,

        writeRaw,

        raw

    };

})();


/*
=====================================================
 GLOBAL EXPORT
=====================================================
*/

window.Bluetooth =
    Bluetooth;


/*
=====================================================
 COMPATIBILITY ALIASES
=====================================================
*/

window.BluetoothEngine =
    Bluetooth;

window.SmartPrintBluetooth =
    Bluetooth;


/*
=====================================================
 READY
=====================================================
*/

console.log(
    "========================================"
);

console.log(
    "SmartPrint Bluetooth Engine v5.4"
);

console.log(
    "========================================"
);

console.log(
    "BLE:",
    Bluetooth.supportedBLE()
);

console.log(
    "Serial:",
    Bluetooth.supportedSerial()
);

console.log(
    "RAW Uint8Array: ENABLED"
);

console.log(
    "Chunked Transmission: ENABLED"
);

console.log(
    "TSPL: handled by tspl.js"
);

console.log(
    "========================================"
);
