"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.5
=====================================================

 TARGET
 ----------------------------------------------------
 BLE Printer
 Web Serial / COM
 Local Bridge
 RAW Uint8Array

 IMPORTANT
 ----------------------------------------------------
 AUTO CONNECT
    -> TIDAK MEMBUKA PICKER
    -> menggunakan navigator.bluetooth.getDevices()

 MANUAL BLE
    -> connectUser()
    -> connectBLE()
    -> picker hanya melalui user action

 SERIAL
    -> connectSerial()
    -> requestPort() harus berasal dari user gesture

 BRIDGE
    -> connectBridge()

 RAW
    -> sendRaw(Uint8Array)

 COMPATIBILITY
 ----------------------------------------------------
 Printer Manager v4.1 / v4.2
 TSPL v5.3
 ESC/POS
 ZPL
 CPCL

=====================================================
*/


(function () {

    "use strict";


    const VERSION = "5.5.0";


    /*
    =================================================
     DEFAULT CONFIG
    =================================================
    */

    const DEFAULTS = {

        /*
         * BLE printer discovery.
         *
         * Jika printer Anda mempunyai service UUID
         * khusus, masukkan melalui setBLEConfig().
         */

        serviceUUID: null,

        characteristicUUID: null,

        /*
         * UUID umum Nordic UART.
         *
         * Banyak BLE printer menggunakan pola ini,
         * tetapi TIDAK semua printer.
         */

        fallbackServices: [

            "6e400001-b5a3-f393-e0a9-e50e24dcca9e",

            "0000ffe0-0000-1000-8000-00805f9b34fb",

            "0000ff00-0000-1000-8000-00805f9b34fb"

        ],

        fallbackCharacteristics: [

            "6e400002-b5a3-f393-e0a9-e50e24dcca9e",

            "6e400003-b5a3-f393-e0a9-e50e24dcca9e",

            "0000ffe1-0000-1000-8000-00805f9b34fb",

            "0000ff01-0000-1000-8000-00805f9b34fb"

        ],

        /*
         * Serial
         */

        serialBaudRate: 9600,

        serialDataBits: 8,

        serialStopBits: 1,

        serialParity: "none",

        serialBufferSize: 255,

        /*
         * Bridge
         */

        bridgeURL:
            "http://127.0.0.1:9100/print",

        /*
         * BLE packet size.
         *
         * 20 aman untuk banyak BLE printer.
         */

        bleChunkSize: 20,

        bleChunkDelay: 5,

        /*
         * Debug
         */

        debug: true

    };


    /*
    =================================================
     STATE
    =================================================
    */

    const Bluetooth = {

        version: VERSION,

        connected: false,

        connecting: false,

        transport: null,

        device: null,

        server: null,

        service: null,

        characteristic: null,

        port: null,

        writer: null,

        bridgeConnected: false,

        deviceName: "",

        lastError: null,

        initialized: false,

        manualConnection: false,

        autoConnecting: false,

        config: {

            ...DEFAULTS,

            fallbackServices:
                [
                    ...DEFAULTS.fallbackServices
                ],

            fallbackCharacteristics:
                [
                    ...DEFAULTS.fallbackCharacteristics
                ]

        },


        /*
        =================================================
         INIT
        =================================================
        */

        init() {

            if (this.initialized) {

                return true;

            }


            this.initialized = true;


            this.log(
                "========================================"
            );

            this.log(
                "SmartPrint Bluetooth Engine v" +
                VERSION
            );

            this.log(
                "========================================"
            );

            this.log(
                "BLE | Web Serial | Bridge | RAW Uint8Array"
            );


            this.updateStatus(
                "disconnected"
            );


            return true;

        },


        /*
        =================================================
         LOG
        =================================================
         */

        log(...args) {

            if (
                this.config.debug
            ) {

                console.log(
                    "[SmartPrint Bluetooth]",
                    ...args
                );

            }

        },


        warn(...args) {

            console.warn(
                "[SmartPrint Bluetooth]",
                ...args
            );

        },


        error(...args) {

            console.error(
                "[SmartPrint Bluetooth]",
                ...args
            );

        },


        /*
        =================================================
         CONFIG
        =================================================
         */

        setBLEConfig(options = {}) {

            if (
                options.serviceUUID !== undefined
            ) {

                this.config.serviceUUID =
                    options.serviceUUID ||
                    null;

            }


            if (
                options.characteristicUUID !==
                undefined
            ) {

                this.config.characteristicUUID =
                    options.characteristicUUID ||
                    null;

            }


            if (
                Array.isArray(
                    options.fallbackServices
                )
            ) {

                this.config.fallbackServices =
                    [
                        ...options.fallbackServices
                    ];

            }


            if (
                Array.isArray(
                    options.fallbackCharacteristics
                )
            ) {

                this.config.fallbackCharacteristics =
                    [
                        ...options.fallbackCharacteristics
                    ];

            }


            return true;

        },


        /*
        =================================================
         FEATURE CHECK
        =================================================
         */

        isSupported() {

            return (
                typeof navigator !==
                "undefined" &&
                "bluetooth" in navigator
            );

        },


        isSerialSupported() {

            return (
                typeof navigator !==
                "undefined" &&
                "serial" in navigator
            );

        },


        isBridgeSupported() {

            return (
                typeof fetch ===
                "function"
            );

        },


        /*
        =================================================
         CONNECT USER
        =================================================

         Manual connection.

         Picker boleh muncul di sini.

         HARUS dipanggil dari click/tap.
        =================================================
         */

        async connectUser() {

            if (
                this.connecting
            ) {

                this.warn(
                    "Bluetooth sedang connecting."
                );

                return false;

            }


            this.manualConnection =
                true;


            /*
             * Default manual connection =
             * BLE.
             */

            return await this.connectBLE();

        },


        /*
        =================================================
         AUTO CONNECT
        =================================================

         IMPORTANT:

         TIDAK BOLEH memanggil requestDevice().

         Tidak membuka picker.

         Menggunakan getDevices().
        =================================================
         */

        async autoConnect() {

            if (
                this.autoConnecting
            ) {

                return false;

            }


            if (
                this.connected
            ) {

                return true;

            }


            if (
                !this.isSupported()
            ) {

                this.warn(
                    "Web Bluetooth tidak tersedia."
                );

                return false;

            }


            /*
             * getDevices() adalah API untuk device
             * yang sebelumnya sudah diberikan permission.
             */

            if (
                typeof navigator.bluetooth.getDevices !==
                "function"
            ) {

                this.warn(
                    "navigator.bluetooth.getDevices() tidak tersedia. " +
                    "Auto Connect tanpa picker tidak dapat dilakukan browser ini."
                );

                return false;

            }


            this.autoConnecting =
                true;


            try {

                this.log(
                    "Bluetooth Auto Connect..."
                );


                const devices =
                    await navigator.bluetooth.getDevices();


                if (
                    !Array.isArray(devices) ||
                    devices.length === 0
                ) {

                    this.log(
                        "Tidak ada BLE device yang sudah diberi permission."
                    );

                    return false;

                }


                this.log(
                    "Known BLE Devices:",
                    devices.length
                );


                /*
                 * Jika printerName tersimpan,
                 * prioritaskan device tersebut.
                 */

                const sorted =
                    this.sortDevices(
                        devices
                    );


                for (
                    const device of sorted
                ) {

                    try {

                        this.log(
                            "Mencoba reconnect:",
                            device.name ||
                            "(Unnamed)"
                        );


                        const result =
                            await this.connectKnownDevice(
                                device
                            );


                        if (
                            result
                        ) {

                            this.log(
                                "Bluetooth Auto Connected:",
                                this.deviceName
                            );

                            return true;

                        }

                    }

                    catch (error) {

                        this.warn(
                            "Reconnect gagal:",
                            device.name,
                            error
                        );

                    }

                }


                this.connected =
                    false;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

            catch (error) {

                this.lastError =
                    error;


                this.warn(
                    "Bluetooth autoConnect error:",
                    error
                );


                this.connected =
                    false;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

            finally {

                this.autoConnecting =
                    false;

            }

        },


        /*
        =================================================
         SORT DEVICES
        =================================================
         */

        sortDevices(
            devices
        ) {

            const savedName =
                this.getSavedPrinterName();


            if (!savedName) {

                return [
                    ...devices
                ];

            }


            return [
                ...devices
            ].sort(
                (a, b) => {

                    const aMatch =
                        (
                            a.name ===
                            savedName
                        )
                            ? 0
                            : 1;


                    const bMatch =
                        (
                            b.name ===
                            savedName
                        )
                            ? 0
                            : 1;


                    return (
                        aMatch -
                        bMatch
                    );

                }
            );

        },


        /*
        =================================================
         SAVED NAME
         =================================================
         */

        getSavedPrinterName() {

            try {

                const raw =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_SETTINGS"
                    );


                if (!raw) {

                    return "";

                }


                const settings =
                    JSON.parse(
                        raw
                    );


                return String(
                    settings.printerName ||
                    ""
                );

            }

            catch (error) {

                return "";

            }

        },


        /*
        =================================================
         CONNECT KNOWN DEVICE
         =================================================

         Tidak menggunakan requestDevice().
        =================================================
         */

        async connectKnownDevice(
            device
        ) {

            if (!device) {

                return false;

            }


            if (
                !device.gatt
            ) {

                return false;

            }


            this.cleanupBLEState(
                false
            );


            this.device =
                device;


            this.deviceName =
                device.name ||
                "";


            this.attachDeviceEvents(
                device
            );


            this.updateStatus(
                "connecting"
            );


            /*
             * Kalau masih connected,
             * gunakan koneksi tersebut.
             */

            if (
                device.gatt.connected
            ) {

                this.server =
                    device.gatt;

            }

            else {

                this.server =
                    await device.gatt.connect();

            }


            if (!this.server) {

                throw new Error(
                    "BLE GATT server tidak tersedia."
                );

            }


            const found =
                await this.findWritableCharacteristic(
                    this.server
                );


            if (
                !found ||
                !found.characteristic
            ) {

                /*
                 * Jangan biarkan GATT connection
                 * menggantung jika characteristic
                 * tidak ditemukan.
                 */

                try {

                    if (
                        device.gatt.connected
                    ) {

                        device.gatt.disconnect();

                    }

                }

                catch (e) {}


                throw new Error(
                    "BLE writable characteristic printer tidak ditemukan."
                );

            }


            this.service =
                found.service;


            this.characteristic =
                found.characteristic;


            this.transport =
                "ble";


            this.connected =
                true;


            this.lastError =
                null;


            this.updateStatus(
                "connected"
            );


            this.saveDeviceInfo();


            return true;

        },


        /*
        =================================================
         MANUAL BLE CONNECT
        =================================================

         Picker HANYA di sini.
        =================================================
         */

        async connectBLE() {

            if (
                this.connecting
            ) {

                this.warn(
                    "BLE sedang connecting."
                );

                return false;

            }


            if (
                !this.isSupported()
            ) {

                this.error(
                    "Web Bluetooth tidak tersedia."
                );

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                this.log(
                    "Bluetooth BLE: membuka printer picker..."
                );


                /*
                 * Filter / optionalServices.
                 *
                 * Jika serviceUUID diberikan,
                 * gunakan filter.
                 */

                const options =
                    this.buildRequestDeviceOptions();


                const device =
                    await navigator.bluetooth.requestDevice(
                        options
                    );


                if (!device) {

                    return false;

                }


                this.manualConnection =
                    true;


                const result =
                    await this.connectKnownDevice(
                        device
                    );


                if (!result) {

                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.saveDeviceInfo();


                return true;

            }

            catch (error) {

                this.lastError =
                    error;


                if (
                    error &&
                    (
                        error.name ===
                        "NotFoundError" ||

                        error.name ===
                        "AbortError"
                    )
                ) {

                    this.log(
                        "BLE picker dibatalkan pengguna."
                    );


                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.error(
                    "BLE Connect Error:",
                    error
                );


                this.connected =
                    false;


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


        /*
        =================================================
         REQUEST DEVICE OPTIONS
        =================================================
         */

        buildRequestDeviceOptions() {

            const services = [];


            /*
             * Service utama
             */

            if (
                this.config.serviceUUID
            ) {

                services.push(
                    this.config.serviceUUID
                );

            }


            /*
             * Fallback services
             */

            for (
                const uuid
                of this.config.fallbackServices
            ) {

                if (
                    !services.includes(
                        uuid
                    )
                ) {

                    services.push(
                        uuid
                    );

                }

            }


            /*
             * Jika service diketahui:
             * gunakan filters.

             * Jika tidak:
             * acceptAllDevices.

             * optionalServices diperlukan supaya
             * getPrimaryService() bisa diakses.
             */

            if (
                services.length > 0
            ) {

                return {

                    acceptAllDevices:
                        true,

                    optionalServices:
                        services

                };

            }


            return {

                acceptAllDevices:
                    true

            };

        },


        /*
        =================================================
         FIND WRITABLE CHARACTERISTIC
        =================================================
         */

        async findWritableCharacteristic(
            server
        ) {

            if (!server) {

                throw new Error(
                    "GATT server tidak tersedia."
                );

            }


            /*
             * 1. Explicit service + characteristic
             */

            if (
                this.config.serviceUUID
            ) {

                try {

                    const service =
                        await server.getPrimaryService(
                            this.config.serviceUUID
                        );


                    if (
                        this.config.characteristicUUID
                    ) {

                        try {

                            const characteristic =
                                await service.getCharacteristic(
                                    this.config.characteristicUUID
                                );


                            if (
                                this.isWritableCharacteristic(
                                    characteristic
                                )
                            ) {

                                return {

                                    service,

                                    characteristic

                                };

                            }

                        }

                        catch (error) {

                            this.warn(
                                "Characteristic explicit tidak ditemukan.",
                                error
                            );

                        }

                    }


                    const characteristic =
                        await this.findWritableInService(
                            service
                        );


                    if (
                        characteristic
                    ) {

                        return {

                            service,

                            characteristic

                        };

                    }

                }

                catch (error) {

                    this.warn(
                        "Service explicit tidak ditemukan:",
                        error
                    );

                }

            }


            /*
             * 2. Fallback services
             */

            for (
                const serviceUUID
                of this.config.fallbackServices
            ) {

                try {

                    const service =
                        await server.getPrimaryService(
                            serviceUUID
                        );


                    if (
                        this.config.characteristicUUID
                    ) {

                        try {

                            const characteristic =
                                await service.getCharacteristic(
                                    this.config.characteristicUUID
                                );


                            if (
                                this.isWritableCharacteristic(
                                    characteristic
                                )
                            ) {

                                return {

                                    service,

                                    characteristic

                                };

                            }

                        }

                        catch (error) {}

                    }


                    const characteristic =
                        await this.findWritableInService(
                            service
                        );


                    if (
                        characteristic
                    ) {

                        return {

                            service,

                            characteristic

                        };

                    }

                }

                catch (error) {

                    /*
                     * Tidak masalah.
                     * Lanjutkan service berikutnya.
                     */

                }

            }


            /*
             * 3. Enumerate primary services.
             *
             * Hanya jika browser mengizinkan.
             */

            try {

                if (
                    typeof server.getPrimaryServices ===
                    "function"
                ) {

                    const services =
                        await server.getPrimaryServices();


                    for (
                        const service
                        of services
                    ) {

                        const characteristic =
                            await this.findWritableInService(
                                service
                            );


                        if (
                            characteristic
                        ) {

                            return {

                                service,

                                characteristic

                            };

                        }

                    }

                }

            }

            catch (error) {

                this.warn(
                    "Enumerasi BLE service gagal:",
                    error
                );

            }


            return null;

        },


        /*
        =================================================
         FIND WRITABLE IN SERVICE
        =================================================
         */

        async findWritableInService(
            service
        ) {

            if (!service) {

                return null;

            }


            /*
             * Coba characteristic yang dikenal
             * terlebih dahulu.
             */

            for (
                const uuid
                of this.config.fallbackCharacteristics
            ) {

                try {

                    const characteristic =
                        await service.getCharacteristic(
                            uuid
                        );


                    if (
                        this.isWritableCharacteristic(
                            characteristic
                        )
                    ) {

                        return characteristic;

                    }

                }

                catch (error) {}

            }


            /*
             * Enumerate characteristics.
             */

            try {

                if (
                    typeof service.getCharacteristics ===
                    "function"
                ) {

                    const characteristics =
                        await service.getCharacteristics();


                    /*
                     * Prioritaskan write / writeWithoutResponse
                     */

                    for (
                        const characteristic
                        of characteristics
                    ) {

                        if (
                            this.isWritableCharacteristic(
                                characteristic
                            )
                        ) {

                            return characteristic;

                        }

                    }

                }

            }

            catch (error) {

                this.warn(
                    "Enumerasi characteristic gagal:",
                    error
                );

            }


            return null;

        },


        /*
        =================================================
         WRITABLE CHECK
        =================================================
         */

        isWritableCharacteristic(
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
         DEVICE EVENTS
        =================================================
         */

        attachDeviceEvents(
            device
        ) {

            if (!device) {

                return;

            }


            /*
             * Hindari event listener berulang.
             */

            if (
                device.__smartPrintEventsAttached
            ) {

                return;

            }


            device.__smartPrintEventsAttached =
                true;


            device.addEventListener(
                "gattserverdisconnected",
                () => {

                    this.log(
                        "BLE device disconnected:",
                        device.name
                    );


                    this.connected =
                        false;


                    this.server =
                        null;


                    this.service =
                        null;


                    this.characteristic =
                        null;


                    this.transport =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );

                }
            );

        },


        /*
        =================================================
         SERIAL / COM
        =================================================

         HARUS user gesture.
        =================================================
         */

        async connectSerial() {

            if (
                this.connecting
            ) {

                this.warn(
                    "Serial sedang connecting."
                );

                return false;

            }


            if (
                !this.isSerialSupported()
            ) {

                this.error(
                    "Web Serial tidak tersedia."
                );

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                this.log(
                    "Web Serial: membuka COM picker..."
                );


                /*
                 * requestPort() HARUS berasal dari
                 * user gesture.
                 */

                const port =
                    await navigator.serial.requestPort();


                if (!port) {

                    return false;

                }


                await port.open({

                    baudRate:
                        this.config.serialBaudRate,

                    dataBits:
                        this.config.serialDataBits,

                    stopBits:
                        this.config.serialStopBits,

                    parity:
                        this.config.serialParity,

                    bufferSize:
                        this.config.serialBufferSize

                });


                this.port =
                    port;


                this.writer =
                    port.writable
                        ? port.writable.getWriter()
                        : null;


                if (!this.writer) {

                    throw new Error(
                        "Serial writer tidak tersedia."
                    );

                }


                this.transport =
                    "serial";


                this.connected =
                    true;


                this.deviceName =
                    "Serial / COM";


                this.updateStatus(
                    "connected"
                );


                return true;

            }

            catch (error) {

                this.lastError =
                    error;


                if (
                    error &&
                    (
                        error.name ===
                        "NotFoundError" ||

                        error.name ===
                        "AbortError"
                    )
                ) {

                    this.log(
                        "COM picker dibatalkan pengguna."
                    );


                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                if (
                    error &&
                    error.name ===
                    "SecurityError"
                ) {

                    this.error(
                        "Web Serial membutuhkan user gesture."
                    );


                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.error(
                    "Serial Connect Error:",
                    error
                );


                this.connected =
                    false;


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


        /*
        =================================================
         BRIDGE CONNECT
        =================================================
         */

        async connectBridge(
            url
        ) {

            const bridgeURL =
                url ||
                this.config.bridgeURL;


            if (!bridgeURL) {

                this.error(
                    "Bridge URL belum diatur."
                );

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                /*
                 * Endpoint health check.

                 * Tidak semua bridge mendukung GET.
                 * Jika gagal GET, kita tetap bisa
                 * mencoba saat sendRaw().
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


                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            "Bridge HTTP " +
                            response.status
                        );

                    }

                }

                catch (healthError) {

                    /*
                     * Jangan langsung gagal.
                     * Beberapa bridge hanya menerima POST.
                     */

                    this.warn(
                        "Bridge health check tidak tersedia:",
                        healthError.message
                    );

                }


                this.transport =
                    "bridge";


                this.bridgeConnected =
                    true;


                this.connected =
                    true;


                this.deviceName =
                    "Local Bridge";


                this.updateStatus(
                    "connected"
                );


                return true;

            }

            catch (error) {

                this.lastError =
                    error;


                this.connected =
                    false;


                this.bridgeConnected =
                    false;


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


        /*
        =================================================
         SEND RAW
        =================================================
         */

        async sendRaw(
            data
        ) {

            /*
             * HARUS Uint8Array.
             */

            if (
                !(data instanceof Uint8Array)
            ) {

                /*
                 * Compatibility untuk ArrayBuffer.
                 */

                if (
                    data instanceof ArrayBuffer
                ) {

                    data =
                        new Uint8Array(
                            data
                        );

                }

                else if (
                    ArrayBuffer.isView(
                        data
                    )
                ) {

                    data =
                        new Uint8Array(
                            data.buffer,
                            data.byteOffset,
                            data.byteLength
                        );

                }

                else {

                    throw new TypeError(
                        "Bluetooth.sendRaw() membutuhkan Uint8Array."
                    );

                }

            }


            if (
                data.length === 0
            ) {

                return true;

            }


            /*
             * Pastikan connection state.
             */

            if (
                !this.isConnected()
            ) {

                throw new Error(
                    "Bluetooth printer belum terhubung."
                );

            }


            /*
             * BLE
             */

            if (
                this.transport ===
                "ble"
            ) {

                return await this.sendBLE(
                    data
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
                    data
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
                    data
                );

            }


            throw new Error(
                "Transport tidak diketahui: " +
                this.transport
            );

        },


        /*
        =================================================
         BLE SEND
        =================================================
         */

        async sendBLE(
            data
        ) {

            if (
                !this.characteristic
            ) {

                throw new Error(
                    "BLE writable characteristic tidak tersedia."
                );

            }


            const characteristic =
                this.characteristic;


            const chunkSize =
                Math.max(
                    1,
                    Number(
                        this.config.bleChunkSize
                    ) || 20
                );


            const delay =
                Math.max(
                    0,
                    Number(
                        this.config.bleChunkDelay
                    ) || 0
                );


            /*
             * BLE printer biasanya mempunyai
             * limit MTU.

             * Jangan kirim seluruh job TSPL
             * dalam satu write.
             */

            for (
                let offset = 0;
                offset < data.length;
                offset += chunkSize
            ) {

                const chunk =
                    data.slice(
                        offset,
                        Math.min(
                            offset +
                            chunkSize,
                            data.length
                        )
                    );


                if (
                    typeof characteristic.writeValueWithoutResponse ===
                    "function"
                ) {

                    await characteristic
                        .writeValueWithoutResponse(
                            chunk
                        );

                }

                else if (
                    typeof characteristic.writeValue ===
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
                    delay > 0 &&
                    offset +
                    chunkSize <
                    data.length
                ) {

                    await this.sleep(
                        delay
                    );

                }

            }


            this.log(
                "BLE RAW sent:",
                data.length,
                "bytes"
            );


            return true;

        },


        /*
        =================================================
         SERIAL SEND
        =================================================
         */

        async sendSerial(
            data
        ) {

            if (!this.writer) {

                throw new Error(
                    "Serial writer tidak tersedia."
                );

            }


            await this.writer.write(
                data
            );


            this.log(
                "Serial RAW sent:",
                data.length,
                "bytes"
            );


            return true;

        },


        /*
        =================================================
         BRIDGE SEND
        =================================================
         */

        async sendBridge(
            data
        ) {

            const url =
                this.config.bridgeURL;


            if (!url) {

                throw new Error(
                    "Bridge URL tidak tersedia."
                );

            }


            /*
             * Kirim binary RAW.

             * BUKAN TextEncoder.
             * BUKAN JSON.
             * BUKAN Base64.
             */

            const response =
                await fetch(
                    url,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/octet-stream"

                        },

                        body:
                            data

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


            this.log(
                "Bridge RAW sent:",
                data.length,
                "bytes"
            );


            return true;

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
         RAW
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

                    this.writer

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
                    this.connected &&
                    this.bridgeConnected
                );

            }


            return Boolean(
                this.connected
            );

        },


        /*
        =================================================
         GET DEVICE NAME
        =================================================
         */

        getDeviceName() {

            if (
                this.device &&
                this.device.name
            ) {

                return this.device.name;

            }


            return this.deviceName || "";

        },


        /*
        =================================================
         GET TRANSPORT
        =================================================
         */

        getTransport() {

            return this.transport;

        },


        /*
        =================================================
         GET STATUS
        =================================================
         */

        getStatus() {

            return {

                connected:
                    this.isConnected(),

                transport:
                    this.transport,

                device:
                    this.getDeviceName(),

                connecting:
                    this.connecting,

                autoConnecting:
                    this.autoConnecting,

                characteristic:
                    Boolean(
                        this.characteristic
                    ),

                lastError:
                    this.lastError

            };

        },


        /*
        =================================================
         DISCONNECT
        =================================================
         */

        async disconnect() {

            this.log(
                "Bluetooth Disconnect"
            );


            /*
             * BLE
             */

            if (
                this.transport ===
                "ble"
            ) {

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

                    this.warn(
                        "BLE disconnect error:",
                        error
                    );

                }

            }


            /*
             * SERIAL
             */

            if (
                this.transport ===
                "serial"
            ) {

                try {

                    if (
                        this.writer
                    ) {

                        try {

                            await this.writer.close();

                        }

                        catch (error) {}

                    }

                }

                catch (error) {

                    this.warn(
                        "Serial writer close error:",
                        error
                    );

                }


                try {

                    if (
                        this.port
                    ) {

                        await this.port.close();

                    }

                }

                catch (error) {

                    this.warn(
                        "Serial port close error:",
                        error
                    );

                }

            }


            /*
             * RESET
             */

            this.cleanupBLEState(
                true
            );


            this.port =
                null;


            this.writer =
                null;


            this.bridgeConnected =
                false;


            this.connected =
                false;


            this.connecting =
                false;


            this.transport =
                null;


            this.updateStatus(
                "disconnected"
            );


            return true;

        },


        /*
        =================================================
         CLEANUP BLE
        =================================================
         */

        cleanupBLEState(
            keepDevice
        ) {

            this.server =
                null;


            this.service =
                null;


            this.characteristic =
                null;


            if (!keepDevice) {

                /*
                 * Jangan menghapus device.
                 *
                 * Device object diperlukan untuk
                 * reconnect.
                 */

            }


        },


        /*
        =================================================
         SAVE DEVICE INFO
        =================================================
         */

        saveDeviceInfo() {

            try {

                const raw =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_SETTINGS"
                    );


                let settings =
                    {};


                if (raw) {

                    try {

                        settings =
                            JSON.parse(
                                raw
                            );

                    }

                    catch (error) {}

                }


                settings.printerName =
                    this.getDeviceName();


                settings.bluetoothTransport =
                    this.transport;


                localStorage.setItem(

                    "SMARTPRINT_PRINTER_SETTINGS",

                    JSON.stringify(
                        settings
                    )

                );

            }

            catch (error) {

                this.warn(
                    "Gagal menyimpan device info:",
                    error
                );

            }

        },


        /*
        =================================================
         STATUS
        =================================================
         */

        updateStatus(
            state
        ) {

            let text =
                "No Printer";


            let connected =
                false;


            switch (
                state
            ) {

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
                        "Printer Error";

                    break;


                case "disconnected":

                default:

                    text =
                        "No Printer";

                    break;

            }


            /*
             * printerStatus
             */

            const status =
                document.getElementById(
                    "printerStatus"
                );


            if (status) {

                status.textContent =
                    text;

            }


            /*
             * status
             */

            const globalStatus =
                document.getElementById(
                    "status"
                );


            if (globalStatus) {

                globalStatus.textContent =
                    text;

            }


            /*
             * dot
             */

            const dot =
                document.querySelector(
                    ".dot"
                );


            if (dot) {

                dot.classList.toggle(
                    "connected",
                    connected
                );

            }


            /*
             * optional event
             */

            try {

                window.dispatchEvent(

                    new CustomEvent(
                        "smartprint:bluetooth-status",
                        {

                            detail: {

                                state,

                                connected,

                                transport:
                                    this.transport,

                                device:
                                    this.getDeviceName()

                            }

                        }
                    )

                );

            }

            catch (error) {}

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

        },


        /*
        =================================================
         RESET PERMISSION
        =================================================
         */

        async forgetDevices() {

            /*
             * Web Bluetooth tidak menyediakan
             * delete permission universal.

             * disconnect saja.
             */

            await this.disconnect();

            this.device =
                null;

            this.deviceName =
                "";

            return true;

        }

    };


    /*
    =====================================================
     GLOBAL
    =====================================================
     */

    window.Bluetooth =
        Bluetooth;


    window.BluetoothEngine =
        Bluetooth;


    window.SmartPrintBluetooth =
        Bluetooth;


    /*
    =====================================================
     LEGACY API
    =====================================================
     */

    window.bluetoothConnect =
        function () {

            return Bluetooth.connectUser();

        };


    window.bluetoothDisconnect =
        function () {

            return Bluetooth.disconnect();

        };


    /*
    =====================================================
     INIT
    =====================================================
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                Bluetooth.init();

            }
        );

    }

    else {

        Bluetooth.init();

    }


    /*
    =====================================================
     READY
    =====================================================
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
        "API: autoConnect() | connectUser() | " +
        "connectBLE() | connectSerial() | " +
        "connectBridge() | sendRaw()"
    );

})();
