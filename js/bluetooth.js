"use strict";

/*
===========================================================
 SMARTPRINT BLUETOOTH ENGINE v5.4
===========================================================

 TRANSPORT
 ----------------------------------------------------------
 1. Bluetooth Classic / Serial COM   ← PRIORITAS
 2. Web Bluetooth BLE
 3. Bridge / kompatibilitas future

 KOMPATIBEL DENGAN
 ----------------------------------------------------------
 ✓ PrinterManager v4.1
 ✓ TSPL
 ✓ ESC/POS
 ✓ ZPL
 ✓ CPCL
 ✓ Web Serial API
 ✓ Web Bluetooth API

 API UTAMA
 ----------------------------------------------------------
 Bluetooth.connect()
 Bluetooth.connectSerial()
 Bluetooth.connectBLE()
 Bluetooth.autoConnect()
 Bluetooth.disconnect()
 Bluetooth.isConnected()
 Bluetooth.getDeviceName()
 Bluetooth.send()
 Bluetooth.write()

 CATATAN PENTING
 ----------------------------------------------------------
 Web Serial requestPort() HARUS dipanggil dari user gesture.

 Karena itu:
 ✓ connectSerial()       → untuk tombol Connect
 ✓ autoConnect()         → hanya getPorts(), tanpa picker
 ✗ autoConnect()         → TIDAK requestPort()

===========================================================
*/

(function () {

    "use strict";


    // =====================================================
    // CONSTANTS
    // =====================================================

    const VERSION =
        "5.4.0";


    const SETTINGS_KEY =
        "SMARTPRINT_BLUETOOTH_SETTINGS";


    const TRANSPORT_SERIAL =
        "serial";


    const TRANSPORT_BLE =
        "ble";


    const TRANSPORT_NONE =
        "none";


    // =====================================================
    // BLE UUID CANDIDATES
    // =====================================================

    /*
    Banyak printer BLE thermal menggunakan UUID
    berbeda-beda.

    Kita mencoba beberapa UUID umum.

    Jika printer menggunakan BLE custom UUID,
    characteristic dapat ditemukan melalui discovery.
    */

    const BLE_SERVICES = [

        "0000ffe0-0000-1000-8000-00805f9b34fb",

        "0000ff00-0000-1000-8000-00805f9b34fb",

        "000018f0-0000-1000-8000-00805f9b34fb",

        "49535343-fe7d-4ae5-8fa9-9fafd205e455",

        "e7810a71-73ae-499d-8c15-faa9aef0c3f2"

    ];


    const BLE_CHARACTERISTICS = [

        "0000ffe1-0000-1000-8000-00805f9b34fb",

        "0000ff02-0000-1000-8000-00805f9b34fb",

        "0000ff01-0000-1000-8000-00805f9b34fb",

        "49535343-8841-43f4-a8d4-ecbe34729bb3",

        "49535343-1e4d-4bd9-ba61-23c647249616",

        "e7810a71-73ae-499d-8c15-faa9aef0c3f3"

    ];


    // =====================================================
    // ENGINE
    // =====================================================

    const Bluetooth = {


        // =================================================
        // VERSION
        // =================================================

        version:
            VERSION,


        // =================================================
        // CAPABILITIES
        // =================================================

        capabilities: {

            bluetooth:
                "bluetooth" in navigator,

            serial:
                "serial" in navigator,

            bridge:
                true

        },


        // =================================================
        // STATE
        // =================================================

        connected:
            false,


        connecting:
            false,


        transport:
            TRANSPORT_NONE,


        device:
            null,


        port:
            null,


        characteristic:
            null,


        server:
            null,


        service:
            null,


        writer:
            null,


        deviceName:
            "",


        serialConnected:
            false,


        bleConnected:
            false,


        initialized:
            false,


        lastError:
            null,


        // =================================================
        // INIT
        // =================================================

        init() {

            if (
                this.initialized
            ) {

                return true;

            }


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
                "Transport: BLE + Serial + Classic Bridge"
            );

            console.log(
                "Capabilities:",
                this.capabilities
            );


            this.loadSettings();


            this.initialized =
                true;


            /*
            Listener untuk BLE disconnect.
            */

            this.setupBLEListeners();


            return true;

        },


        // =================================================
        // SETUP BLE LISTENER
        // =================================================

        setupBLEListeners() {

            /*
            Listener dipasang ketika device sudah tersedia.
            */

        },


        // =================================================
        // CONNECT
        // =================================================

        async connect() {

            if (
                this.connecting
            ) {

                console.warn(
                    "Bluetooth sedang connecting."
                );

                return false;

            }


            this.connecting =
                true;


            this.lastError =
                null;


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT BLUETOOTH USER CONNECT v5.4"
            );

            console.log(
                "========================================"
            );


            try {

                /*
                =================================================
                PRIORITAS 1
                SERIAL / BLUETOOTH CLASSIC
                =================================================

                Untuk printer Bluetooth Classic yang muncul
                sebagai COM di Windows.

                requestPort() dipanggil dari tombol user.
                */

                if (
                    this.capabilities.serial
                ) {

                    console.log(
                        "User Connect → Bluetooth Classic / Serial"
                    );


                    const serialResult =
                        await this.connectSerial();


                    if (
                        serialResult
                    ) {

                        console.log(
                            "Bluetooth Classic / Serial Connected"
                        );

                        return true;

                    }

                }


                /*
                =================================================
                PRIORITAS 2
                BLE
                =================================================

                Hanya dicoba jika Serial gagal.
                */

                if (
                    this.capabilities.bluetooth
                ) {

                    console.log(
                        "Serial gagal → mencoba BLE"
                    );


                    const bleResult =
                        await this.connectBLE();


                    if (
                        bleResult
                    ) {

                        return true;

                    }

                }


                throw new Error(
                    "Tidak ada transport Bluetooth yang berhasil."
                );

            }

            catch (error) {

                this.lastError =
                    error;


                console.error(
                    "Bluetooth Connect Error:",
                    error
                );


                this.connected =
                    false;


                return false;

            }

            finally {

                this.connecting =
                    false;

            }

        },


        // =================================================
        // SERIAL CONNECT
        // =================================================

        async connectSerial() {

            if (
                !this.capabilities.serial
            ) {

                console.warn(
                    "Web Serial tidak tersedia."
                );

                return false;

            }


            /*
            Jangan menjalankan connectSerial dua kali.
            */

            if (
                this.serialConnected &&
                this.port
            ) {

                console.log(
                    "Serial sudah terhubung."
                );

                return true;

            }


            try {

                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT SERIAL CONNECT v5.4"
                );

                console.log(
                    "========================================"
                );


                let port =
                    null;


                /*
                =================================================
                STEP 1
                CARI PORT YANG SUDAH DIBERI PERMISSION
                =================================================
                */

                try {

                    const ports =
                        await navigator.serial.getPorts();


                    if (
                        ports &&
                        ports.length
                    ) {

                        /*
                        Gunakan port pertama yang sudah
                        mendapat permission.

                        Ini TIDAK membutuhkan user gesture.
                        */

                        port =
                            ports[0];


                        console.log(
                            "Saved Serial Port ditemukan."
                        );

                    }

                }

                catch (error) {

                    console.warn(
                        "getPorts() gagal:",
                        error
                    );

                }


                /*
                =================================================
                STEP 2
                REQUEST PORT
                =================================================

                Ini hanya boleh dilakukan dari klik user.

                Jika user membatalkan picker,
                kita return false dengan aman.
                */

                if (
                    !port
                ) {

                    console.log(
                        "Membuka Serial Port Picker..."
                    );


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
                                "Serial Port picker dibatalkan."
                            );

                            return false;

                        }


                        throw error;

                    }

                }


                if (
                    !port
                ) {

                    return false;

                }


                /*
                =================================================
                STEP 3
                OPEN PORT
                =================================================
                */

                if (
                    !port.readable ||
                    !port.writable
                ) {

                    try {

                        await port.open({

                            baudRate:
                                9600,

                            dataBits:
                                8,

                            stopBits:
                                1,

                            parity:
                                "none",

                            flowControl:
                                "none"

                        });

                    }

                    catch (openError) {

                        /*
                        Beberapa printer COM mungkin
                        membutuhkan baud rate berbeda.

                        Coba 115200 sebagai fallback.
                        */

                        console.warn(
                            "Open 9600 gagal, mencoba 115200...",
                            openError
                        );


                        try {

                            await port.open({

                                baudRate:
                                    115200,

                                dataBits:
                                    8,

                                stopBits:
                                    1,

                                parity:
                                    "none",

                                flowControl:
                                    "none"

                            });

                        }

                        catch (secondError) {

                            console.error(
                                "Serial Port gagal dibuka:",
                                secondError
                            );

                            return false;

                        }

                    }

                }


                /*
                =================================================
                SAVE
                =================================================
                */

                this.port =
                    port;


                this.transport =
                    TRANSPORT_SERIAL;


                this.serialConnected =
                    true;


                this.bleConnected =
                    false;


                this.connected =
                    true;


                this.device =
                    null;


                this.writer =
                    null;


                /*
                Device name Web Serial biasanya tidak
                tersedia secara langsung.

                Berikan nama generic terlebih dahulu.
                */

                this.deviceName =
                    this.getSerialPortName(
                        port
                    );


                this.saveSettings();


                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT SERIAL CONNECTED"
                );

                console.log(
                    "Port:",
                    this.deviceName
                );

                console.log(
                    "Transport:",
                    this.transport
                );

                console.log(
                    "========================================"
                );


                return true;

            }

            catch (error) {

                this.lastError =
                    error;


                console.error(
                    "Serial Connect Error:",
                    error
                );


                this.serialConnected =
                    false;


                this.connected =
                    false;


                this.port =
                    null;


                return false;

            }

        },


        // =================================================
        // SERIAL PORT NAME
        // =================================================

        getSerialPortName(port) {

            try {

                if (
                    !port
                ) {

                    return "Bluetooth Serial";

                }


                /*
                Web Serial tidak selalu memberikan
                nama COM port.

                getInfo() bisa memberikan USB VID/PID,
                tetapi Bluetooth Classic kadang kosong.
                */

                if (
                    typeof port.getInfo ===
                    "function"
                ) {

                    const info =
                        port.getInfo();


                    if (
                        info &&
                        (
                            info.usbVendorId ||
                            info.usbProductId
                        )
                    ) {

                        return (
                            "Bluetooth Serial " +
                            (
                                info.usbVendorId
                                    ? "VID:" +
                                      info.usbVendorId
                                    : ""
                            ) +
                            (
                                info.usbProductId
                                    ? " PID:" +
                                      info.usbProductId
                                    : ""
                            )
                        );

                    }

                }

            }

            catch (error) {

                console.warn(
                    "Serial info tidak tersedia:",
                    error
                );

            }


            return "Bluetooth Serial";

        },


        // =================================================
        // BLE CONNECT
        // =================================================

        async connectBLE() {

            if (
                !this.capabilities.bluetooth
            ) {

                console.warn(
                    "Web Bluetooth tidak tersedia."
                );

                return false;

            }


            if (
                this.bleConnected &&
                this.device
            ) {

                return true;

            }


            try {

                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT BLE CONNECT v5.4"
                );

                console.log(
                    "========================================"
                );


                /*
                =================================================
                REQUEST DEVICE
                =================================================

                acceptAllDevices digunakan agar printer
                thermal BLE yang tidak memiliki nama/service
                standar tetap dapat muncul.

                Ini berbeda dari versi lama yang terlalu
                ketat menggunakan filter.
                */

                const optionalServices =
                    [
                        ...BLE_SERVICES
                    ];


                const device =
                    await navigator.bluetooth.requestDevice({

                        acceptAllDevices:
                            true,

                        optionalServices:
                            optionalServices

                    });


                if (
                    !device
                ) {

                    console.warn(
                        "Tidak ada BLE device."
                    );

                    return false;

                }


                this.device =
                    device;


                this.deviceName =
                    device.name ||
                    "Bluetooth BLE Printer";


                console.log(
                    "BLE Device:",
                    this.deviceName
                );


                /*
                =================================================
                DEVICE DISCONNECT
                =================================================
                */

                if (
                    typeof device.addEventListener ===
                    "function"
                ) {

                    device.addEventListener(
                        "gattserverdisconnected",
                        () => {

                            console.warn(
                                "BLE device disconnected."
                            );


                            this.bleConnected =
                                false;


                            if (
                                this.transport ===
                                TRANSPORT_BLE
                            ) {

                                this.connected =
                                    false;

                            }

                        }
                    );

                }


                /*
                =================================================
                CONNECT GATT
                =================================================
                */

                if (
                    !device.gatt
                ) {

                    throw new Error(
                        "BLE GATT tidak tersedia."
                    );

                }


                this.server =
                    await device.gatt.connect();


                /*
                =================================================
                DISCOVER CHARACTERISTIC
                =================================================
                */

                const found =
                    await this.findBLECharacteristic();


                if (
                    !found
                ) {

                    throw new Error(
                        "BLE printer terdeteksi tetapi write characteristic tidak ditemukan."
                    );

                }


                this.transport =
                    TRANSPORT_BLE;


                this.bleConnected =
                    true;


                this.serialConnected =
                    false;


                this.connected =
                    true;


                this.saveSettings();


                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT BLE CONNECTED"
                );

                console.log(
                    "Device:",
                    this.deviceName
                );

                console.log(
                    "Transport:",
                    this.transport
                );

                console.log(
                    "========================================"
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

                    console.warn(
                        "BLE device picker dibatalkan."
                    );

                }

                else {

                    console.error(
                        "BLE Connect Error:",
                        error
                    );

                }


                this.bleConnected =
                    false;


                /*
                Jangan memutus Serial yang sudah
                berhasil sebelumnya.
                */

                if (
                    !this.serialConnected
                ) {

                    this.connected =
                        false;

                }


                return false;

            }

        },


        // =================================================
        // FIND BLE CHARACTERISTIC
        // =================================================

        async findBLECharacteristic() {

            if (
                !this.server
            ) {

                return false;

            }


            /*
            =================================================
            COBA SERVICE UUID YANG DIKENAL
            =================================================
            */

            for (
                const serviceUUID of BLE_SERVICES
            ) {

                try {

                    const service =
                        await this.server.getPrimaryService(
                            serviceUUID
                        );


                    if (
                        !service
                    ) {

                        continue;

                    }


                    this.service =
                        service;


                    console.log(
                        "BLE Service ditemukan:",
                        serviceUUID
                    );


                    /*
                    -----------------------------------------
                    COBA CHARACTERISTIC UUID YANG DIKENAL
                    -----------------------------------------
                    */

                    for (
                        const charUUID of
                        BLE_CHARACTERISTICS
                    ) {

                        try {

                            const characteristic =
                                await service.getCharacteristic(
                                    charUUID
                                );


                            if (
                                characteristic &&
                                this.canWriteCharacteristic(
                                    characteristic
                                )
                            ) {

                                this.characteristic =
                                    characteristic;


                                console.log(
                                    "BLE Write Characteristic:",
                                    charUUID
                                );


                                return true;

                            }

                        }

                        catch (error) {

                            /*
                            Characteristic tidak ada.
                            Lanjutkan pencarian.
                            */

                        }

                    }


                    /*
                    -----------------------------------------
                    DISCOVER SEMUA CHARACTERISTIC
                    -----------------------------------------
                    */

                    try {

                        const characteristics =
                            await service.getCharacteristics();


                        for (
                            const characteristic
                            of characteristics
                        ) {

                            if (
                                this.canWriteCharacteristic(
                                    characteristic
                                )
                            ) {

                                this.characteristic =
                                    characteristic;


                                console.log(
                                    "BLE Write Characteristic ditemukan melalui discovery."
                                );


                                return true;

                            }

                        }

                    }

                    catch (error) {

                        console.warn(
                            "BLE characteristic discovery gagal:",
                            error
                        );

                    }

                }

                catch (error) {

                    /*
                    Service tidak ditemukan.
                    Lanjutkan UUID berikutnya.
                    */

                }

            }


            /*
            =================================================
            FALLBACK
            =================================================

            Ambil semua primary services yang diizinkan.
            */

            try {

                const services =
                    await this.server.getPrimaryServices();


                for (
                    const service
                    of services
                ) {

                    try {

                        const characteristics =
                            await service.getCharacteristics();


                        for (
                            const characteristic
                            of characteristics
                        ) {

                            if (
                                this.canWriteCharacteristic(
                                    characteristic
                                )
                            ) {

                                this.service =
                                    service;


                                this.characteristic =
                                    characteristic;


                                console.log(
                                    "BLE characteristic fallback ditemukan."
                                );


                                return true;

                            }

                        }

                    }

                    catch (error) {

                        // continue

                    }

                }

            }

            catch (error) {

                console.warn(
                    "BLE fallback discovery gagal:",
                    error
                );

            }


            return false;

        },


        // =================================================
        // CAN WRITE CHARACTERISTIC
        // =================================================

        canWriteCharacteristic(
            characteristic
        ) {

            if (
                !characteristic
            ) {

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


        // =================================================
        // AUTO CONNECT
        // =================================================

        async autoConnect() {

            /*
            =================================================
            PENTING

            Fungsi ini TIDAK boleh menggunakan:

                navigator.serial.requestPort()

            karena autoConnect bukan user gesture.

            Kita hanya mencari port yang sebelumnya
            sudah diberi permission.
            =================================================
            */

            console.log(
                "SmartPrint Bluetooth Auto Connect..."
            );


            /*
            =================================================
            SERIAL AUTO CONNECT
            =================================================
            */

            if (
                this.capabilities.serial
            ) {

                try {

                    const ports =
                        await navigator.serial.getPorts();


                    if (
                        ports &&
                        ports.length
                    ) {

                        console.log(
                            "Saved Serial printer ditemukan."
                        );


                        const port =
                            ports[0];


                        this.port =
                            port;


                        /*
                        Port mungkin masih terbuka.
                        */

                        if (
                            !port.readable ||
                            !port.writable
                        ) {

                            try {

                                await port.open({

                                    baudRate:
                                        9600,

                                    dataBits:
                                        8,

                                    stopBits:
                                        1,

                                    parity:
                                        "none",

                                    flowControl:
                                        "none"

                                });

                            }

                            catch (error) {

                                console.warn(
                                    "Serial auto open gagal:",
                                    error
                                );

                                return false;

                            }

                        }


                        this.transport =
                            TRANSPORT_SERIAL;


                        this.serialConnected =
                            true;


                        this.bleConnected =
                            false;


                        this.connected =
                            true;


                        this.deviceName =
                            this.getSerialPortName(
                                port
                            );


                        console.log(
                            "Serial Auto Connected:",
                            this.deviceName
                        );


                        return true;

                    }

                }

                catch (error) {

                    console.warn(
                        "Serial auto-connect gagal:",
                        error
                    );

                }

            }


            /*
            =================================================
            BLE AUTO CONNECT
            =================================================

            Web Bluetooth device yang sudah pernah
            dipair dapat dicari menggunakan getDevices()
            pada browser yang mendukungnya.

            Tidak semua Chrome environment mendukung.
            */

            if (
                this.capabilities.bluetooth &&
                navigator.bluetooth &&
                typeof navigator.bluetooth.getDevices ===
                "function"
            ) {

                try {

                    const devices =
                        await navigator.bluetooth.getDevices();


                    if (
                        devices &&
                        devices.length
                    ) {

                        for (
                            const device
                            of devices
                        ) {

                            try {

                                if (
                                    !device.gatt
                                ) {

                                    continue;

                                }


                                this.device =
                                    device;


                                this.deviceName =
                                    device.name ||
                                    "Bluetooth BLE Printer";


                                this.server =
                                    await device.gatt.connect();


                                const found =
                                    await this.findBLECharacteristic();


                                if (
                                    found
                                ) {

                                    this.transport =
                                        TRANSPORT_BLE;


                                    this.bleConnected =
                                        true;


                                    this.serialConnected =
                                        false;


                                    this.connected =
                                        true;


                                    console.log(
                                        "BLE Auto Connected:",
                                        this.deviceName
                                    );


                                    return true;

                                }

                            }

                            catch (error) {

                                console.warn(
                                    "BLE auto device gagal:",
                                    error
                                );

                            }

                        }

                    }

                }

                catch (error) {

                    console.warn(
                        "BLE getDevices() gagal:",
                        error
                    );

                }

            }


            console.log(
                "Tidak ada printer yang dapat auto-connect."
            );


            return false;

        },


        // =================================================
        // SEND
        // =================================================

        async send(data) {

            if (
                !this.isConnected()
            ) {

                throw new Error(
                    "Bluetooth belum terhubung."
                );

            }


            if (
                data ===
                undefined ||
                data ===
                null
            ) {

                throw new Error(
                    "Data print kosong."
                );

            }


            /*
            =================================================
            NORMALIZE DATA
            =================================================
            */

            const bytes =
                this.toUint8Array(
                    data
                );


            if (
                !bytes ||
                !bytes.length
            ) {

                throw new Error(
                    "Data print tidak valid."
                );

            }


            /*
            =================================================
            SERIAL
            =================================================
            */

            if (
                this.transport ===
                TRANSPORT_SERIAL
            ) {

                return await this.sendSerial(
                    bytes
                );

            }


            /*
            =================================================
            BLE
            =================================================
            */

            if (
                this.transport ===
                TRANSPORT_BLE
            ) {

                return await this.sendBLE(
                    bytes
                );

            }


            throw new Error(
                "Transport Bluetooth tidak diketahui."
            );

        },


        // =================================================
        // WRITE ALIAS
        // =================================================

        async write(data) {

            return await this.send(
                data
            );

        },


        // =================================================
        // SEND SERIAL
        // =================================================

        async sendSerial(bytes) {

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
                    "Serial port tidak writable."
                );

            }


            let writer =
                null;


            try {

                writer =
                    this.port.writable.getWriter();


                /*
                Web Serial dapat menerima Uint8Array
                secara langsung.
                */

                await writer.write(
                    bytes
                );


                console.log(
                    "Serial data sent:",
                    bytes.length,
                    "bytes"
                );


                return true;

            }

            finally {

                if (
                    writer
                ) {

                    try {

                        writer.releaseLock();

                    }

                    catch (error) {

                        // ignore

                    }

                }

            }

        },


        // =================================================
        // SEND BLE
        // =================================================

        async sendBLE(bytes) {

            if (
                !this.characteristic
            ) {

                throw new Error(
                    "BLE write characteristic tidak tersedia."
                );

            }


            /*
            BLE memiliki ukuran paket terbatas.

            Kita kirim secara chunk.
            */

            const characteristic =
                this.characteristic;


            const useWithoutResponse =
                Boolean(
                    characteristic.properties &&
                    characteristic.properties.writeWithoutResponse &&
                    !characteristic.properties.write
                );


            /*
            MTU aman untuk sebagian besar printer BLE.
            */

            const chunkSize =
                180;


            for (
                let offset = 0;
                offset < bytes.length;
                offset += chunkSize
            ) {

                const chunk =
                    bytes.slice(
                        offset,
                        Math.min(
                            offset +
                            chunkSize,
                            bytes.length
                        )
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
                    typeof characteristic.writeValueWithoutResponse ===
                    "function" &&
                    characteristic.properties &&
                    characteristic.properties.writeWithoutResponse
                ) {

                    await characteristic.writeValueWithoutResponse(
                        chunk
                    );

                }

                else {

                    await characteristic.writeValue(
                        chunk
                    );

                }


                /*
                Beri jeda kecil agar printer BLE tidak
                overflow buffer.
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


            console.log(
                "BLE data sent:",
                bytes.length,
                "bytes"
            );


            return true;

        },


        // =================================================
        // TO UINT8 ARRAY
        // =================================================

        toUint8Array(data) {

            /*
            Uint8Array
            */

            if (
                data instanceof Uint8Array
            ) {

                return data;

            }


            /*
            ArrayBuffer
            */

            if (
                data instanceof ArrayBuffer
            ) {

                return new Uint8Array(
                    data
                );

            }


            /*
            DataView
            */

            if (
                data instanceof DataView
            ) {

                return new Uint8Array(
                    data.buffer,
                    data.byteOffset,
                    data.byteLength
                );

            }


            /*
            Array number
            */

            if (
                Array.isArray(data)
            ) {

                return new Uint8Array(
                    data
                );

            }


            /*
            String
            */

            if (
                typeof data ===
                "string"
            ) {

                return new TextEncoder().encode(
                    data
                );

            }


            throw new Error(
                "Format data Bluetooth tidak didukung."
            );

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            /*
            SERIAL
            */

            if (
                this.transport ===
                TRANSPORT_SERIAL
            ) {

                this.connected =
                    Boolean(
                        this.port &&
                        this.serialConnected
                    );


                return this.connected;

            }


            /*
            BLE
            */

            if (
                this.transport ===
                TRANSPORT_BLE
            ) {

                const gattConnected =
                    Boolean(
                        this.device &&
                        this.device.gatt &&
                        this.device.gatt.connected
                    );


                this.connected =
                    Boolean(
                        this.bleConnected &&
                        gattConnected
                    );


                return this.connected;

            }


            return false;

        },


        // =================================================
        // GET DEVICE NAME
        // =================================================

        getDeviceName() {

            return (
                this.deviceName ||
                (
                    this.transport ===
                    TRANSPORT_SERIAL
                        ? "Bluetooth Serial"
                        : ""
                )
            );

        },


        // =================================================
        // GET TRANSPORT
        // =================================================

        getTransport() {

            return this.transport;

        },


        // =================================================
        // GET STATUS
        // =================================================

        getStatus() {

            return {

                connected:
                    this.isConnected(),

                connecting:
                    this.connecting,

                transport:
                    this.transport,

                deviceName:
                    this.getDeviceName(),

                serial:
                    this.serialConnected,

                ble:
                    this.bleConnected,

                capabilities:
                    {
                        ...this.capabilities
                    },

                error:
                    this.lastError

            };

        },


        // =================================================
        // DISCONNECT
        // =================================================

        async disconnect() {

            console.log(
                "SmartPrint Bluetooth Disconnect..."
            );


            /*
            =================================================
            SERIAL
            =================================================
            */

            if (
                this.port
            ) {

                try {

                    if (
                        this.port.readable ||
                        this.port.writable
                    ) {

                        await this.port.close();

                    }

                }

                catch (error) {

                    console.warn(
                        "Serial close error:",
                        error
                    );

                }

            }


            /*
            =================================================
            BLE
            =================================================
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
            =================================================
            RESET STATE
            =================================================
            */

            this.port =
                null;


            this.device =
                null;


            this.server =
                null;


            this.service =
                null;


            this.characteristic =
                null;


            this.writer =
                null;


            this.connected =
                false;


            this.serialConnected =
                false;


            this.bleConnected =
                false;


            this.transport =
                TRANSPORT_NONE;


            console.log(
                "Bluetooth Disconnected."
            );


            return true;

        },


        // =================================================
        // SAVE SETTINGS
        // =================================================

        saveSettings() {

            try {

                localStorage.setItem(

                    SETTINGS_KEY,

                    JSON.stringify({

                        transport:
                            this.transport,

                        deviceName:
                            this.deviceName

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


        // =================================================
        // LOAD SETTINGS
        // =================================================

        loadSettings() {

            try {

                const raw =
                    localStorage.getItem(
                        SETTINGS_KEY
                    );


                if (
                    !raw
                ) {

                    return;

                }


                const settings =
                    JSON.parse(
                        raw
                    );


                if (
                    settings.deviceName
                ) {

                    this.deviceName =
                        settings.deviceName;

                }

                /*
                Transport tidak langsung dipakai untuk
                koneksi otomatis karena port/device harus
                diverifikasi terlebih dahulu.
                */

            }

            catch (error) {

                console.warn(
                    "Bluetooth settings gagal dibaca:",
                    error
                );

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


    window.SmartPrintBluetooth =
        Bluetooth;


    // =====================================================
    // INIT
    // =====================================================

    Bluetooth.init();


    // =====================================================
    // LOG
    // =====================================================

    console.log(
        "========================================"
    );

    console.log(
        "SmartPrint Bluetooth Engine v5.4 Ready"
    );

    console.log(
        "Transport: BLE + Serial + Classic Bridge"
    );

    console.log(
        "========================================"
    );


})();
