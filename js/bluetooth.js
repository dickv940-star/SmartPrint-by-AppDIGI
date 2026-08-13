"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.6.0
=====================================================

 PURPOSE
 ----------------------------------------------------
 BLE Printer
 Web Serial / COM Printer
 Local Bridge
 RAW Uint8Array Transport

 CONNECTION MODEL
 ----------------------------------------------------
 1. autoConnect()
      -> TIDAK membuka picker
      -> mencoba device yang sudah diizinkan browser

 2. connect()
      -> mencoba koneksi langsung
      -> jika device dikenal dan tersedia:
           langsung connect
      -> jika belum dikenal:
           TIDAK otomatis membuka picker

 3. connectUser()
      -> khusus tombol Connect
      -> jika device belum dikenal:
           membuka picker SATU KALI

 4. connectBLE()
      -> sama seperti connectUser()
      -> explicit BLE user connection

 5. connectSerial()
      -> Web Serial picker
      -> hanya dipanggil oleh user gesture

 6. connectBridge()
      -> Local Bridge

 SEND
 ----------------------------------------------------
 sendRaw(Uint8Array)

 BLE DATA
 ----------------------------------------------------
 RAW Uint8Array
 Tidak TextEncoder
 Tidak Base64

=====================================================
 IMPORTANT
=====================================================

 Browser security:

 BLE printer yang BELUM pernah diberi permission
 browser TIDAK BISA ditemukan otomatis.

 navigator.bluetooth.getDevices()
 hanya tersedia di browser tertentu.

 Karena itu:

 known device
    ↓
 autoConnect
    ↓
 langsung connect

 unknown device
    ↓
 connectUser()
    ↓
 picker
    ↓
 permission
    ↓
 device tersimpan selama sesi

=====================================================
*/


(function () {

    "use strict";


    /*
    =================================================
     VERSION
    =================================================
    */

    const VERSION = "5.6.0";


    /*
    =================================================
     STATE
    =================================================
    */

    let device = null;

    let server = null;

    let writeCharacteristic = null;

    let notifyCharacteristic = null;

    let serialPort = null;

    let serialWriter = null;

    let bridgeConnected = false;

    let connecting = false;

    let disconnectHandlerAttached = false;


    /*
    =================================================
     CONFIG
    =================================================
    */

    const CONFIG = {

        /*
         * BLE chunk size.
         *
         * 20 byte adalah nilai konservatif
         * yang kompatibel dengan banyak printer BLE.
         *
         * Bisa dinaikkan jika printer mendukung MTU besar.
         */

        bleChunkSize: 20,


        /*
         * Delay antar chunk.
         *
         * Printer murah / thermal printer BLE
         * kadang membutuhkan sedikit waktu.
         */

        bleChunkDelay: 8,


        /*
         * UUID umum printer BLE.
         */

        optionalServices: [

            "0000ffe0-0000-1000-8000-00805f9b34fb",

            "0000ffe5-0000-1000-8000-00805f9b34fb",

            "0000fff0-0000-1000-8000-00805f9b34fb",

            "0000ff00-0000-1000-8000-00805f9b34fb",

            "000018f0-0000-1000-8000-00805f9b34fb",

            "000018ff-0000-1000-8000-00805f9b34fb"

        ],


        /*
         * Nama device yang umum pada printer thermal.
         */

        namePrefixes: [

            "MPT",

            "PT",

            "POS",

            "RPP",

            "RP",

            "BT",

            "BLE",

            "Printer",

            "Thermal",

            "Label",

            "XPRINTER",

            "Gprinter",

            "Gprinter",

            "MUNBYN",

            "NIIMBOT",

            "Zebra",

            "TSC"

        ]

    };


    /*
    =================================================
     LOGGING
    =================================================
    */

    function log(...args) {

        console.log(
            "[SmartPrint Bluetooth]",
            ...args
        );

    }


    function warn(...args) {

        console.warn(
            "[SmartPrint Bluetooth]",
            ...args
        );

    }


    function error(...args) {

        console.error(
            "[SmartPrint Bluetooth]",
            ...args
        );

    }


    /*
    =================================================
     SLEEP
    =================================================
    */

    function sleep(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );

    }


    /*
    =================================================
     UINT8 VALIDATOR
    =================================================
    */

    function normalizeBytes(data) {

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


        throw new TypeError(
            "Bluetooth v5.6: data harus Uint8Array."
        );

    }


    /*
    =================================================
     SUPPORT CHECK
    =================================================
    */

    function isBluetoothSupported() {

        return (
            typeof navigator !== "undefined" &&
            "bluetooth" in navigator
        );

    }


    function isSerialSupported() {

        return (
            typeof navigator !== "undefined" &&
            "serial" in navigator
        );

    }


    /*
    =================================================
     GET DEVICE NAME
    =================================================
    */

    function getDeviceName() {

        if (!device) {

            return "";

        }


        return (
            device.name ||
            ""
        );

    }


    /*
    =================================================
     IS CONNECTED
    =================================================
    */

    function isConnected() {

        /*
         * BLE
         */

        if (
            device &&
            device.gatt
        ) {

            try {

                if (
                    device.gatt.connected
                ) {

                    return true;

                }

            }

            catch (e) {}

        }


        /*
         * Serial
         */

        if (
            serialPort
        ) {

            try {

                if (
                    serialPort.readable ||
                    serialPort.writable
                ) {

                    return true;

                }

            }

            catch (e) {}

        }


        /*
         * Bridge
         */

        if (
            bridgeConnected
        ) {

            return true;

        }


        return false;

    }


    /*
    =================================================
     CONNECTION TYPE
    =================================================
    */

    function getConnectionType() {

        if (
            device &&
            device.gatt &&
            device.gatt.connected
        ) {

            return "BLE";

        }


        if (
            serialPort
        ) {

            return "SERIAL";

        }


        if (
            bridgeConnected
        ) {

            return "BRIDGE";

        }


        return null;

    }


    /*
    =================================================
     ATTACH DISCONNECT EVENT
    =================================================
    */

    function attachDisconnectHandler(
        target
    ) {

        if (!target) {

            return;

        }


        if (
            disconnectHandlerAttached
        ) {

            return;

        }


        target.addEventListener(
            "gattserverdisconnected",
            handleDisconnected
        );


        disconnectHandlerAttached =
            true;

    }


    /*
    =================================================
     DISCONNECT EVENT
    =================================================
    */

    function handleDisconnected() {

        log(
            "BLE printer disconnected."
        );


        server =
            null;


        writeCharacteristic =
            null;


        notifyCharacteristic =
            null;


        disconnectHandlerAttached =
            false;


        dispatch(
            "disconnected",
            {
                device
            }
        );

    }


    /*
    =================================================
     EVENT DISPATCH
    =================================================
    */

    function dispatch(
        eventName,
        detail = {}
    ) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-bluetooth-" +
                    eventName,
                    {
                        detail
                    }
                )
            );

        }

        catch (e) {}

    }


    /*
    =================================================
     GET KNOWN DEVICES
    =================================================
    */

    async function getKnownDevices() {

        if (
            !isBluetoothSupported()
        ) {

            return [];

        }


        if (
            typeof navigator.bluetooth.getDevices !==
            "function"
        ) {

            warn(
                "navigator.bluetooth.getDevices() tidak tersedia."
            );


            return [];

        }


        try {

            const devices =
                await navigator.bluetooth.getDevices();


            return Array.isArray(
                devices
            )
                ? devices
                : [];

        }

        catch (err) {

            warn(
                "getDevices() gagal:",
                err
            );


            return [];

        }

    }


    /*
    =================================================
     FIND KNOWN DEVICE
    =================================================
    */

    async function findKnownDevice() {

        /*
         * Jika masih ada object device
         * dari sesi sekarang, gunakan itu.
         */

        if (
            device
        ) {

            return device;

        }


        const devices =
            await getKnownDevices();


        if (
            devices.length === 0
        ) {

            return null;

        }


        /*
         * Jika ada nama printer yang disimpan,
         * prioritaskan nama tersebut.
         */

        let preferredName = "";

        try {

            preferredName =
                localStorage.getItem(
                    "SMARTPRINT_BLUETOOTH_NAME"
                ) ||
                "";

        }

        catch (e) {}


        if (
            preferredName
        ) {

            const exact =
                devices.find(
                    item =>
                        item.name ===
                        preferredName
                );


            if (
                exact
            ) {

                return exact;

            }

        }


        /*
         * Prioritaskan device dengan nama printer.
         */

        const printerDevice =
            devices.find(
                item =>
                    isPrinterName(
                        item.name
                    )
            );


        if (
            printerDevice
        ) {

            return printerDevice;

        }


        /*
         * Kalau hanya ada satu device,
         * gunakan device tersebut.
         */

        if (
            devices.length === 1
        ) {

            return devices[0];

        }


        /*
         * Jangan asal pilih kalau banyak device.
         */

        return null;

    }


    /*
    =================================================
     PRINTER NAME CHECK
    =================================================
    */

    function isPrinterName(
        name
    ) {

        if (!name) {

            return false;

        }


        const value =
            String(
                name
            )
            .toLowerCase();


        return CONFIG.namePrefixes.some(
            prefix =>
                value.includes(
                    String(
                        prefix
                    )
                    .toLowerCase()
                )
        );

    }


    /*
    =================================================
     CONNECT EXISTING DEVICE
    =================================================
    */

    async function connectExistingDevice(
        targetDevice
    ) {

        if (
            !targetDevice
        ) {

            return false;

        }


        if (
            !targetDevice.gatt
        ) {

            throw new Error(
                "BluetoothDevice tidak memiliki GATT."
            );

        }


        device =
            targetDevice;


        attachDisconnectHandler(
            device
        );


        /*
         * Sudah connected?
         */

        if (
            device.gatt.connected
        ) {

            log(
                "BLE device sudah connected:",
                getDeviceName()
            );


            await discoverServices();

            saveDeviceInfo();

            dispatch(
                "connected",
                {
                    device
                }
            );


            return true;

        }


        log(
            "Menghubungkan BLE:",
            device.name ||
            "(unknown)"
        );


        server =
            await device.gatt.connect();


        if (
            !server
        ) {

            throw new Error(
                "GATT server tidak tersedia."
            );

        }


        await discoverServices();


        saveDeviceInfo();


        log(
            "BLE connected:",
            getDeviceName()
        );


        dispatch(
            "connected",
            {
                device
            }
        );


        return true;

    }


    /*
    =================================================
     DISCOVER SERVICES
    =================================================
    */

    async function discoverServices() {

        if (
            !device ||
            !device.gatt ||
            !device.gatt.connected
        ) {

            throw new Error(
                "BLE belum connected."
            );

        }


        /*
         * Ambil semua primary services.
         */

        let services = [];


        try {

            services =
                await server.getPrimaryServices();

        }

        catch (err) {

            error(
                "Gagal mendapatkan BLE services:",
                err
            );


            throw err;

        }


        log(
            "BLE services:",
            services.map(
                service =>
                    service.uuid
            )
        );


        /*
         * Cari characteristic WRITE.
         */

        let writeCandidate =
            null;


        let notifyCandidate =
            null;


        for (
            const service of services
        ) {

            let characteristics = [];


            try {

                characteristics =
                    await service.getCharacteristics();

            }

            catch (err) {

                warn(
                    "Gagal membaca characteristic:",
                    service.uuid,
                    err
                );


                continue;

            }


            for (
                const characteristic
                of characteristics
            ) {

                const properties =
                    characteristic.properties ||
                    {};


                const canWrite =
                    Boolean(
                        properties.write ||
                        properties.writeWithoutResponse
                    );


                const canNotify =
                    Boolean(
                        properties.notify ||
                        properties.indicate
                    );


                log(
                    "BLE characteristic:",
                    characteristic.uuid,
                    properties
                );


                /*
                 * Prioritas WRITE WITHOUT RESPONSE.
                 */

                if (
                    canWrite &&
                    !writeCandidate
                ) {

                    writeCandidate =
                        characteristic;

                }


                if (
                    properties.writeWithoutResponse
                ) {

                    writeCandidate =
                        characteristic;

                }


                if (
                    canNotify &&
                    !notifyCandidate
                ) {

                    notifyCandidate =
                        characteristic;

                }

            }

        }


        if (
            !writeCandidate
        ) {

            throw new Error(
                "Tidak ditemukan BLE characteristic WRITE."
            );

        }


        writeCharacteristic =
            writeCandidate;


        notifyCharacteristic =
            notifyCandidate;


        log(
            "BLE WRITE:",
            writeCharacteristic.uuid
        );


        if (
            notifyCharacteristic
        ) {

            log(
                "BLE NOTIFY:",
                notifyCharacteristic.uuid
            );


            try {

                await notifyCharacteristic.startNotifications();


                notifyCharacteristic.addEventListener(
                    "characteristicvaluechanged",
                    handleNotification
                );

            }

            catch (err) {

                warn(
                    "Notify tidak tersedia:",
                    err
                );

            }

        }

    }


    /*
    =================================================
     NOTIFICATION
    =================================================
    */

    function handleNotification(
        event
    ) {

        try {

            const value =
                event.target.value;


            if (!value) {

                return;

            }


            const bytes =
                new Uint8Array(
                    value.buffer,
                    value.byteOffset,
                    value.byteLength
                );


            dispatch(
                "data",
                {
                    data: bytes
                }
            );

        }

        catch (err) {

            warn(
                "Notification error:",
                err
            );

        }

    }


    /*
    =================================================
     PICK BLE DEVICE
    =================================================
    */

    async function requestBLEDevice() {

        if (
            !isBluetoothSupported()
        ) {

            throw new Error(
                "Web Bluetooth tidak didukung browser."
            );

        }


        log(
            "BLE printer belum dikenal."
        );


        log(
            "Membuka printer picker SATU KALI..."
        );


        /*
         * acceptAllDevices digunakan agar
         * printer thermal dengan UUID berbeda
         * tetap dapat dipilih.
         *
         * optionalServices diperlukan agar
         * getPrimaryServices() bisa dipanggil.
         */

        const selected =
            await navigator.bluetooth.requestDevice({

                acceptAllDevices: true,

                optionalServices:
                    CONFIG.optionalServices

            });


        if (
            !selected
        ) {

            return null;

        }


        log(
            "BLE device dipilih:",
            selected.name ||
            "(unknown)"
        );


        return selected;

    }


    /*
    =================================================
     CONNECT USER
    =================================================
    */

    async function connectUser() {

        if (
            connecting
        ) {

            warn(
                "Bluetooth sedang connecting."
            );


            return false;

        }


        connecting =
            true;


        dispatch(
            "connecting"
        );


        try {

            /*
             * PRIORITAS 1
             *
             * Device object yang masih tersimpan.
             */

            let target =
                await findKnownDevice();


            if (
                target
            ) {

                try {

                    log(
                        "Mencoba connect device yang sudah dikenal..."
                    );


                    const result =
                        await connectExistingDevice(
                            target
                        );


                    if (
                        result
                    ) {

                        return true;

                    }

                }

                catch (err) {

                    warn(
                        "Known device gagal connect:",
                        err
                    );


                    /*
                     * Reset GATT.
                     */

                    server =
                        null;


                    writeCharacteristic =
                        null;

                }

            }


            /*
             * PRIORITAS 2
             *
             * Device belum dikenal.
             *
             * Karena ini connectUser(),
             * picker memang diperbolehkan.
             */

            target =
                await requestBLEDevice();


            if (
                !target
            ) {

                log(
                    "BLE picker dibatalkan pengguna."
                );


                return false;

            }


            const result =
                await connectExistingDevice(
                    target
                );


            return Boolean(
                result
            );

        }

        catch (err) {

            if (
                err &&
                (
                    err.name ===
                    "NotFoundError" ||

                    err.name ===
                    "AbortError"
                )
            ) {

                log(
                    "BLE picker dibatalkan pengguna."
                );


                return false;

            }


            error(
                "BLE connect error:",
                err
            );


            return false;

        }

        finally {

            connecting =
                false;


            dispatch(
                "status",
                {
                    connected:
                        isConnected()
                }
            );

        }

    }


    /*
    =================================================
     CONNECT
    =================================================
     IMPORTANT
     =================================================

     connect() TIDAK MEMBUKA PICKER.

     Ini adalah API untuk:

     - auto connect
     - reconnect
     - tombol aplikasi jika device
       sudah dikenal

    =================================================
    */

    async function connect() {

        if (
            connecting
        ) {

            return false;

        }


        connecting =
            true;


        dispatch(
            "connecting"
        );


        try {

            /*
             * Cari device yang sudah dikenal.
             */

            const target =
                await findKnownDevice();


            if (
                !target
            ) {

                warn(
                    "Tidak ada BLE device yang sudah diberi izin."
                );


                warn(
                    "connect() TIDAK membuka picker."
                );


                return false;

            }


            try {

                return await connectExistingDevice(
                    target
                );

            }

            catch (err) {

                warn(
                    "Reconnect BLE gagal:",
                    err
                );


                server =
                    null;


                writeCharacteristic =
                    null;


                return false;

            }

        }

        finally {

            connecting =
                false;


            dispatch(
                "status",
                {
                    connected:
                        isConnected()
                }
            );

        }

    }


    /*
    =================================================
     CONNECT BLE
    =================================================
     Explicit user BLE connection.
     =================================================
    */

    async function connectBLE() {

        return await connectUser();

    }


    /*
    =================================================
     AUTO CONNECT
    =================================================
     IMPORTANT:
     TIDAK PERNAH MEMBUKA PICKER.
    =================================================
    */

    async function autoConnect() {

        if (
            connecting
        ) {

            return false;

        }


        log(
            "Bluetooth autoConnect..."
        );


        if (
            !isBluetoothSupported()
        ) {

            warn(
                "Web Bluetooth tidak tersedia."
            );


            return false;

        }


        /*
         * Browser harus mendukung getDevices().
         */

        if (
            typeof navigator.bluetooth.getDevices !==
            "function"
        ) {

            warn(
                "navigator.bluetooth.getDevices() tidak tersedia."
            );


            warn(
                "Auto Connect tanpa picker tidak dapat dilakukan browser ini."
            );


            return false;

        }


        try {

            const target =
                await findKnownDevice();


            if (
                !target
            ) {

                log(
                    "Tidak ada printer BLE yang sudah diberi izin."
                );


                return false;

            }


            const result =
                await connectExistingDevice(
                    target
                );


            if (
                result
            ) {

                log(
                    "Auto Connected:",
                    getDeviceName()
                );

            }


            return Boolean(
                result
            );

        }

        catch (err) {

            warn(
                "Auto Connect gagal:",
                err
            );


            return false;

        }

    }


    /*
    =================================================
     SERIAL / COM
    =================================================
    */

    async function connectSerial() {

        if (
            !isSerialSupported()
        ) {

            error(
                "Web Serial tidak didukung browser."
            );


            return false;

        }


        try {

            /*
             * requestPort HARUS dipanggil
             * langsung dari user gesture.
             */

            serialPort =
                await navigator.serial.requestPort();


            await serialPort.open({

                baudRate: 9600

            });


            log(
                "Serial / COM connected."
            );


            dispatch(
                "connected",
                {
                    type:
                        "SERIAL"
                }
            );


            return true;

        }

        catch (err) {

            serialPort =
                null;


            if (
                err &&
                (
                    err.name ===
                    "NotFoundError" ||

                    err.name ===
                    "AbortError"
                )
            ) {

                log(
                    "Serial picker dibatalkan pengguna."
                );


                return false;

            }


            error(
                "Serial connect error:",
                err
            );


            return false;

        }

    }


    /*
    =================================================
     SERIAL SEND
    =================================================
    */

    async function sendSerial(
        data
    ) {

        const bytes =
            normalizeBytes(
                data
            );


        if (
            !serialPort ||
            !serialPort.writable
        ) {

            throw new Error(
                "Serial printer belum terhubung."
            );

        }


        serialWriter =
            serialPort.writable.getWriter();


        try {

            await serialWriter.write(
                bytes
            );

        }

        finally {

            serialWriter.releaseLock();

            serialWriter =
                null;

        }


        return true;

    }


    /*
    =================================================
     BLE SEND
    =================================================
    */

    async function sendBLE(
        data
    ) {

        const bytes =
            normalizeBytes(
                data
            );


        if (
            !device ||
            !device.gatt ||
            !device.gatt.connected
        ) {

            throw new Error(
                "BLE printer belum terhubung."
            );

        }


        if (
            !writeCharacteristic
        ) {

            await discoverServices();

        }


        if (
            !writeCharacteristic
        ) {

            throw new Error(
                "BLE WRITE characteristic tidak ditemukan."
            );

        }


        const characteristic =
            writeCharacteristic;


        /*
         * Tentukan metode write.
         */

        const useWithoutResponse =
            Boolean(
                characteristic.properties &&
                characteristic.properties.writeWithoutResponse
            );


        const chunkSize =
            CONFIG.bleChunkSize;


        log(
            "BLE SEND:",
            bytes.length,
            "bytes"
        );


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
                useWithoutResponse &&
                typeof characteristic.writeValueWithoutResponse ===
                "function"
            ) {

                await characteristic.writeValueWithoutResponse(
                    chunk
                );

            }

            else if (
                typeof characteristic.writeValueWithResponse ===
                "function"
            ) {

                await characteristic.writeValueWithResponse(
                    chunk
                );

            }

            else if (
                typeof characteristic.writeValue ===
                "function"
            ) {

                await characteristic.writeValue(
                    chunk
                );

            }

            else {

                throw new Error(
                    "BLE characteristic tidak mendukung WRITE."
                );

            }


            /*
             * Beri waktu printer memproses
             * chunk berikutnya.
             */

            if (
                offset + chunkSize <
                bytes.length
            ) {

                await sleep(
                    CONFIG.bleChunkDelay
                );

            }

        }


        log(
            "BLE SEND selesai."
        );


        return true;

    }


    /*
    =================================================
     BRIDGE
    =================================================
    */

    async function connectBridge(
        url = null
    ) {

        /*
         * Default bridge URL.
         *
         * Bisa diubah:
         *
         * Bluetooth.setBridgeURL(...)
         */

        const bridgeURL =
            url ||
            getBridgeURL();


        if (
            !bridgeURL
        ) {

            error(
                "Bridge URL belum diset."
            );


            return false;

        }


        try {

            const response =
                await fetch(
                    bridgeURL +
                    "/status",
                    {
                        method:
                            "GET",
                        cache:
                            "no-store"
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    "Bridge HTTP " +
                    response.status
                );

            }


            bridgeConnected =
                true;


            log(
                "Bridge connected:",
                bridgeURL
            );


            dispatch(
                "connected",
                {
                    type:
                        "BRIDGE"
                }
            );


            return true;

        }

        catch (err) {

            bridgeConnected =
                false;


            error(
                "Bridge connect error:",
                err
            );


            return false;

        }

    }


    /*
    =================================================
     BRIDGE URL
    =================================================
    */

    function getBridgeURL() {

        try {

            return (
                localStorage.getItem(
                    "SMARTPRINT_BRIDGE_URL"
                ) ||
                "http://127.0.0.1:18181"
            );

        }

        catch (e) {

            return "http://127.0.0.1:18181";

        }

    }


    function setBridgeURL(
        url
    ) {

        try {

            localStorage.setItem(
                "SMARTPRINT_BRIDGE_URL",
                String(
                    url || ""
                )
            );

        }

        catch (e) {}

    }


    /*
    =================================================
     SEND BRIDGE
    =================================================
    */

    async function sendBridge(
        data
    ) {

        const bytes =
            normalizeBytes(
                data
            );


        const url =
            getBridgeURL();


        /*
         * Uint8Array -> ArrayBuffer
         */

        const body =
            bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset +
                bytes.byteLength
            );


        const response =
            await fetch(
                url +
                "/print",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/octet-stream"

                    },

                    body

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Bridge print HTTP " +
                response.status
            );

        }


        return true;

    }


    /*
    =================================================
     SEND RAW
    =================================================
    */

    async function sendRaw(
        data
    ) {

        const bytes =
            normalizeBytes(
                data
            );


        if (
            bytes.length === 0
        ) {

            warn(
                "sendRaw(): data kosong."
            );


            return false;

        }


        /*
         * BLE
         */

        if (
            device &&
            device.gatt &&
            device.gatt.connected
        ) {

            return await sendBLE(
                bytes
            );

        }


        /*
         * SERIAL
         */

        if (
            serialPort
        ) {

            return await sendSerial(
                bytes
            );

        }


        /*
         * BRIDGE
         */

        if (
            bridgeConnected
        ) {

            return await sendBridge(
                bytes
            );

        }


        throw new Error(
            "Tidak ada printer yang terhubung."
        );

    }


    /*
    =================================================
     ALIASES
    =================================================
    */

    async function send(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    async function raw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    async function write(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    async function writeRaw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    async function printRaw(
        data
    ) {

        return await sendRaw(
            data
        );

    }


    /*
    =================================================
     DISCONNECT BLE
    =================================================
    */

    async function disconnectBLE() {

        try {

            if (
                notifyCharacteristic
            ) {

                try {

                    await notifyCharacteristic.stopNotifications();

                }

                catch (e) {}

            }


            if (
                device &&
                device.gatt &&
                device.gatt.connected
            ) {

                device.gatt.disconnect();

            }

        }

        catch (err) {

            warn(
                "BLE disconnect error:",
                err
            );

        }


        server =
            null;


        writeCharacteristic =
            null;


        notifyCharacteristic =
            null;


        disconnectHandlerAttached =
            false;


        dispatch(
            "disconnected"
        );


        return true;

    }


    /*
    =================================================
     DISCONNECT SERIAL
    =================================================
    */

    async function disconnectSerial() {

        try {

            if (
                serialWriter
            ) {

                try {

                    serialWriter.releaseLock();

                }

                catch (e) {}

                serialWriter =
                    null;

            }


            if (
                serialPort
            ) {

                try {

                    await serialPort.close();

                }

                catch (e) {}

            }

        }

        finally {

            serialPort =
                null;

        }


        dispatch(
            "disconnected"
        );


        return true;

    }


    /*
    =================================================
     DISCONNECT
    =================================================
    */

    async function disconnect() {

        log(
            "Disconnect printer..."
        );


        await disconnectBLE();


        await disconnectSerial();


        bridgeConnected =
            false;


        return true;

    }


    /*
    =================================================
     SAVE DEVICE INFO
    =================================================
    */

    function saveDeviceInfo() {

        if (!device) {

            return;

        }


        try {

            if (
                device.name
            ) {

                localStorage.setItem(
                    "SMARTPRINT_BLUETOOTH_NAME",
                    device.name
                );

            }


            /*
             * Device ID bukan jaminan bisa
             * digunakan kembali sebagai object
             * BluetoothDevice setelah reload.
             *
             * Jangan menganggap ID ini sebagai
             * pengganti getDevices().
             */

            if (
                device.id
            ) {

                localStorage.setItem(
                    "SMARTPRINT_BLUETOOTH_ID",
                    device.id
                );

            }

        }

        catch (e) {}

    }


    /*
    =================================================
     GET DEVICE
    =================================================
    */

    function getDevice() {

        return device;

    }


    /*
    =================================================
     GET INFO
    =================================================
    */

    function getInfo() {

        return {

            version:
                VERSION,

            connected:
                isConnected(),

            type:
                getConnectionType(),

            deviceName:
                getDeviceName(),

            deviceId:
                device &&
                device.id
                    ? device.id
                    : "",

            bleConnected:
                Boolean(
                    device &&
                    device.gatt &&
                    device.gatt.connected
                ),

            serialConnected:
                Boolean(
                    serialPort
                ),

            bridgeConnected:
                bridgeConnected,

            writeCharacteristic:
                writeCharacteristic
                    ? writeCharacteristic.uuid
                    : null

        };

    }


    /*
    =================================================
     FORGET DEVICE
    =================================================
    */

    function forgetDevice() {

        try {

            localStorage.removeItem(
                "SMARTPRINT_BLUETOOTH_NAME"
            );


            localStorage.removeItem(
                "SMARTPRINT_BLUETOOTH_ID"
            );

        }

        catch (e) {}


        device =
            null;


        server =
            null;


        writeCharacteristic =
            null;


        notifyCharacteristic =
            null;


        log(
            "Bluetooth device info dihapus."
        );


        return true;

    }


    /*
    =================================================
     INIT
    =================================================
    */

    async function init() {

        log(
            "========================================"
        );


        log(
            "SmartPrint Bluetooth Engine v" +
            VERSION
        );


        log(
            "========================================"
        );


        log(
            "BLE | Web Serial | Bridge | RAW Uint8Array"
        );


        if (
            isBluetoothSupported()
        ) {

            log(
                "Web Bluetooth: AVAILABLE"
            );

        }

        else {

            warn(
                "Web Bluetooth: NOT AVAILABLE"
            );

        }


        if (
            isSerialSupported()
        ) {

            log(
                "Web Serial: AVAILABLE"
            );

        }

        else {

            warn(
                "Web Serial: NOT AVAILABLE"
            );

        }


        /*
         * Jangan auto picker.
         *
         * Hanya coba autoConnect.
         */

        try {

            await autoConnect();

        }

        catch (err) {

            warn(
                "Init autoConnect error:",
                err
            );

        }


        return true;

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    const Bluetooth = {

        version:
            VERSION,

        config:
            CONFIG,

        init,

        connect,

        connectUser,

        connectBLE,

        autoConnect,

        connectSerial,

        connectBridge,

        disconnect,

        disconnectBLE,

        disconnectSerial,

        sendRaw,

        send,

        raw,

        write,

        writeRaw,

        printRaw,

        isConnected,

        getDevice,

        getDeviceName,

        getConnectionType,

        getInfo,

        getKnownDevices,

        forgetDevice,

        setBridgeURL,

        getBridgeURL,

        discoverServices

    };


    /*
    =================================================
     GLOBAL
    =================================================
    */

    window.Bluetooth =
        Bluetooth;


    window.SmartPrintBluetooth =
        Bluetooth;


    window.BluetoothEngine =
        Bluetooth;


    /*
    =================================================
     READY
    =================================================
    */

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


    console.log(
        "BLE | Web Serial | Bridge | RAW Uint8Array"
    );


    console.log(
        "API:",
        "autoConnect() |",
        "connectUser() |",
        "connectBLE() |",
        "connectSerial() |",
        "connectBridge() |",
        "sendRaw()"
    );


    /*
    =================================================
     DOM READY
    =================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                setTimeout(
                    () => {

                        Bluetooth.init();

                    },
                    100
                );

            },
            {
                once: true
            }
        );

    }

    else {

        setTimeout(
            () => {

                Bluetooth.init();

            },
            100
        );

    }


})();
