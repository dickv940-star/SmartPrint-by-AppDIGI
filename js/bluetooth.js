"use strict";

/*
=====================================================
 SmartPrint Bluetooth Engine v5.2
=====================================================

 FIX v5.2
 ----------------------------------------------------
 ✓ FIX Web Serial SecurityError
 ✓ Tidak lagi BLE -> Serial fallback setelah await
 ✓ Serial requestPort() hanya dipanggil dari user gesture
 ✓ Auto Connect tidak membuka picker
 ✓ Saved Serial printer tetap bisa dipilih saat Connect
 ✓ Saved BLE device auto reconnect
 ✓ Bridge auto reconnect
 ✓ BLE / Web Bluetooth
 ✓ Bluetooth Classic / SPP via Windows COM
 ✓ Web Serial
 ✓ Android / Classic Bluetooth via Local Bridge
 ✓ Auto reconnect
 ✓ Saved printer
 ✓ Connection status
 ✓ GATT service discovery
 ✓ Write characteristic detection
 ✓ Serial chunking
 ✓ BLE chunking
 ✓ Bridge chunking
 ✓ ESC/POS
 ✓ TSPL
 ✓ ZPL
 ✓ CPCL
 ✓ Compatible PrinterManager v4.0
 ✓ Compatible legacy connectPrinter()
 ✓ Tidak menganggap cancel picker sebagai error

=====================================================
 IMPORTANT
=====================================================

Web Bluetooth:
    BLE / GATT ONLY

Bluetooth Classic:
    Windows → Web Serial / COM
    Android → Local Bridge

Browser tidak dapat mengakses Bluetooth Classic/SPP
secara langsung menggunakan navigator.bluetooth.

=====================================================
 CONNECTION RULE
=====================================================

AUTO MODE:

    Saved BLE
        ↓
    BLE reconnect

    Saved Bridge
        ↓
    Bridge reconnect

    Saved Serial
        ↓
    TIDAK AUTO REQUEST PORT
        ↓
    menunggu tombol Connect

USER CONNECT:

    savedTransport = serial
        ↓
    requestPort()

    savedTransport = bridge
        ↓
    Bridge

    savedTransport = ble
        ↓
    BLE picker

    belum ada saved transport
        ↓
    BLE picker

IMPORTANT:

JANGAN:

    BLE requestDevice()
        ↓ await
    requestPort()

Karena browser akan menolak requestPort()
dengan SecurityError.

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
        // GET SAVED TRANSPORT
        // =================================================

        getSavedTransport() {

            try {

                return localStorage.getItem(
                    "SMARTPRINT_PRINTER_TRANSPORT"
                );

            }

            catch (error) {

                console.warn(
                    "Gagal membaca saved transport:",
                    error
                );

                return null;

            }

        },


        // =================================================
        // CONNECT
        // =================================================
        /*
        IMPORTANT:

        Fungsi ini kompatibel dengan:

            PrinterManager.connect()

        Tetapi tidak boleh melakukan:

            BLE picker
                ↓
            await
                ↓
            Serial picker

        Karena akan menyebabkan SecurityError.

        AUTO MODE sekarang menentukan SATU transport
        sebelum membuka permission picker.
        */

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

                // =================================================
                // AUTO MODE
                // =================================================

                if (
                    this.mode === "auto"
                ) {

                    const savedTransport =
                        this.getSavedTransport();


                    console.log(
                        "Saved Transport:",
                        savedTransport
                    );


                    /*
                    -------------------------------------------------
                    SAVED SERIAL

                    Jika printer sebelumnya adalah Serial,
                    langsung requestPort().

                    Ini aman bila connect() dipanggil langsung
                    dari event klik user.
                    -------------------------------------------------
                    */

                    if (
                        savedTransport === "serial"
                    ) {

                        console.log(
                            "Saved transport = SERIAL"
                        );

                        console.log(
                            "Opening Serial picker..."
                        );


                        const result =
                            await this.connectSerial();


                        if (result) {

                            return true;

                        }


                        this.updateStatus(
                            "disconnected"
                        );

                        return false;

                    }


                    /*
                    -------------------------------------------------
                    SAVED BRIDGE
                    -------------------------------------------------
                    */

                    if (
                        savedTransport === "bridge"
                    ) {

                        console.log(
                            "Saved transport = BRIDGE"
                        );


                        const result =
                            await this.connectBridge();


                        if (result) {

                            return true;

                        }


                        this.updateStatus(
                            "disconnected"
                        );

                        return false;

                    }


                    /*
                    -------------------------------------------------
                    SAVED BLE
                    -------------------------------------------------
                    */

                    if (
                        savedTransport === "ble"
                    ) {

                        console.log(
                            "Saved transport = BLE"
                        );


                        /*
                        Coba reconnect saved BLE
                        tanpa picker terlebih dahulu.
                        */

                        const autoResult =
                            await this.autoConnectBLE();


                        if (autoResult) {

                            return true;

                        }


                        /*
                        Jika gagal, baru buka picker BLE.

                        Tidak pernah fallback otomatis ke Serial.
                        */

                        if (
                            this.isBluetoothSupported()
                        ) {

                            console.log(
                                "BLE Saved Device tidak tersedia."
                            );

                            console.log(
                                "Opening BLE picker..."
                            );


                            const bleResult =
                                await this.connectBLE();


                            if (bleResult) {

                                return true;

                            }

                        }


                        this.updateStatus(
                            "disconnected"
                        );

                        return false;

                    }


                    /*
                    -------------------------------------------------
                    NO SAVED TRANSPORT
                    -------------------------------------------------

                    Default:

                        BLE picker

                    Jangan mencoba Serial setelah BLE
                    karena user gesture dapat hilang.
                    -------------------------------------------------
                    */

                    if (
                        this.isBluetoothSupported()
                    ) {

                        console.log(
                            "No saved transport."
                        );

                        console.log(
                            "Opening BLE picker..."
                        );


                        const bleResult =
                            await this.connectBLE();


                        if (bleResult) {

                            return true;

                        }

                    }


                    /*
                    Tidak ada fallback Serial di sini.

                    User harus klik Connect lagi setelah
                    memilih mode Serial / COM.

                    Ini sengaja untuk menjaga user gesture.
                    */

                    console.log(
                        "BLE tidak terhubung."
                    );

                    console.log(
                        "Serial tidak dipanggil otomatis."
                    );

                    console.log(
                        "Gunakan connectSerial() dari tombol user."
                    );


                    this.updateStatus(
                        "disconnected"
                    );

                    return false;

                }


                // =================================================
                // MANUAL BLE MODE
                // =================================================

                if (
                    this.mode === "ble"
                ) {

                    return await this.connectBLE();

                }


                // =================================================
                // MANUAL SERIAL MODE
                // =================================================

                if (
                    this.mode === "serial"
                ) {

                    return await this.connectSerial();

                }


                // =================================================
                // MANUAL BRIDGE MODE
                // =================================================

                if (
                    this.mode === "bridge"
                ) {

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


                this.resetConnectionState();


                /*
                User cancel BLE / Serial picker
                bukan error aplikasi.
                */

                if (
                    error &&
                    (
                        error.name === "NotFoundError" ||
                        error.name === "AbortError"
                    )
                ) {

                    console.warn(
                        "Pemilihan printer dibatalkan pengguna."
                    );


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                /*
                SecurityError dari requestPort biasanya berarti
                requestPort tidak berasal dari user gesture.

                Kita tampilkan warning yang jelas.
                */

                if (
                    error &&
                    error.name === "SecurityError"
                ) {

                    console.error(
                        "Web Serial membutuhkan user gesture langsung."
                    );


                    console.error(
                        "Pastikan connectSerial() dipanggil langsung dari tombol."
                    );


                    this.updateStatus(
                        "error"
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
        // USER CONNECT
        // =================================================

        /*
        Gunakan fungsi ini bila ingin tombol Connect
        menentukan transport secara eksplisit.

        Contoh:

            Bluetooth.connectUser("ble")

            Bluetooth.connectUser("serial")

            Bluetooth.connectUser("bridge")
        */

        async connectUser(type = null) {

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
                "========================================"
            );


            try {

                const selected =
                    type ||
                    this.getSavedTransport() ||
                    "ble";


                console.log(
                    "Selected Transport:",
                    selected
                );


                // =================================================
                // BLE
                // =================================================

                if (
                    selected === "ble"
                ) {

                    const result =
                        await this.connectBLE();


                    if (result) {

                        this.saveDevice();

                    }


                    return result;

                }


                // =================================================
                // SERIAL
                // =================================================

                if (
                    selected === "serial"
                ) {

                    /*
                    IMPORTANT:

                    requestPort() dipanggil langsung di sini.

                    Jangan melakukan:

                        await connectBLE()
                        await sleep()
                        connectSerial()

                    sebelum requestPort().
                    */

                    const result =
                        await this.connectSerial();


                    if (result) {

                        this.saveDevice();

                    }


                    return result;

                }


                // =================================================
                // BRIDGE
                // =================================================

                if (
                    selected === "bridge"
                ) {

                    const result =
                        await this.connectBridge();


                    if (result) {

                        this.saveDevice();

                    }


                    return result;

                }


                throw new Error(
                    "Transport tidak didukung: " +
                    selected
                );

            }

            catch (error) {

                console.error(
                    "User Connect Error:",
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


            try {

                console.log(
                    "BLE Auto Connect..."
                );


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


                if (!device) {

                    console.log(
                        "Saved BLE device tidak ditemukan."
                    );


                    return false;

                }


                console.log(
                    "Saved BLE Device:",
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


                this.updateStatus(
                    "connected"
                );


                console.log(
                    "BLE Auto Connected:",
                    this.getDeviceName()
                );


                return true;

            }

            catch (error) {

                console.warn(
                    "BLE Auto Connect gagal:",
                    error
                );


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
            PASS 1

            Cari characteristic yang cocok dengan daftar
            printer characteristic.
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
            =================================================
            PASS 2

            Jika tidak menemukan UUID khusus,
            gunakan characteristic writable pertama.
            =================================================
            */

            if (
                !this.writeCharacteristic
            ) {

                for (
                    const service of services
                ) {

                    let characteristics;


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

                        const canWrite =
                            characteristic.properties.write ||
                            characteristic.properties.writeWithoutResponse;


                        if (
                            canWrite
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


            /*
            IMPORTANT:

            requestPort() HARUS dipanggil tanpa menunggu
            proses permission lain sebelumnya.

            Fungsi ini harus dipanggil langsung dari:

                onclick
                addEventListener("click", ...)

            */

            let port;


            try {

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


                if (
                    error &&
                    error.name === "SecurityError"
                ) {

                    console.error(
                        "Serial request membutuhkan user gesture langsung."
                    );


                    throw error;

                }


                throw error;

            }


            if (!port) {

                return false;

            }


            /*
            =================================================
            OPEN PORT
            =================================================
            */

            try {

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

            catch (error) {

                console.error(
                    "Serial port open gagal:",
                    error
                );


                throw error;

            }


            this.port =
                port;


            this.writer =
                port.writable
                    ? port.writable.getWriter()
                    : null;


            if (!this.writer) {

                try {

                    await port.close();

                }

                catch (_) {}


                this.port =
                    null;


                throw new Error(
                    "Serial port tidak dapat ditulis."
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
                savedTransport === "ble"
            ) {

                const result =
                    await this.autoConnectBLE();


                if (result) {

                    return true;

                }

            }


            /*
            =================================================
            BRIDGE
            =================================================
            */

            if (
                savedTransport === "bridge"
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
            =================================================

            Jangan requestPort otomatis.

            Browser membutuhkan user gesture.
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
                    "Menunggu tombol Connect manual."
                );


                return false;

            }


            console.log(
                "Tidak ada printer yang dapat auto-connect."
            );


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


                    this.connected =
                        false;

                }

                finally {

                    this.connecting =
                        false;

                }

            }


            if (
                this.transport === "bridge"
            ) {

                return await this.connectBridge();

            }


            if (
                this.transport === "serial"
            ) {

                console.warn(
                    "Serial reconnect membutuhkan pemilihan COM port."
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


            // =================================================
            // BLE
            // =================================================

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


            // =================================================
            // SERIAL
            // =================================================

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


            // =================================================
            // BRIDGE
            // =================================================

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
                    characteristic.properties &&
                    characteristic.properties.writeWithoutResponse &&
                    typeof characteristic.writeValueWithoutResponse ===
                    "function"
                ) {

                    await characteristic
                        .writeValueWithoutResponse(
                            chunk
                        );

                }

                else if (
                    characteristic.properties &&
                    characteristic.properties.write &&
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


            try {

                for (
                    let offset = 0;
                    offset < bytes.length;
                    offset += this.chunkSize
                ) {

                    const end =
                        Math.min(
                            offset + this.chunkSize,
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


                    const percent =
                        Math.round(
                            (end / bytes.length) * 100
                        );


                    if (
                        offset === 0 ||
                        end >= bytes.length ||
                        offset % 10000 < this.chunkSize
                    ) {

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

            }

            catch (error) {

                console.error(
                    "Serial Write Error:",
                    error
                );


                throw error;

            }

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


            // =================================================
            // BLE
            // =================================================

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


            // =================================================
            // SERIAL
            // =================================================

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


            // =================================================
            // BRIDGE
            // =================================================

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

            catch (error) {

                console.warn(
                    "Gagal menghapus printer tersimpan:",
                    error
                );

            }


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


                case "disconnected":

                    text =
                        "No Printer";

                    break;


                case "error":

                    text =
                        "Bluetooth Error";

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
    // OPTIONAL DIRECT SERIAL
    // =====================================================

    /*
    Gunakan ini untuk tombol khusus:

        Bluetooth.connectSerial()

    Contoh:

        button.addEventListener(
            "click",
            () => Bluetooth.connectSerial()
        );

    */

    window.connectSerialPrinter =
        function () {

            return Bluetooth.connectSerial();

        };


    // =====================================================
    // OPTIONAL DIRECT BLE
    // =====================================================

    window.connectBLEPrinter =
        function () {

            return Bluetooth.connectBLE();

        };


    // =====================================================
    // OPTIONAL DIRECT BRIDGE
    // =====================================================

    window.connectBridgePrinter =
        function () {

            return Bluetooth.connectBridge();

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
        "Web Serial user-gesture protection: ACTIVE"
    );

    console.log(
        "========================================"
    );

})();
