/*
=========================================================
 SmartPrint Bluetooth Engine v6.0.0
 Universal BLE Thermal Printer Transport
=========================================================

 TARGET
 --------------------------------------------------------
 BLE thermal printer
 Label printer
 POS printer
 ESC/POS printer
 TSPL printer
 ZPL printer
 CPCL printer

 DESIGN
 --------------------------------------------------------
 1. User memilih device melalui Bluetooth picker
 2. acceptAllDevices = true
 3. optionalServices memberi akses ke service printer
 4. Scan seluruh primary services
 5. Scan seluruh characteristics
 6. Cari WRITE characteristic
 7. Prioritas:
      writeWithoutResponse
      write
 8. sendRaw(Uint8Array)
 9. Tidak menggunakan TextEncoder
10. Tidak menggunakan Base64
11. Diagnostic tersedia:
      Bluetooth.diagnosePrinter()
=========================================================
*/

(function () {

    "use strict";

    const VERSION = "6.0.0";

    let device = null;
    let server = null;
    let writeCharacteristic = null;
    let notifyCharacteristic = null;

    let serialPort = null;
    let serialWriter = null;

    let bridgeConnected = false;
    let connecting = false;

    let disconnectHandlerDevice = null;
    let notificationHandlerCharacteristic = null;


    /*
    =====================================================
     CONFIG
    =====================================================
    */

    const CONFIG = {

        /*
         * 20 byte aman untuk banyak BLE printer.
         */

        bleChunkSize: 20,

        /*
         * Delay antar packet.
         */

        bleChunkDelay: 8,

        /*
         * Service UUID umum printer BLE.
         */

        optionalServices: [

            "0000ffe0-0000-1000-8000-00805f9b34fb",

            "0000ffe5-0000-1000-8000-00805f9b34fb",

            "0000fff0-0000-1000-8000-00805f9b34fb",

            "0000ff00-0000-1000-8000-00805f9b34fb",

            "000018f0-0000-1000-8000-00805f9b34fb",

            "000018ff-0000-1000-8000-00805f9b34fb",

            /*
             * Nordic UART
             */

            "6e400001-b5a3-f393-e0a9-e50e24dcca9e",

            /*
             * Serial service
             */

            "00001101-0000-1000-8000-00805f9b34fb"

        ]

    };


    /*
    =====================================================
     LOG
    =====================================================
    */

    function log() {

        console.log(
            "[SmartPrint Bluetooth]",
            ...arguments
        );

    }


    function warn() {

        console.warn(
            "[SmartPrint Bluetooth]",
            ...arguments
        );

    }


    function error() {

        console.error(
            "[SmartPrint Bluetooth]",
            ...arguments
        );

    }


    /*
    =====================================================
     SLEEP
    =====================================================
    */

    function sleep(ms) {

        return new Promise(function (resolve) {

            setTimeout(resolve, ms);

        });

    }


    /*
    =====================================================
     SUPPORT
    =====================================================
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
    =====================================================
     NORMALIZE RAW DATA
    =====================================================
    */

    function normalizeBytes(data) {

        if (data instanceof Uint8Array) {

            return data;

        }


        if (data instanceof ArrayBuffer) {

            return new Uint8Array(data);

        }


        if (ArrayBuffer.isView(data)) {

            return new Uint8Array(

                data.buffer,

                data.byteOffset,

                data.byteLength

            );

        }


        throw new TypeError(

            "SmartPrint Bluetooth: data harus Uint8Array, ArrayBuffer, atau TypedArray."

        );

    }


    /*
    =====================================================
     EVENT
    =====================================================
    */

    function dispatch(name, detail) {

        try {

            window.dispatchEvent(

                new CustomEvent(

                    "smartprint-bluetooth-" + name,

                    {

                        detail: detail || {}

                    }

                )

            );

        }

        catch (e) {}

    }


    /*
    =====================================================
     DEVICE
    =====================================================
    */

    function getDeviceName() {

        if (!device) {

            return "";

        }

        return device.name || "";

    }


    function getDevice() {

        return device;

    }


    /*
    =====================================================
     CONNECTION
    =====================================================
    */

    function isBLEConnected() {

        return (

            !!device &&

            !!device.gatt &&

            device.gatt.connected === true

        );

    }


    function isConnected() {

        if (isBLEConnected()) {

            return true;

        }


        if (serialPort) {

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


        if (bridgeConnected) {

            return true;

        }


        return false;

    }


    function getConnectionType() {

        if (isBLEConnected()) {

            return "BLE";

        }


        if (serialPort) {

            return "SERIAL";

        }


        if (bridgeConnected) {

            return "BRIDGE";

        }


        return null;

    }


    /*
    =====================================================
     CLEAR
    =====================================================
    */

    function clearCharacteristics() {

        writeCharacteristic = null;

        notifyCharacteristic = null;

        notificationHandlerCharacteristic = null;

    }


    /*
    =====================================================
     DISCONNECT EVENT
    =====================================================
    */

    function handleDisconnected(event) {

        log(

            "BLE printer disconnected:",

            event && event.target

                ? event.target.name

                : getDeviceName()

        );


        server = null;

        clearCharacteristics();


        dispatch(

            "disconnected",

            {

                device: device

            }

        );


        dispatch(

            "status",

            {

                connected: false,

                type: null,

                device: device

            }

        );

    }


    /*
    =====================================================
     ATTACH DISCONNECT
    =====================================================
    */

    function attachDisconnectHandler(target) {

        if (!target) {

            return;

        }


        if (

            disconnectHandlerDevice === target

        ) {

            return;

        }


        try {

            target.addEventListener(

                "gattserverdisconnected",

                handleDisconnected

            );


            disconnectHandlerDevice = target;

        }

        catch (e) {

            warn(

                "Gagal memasang disconnect handler:",

                e

            );

        }

    }


    /*
    =====================================================
     SAVE DEVICE
    =====================================================
    */

    function saveDeviceInfo() {

        if (!device) {

            return;

        }


        try {

            if (device.name) {

                localStorage.setItem(

                    "SMARTPRINT_BLUETOOTH_NAME",

                    device.name

                );

            }


            if (device.id) {

                localStorage.setItem(

                    "SMARTPRINT_BLUETOOTH_ID",

                    device.id

                );

            }

        }

        catch (e) {}

    }


    /*
    =====================================================
     REQUEST DEVICE
    =====================================================
    */

    async function requestBLEDevice() {

        if (!isBluetoothSupported()) {

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


        log("========================================");

        log("BLE DEVICE DISCOVERY");

        log("Mode: UNIVERSAL PRINTER");

        log("acceptAllDevices: true");

        log(

            "optionalServices:",

            CONFIG.optionalServices

        );

        log("Membuka Bluetooth picker...");


        let selected;


        try {

            selected =

                await navigator.bluetooth.requestDevice({

                    acceptAllDevices: true,

                    optionalServices:

                        CONFIG.optionalServices

                });

        }

        catch (err) {

            if (

                err &&

                (

                    err.name === "NotFoundError" ||

                    err.name === "AbortError"

                )

            ) {

                log(

                    "Bluetooth picker dibatalkan pengguna."

                );


                dispatch(

                    "cancelled",

                    {

                        error: err

                    }

                );

            }


            throw err;

        }


        if (!selected) {

            throw new Error(

                "Tidak ada BLE device yang dipilih."

            );

        }


        log("========================================");

        log("BLE DEVICE TERPILIH");

        log(

            "Name:",

            selected.name || "(unknown)"

        );

        log(

            "ID:",

            selected.id || "(unknown)"

        );

        log(

            "GATT:",

            !!selected.gatt

        );

        log("========================================");


        return selected;

    }


    /*
    =====================================================
     CONNECT GATT
    =====================================================
    */

    async function connectGATT(target) {

        if (!target) {

            throw new Error(

                "Bluetooth device tidak tersedia."

            );

        }


        if (!target.gatt) {

            throw new Error(

                "Bluetooth device tidak memiliki GATT."

            );

        }


        device = target;


        attachDisconnectHandler(device);


        clearCharacteristics();


        if (device.gatt.connected) {

            log(

                "GATT sudah connected:",

                getDeviceName()

            );

            server = device.gatt;

        }

        else {

            log(

                "GATT connecting:",

                getDeviceName() || "(unknown)"

            );


            server =

                await device.gatt.connect();

        }


        if (!server) {

            throw new Error(

                "GATT server tidak tersedia."

            );

        }


        log("GATT CONNECTED");


        dispatch(

            "gattconnected",

            {

                device: device

            }

        );


        await discoverServices();


        saveDeviceInfo();


        if (!writeCharacteristic) {

            throw new Error(

                "Printer terhubung ke Bluetooth tetapi WRITE characteristic tidak ditemukan."

            );

        }


        log("========================================");

        log("PRINTER BLE CONNECTED");

        log(

            "Printer:",

            getDeviceName() || "(unknown)"

        );

        log(

            "WRITE:",

            writeCharacteristic.uuid

        );

        log(

            "WRITE WITHOUT RESPONSE:",

            !!writeCharacteristic.properties

                .writeWithoutResponse

        );

        log(

            "WRITE:",

            !!writeCharacteristic.properties.write

        );

        log("========================================");


        dispatch(

            "connected",

            {

                device: device,

                name: getDeviceName(),

                type: "BLE",

                writeCharacteristic:

                    writeCharacteristic.uuid

            }

        );


        dispatch(

            "status",

            {

                connected: true,

                type: "BLE",

                device: device

            }

        );


        return true;

    }


    /*
    =====================================================
     DISCOVER SERVICES
    =====================================================
    */

    async function discoverServices() {

        if (!device || !device.gatt) {

            throw new Error(

                "BLE device belum tersedia."

            );

        }


        if (!device.gatt.connected) {

            throw new Error(

                "BLE GATT belum connected."

            );

        }


        server =

            server || device.gatt;


        log("========================================");

        log("BLE SERVICE DISCOVERY");

        log("========================================");


        let services;


        try {

            services =

                await server.getPrimaryServices();

        }

        catch (err) {

            error(

                "getPrimaryServices gagal:",

                err

            );


            throw new Error(

                "Service BLE printer tidak dapat diakses: " +

                (err.message || err)

            );

        }


        log(

            "Primary services:",

            services.length

        );


        if (!services.length) {

            throw new Error(

                "BLE device tidak memiliki primary service yang dapat diakses."

            );

        }


        clearCharacteristics();


        let bestWriteWithoutResponse = null;

        let bestWrite = null;

        let bestNotify = null;


        for (const service of services) {

            log(

                "SERVICE:",

                service.uuid

            );


            let characteristics;


            try {

                characteristics =

                    await service.getCharacteristics();

            }

            catch (err) {

                warn(

                    "Gagal membaca service:",

                    service.uuid,

                    err

                );

                continue;

            }


            for (

                const characteristic

                of characteristics

            ) {

                const p =

                    characteristic.properties || {};


                const canWrite =

                    p.write === true;


                const canWriteWithoutResponse =

                    p.writeWithoutResponse === true;


                const canNotify =

                    p.notify === true ||

                    p.indicate === true;


                log(

                    "CHAR:",

                    characteristic.uuid,

                    "write=",

                    canWrite,

                    "writeWithoutResponse=",

                    canWriteWithoutResponse,

                    "notify=",

                    canNotify,

                    "read=",

                    p.read === true

                );


                if (

                    canWriteWithoutResponse &&

                    !bestWriteWithoutResponse

                ) {

                    bestWriteWithoutResponse =

                        characteristic;

                }


                if (

                    canWrite &&

                    !bestWrite

                ) {

                    bestWrite =

                        characteristic;

                }


                if (

                    canNotify &&

                    !bestNotify

                ) {

                    bestNotify =

                        characteristic;

                }

            }

        }


        writeCharacteristic =

            bestWriteWithoutResponse ||

            bestWrite ||

            null;


        notifyCharacteristic =

            bestNotify ||

            null;


        /*
         * ENABLE NOTIFY
         */

        if (notifyCharacteristic) {

            try {

                await notifyCharacteristic

                    .startNotifications();


                notifyCharacteristic

                    .addEventListener(

                        "characteristicvaluechanged",

                        handleNotification

                    );


                notificationHandlerCharacteristic =

                    notifyCharacteristic;


                log(

                    "NOTIFY ENABLED:",

                    notifyCharacteristic.uuid

                );

            }

            catch (err) {

                warn(

                    "Notify tidak dapat diaktifkan:",

                    err

                );

            }

        }


        if (!writeCharacteristic) {

            error(

                "========================================"

            );

            error(

                "WRITE CHARACTERISTIC TIDAK DITEMUKAN"

            );

            error(

                "========================================"

            );


            throw new Error(

                "BLE connected, tetapi tidak ditemukan characteristic WRITE."

            );

        }


        log(

            "WRITE CHARACTERISTIC:",

            writeCharacteristic.uuid

        );


        log(

            "Properties:",

            writeCharacteristic.properties

        );


        return true;

    }


    /*
    =====================================================
     NOTIFICATION
    =====================================================
    */

    function handleNotification(event) {

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
    =====================================================
     CONNECT USER
    =====================================================
    */

    async function connectUser() {

        if (connecting) {

            warn(

                "Bluetooth sedang connecting."

            );

            return false;

        }


        connecting = true;


        dispatch("connecting");


        try {

            const target =

                await requestBLEDevice();


            if (!target) {

                return false;

            }


            return !!(

                await connectGATT(target)

            );

        }

        catch (err) {

            if (

                err &&

                (

                    err.name === "NotFoundError" ||

                    err.name === "AbortError"

                )

            ) {

                return false;

            }


            error(

                "BLE connection error:",

                err

            );


            dispatch(

                "error",

                {

                    error: err,

                    message:

                        err && err.message

                            ? err.message

                            : String(err)

                }

            );


            return false;

        }

        finally {

            connecting = false;


            dispatch(

                "status",

                {

                    connected:

                        isConnected(),

                    type:

                        getConnectionType()

                }

            );

        }

    }


    /*
    =====================================================
     CONNECT ALIASES
    =====================================================
    */

    async function connectBLE() {

        return connectUser();

    }


    async function connectBLENew() {

        return connectUser();

    }


    /*
    =====================================================
     AUTO CONNECT
    =====================================================
    */

    async function autoConnect() {

        if (!isBluetoothSupported()) {

            return false;

        }


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

            const devices =

                await navigator.bluetooth.getDevices();


            if (!devices.length) {

                return false;

            }


            const savedId =

                localStorage.getItem(

                    "SMARTPRINT_BLUETOOTH_ID"

                ) || "";


            let target = null;


            if (savedId) {

                target =

                    devices.find(

                        d => d.id === savedId

                    ) || null;

            }


            if (!target && devices.length === 1) {

                target = devices[0];

            }


            if (!target || !target.gatt) {

                return false;

            }


            device = target;


            attachDisconnectHandler(device);


            if (!device.gatt.connected) {

                server =

                    await device.gatt.connect();

            }

            else {

                server = device.gatt;

            }


            await discoverServices();


            saveDeviceInfo();


            if (!writeCharacteristic) {

                throw new Error(

                    "Auto Connect berhasil ke GATT tetapi WRITE characteristic tidak ditemukan."

                );

            }


            dispatch(

                "connected",

                {

                    device: device,

                    name: getDeviceName(),

                    type: "BLE",

                    writeCharacteristic:

                        writeCharacteristic.uuid

                }

            );


            dispatch(

                "status",

                {

                    connected: true,

                    type: "BLE",

                    device: device

                }

            );


            log(

                "Auto Connected:",

                getDeviceName()

            );


            return true;

        }

        catch (err) {

            warn(

                "Auto Connect gagal:",

                err

            );


            server = null;

            clearCharacteristics();


            return false;

        }

    }


    /*
    =====================================================
     SEND BLE
    =====================================================
    */

    async function sendBLE(data) {

        const bytes =

            normalizeBytes(data);


        if (!isBLEConnected()) {

            throw new Error(

                "BLE printer belum terhubung."

            );

        }


        if (!writeCharacteristic) {

            await discoverServices();

        }


        if (!writeCharacteristic) {

            throw new Error(

                "BLE WRITE characteristic tidak ditemukan."

            );

        }


        const characteristic =

            writeCharacteristic;


        const properties =

            characteristic.properties || {};


        const useWithoutResponse =

            properties.writeWithoutResponse === true;


        const chunkSize =

            Math.max(

                1,

                Number(CONFIG.bleChunkSize) || 20

            );


        log(

            "BLE SEND:",

            bytes.length,

            "bytes"

        );


        log(

            "Characteristic:",

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

                    offset + chunkSize,

                    bytes.length

                );


            const chunk =

                bytes.slice(offset, end);


            if (

                useWithoutResponse &&

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

                typeof characteristic

                    .writeValueWithResponse ===

                "function"

            ) {

                await characteristic

                    .writeValueWithResponse(

                        chunk

                    );

            }

            else if (

                typeof characteristic

                    .writeValue ===

                "function"

            ) {

                await characteristic

                    .writeValue(chunk);

            }

            else {

                throw new Error(

                    "BLE characteristic tidak mendukung WRITE."

                );

            }


            if (

                offset + chunk.length <

                bytes.length

            ) {

                await sleep(

                    Math.max(

                        0,

                        Number(

                            CONFIG.bleChunkDelay

                        ) || 0

                    )

                );

            }

        }


        log(

            "BLE SEND selesai."

        );


        return true;

    }


    /*
    =====================================================
     SERIAL
    =====================================================
    */

    async function connectSerial() {

        if (!isSerialSupported()) {

            throw new Error(

                "Web Serial tidak didukung browser."

            );

        }


        try {

            serialPort =

                await navigator.serial.requestPort();


            await serialPort.open({

                baudRate: 9600

            });


            dispatch(

                "connected",

                {

                    type: "SERIAL"

                }

            );


            dispatch(

                "status",

                {

                    connected: true,

                    type: "SERIAL"

                }

            );


            return true;

        }

        catch (err) {

            serialPort = null;


            if (

                err &&

                (

                    err.name === "NotFoundError" ||

                    err.name === "AbortError"

                )

            ) {

                return false;

            }


            error(

                "Serial connection error:",

                err

            );


            return false;

        }

    }


    /*
    =====================================================
     SEND SERIAL
    =====================================================
    */

    async function sendSerial(data) {

        const bytes =

            normalizeBytes(data);


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

            await serialWriter.write(bytes);

        }

        finally {

            serialWriter.releaseLock();

            serialWriter = null;

        }


        return true;

    }


    /*
    =====================================================
     BRIDGE
    =====================================================
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


    function setBridgeURL(url) {

        try {

            localStorage.setItem(

                "SMARTPRINT_BRIDGE_URL",

                String(url || "")

            );

        }

        catch (e) {}

    }


    async function connectBridge(url) {

        const bridgeURL =

            url || getBridgeURL();


        try {

            const response =

                await fetch(

                    bridgeURL + "/status",

                    {

                        method: "GET",

                        cache: "no-store"

                    }

                );


            if (!response.ok) {

                throw new Error(

                    "Bridge HTTP " +

                    response.status

                );

            }


            bridgeConnected = true;


            dispatch(

                "connected",

                {

                    type: "BRIDGE"

                }

            );


            dispatch(

                "status",

                {

                    connected: true,

                    type: "BRIDGE"

                }

            );


            return true;

        }

        catch (err) {

            bridgeConnected = false;


            error(

                "Bridge connection error:",

                err

            );


            return false;

        }

    }


    /*
    =====================================================
     SEND BRIDGE
    =====================================================
    */

    async function sendBridge(data) {

        const bytes =

            normalizeBytes(data);


        const body =

            bytes.buffer.slice(

                bytes.byteOffset,

                bytes.byteOffset +

                bytes.byteLength

            );


        const response =

            await fetch(

                getBridgeURL() + "/print",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":

                            "application/octet-stream"

                    },

                    body: body

                }

            );


        if (!response.ok) {

            throw new Error(

                "Bridge print HTTP " +

                response.status

            );

        }


        return true;

    }


    /*
    =====================================================
     SEND RAW
    =====================================================
    */

    async function sendRaw(data) {

        const bytes =

            normalizeBytes(data);


        if (!bytes.length) {

            return false;

        }


        if (isBLEConnected()) {

            return sendBLE(bytes);

        }


        if (

            serialPort &&

            serialPort.writable

        ) {

            return sendSerial(bytes);

        }


        if (bridgeConnected) {

            return sendBridge(bytes);

        }


        throw new Error(

            "Tidak ada printer yang terhubung."

        );

    }


    /*
    =====================================================
     ALIASES
    =====================================================
    */

    async function send(data) {

        return sendRaw(data);

    }


    async function raw(data) {

        return sendRaw(data);

    }


    async function write(data) {

        return sendRaw(data);

    }


    async function writeRaw(data) {

        return sendRaw(data);

    }


    async function printRaw(data) {

        return sendRaw(data);

    }


    /*
    =====================================================
     DISCONNECT BLE
    =====================================================
    */

    async function disconnectBLE() {

        try {

            if (notifyCharacteristic) {

                try {

                    if (

                        typeof notifyCharacteristic

                            .stopNotifications ===

                        "function"

                    ) {

                        await notifyCharacteristic

                            .stopNotifications();

                    }

                }

                catch (e) {}


                try {

                    if (

                        notificationHandlerCharacteristic ===

                        notifyCharacteristic

                    ) {

                        notifyCharacteristic

                            .removeEventListener(

                                "characteristicvaluechanged",

                                handleNotification

                            );

                    }

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


        server = null;

        clearCharacteristics();


        dispatch(

            "disconnected",

            {

                device: device

            }

        );


        return true;

    }


    /*
    =====================================================
     DISCONNECT SERIAL
    =====================================================
    */

    async function disconnectSerial() {

        try {

            if (serialWriter) {

                try {

                    serialWriter.releaseLock();

                }

                catch (e) {}


                serialWriter = null;

            }


            if (serialPort) {

                try {

                    await serialPort.close();

                }

                catch (e) {}

            }

        }

        finally {

            serialPort = null;

        }


        return true;

    }


    /*
    =====================================================
     DISCONNECT
    =====================================================
    */

    async function disconnect() {

        await disconnectBLE();

        await disconnectSerial();


        bridgeConnected = false;


        dispatch(

            "status",

            {

                connected: false,

                type: null

            }

        );


        return true;

    }


    /*
    =====================================================
     GET INFO
    =====================================================
    */

    function getInfo() {

        return {

            version: VERSION,

            connected:

                isConnected(),

            type:

                getConnectionType(),

            deviceName:

                getDeviceName(),

            deviceId:

                device && device.id

                    ? device.id

                    : "",

            bleConnected:

                isBLEConnected(),

            serialConnected:

                !!serialPort,

            bridgeConnected:

                bridgeConnected,

            writeCharacteristic:

                writeCharacteristic

                    ? writeCharacteristic.uuid

                    : null,

            writeMode:

                writeCharacteristic

                    ? (

                        writeCharacteristic

                            .properties

                            .writeWithoutResponse

                            ? "WRITE WITHOUT RESPONSE"

                            : (

                                writeCharacteristic

                                    .properties

                                    .write

                                    ? "WRITE"

                                    : null

                            )

                    )

                    : null,

            notifyCharacteristic:

                notifyCharacteristic

                    ? notifyCharacteristic.uuid

                    : null

        };

    }


    /*
    =====================================================
     FORGET DEVICE
    =====================================================
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


        device = null;

        server = null;

        clearCharacteristics();

        disconnectHandlerDevice = null;


        return true;

    }


    /*
    =====================================================
     DIAGNOSTIC
    =====================================================
    */

    async function diagnosePrinter() {

        console.log("");

        console.log(

            "========================================"

        );

        console.log(

            " SMARTPRINT BLE PRINTER DIAGNOSTIC"

        );

        console.log(

            "========================================"

        );


        if (!isBluetoothSupported()) {

            console.error(

                "[Diagnostic] Web Bluetooth tidak tersedia."

            );


            return {

                supported: false,

                selected: false,

                gatt: false,

                services: [],

                write: null,

                notify: null

            };

        }


        let selected = null;


        try {

            console.log(

                "[Diagnostic] Membuka Bluetooth picker..."

            );


            selected =

                await navigator.bluetooth.requestDevice({

                    acceptAllDevices: true,

                    optionalServices:

                        CONFIG.optionalServices

                });

        }

        catch (err) {

            console.error(

                "[Diagnostic] Bluetooth picker error:",

                err

            );


            return {

                supported: true,

                selected: false,

                cancelled:

                    !!(

                        err &&

                        (

                            err.name === "NotFoundError" ||

                            err.name === "AbortError"

                        )

                    ),

                error: err

            };

        }


        if (!selected) {

            console.warn(

                "[Diagnostic] Tidak ada device dipilih."

            );


            return {

                supported: true,

                selected: false

            };

        }


        console.log("");

        console.log(

            "========================================"

        );

        console.log(

            " DEVICE TERPILIH"

        );

        console.log(

            "========================================"

        );


        console.log(

            "Name:",

            selected.name || "(unknown)"

        );


        console.log(

            "ID:",

            selected.id || "(unknown)"

        );


        console.log(

            "GATT:",

            Boolean(selected.gatt)

        );


        if (!selected.gatt) {

            return {

                supported: true,

                selected: true,

                name:

                    selected.name || "",

                id:

                    selected.id || "",

                gatt: false,

                services: [],

                write: null,

                notify: null

            };

        }


        try {

            console.log(

                "[Diagnostic] GATT connecting..."

            );


            const diagnosticServer =

                selected.gatt.connected

                    ? selected.gatt

                    : await selected.gatt.connect();


            console.log(

                "[Diagnostic] GATT CONNECTED"

            );


            const services =

                await diagnosticServer

                    .getPrimaryServices();


            console.log("");

            console.log(

                "========================================"

            );

            console.log(

                " PRIMARY SERVICES:",

                services.length

            );

            console.log(

                "========================================"

            );


            const serviceResults = [];


            for (const service of services) {

                console.log("");

                console.log(

                    "SERVICE:",

                    service.uuid

                );


                let characteristics = [];


                try {

                    characteristics =

                        await service

                            .getCharacteristics();

                }

                catch (err) {

                    console.warn(

                        "Gagal membaca characteristic:",

                        err

                    );


                    serviceResults.push({

                        uuid:

                            service.uuid,

                        characteristics: [],

                        error:

                            String(

                                err && err.message

                                    ? err.message

                                    : err

                            )

                    });


                    continue;

                }


                const characteristicResults = [];


                for (

                    const characteristic

                    of characteristics

                ) {

                    const properties =

                        characteristic.properties ||

                        {};


                    const result = {

                        uuid:

                            characteristic.uuid,

                        read:

                            Boolean(properties.read),

                        write:

                            Boolean(properties.write),

                        writeWithoutResponse:

                            Boolean(

                                properties

                                    .writeWithoutResponse

                            ),

                        notify:

                            Boolean(properties.notify),

                        indicate:

                            Boolean(properties.indicate)

                    };


                    characteristicResults.push(

                        result

                    );


                    console.log(

                        "  CHARACTERISTIC:",

                        result.uuid

                    );


                    console.log(

                        "    read:",

                        result.read

                    );


                    console.log(

                        "    write:",

                        result.write

                    );


                    console.log(

                        "    writeWithoutResponse:",

                        result.writeWithoutResponse

                    );


                    console.log(

                        "    notify:",

                        result.notify

                    );


                    console.log(

                        "    indicate:",

                        result.indicate

                    );

                }


                serviceResults.push({

                    uuid:

                        service.uuid,

                    characteristics:

                        characteristicResults

                });

            }


            let writeFound = null;

            let notifyFound = null;


            for (

                const service

                of serviceResults

            ) {

                for (

                    const characteristic

                    of service.characteristics

                ) {

                    if (

                        !writeFound &&

                        (

                            characteristic.write ||

                            characteristic

                                .writeWithoutResponse

                        )

                    ) {

                        writeFound = {

                            service:

                                service.uuid,

                            characteristic:

                                characteristic.uuid,

                            write:

                                characteristic.write,

                            writeWithoutResponse:

                                characteristic

                                    .writeWithoutResponse

                        };

                    }


                    if (

                        !notifyFound &&

                        (

                            characteristic.notify ||

                            characteristic.indicate

                        )

                    ) {

                        notifyFound = {

                            service:

                                service.uuid,

                            characteristic:

                                characteristic.uuid,

                            notify:

                                characteristic.notify,

                            indicate:

                                characteristic.indicate

                        };

                    }

                }

            }


            console.log("");

            console.log(

                "========================================"

            );

            console.log(

                " DIAGNOSTIC RESULT"

            );

            console.log(

                "========================================"

            );

            console.log(

                "Printer:",

                selected.name || "(unknown)"

            );

            console.log(

                "GATT:",

                true

            );

            console.log(

                "Services:",

                services.length

            );

            console.log(

                "WRITE:",

                writeFound || "NOT FOUND"

            );

            console.log(

                "NOTIFY:",

                notifyFound || "NOT FOUND"

            );

            console.log(

                "========================================"

            );


            return {

                supported: true,

                selected: true,

                name:

                    selected.name || "",

                id:

                    selected.id || "",

                gatt: true,

                services:

                    serviceResults,

                write:

                    writeFound,

                notify:

                    notifyFound

            };

        }

        catch (err) {

            console.error(

                "[Diagnostic] GATT/service error:",

                err

            );


            return {

                supported: true,

                selected: true,

                name:

                    selected.name || "",

                id:

                    selected.id || "",

                gatt:

                    Boolean(selected.gatt),

                services: [],

                write: null,

                notify: null,

                error: err

            };

        }

    }


    /*
    =====================================================
     TEST RAW
    =====================================================
    */

    async function testRaw(bytes) {

        const data =

            normalizeBytes(bytes);


        log(

            "TEST RAW:",

            data.length,

            "bytes"

        );


        return sendRaw(data);

    }


    /*
    =====================================================
     INIT
    =====================================================
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


        log(

            "Web Bluetooth:",

            isBluetoothSupported()

                ? "AVAILABLE"

                : "NOT AVAILABLE"

        );


        log(

            "Web Serial:",

            isSerialSupported()

                ? "AVAILABLE"

                : "NOT AVAILABLE"

        );


        try {

            await autoConnect();

        }

        catch (err) {

            warn(

                "AutoConnect error:",

                err

            );

        }


        return true;

    }


    /*
    =====================================================
     PUBLIC API
    =====================================================
    */

    const Bluetooth = {

        version: VERSION,

        config: CONFIG,

        init: init,

        connect: connectUser,

        connectUser: connectUser,

        connectBLE: connectBLE,

        connectBLENew: connectBLENew,

        autoConnect: autoConnect,

        connectSerial: connectSerial,

        connectBridge: connectBridge,

        disconnect: disconnect,

        disconnectBLE: disconnectBLE,

        disconnectSerial: disconnectSerial,

        sendRaw: sendRaw,

        send: send,

        raw: raw,

        write: write,

        writeRaw: writeRaw,

        printRaw: printRaw,

        testRaw: testRaw,

        isConnected: isConnected,

        getDevice: getDevice,

        getDeviceName: getDeviceName,

        getConnectionType: getConnectionType,

        getInfo: getInfo,

        getBridgeURL: getBridgeURL,

        setBridgeURL: setBridgeURL,

        forgetDevice: forgetDevice,

        discoverServices: discoverServices,

        diagnosePrinter: diagnosePrinter

    };


    /*
    =====================================================
     GLOBAL
    =====================================================
    */

    window.Bluetooth = Bluetooth;

    window.SmartPrintBluetooth = Bluetooth;

    window.BluetoothEngine = Bluetooth;


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

        VERSION +

        " Ready"

    );


    console.log(

        "========================================"

    );


    console.log(

        "Universal BLE Thermal Printer"

    );


    console.log(

        "RAW Uint8Array Transport"

    );


    console.log(

        "Diagnostic:",

        "Bluetooth.diagnosePrinter()"

    );


    /*
    =====================================================
     AUTO INIT
    =====================================================
    */

    function start() {

        setTimeout(function () {

            Bluetooth.init();

        }, 100);

    }


    if (

        document.readyState ===

        "loading"

    ) {

        document.addEventListener(

            "DOMContentLoaded",

            start,

            {

                once: true

            }

        );

    }

    else {

        start();

    }


})();
