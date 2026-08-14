"use strict";

/*
=====================================================
 SmartPrint Printer Manager v4.2
=====================================================

 PURPOSE
 ----------------------------------------------------
 Central Printer Manager untuk SmartPrint.

 TRANSPORT
 ----------------------------------------------------
 ✓ BLE / Web Bluetooth
 ✓ Web Serial / COM
 ✓ Local Bridge
 ✓ USB / System Printer compatibility

 BLUETOOTH ENGINE
 ----------------------------------------------------
 Compatible:
 SmartPrint Bluetooth Engine v5.7+

 USER CONNECT
 ----------------------------------------------------
 Printer.connect()
      ↓
 Bluetooth.connectUser()
      ↓
 BLE picker
      ↓
 GATT
      ↓
 WRITE characteristic

 AUTO CONNECT
 ----------------------------------------------------
 Printer.autoConnectPrinter()
      ↓
 Bluetooth.autoConnect()

 IMPORTANT
 ----------------------------------------------------
 autoConnect() TIDAK BOLEH membuka picker.

 BLE requestDevice()
 HARUS berasal dari user gesture.

 SERIAL requestPort()
 HARUS berasal dari user gesture.

 PRINT ROUTING
 ----------------------------------------------------
 ESC
 TSPL
 ZPL
 CPCL

 ====================================================
*/


(function () {

    "use strict";


    /*
    =================================================
     VERSION
    =================================================
    */

    const VERSION = "4.2.0";


    /*
    =================================================
     PRINTER MANAGER
    =================================================
    */

    const PrinterManager = {


        /*
        =============================================
         VERSION
        =============================================
        */

        version: VERSION,


        /*
        =============================================
         DEFAULT SETTINGS
        =============================================
        */

        printerType: "bluetooth",

        printerName: "",

        language: "TSPL",

        paperWidth: 576,

        paperHeight: 1200,

        dpi: 203,

        copies: 1,

        density: 8,

        speed: 4,

        autoConnect: true,

        cutPaper: false,

        openDrawer: false,


        /*
        =============================================
         STATE
        =============================================
        */

        connected: false,

        connecting: false,

        printing: false,

        initialized: false,

        lastError: null,

        connectionType: null,


        /*
        =============================================
         INIT
        =============================================
        */

        async init() {

            if (this.initialized) {

                return true;

            }


            console.log(
                "========================================"
            );

            console.log(
                "SmartPrint Printer Manager v" +
                VERSION
            );

            console.log(
                "========================================"
            );


            /*
            =========================================
             LOAD SETTINGS
            =========================================
            */

            this.loadSettings();


            /*
            =========================================
             INITIAL STATE
            =========================================
            */

            this.initialized =
                true;

            this.connected =
                false;

            this.connecting =
                false;

            this.printing =
                false;

            this.connectionType =
                null;

            this.lastError =
                null;


            this.updateStatus(
                "disconnected"
            );


            /*
            =========================================
             AUTO CONNECT
            =========================================

             IMPORTANT:

             Tidak membuka picker.

             Hanya mencoba device yang sudah
             diberikan permission browser.

            =========================================
            */

            if (
                this.autoConnect &&
                this.printerType ===
                "bluetooth"
            ) {

                await this.waitForBluetooth();


                try {

                    const result =
                        await this.autoConnectPrinter();


                    if (result) {

                        console.log(
                            "Printer Auto Connected:",
                            this.printerName
                        );

                    }

                }

                catch (error) {

                    console.warn(
                        "Printer Auto Connect gagal:",
                        error
                    );

                }

            }


            console.log(
                "Printer Manager initialized."
            );


            return true;

        },


        /*
        =================================================
         WAIT BLUETOOTH ENGINE
        =================================================
        */

        async waitForBluetooth(
            timeout = 5000
        ) {

            const start =
                Date.now();


            while (
                typeof Bluetooth ===
                "undefined"
            ) {

                if (
                    Date.now() -
                    start >
                    timeout
                ) {

                    console.warn(
                        "Bluetooth Engine tidak ditemukan."
                    );


                    return false;

                }


                await this.sleep(
                    100
                );

            }


            return true;

        },


        /*
        =================================================
         USER CONNECT
        =================================================

         Fungsi utama tombol CONNECT.

         BLE:
             Bluetooth.connectUser()

         Tidak menggunakan autoConnect.

        =================================================
        */

        async connect() {

            /*
            =========================================
             PREVENT DOUBLE CONNECT
            =========================================
            */

            if (
                this.connecting
            ) {

                console.warn(
                    "Printer sedang connecting."
                );


                return false;

            }


            /*
            =========================================
             SUDAH CONNECTED
            =========================================
            */

            if (
                this.isConnected()
            ) {

                console.log(
                    "Printer sudah terhubung."
                );


                this.updateStatus(
                    "connected"
                );


                return true;

            }


            this.connecting =
                true;

            this.lastError =
                null;


            this.updateStatus(
                "connecting"
            );


            try {

                await this.waitForBluetooth();


                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT PRINTER USER CONNECT v4.2"
                );

                console.log(
                    "========================================"
                );


                /*
                =========================================
                 BLUETOOTH
                =========================================
                */

                if (
                    this.printerType ===
                    "bluetooth"
                ) {

                    return await this.connectBluetoothUser();

                }


                /*
                =========================================
                 USB
                =========================================
                */

                if (
                    this.printerType ===
                    "usb"
                ) {

                    return await this.connectUSB();

                }


                /*
                =========================================
                 SYSTEM
                =========================================
                */

                if (
                    this.printerType ===
                    "system"
                ) {

                    return await this.connectSystem();

                }


                throw new Error(
                    "Printer type tidak didukung: " +
                    this.printerType
                );

            }

            catch (error) {

                this.lastError =
                    error;


                this.connected =
                    false;


                this.connectionType =
                    null;


                console.error(
                    "Printer Connect Error:",
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


        /*
        =================================================
         CONNECT BLUETOOTH USER
        =================================================

         KHUSUS USER GESTURE.

         Jangan panggil dari autoConnect.

        =================================================
        */

        async connectBluetoothUser() {

            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                throw new Error(
                    "Bluetooth Engine tidak ditemukan."
                );

            }


            /*
            =========================================
             PREFER connectUser()
            =========================================
            */

            if (
                typeof Bluetooth.connectUser ===
                "function"
            ) {

                console.log(
                    "Bluetooth.connectUser()"
                );


                const result =
                    await Bluetooth.connectUser();


                if (
                    !result
                ) {

                    this.connected =
                        false;

                    this.connectionType =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }

            }

            else if (
                typeof Bluetooth.connectBLE ===
                "function"
            ) {

                console.log(
                    "Bluetooth.connectBLE()"
                );


                const result =
                    await Bluetooth.connectBLE();


                if (
                    !result
                ) {

                    this.connected =
                        false;

                    this.connectionType =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }

            }

            else {

                throw new Error(
                    "Bluetooth user connection API tidak tersedia."
                );

            }


            /*
            =========================================
             CHECK CONNECTION
            =========================================
            */

            this.connected =
                this.bluetoothIsConnected();


            if (
                !this.connected
            ) {

                this.connectionType =
                    null;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }


            this.connectionType =
                this.getBluetoothConnectionType();


            /*
            =========================================
             DEVICE NAME
            =========================================
            */

            if (
                typeof Bluetooth.getDeviceName ===
                "function"
            ) {

                const name =
                    Bluetooth.getDeviceName();


                if (
                    name
                ) {

                    this.printerName =
                        name;

                }

            }


            /*
            =========================================
             SAVE
            =========================================
            */

            this.updateStatus(
                "connected"
            );


            this.saveSettings();


            console.log(
                "Printer Connected:",
                this.printerName ||
                "(unknown)"
            );


            console.log(
                "Connection Type:",
                this.connectionType ||
                "BLUETOOTH"
            );


            return true;

        },


        /*
        =================================================
         EXPLICIT BLE CONNECT
        =================================================
        */

        async connectBluetooth() {

            if (
                this.connecting
            ) {

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                return await this.connectBluetoothUser();

            }

            catch (error) {

                this.lastError =
                    error;


                this.connected =
                    false;


                this.connectionType =
                    null;


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


        /*
        =================================================
         SERIAL / COM
        =================================================

         HARUS dipanggil langsung dari tombol.

        =================================================
        */

        async connectSerial() {

            if (
                this.connecting
            ) {

                console.warn(
                    "Printer sedang connecting."
                );


                return false;

            }


            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                console.error(
                    "Bluetooth Engine tidak ditemukan."
                );


                return false;

            }


            if (
                typeof Bluetooth.connectSerial !==
                "function"
            ) {

                console.error(
                    "Bluetooth.connectSerial() tidak tersedia."
                );


                return false;

            }


            this.connecting =
                true;

            this.lastError =
                null;


            this.updateStatus(
                "connecting"
            );


            try {

                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT SERIAL / COM CONNECT v4.2"
                );

                console.log(
                    "========================================"
                );


                /*
                =========================================
                 requestPort()
                 =========================================

                 Harus berasal dari event click user.

                =========================================
                */

                const result =
                    await Bluetooth.connectSerial();


                if (
                    !result
                ) {

                    this.connected =
                        false;

                    this.connectionType =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connected =
                    this.bluetoothIsConnected();


                if (
                    !this.connected
                ) {

                    this.connectionType =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connectionType =
                    "SERIAL";


                /*
                =========================================
                 NAME
                =========================================
                */

                if (
                    typeof Bluetooth.getDeviceName ===
                    "function"
                ) {

                    const name =
                        Bluetooth.getDeviceName();


                    if (
                        name
                    ) {

                        this.printerName =
                            name;

                    }

                }


                this.updateStatus(
                    "connected"
                );


                this.saveSettings();


                console.log(
                    "Serial / COM Connected."
                );


                return true;

            }

            catch (error) {

                this.lastError =
                    error;


                this.connected =
                    false;


                this.connectionType =
                    null;


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


        /*
        =================================================
         BRIDGE CONNECT
        =================================================
        */

        async connectBridge() {

            if (
                this.connecting
            ) {

                return false;

            }


            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                console.error(
                    "Bluetooth Engine tidak ditemukan."
                );


                return false;

            }


            if (
                typeof Bluetooth.connectBridge !==
                "function"
            ) {

                console.error(
                    "Bluetooth.connectBridge() tidak tersedia."
                );


                return false;

            }


            this.connecting =
                true;

            this.lastError =
                null;


            this.updateStatus(
                "connecting"
            );


            try {

                const result =
                    await Bluetooth.connectBridge();


                if (
                    !result
                ) {

                    this.connected =
                        false;

                    this.connectionType =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connected =
                    this.bluetoothIsConnected();


                if (
                    !this.connected
                ) {

                    this.connectionType =
                        null;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connectionType =
                    "BRIDGE";


                this.updateStatus(
                    "connected"
                );


                this.saveSettings();


                console.log(
                    "Local Bridge Connected."
                );


                return true;

            }

            catch (error) {

                this.lastError =
                    error;


                this.connected =
                    false;


                this.connectionType =
                    null;


                console.error(
                    "Bridge Connect Error:",
                    error
                );


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
         USB CONNECT
        =================================================
        */

        async connectUSB() {

            if (
                typeof USBPrinter ===
                "undefined"
            ) {

                throw new Error(
                    "USB Printer Engine belum tersedia."
                );

            }


            if (
                typeof USBPrinter.connect !==
                "function"
            ) {

                throw new Error(
                    "USBPrinter.connect() belum tersedia."
                );

            }


            const result =
                await USBPrinter.connect();


            this.connected =
                Boolean(
                    result
                );


            if (
                this.connected
            ) {

                this.connectionType =
                    "USB";


                this.updateStatus(
                    "connected"
                );


                this.saveSettings();

            }

            else {

                this.connectionType =
                    null;


                this.updateStatus(
                    "disconnected"
                );

            }


            return this.connected;

        },


        /*
        =================================================
         SYSTEM PRINTER CONNECT
        =================================================
        */

        async connectSystem() {

            if (
                typeof SystemPrinter ===
                "undefined"
            ) {

                throw new Error(
                    "System Printer Engine belum tersedia."
                );

            }


            if (
                typeof SystemPrinter.connect !==
                "function"
            ) {

                throw new Error(
                    "SystemPrinter.connect() belum tersedia."
                );

            }


            const result =
                await SystemPrinter.connect();


            this.connected =
                Boolean(
                    result
                );


            if (
                this.connected
            ) {

                this.connectionType =
                    "SYSTEM";


                this.updateStatus(
                    "connected"
                );


                this.saveSettings();

            }

            else {

                this.connectionType =
                    null;


                this.updateStatus(
                    "disconnected"
                );

            }


            return this.connected;

        },


        /*
        =================================================
         AUTO CONNECT
        =================================================

         IMPORTANT:

         Tidak membuka picker.

        =================================================
        */

        async autoConnectPrinter() {

            if (
                this.printerType !==
                "bluetooth"
            ) {

                return false;

            }


            await this.waitForBluetooth();


            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                return false;

            }


            if (
                typeof Bluetooth.autoConnect !==
                "function"
            ) {

                console.warn(
                    "Bluetooth.autoConnect() tidak tersedia."
                );


                return false;

            }


            /*
            =========================================
             AUTO CONNECT
            =========================================

             Browser permission diperlukan.

             Jangan requestDevice() di sini.

            =========================================
            */

            try {

                console.log(
                    "Printer Auto Connect..."
                );


                const result =
                    await Bluetooth.autoConnect();


                this.connected =
                    Boolean(
                        result
                    );


                if (
                    this.connected
                ) {

                    this.connectionType =
                        this.getBluetoothConnectionType();


                    if (
                        typeof Bluetooth.getDeviceName ===
                        "function"
                    ) {

                        const name =
                            Bluetooth.getDeviceName();


                        if (
                            name
                        ) {

                            this.printerName =
                                name;

                        }

                    }


                    this.updateStatus(
                        "connected"
                    );


                    this.saveSettings();


                    console.log(
                        "Printer Auto Connected:",
                        this.printerName
                    );


                    return true;

                }


                this.connected =
                    false;

                this.connectionType =
                    null;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

            catch (error) {

                this.lastError =
                    error;


                this.connected =
                    false;


                this.connectionType =
                    null;


                console.warn(
                    "Printer Auto Connect Error:",
                    error
                );


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

        },


        /*
        =================================================
         LEGACY AUTO CONNECT
        =================================================
        */

        autoConnectLegacy() {

            return this.autoConnectPrinter();

        },


        /*
        =================================================
         BLUETOOTH CONNECTION CHECK
        =================================================
        */

        bluetoothIsConnected() {

            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                return false;

            }


            if (
                typeof Bluetooth.isConnected ===
                "function"
            ) {

                try {

                    return Boolean(
                        Bluetooth.isConnected()
                    );

                }

                catch (error) {

                    console.warn(
                        "Bluetooth.isConnected error:",
                        error
                    );


                    return false;

                }

            }


            /*
            =========================================
             FALLBACK getInfo()
            =========================================
            */

            if (
                typeof Bluetooth.getInfo ===
                "function"
            ) {

                try {

                    const info =
                        Bluetooth.getInfo();


                    return Boolean(
                        info &&
                        info.connected
                    );

                }

                catch (error) {

                    return false;

                }

            }


            return false;

        },


        /*
        =================================================
         GET BLUETOOTH CONNECTION TYPE
        =================================================
        */

        getBluetoothConnectionType() {

            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                return null;

            }


            if (
                typeof Bluetooth.getConnectionType ===
                "function"
            ) {

                try {

                    return (
                        Bluetooth.getConnectionType()
                        ||
                        "BLUETOOTH"
                    );

                }

                catch (error) {}

            }


            if (
                typeof Bluetooth.getInfo ===
                "function"
            ) {

                try {

                    const info =
                        Bluetooth.getInfo();


                    if (
                        info &&
                        info.type
                    ) {

                        return info.type;

                    }

                }

                catch (error) {}

            }


            return "BLUETOOTH";

        },


        /*
        =================================================
         IS CONNECTED
        =================================================
        */

        isConnected() {

            /*
            =========================================
             BLUETOOTH
            =========================================
            */

            if (
                this.printerType ===
                "bluetooth"
            ) {

                this.connected =
                    this.bluetoothIsConnected();


                if (
                    !this.connected
                ) {

                    this.connectionType =
                        null;

                }


                return this.connected;

            }


            /*
            =========================================
             USB
            =========================================
            */

            if (
                this.printerType ===
                "usb"
            ) {

                if (
                    typeof USBPrinter !==
                    "undefined" &&
                    typeof USBPrinter.isConnected ===
                    "function"
                ) {

                    this.connected =
                        Boolean(
                            USBPrinter.isConnected()
                        );


                    return this.connected;

                }


                return false;

            }


            /*
            =========================================
             SYSTEM
            =========================================
            */

            if (
                this.printerType ===
                "system"
            ) {

                if (
                    typeof SystemPrinter !==
                    "undefined" &&
                    typeof SystemPrinter.isConnected ===
                    "function"
                ) {

                    this.connected =
                        Boolean(
                            SystemPrinter.isConnected()
                        );


                    return this.connected;

                }


                return false;

            }


            return false;

        },


        /*
        =================================================
         DISCONNECT
        =================================================
        */

        async disconnect() {

            console.log(
                "Printer Disconnect"
            );


            try {

                /*
                =========================================
                 BLUETOOTH
                =========================================
                */

                if (
                    this.printerType ===
                    "bluetooth"
                ) {

                    if (
                        typeof Bluetooth !==
                        "undefined" &&
                        typeof Bluetooth.disconnect ===
                        "function"
                    ) {

                        await Bluetooth.disconnect();

                    }

                }


                /*
                =========================================
                 USB
                =========================================
                */

                else if (
                    this.printerType ===
                    "usb"
                ) {

                    if (
                        typeof USBPrinter !==
                        "undefined" &&
                        typeof USBPrinter.disconnect ===
                        "function"
                    ) {

                        await USBPrinter.disconnect();

                    }

                }


                /*
                =========================================
                 SYSTEM
                =========================================
                */

                else if (
                    this.printerType ===
                    "system"
                ) {

                    if (
                        typeof SystemPrinter !==
                        "undefined" &&
                        typeof SystemPrinter.disconnect ===
                        "function"
                    ) {

                        await SystemPrinter.disconnect();

                    }

                }

            }

            catch (error) {

                console.error(
                    "Printer Disconnect Error:",
                    error
                );

            }


            this.connected =
                false;


            this.connectionType =
                null;


            this.connecting =
                false;


            this.updateStatus(
                "disconnected"
            );


            return true;

        },


        /*
        =================================================
         PRINT
        =================================================
        */

        async print(canvas) {

            if (
                this.printing
            ) {

                throw new Error(
                    "Printer sedang mencetak."
                );

            }


            if (!canvas) {

                throw new Error(
                    "Canvas tidak tersedia."
                );

            }


            if (
                !this.isConnected()
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            this.printing =
                true;


            this.updateStatus(
                "printing"
            );


            try {

                let result;


                /*
                =========================================
                 ESC
                =========================================
                */

                if (
                    this.language ===
                    "ESC"
                ) {

                    if (
                        typeof ESCpos ===
                        "undefined"
                    ) {

                        throw new Error(
                            "ESCpos Engine tidak ditemukan."
                        );

                    }


                    if (
                        typeof ESCpos.print !==
                        "function"
                    ) {

                        throw new Error(
                            "ESCpos.print() tidak tersedia."
                        );

                    }


                    result =
                        await ESCpos.print(
                            canvas,
                            this
                        );

                }


                /*
                =========================================
                 TSPL
                =========================================
                */

                else if (
                    this.language ===
                    "TSPL"
                ) {

                    if (
                        typeof TSPL ===
                        "undefined"
                    ) {

                        throw new Error(
                            "TSPL Engine tidak ditemukan."
                        );

                    }


                    if (
                        typeof TSPL.print !==
                        "function"
                    ) {

                        throw new Error(
                            "TSPL.print() tidak tersedia."
                        );

                    }


                    result =
                        await TSPL.print(
                            canvas,
                            this
                        );

                }


                /*
                =========================================
                 ZPL
                =========================================
                */

                else if (
                    this.language ===
                    "ZPL"
                ) {

                    if (
                        typeof ZPL ===
                        "undefined"
                    ) {

                        throw new Error(
                            "ZPL Engine tidak ditemukan."
                        );

                    }


                    if (
                        typeof ZPL.print !==
                        "function"
                    ) {

                        throw new Error(
                            "ZPL.print() tidak tersedia."
                        );

                    }


                    result =
                        await ZPL.print(
                            canvas,
                            this
                        );

                }


                /*
                =========================================
                 CPCL
                =========================================
                */

                else if (
                    this.language ===
                    "CPCL"
                ) {

                    if (
                        typeof CPCL ===
                        "undefined"
                    ) {

                        throw new Error(
                            "CPCL Engine tidak ditemukan."
                        );

                    }


                    if (
                        typeof CPCL.print !==
                        "function"
                    ) {

                        throw new Error(
                            "CPCL.print() tidak tersedia."
                        );

                    }


                    result =
                        await CPCL.print(
                            canvas,
                            this
                        );

                }


                else {

                    throw new Error(
                        "Printer language tidak didukung: " +
                        this.language
                    );

                }


                /*
                =========================================
                 PRINT SUCCESS
                =========================================
                */

                this.updateStatus(
                    "connected"
                );


                return result;

            }

            catch (error) {

                console.error(
                    "Print Error:",
                    error
                );


                this.lastError =
                    error;


                this.updateStatus(
                    this.isConnected()
                        ? "connected"
                        : "error"
                );


                throw error;

            }

            finally {

                this.printing =
                    false;

            }

        },


        /*
        =================================================
         SET PRINTER TYPE
        =================================================
        */

        setPrinterType(type) {

            const allowedTypes = [

                "bluetooth",

                "usb",

                "system"

            ];


            type =
                String(
                    type || ""
                )
                .toLowerCase()
                .trim();


            if (
                !allowedTypes.includes(
                    type
                )
            ) {

                console.warn(
                    "Printer type tidak valid:",
                    type
                );


                return false;

            }


            if (
                this.isConnected()
            ) {

                this.disconnect();

            }


            this.printerType =
                type;


            this.saveSettings();


            console.log(
                "Printer Type:",
                type
            );


            return true;

        },


        /*
        =================================================
         SET PRINTER NAME
        =================================================
        */

        setPrinterName(name) {

            this.printerName =
                String(
                    name || ""
                );


            this.saveSettings();

        },


        /*
        =================================================
         SET LANGUAGE
        =================================================
        */

        setLanguage(language) {

            this.language =
                String(
                    language ||
                    "TSPL"
                )
                .toUpperCase()
                .trim();


            this.saveSettings();


            console.log(
                "Printer Language:",
                this.language
            );

        },


        /*
        =================================================
         SET PAPER
        =================================================
        */

        setPaper(
            width,
            height
        ) {

            this.paperWidth =
                Number(width) ||
                576;


            if (
                height !==
                undefined
            ) {

                this.paperHeight =
                    Number(height) ||
                    1200;

            }


            this.saveSettings();

        },


        /*
        =================================================
         SET DPI
        =================================================
        */

        setDPI(dpi) {

            this.dpi =
                Number(dpi) ||
                203;


            this.saveSettings();

        },


        /*
        =================================================
         SET COPIES
        =================================================
        */

        setCopies(copies) {

            this.copies =
                Math.max(
                    1,
                    Number(copies) ||
                    1
                );


            this.saveSettings();

        },


        /*
        =================================================
         SET DENSITY
        =================================================
        */

        setDensity(density) {

            this.density =
                Math.max(
                    0,
                    Number(density) ||
                    0
                );


            this.saveSettings();

        },


        /*
        =================================================
         SET SPEED
        =================================================
        */

        setSpeed(speed) {

            this.speed =
                Math.max(
                    1,
                    Number(speed) ||
                    1
                );


            this.saveSettings();

        },


        /*
        =================================================
         SET AUTO CONNECT
        =================================================
        */

        setAutoConnect(enabled) {

            this.autoConnect =
                Boolean(
                    enabled
                );


            this.saveSettings();

        },


        /*
        =================================================
         STATUS
        =================================================
        */

        updateStatus(state) {

            const status =
                document.getElementById(
                    "printerStatus"
                );


            const globalStatus =
                document.getElementById(
                    "status"
                );


            const dot =
                document.querySelector(
                    ".dot"
                );


            let text =
                "No Printer";


            let isConnected =
                false;


            switch (state) {

                case "connecting":

                    text =
                        "Connecting...";

                    break;


                case "connected":

                    text =
                        "Printer Connected";

                    isConnected =
                        true;

                    break;


                case "printing":

                    text =
                        "Printing...";

                    isConnected =
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


            if (
                status
            ) {

                status.textContent =
                    text;

            }


            if (
                globalStatus
            ) {

                globalStatus.textContent =
                    text;

            }


            if (
                dot
            ) {

                dot.classList.toggle(
                    "connected",
                    isConnected
                );

            }


            /*
            =========================================
             CUSTOM EVENT
            =========================================
            */

            try {

                window.dispatchEvent(
                    new CustomEvent(
                        "smartprint-printer-status",
                        {
                            detail: {

                                state,

                                connected:
                                    isConnected,

                                type:
                                    this.connectionType,

                                name:
                                    this.printerName

                            }

                        }
                    )
                );

            }

            catch (error) {}

        },


        /*
        =================================================
         CONNECTION ERROR
        =================================================
        */

        handleConnectionError(error) {

            if (!error) {

                this.updateStatus(
                    "error"
                );


                return;

            }


            /*
            =========================================
             USER CANCEL
            =========================================
            */

            if (
                error.name ===
                "NotFoundError" ||

                error.name ===
                "AbortError"
            ) {

                console.warn(
                    "Pemilihan printer dibatalkan pengguna."
                );


                this.updateStatus(
                    "disconnected"
                );


                return;

            }


            /*
            =========================================
             SECURITY ERROR
            =========================================
            */

            if (
                error.name ===
                "SecurityError"
            ) {

                console.error(
                    "Browser menolak akses printer."
                );


                console.error(
                    "Pastikan fungsi Connect dipanggil langsung dari klik user."
                );


                this.updateStatus(
                    "disconnected"
                );


                return;

            }


            /*
            =========================================
             NOT SUPPORTED
            =========================================
            */

            if (
                error.name ===
                "NotSupportedError"
            ) {

                console.error(
                    "Browser / printer tidak mendukung koneksi ini."
                );


                this.updateStatus(
                    "error"
                );


                return;

            }


            /*
            =========================================
             GENERIC
            =========================================
            */

            console.error(
                "Printer connection failed:",
                error.message ||
                error
            );


            this.updateStatus(
                "error"
            );

        },


        /*
        =================================================
         LOAD SETTINGS
        =================================================
        */

        loadSettings() {

            try {

                const raw =
                    localStorage.getItem(
                        "SMARTPRINT_PRINTER_SETTINGS"
                    );


                if (!raw) {

                    return;

                }


                const settings =
                    JSON.parse(
                        raw
                    );


                if (
                    settings.printerType
                ) {

                    const type =
                        String(
                            settings.printerType
                        )
                        .toLowerCase();


                    if (
                        [
                            "bluetooth",
                            "usb",
                            "system"
                        ]
                        .includes(type)
                    ) {

                        this.printerType =
                            type;

                    }

                }


                if (
                    settings.printerName !==
                    undefined
                ) {

                    this.printerName =
                        String(
                            settings.printerName ||
                            ""
                        );

                }


                if (
                    settings.language
                ) {

                    this.language =
                        String(
                            settings.language
                        )
                        .toUpperCase();

                }


                if (
                    settings.paperWidth !==
                    undefined
                ) {

                    this.paperWidth =
                        Number(
                            settings.paperWidth
                        ) ||
                        576;

                }


                if (
                    settings.paperHeight !==
                    undefined
                ) {

                    this.paperHeight =
                        Number(
                            settings.paperHeight
                        ) ||
                        1200;

                }


                if (
                    settings.dpi !==
                    undefined
                ) {

                    this.dpi =
                        Number(
                            settings.dpi
                        ) ||
                        203;

                }


                if (
                    settings.copies !==
                    undefined
                ) {

                    this.copies =
                        Math.max(
                            1,
                            Number(
                                settings.copies
                            ) ||
                            1
                        );

                }


                if (
                    settings.density !==
                    undefined
                ) {

                    this.density =
                        Math.max(
                            0,
                            Number(
                                settings.density
                            ) ||
                            0
                        );

                }


                if (
                    settings.speed !==
                    undefined
                ) {

                    this.speed =
                        Math.max(
                            1,
                            Number(
                                settings.speed
                            ) ||
                            1
                        );

                }


                if (
                    settings.autoConnect !==
                    undefined
                ) {

                    this.autoConnect =
                        Boolean(
                            settings.autoConnect
                        );

                }


                if (
                    settings.cutPaper !==
                    undefined
                ) {

                    this.cutPaper =
                        Boolean(
                            settings.cutPaper
                        );

                }


                if (
                    settings.openDrawer !==
                    undefined
                ) {

                    this.openDrawer =
                        Boolean(
                            settings.openDrawer
                        );

                }

            }

            catch (error) {

                console.warn(
                    "Printer settings gagal dibaca:",
                    error
                );

            }

        },


        /*
        =================================================
         SAVE SETTINGS
        =================================================
        */

        saveSettings() {

            try {

                localStorage.setItem(

                    "SMARTPRINT_PRINTER_SETTINGS",

                    JSON.stringify({

                        printerType:
                            this.printerType,

                        printerName:
                            this.printerName,

                        language:
                            this.language,

                        paperWidth:
                            this.paperWidth,

                        paperHeight:
                            this.paperHeight,

                        dpi:
                            this.dpi,

                        copies:
                            this.copies,

                        density:
                            this.density,

                        speed:
                            this.speed,

                        autoConnect:
                            this.autoConnect,

                        cutPaper:
                            this.cutPaper,

                        openDrawer:
                            this.openDrawer

                    })

                );

            }

            catch (error) {

                console.warn(
                    "Printer settings gagal disimpan:",
                    error
                );

            }

        },


        /*
        =================================================
         GET INFO
        =================================================
        */

        getInfo() {

            let bluetoothInfo =
                null;


            if (
                typeof Bluetooth !==
                "undefined" &&
                typeof Bluetooth.getInfo ===
                "function"
            ) {

                try {

                    bluetoothInfo =
                        Bluetooth.getInfo();

                }

                catch (error) {

                    bluetoothInfo =
                        null;

                }

            }


            return {

                version:
                    this.version,

                type:
                    this.printerType,

                connectionType:
                    this.connectionType,

                name:
                    this.printerName,

                language:
                    this.language,

                paperWidth:
                    this.paperWidth,

                paperHeight:
                    this.paperHeight,

                dpi:
                    this.dpi,

                copies:
                    this.copies,

                density:
                    this.density,

                speed:
                    this.speed,

                connected:
                    this.isConnected(),

                connecting:
                    this.connecting,

                printing:
                    this.printing,

                autoConnect:
                    this.autoConnect,

                lastError:
                    this.lastError
                        ? (
                            this.lastError.message ||
                            String(
                                this.lastError
                            )
                        )
                        : null,

                bluetooth:
                    bluetoothInfo

            };

        },


        /*
        =================================================
         SLEEP
        =================================================
        */

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


    /*
    =====================================================
     GLOBAL
    =====================================================
    */

    window.Printer =
        PrinterManager;


    window.PrinterManager =
        PrinterManager;


    /*
    =====================================================
     LEGACY COMPATIBILITY
    =====================================================
    */

    window.connectPrinter =
        function () {

            return PrinterManager.connect();

        };


    window.disconnectPrinter =
        function () {

            return PrinterManager.disconnect();

        };


    /*
    =====================================================
     LEGACY SERIAL
    =====================================================
    */

    window.connectSerialPrinter =
        function () {

            return PrinterManager.connectSerial();

        };


    /*
    =====================================================
     LEGACY BLE
    =====================================================
    */

    window.connectBluetoothPrinter =
        function () {

            return PrinterManager.connectBluetooth();

        };


    /*
    =====================================================
     DOM READY
    =====================================================
    */

    function initializePrinterManager() {

        setTimeout(
            () => {

                PrinterManager.init();

            },
            700
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializePrinterManager,
            {
                once: true
            }
        );

    }

    else {

        initializePrinterManager();

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
        "SmartPrint Printer Manager v" +
        VERSION +
        " Ready"
    );

    console.log(
        "========================================"
    );

})();
