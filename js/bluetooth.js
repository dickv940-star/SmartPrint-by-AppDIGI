"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.7.0
=====================================================

 PURPOSE
 ----------------------------------------------------
 BLE Printer
 Web Serial / COM Printer
 Local Bridge
 RAW Uint8Array Transport

 BLE MODEL
 ----------------------------------------------------
 autoConnect()
    -> TIDAK membuka picker
    -> hanya mencoba device yang sudah diizinkan

 connect()
    -> hanya reconnect known device
    -> TIDAK membuka picker

 connectUser()
    -> koneksi dari tombol user
    -> membuka BLE picker bila diperlukan

 connectBLE()
    -> explicit BLE user connection

 BLE DISCOVERY
 ----------------------------------------------------
 requestDevice()
    -> acceptAllDevices: true
    -> TIDAK membatasi nama printer
    -> TIDAK membatasi service saat picker

 Setelah device dipilih:
    device.gatt.connect()
          ↓
    getPrimaryServices()
          ↓
    scan characteristics
          ↓
    cari WRITE characteristic
          ↓
    cari NOTIFY characteristic

 SEND
 ----------------------------------------------------
 sendRaw(Uint8Array)

 BLE
 ----------------------------------------------------
 RAW Uint8Array
 Tidak TextEncoder
 Tidak Base64

=====================================================
*/


(function () {

    "use strict";


    /*
    =================================================
     VERSION
    =================================================
    */

    const VERSION = "5.7.0";


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
         * BLE packet size.
         *
         * 20 byte adalah nilai aman untuk
         * banyak printer BLE.
         */

        bleChunkSize: 20,


        /*
         * Delay antar packet.
         */

        bleChunkDelay: 8,


        /*
         * Optional service UUID.
         *
         * Digunakan setelah device berhasil
         * dipilih oleh user.
         *
         * BUKAN filter picker.
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
         * Nama umum printer.
         *
         * Hanya untuk memilih known device.
         *
         * TIDAK digunakan sebagai BLE picker filter.
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
            "Bluetooth v5.7: data harus Uint8Array."
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
     DEVICE NAME
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
     CONNECTED
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
     DISCONNECT HANDLER
    =================================================
    */

    function attachDisconnectHandler(
        target
    ) {

        if (!target) {

            return;

        }


        /*
         * Jangan memasang handler dua kali
         * pada object device yang sama.
         */

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
     DISCONNECTED
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


        dispatch(
            "status",
            {
                connected:
                    false
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


        /*
         * getDevices() bukan API universal.
         *
         * Browser yang tidak mendukungnya
         * tidak dianggap error fatal.
         */

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


            if (
                !Array.isArray(devices)
            ) {

                return [];

            }


            log(
                "Known BLE devices:",
                devices.length
            );


            devices.forEach(
                item => {

                    log(
                        "Known device:",
                        item.name ||
                        "(unknown)",
                        item.id ||
                        ""
                    );

                }
            );


            return devices;

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
         * Device dari sesi aktif.
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
         * Nama yang sebelumnya disimpan.
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
         * Cari printer berdasarkan nama.
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
         * Jika hanya satu device,
         * gunakan device tersebut.
         */

        if (
            devices.length === 1
        ) {

            return devices[0];

        }


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
            String(name)
            .toLowerCase();


        return CONFIG.namePrefixes.some(
            prefix =>
                value.includes(
                    String(prefix)
                    .toLowerCase()
                )
        );

    }


    /*
    =================================================
     REQUEST BLE DEVICE
    =================================================
     IMPORTANT
    =================================================

     TIDAK menggunakan filters.

     acceptAllDevices = true

     Tujuannya agar printer BLE dengan
     service UUID berbeda tetap muncul.

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


        if (
            typeof navigator.bluetooth.requestDevice !==
            "function"
        ) {

            throw new Error(
                "navigator.bluetooth.requestDevice() tidak tersedia."
            );

        }


        log(
            "========================================"
        );


        log(
            "BLE DEVICE DISCOVERY"
        );


        log(
            "Menggunakan acceptAllDevices=true"
        );


        log(
            "Tidak menggunakan name filter."
        );


        log(
            "Tidak menggunakan service filter."
        );


        log(
            "Membuka Bluetooth picker..."
        );


        /*
         * PENTING:
         *
         * acceptAllDevices membuat picker
         * tidak membatasi printer berdasarkan
         * service UUID.
         *
         * optionalServices tidak digunakan
         * di tahap picker untuk diagnosis.
         */

        const selected =
            await navigator.bluetooth.requestDevice({

                acceptAllDevices:
                    true

            });


        if (
            !selected
        ) {

            warn(
                "Tidak ada BLE device yang dipilih."
            );


            return null;

        }


        log(
            "========================================"
        );


        log(
            "BLE DEVICE TERPILIH"
        );


        log(
            "Name:",
            selected.name ||
            "(unknown)"
        );


        log(
            "ID:",
            selected.id ||
            "(unknown)"
        );


        log(
            "GATT:",
            Boolean(
                selected.gatt
            )
        );


        log(
            "========================================"
        );


        return selected;

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


        /*
         * Jika sebelumnya ada device berbeda,
         * reset handler state.
         */

        if (
            device &&
            device !== targetDevice
        ) {

            disconnectHandlerAttached =
                false;

        }


        device =
            targetDevice;


        attachDisconnectHandler(
            device
        );


        /*
         * Sudah connected.
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


        log(
            "GATT connecting..."
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


        log(
            "GATT connected."
        );


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


        if (
            !server
        ) {

            server =
                device.gatt;

        }


        log(
            "========================================"
        );


        log(
            "BLE SERVICE DISCOVERY"
        );


        /*
         * getPrimaryServices()
         *
         * Tidak semua browser/printer
         * mengizinkan semua service jika
         * service belum termasuk optionalServices.
         *
         * Karena picker menggunakan
         * acceptAllDevices tanpa optionalServices,
         * kita coba discovery terlebih dahulu.
         */

        let services = [];


        try {

            services =
                await server.getPrimaryServices();

        }

        catch (err) {

            error(
                "getPrimaryServices() gagal:",
                err
            );


            /*
             * Berikan pesan yang lebih jelas.
             */

            throw new Error(
                "BLE berhasil dipilih tetapi service printer tidak dapat dibaca. " +
                "Kemungkinan service UUID printer belum diizinkan."
            );

        }


        log(
            "Jumlah BLE services:",
            services.length
        );


        if (
            services.length === 0
        ) {

            throw new Error(
                "BLE device tidak memiliki primary service."
            );

        }


        /*
         * Reset characteristic.
         */

        writeCharacteristic =
            null;


        notifyCharacteristic =
            null;


        /*
         * Kandidat.

         */

        let writeWithoutResponseCandidate =
            null;


        let writeCandidate =
            null;


        let notifyCandidate =
            null;


        /*
         * Scan semua service.
         */

        for (
            const service of services
        ) {

            log(
                "SERVICE:",
                service.uuid
            );


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


            log(
                "Characteristic count:",
                characteristics.length
            );


            for (
                const characteristic
                of characteristics
            ) {

                const properties =
                    characteristic.properties ||
                    {};


                const canWrite =
                    Boolean(
                        properties.write
                    );


                const canWriteWithoutResponse =
                    Boolean(
                        properties.writeWithoutResponse
                    );


                const canNotify =
                    Boolean(
                        properties.notify ||
                        properties.indicate
                    );


                log(
                    "CHARACTERISTIC:",
                    characteristic.uuid
                );


                log(
                    "  write:",
                    canWrite
                );


                log(
                    "  writeWithoutResponse:",
                    canWriteWithoutResponse
                );


                log(
                    "  notify:",
                    Boolean(
                        properties.notify
                    )
                );


                log(
                    "  indicate:",
                    Boolean(
                        properties.indicate
                    )
                );


                /*
                 * PRIORITAS #1
                 *
                 * writeWithoutResponse
                 */

                if (
                    canWriteWithoutResponse &&
                    !writeWithoutResponseCandidate
                ) {

                    writeWithoutResponseCandidate =
                        characteristic;

                }


                /*
                 * PRIORITAS #2
                 *
                 * write
                 */

                if (
                    canWrite &&
                    !writeCandidate
                ) {

                    writeCandidate =
                        characteristic;

                }


                /*
                 * Notify
                 */

                if (
                    canNotify &&
                    !notifyCandidate
                ) {

                    notifyCandidate =
                        characteristic;

                }

            }

        }


        /*
         * Pilih WRITE terbaik.
         */

        writeCharacteristic =
            writeWithoutResponseCandidate ||
            writeCandidate ||
            null;


        notifyCharacteristic =
            notifyCandidate ||
            null;


        /*
         * Tidak ada WRITE.
         */

        if (
            !writeCharacteristic
        ) {

            error(
                "========================================"
            );


            error(
                "BLE WRITE CHARACTERISTIC TIDAK DITEMUKAN"
            );


            error(
                "========================================"
            );


            throw new Error(
                "Tidak ditemukan BLE characteristic WRITE."
            );

        }


        /*
         * WRITE ditemukan.
         */

        log(
            "========================================"
        );


        log(
            "BLE WRITE CHARACTERISTIC:"
        );


        log(
            writeCharacteristic.uuid
        );


        log(
            "Properties:",
            writeCharacteristic.properties
        );


        /*
         * NOTIFY.
         */

        if (
            notifyCharacteristic
        ) {

            log(
                "BLE NOTIFY CHARACTERISTIC:",
                notifyCharacteristic.uuid
            );


            try {

                await notifyCharacteristic.startNotifications();


                notifyCharacteristic.addEventListener(
                    "characteristicvaluechanged",
                    handleNotification
                );


                log(
                    "BLE notifications enabled."
                );

            }

            catch (err) {

                warn(
                    "Notify tidak tersedia:",
                    err
                );

            }

        }


        log(
            "========================================"
        );


        log(
            "BLE SERVICE DISCOVERY SELESAI"
        );


        log(
            "========================================"
        );


        return true;

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
                    data:
                        bytes
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
             * PRIORITAS #1
             *
             * Device object aktif.
             */

            let target =
                await findKnownDevice();


            /*
             * Known device.
             */

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


                    server =
                        null;


                    writeCharacteristic =
                        null;


                    notifyCharacteristic =
                        null;

                }

            }


            /*
             * PRIORITAS #2
             *
             * User picker.
             */

            log(
                "Membuka BLE picker untuk device baru..."
            );


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

            const target =
                await findKnownDevice();


            if (
                !target
            ) {

                warn(
                    "Tidak ada BLE device yang sudah diberi izin."
                );


                warn(
                    "connect() tidak membuka picker."
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


                notifyCharacteristic =
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
    */

    async function connectBLE() {

        return await connectUser();

    }


    /*
    =================================================
     FORCE NEW BLE PICKER
    =================================================

     Untuk testing printer baru.

     Tidak mencoba known device.

    =================================================
    */

    async function connectBLENew() {

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

            log(
                "Force BLE New Connection..."
            );


            const target =
                await requestBLEDevice();


            if (
                !target
            ) {

                return false;

            }


            return await connectExistingDevice(
                target
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
                    "BLE picker dibatalkan."
                );


                return false;

            }


            error(
                "Force BLE connection error:",
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
     AUTO CONNECT
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
         * getDevices tidak tersedia?
         *
         * Tidak masalah.
         *
         * Auto connect tidak dapat dilakukan,
         * tetapi user masih bisa menggunakan
         * connectUser()/connectBLE().
         */

        if (
            typeof navigator.bluetooth.getDevices !==
            "function"
        ) {

            warn(
                "navigator.bluetooth.getDevices() tidak tersedia."
            );


            warn(
                "Auto Connect dilewati."
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
     SERIAL
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
             * requestPort HARUS berasal dari
             * user gesture.
             */

            serialPort =
                await navigator.serial.requestPort();


            await serialPort.open({

                baudRate:
                    9600

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


        const properties =
            characteristic.properties ||
            {};


        const useWithoutResponse =
            Boolean(
                properties.writeWithoutResponse
            );


        const chunkSize =
            Number(
                CONFIG.bleChunkSize
            );


        log(
            "BLE SEND:",
            bytes.length,
            "bytes"
        );


        log(
            "WRITE:",
            characteristic.uuid
        );


        log(
            "Mode:",
            useWithoutResponse
                ? "WRITE WITHOUT RESPONSE"
                : "WRITE"
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


            if (
                offset +
                chunkSize <
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
                    url ||
                    ""
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
     SEND ALIASES
    =================================================
    */

    async function send(data) {

        return await sendRaw(data);

    }


    async function raw(data) {

        return await sendRaw(data);

    }


    async function write(data) {

        return await sendRaw(data);

    }


    async function writeRaw(data) {

        return await sendRaw(data);

    }


    async function printRaw(data) {

        return await sendRaw(data);

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

                    await notifyCharacteristic
                        .stopNotifications();

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
     SAVE DEVICE
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
                    : null,

            notifyCharacteristic:
                notifyCharacteristic
                    ? notifyCharacteristic.uuid
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


        disconnectHandlerAttached =
            false;


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
         * Auto connect tidak pernah
         * membuka picker.
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

        connectBLENew,

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
        "connectBLENew() |",
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
                once:
                    true
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
