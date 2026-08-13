"use strict";

/*
=====================================================
 SmartPrint Printer Manager v4.1
=====================================================

 COMPATIBLE
 -----------------------------------------------------
 ✓ SmartPrint Bluetooth Engine v5.3
 ✓ Bluetooth BLE
 ✓ Bluetooth Classic / Web Serial COM
 ✓ Local Bridge
 ✓ Auto Connect
 ✓ Manual Connect
 ✓ Manual BLE Connect
 ✓ Manual Serial / COM Connect
 ✓ Manual Bridge Connect
 ✓ Disconnect
 ✓ Connection Status
 ✓ Print Routing
 ✓ ESC / TSPL / ZPL / CPCL
 ✓ Copies
 ✓ DPI
 ✓ Paper Width / Height
 ✓ Density
 ✓ Speed
 ✓ Save Printer Settings
 ✓ Legacy Compatibility

 IMPORTANT
 -----------------------------------------------------
 AUTO CONNECT
    → Bluetooth.autoConnect()

 USER CONNECT
    → Bluetooth.connectUser()

 SERIAL / COM
    → Bluetooth.connectSerial()

 BLE
    → Bluetooth.connectBLE()

 BRIDGE
    → Bluetooth.connectBridge()

 Web Serial requestPort() HARUS berasal
 dari user gesture.

 Jangan memanggil connectSerial()
 sebagai fallback otomatis setelah BLE.
=====================================================
*/


(function () {

    "use strict";


    const PrinterManager = {

        // =================================================
        // VERSION
        // =================================================

        version: "4.1.0",


        // =================================================
        // DEFAULT SETTINGS
        // =================================================

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


        // =================================================
        // STATE
        // =================================================

        connected: false,

        connecting: false,

        printing: false,

        initialized: false,


        // =================================================
        // INIT
        // =================================================

        async init() {

            if (this.initialized) {

                return true;

            }


            console.log(
                "========================================"
            );

            console.log(
                "SmartPrint Printer Manager v4.1"
            );

            console.log(
                "========================================"
            );


            // =============================================
            // LOAD SETTINGS
            // =============================================

            this.loadSettings();


            this.initialized =
                true;


            this.connected =
                false;


            this.updateStatus(
                "disconnected"
            );


            // =============================================
            // AUTO CONNECT
            // =============================================

            if (
                this.autoConnect &&
                this.printerType === "bluetooth"
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
                        "Auto Connect gagal:",
                        error
                    );

                }

            }


            console.log(
                "Printer Manager initialized."
            );


            return true;

        },


        // =================================================
        // WAIT BLUETOOTH
        // =================================================

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
                    Date.now() - start >
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


        // =================================================
        // USER CONNECT
        // =================================================
        /*
        IMPORTANT:

        Fungsi ini dipakai oleh tombol Connect.

        Bluetooth.connectUser() akan menjaga
        koneksi tetap berada dalam user gesture
        selama proses picker.

        Jangan mengganti dengan Bluetooth.connect().
        */

        async connect() {

            if (
                this.connecting
            ) {

                console.warn(
                    "Printer sedang connecting."
                );

                return false;

            }


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                await this.waitForBluetooth();


                if (
                    typeof Bluetooth ===
                    "undefined"
                ) {

                    throw new Error(
                        "Bluetooth Engine tidak ditemukan."
                    );

                }


                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT PRINTER USER CONNECT v4.1"
                );

                console.log(
                    "========================================"
                );


                // =========================================
                // BLUETOOTH
                // =========================================

                if (
                    this.printerType ===
                    "bluetooth"
                ) {

                    /*
                    =========================================
                    USER CONNECT

                    PENTING:

                    Gunakan connectUser(), bukan connect().

                    Ini mencegah:

                    SecurityError:
                    Must be handling a user gesture
                    =========================================
                    */

                    if (
                        typeof Bluetooth.connectUser ===
                        "function"
                    ) {

                        const result =
                            await Bluetooth.connectUser();


                        if (!result) {

                            /*
                            Cancel BLE / Serial bukan
                            error aplikasi.

                            Bluetooth Engine sudah mengubah
                            status menjadi disconnected.
                            */

                            this.connected =
                                false;


                            this.updateStatus(
                                "disconnected"
                            );


                            return false;

                        }

                    }

                    else {

                        /*
                        Compatibility fallback
                        untuk Bluetooth Engine lama.
                        */

                        console.warn(
                            "Bluetooth.connectUser() tidak tersedia."
                        );


                        if (
                            typeof Bluetooth.connect ===
                            "function"
                        ) {

                            const result =
                                await Bluetooth.connect();


                            if (!result) {

                                this.connected =
                                    false;


                                this.updateStatus(
                                    "disconnected"
                                );


                                return false;

                            }

                        }

                        else {

                            throw new Error(
                                "Bluetooth Connect API tidak tersedia."
                            );

                        }

                    }


                    this.connected =
                        this.bluetoothIsConnected();


                    if (
                        this.connected &&
                        typeof Bluetooth.getDeviceName ===
                        "function"
                    ) {

                        this.printerName =
                            Bluetooth.getDeviceName();

                    }

                }


                // =========================================
                // USB
                // =========================================

                else if (
                    this.printerType ===
                    "usb"
                ) {

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


                    this.connected =
                        await USBPrinter.connect();

                }


                // =========================================
                // SYSTEM PRINTER
                // =========================================

                else if (
                    this.printerType ===
                    "system"
                ) {

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


                    this.connected =
                        await SystemPrinter.connect();

                }


                else {

                    throw new Error(
                        "Printer type tidak didukung: " +
                        this.printerType
                    );

                }


                // =========================================
                // CONNECTION CHECK
                // =========================================

                if (
                    !this.connected
                ) {

                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.updateStatus(
                    "connected"
                );


                this.saveSettings();


                console.log(
                    "Printer Connected:",
                    this.printerName
                );


                return true;

            }

            catch (error) {

                console.error(
                    "Printer Connect Error:",
                    error
                );


                this.connected =
                    false;


                /*
                Cancel picker bukan error fatal.
                */

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
                        "Pemilihan printer dibatalkan pengguna."
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
        // CONNECT BLUETOOTH USER
        // =================================================

        async connectBluetooth() {

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


            this.connecting =
                true;


            this.updateStatus(
                "connecting"
            );


            try {

                /*
                Hanya panggil connectBLE()
                secara langsung dari event klik.

                Cocok untuk BLE.
                */

                const result =
                    await Bluetooth.connectBLE();


                if (!result) {

                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connected =
                    this.bluetoothIsConnected();


                if (
                    this.connected &&
                    typeof Bluetooth.getDeviceName ===
                    "function"
                ) {

                    this.printerName =
                        Bluetooth.getDeviceName();

                }


                if (
                    this.connected
                ) {

                    this.updateStatus(
                        "connected"
                    );


                    this.saveSettings();

                }


                return this.connected;

            }

            catch (error) {

                console.error(
                    "Bluetooth BLE Connect Error:",
                    error
                );


                this.connected =
                    false;


                if (
                    error &&
                    (
                        error.name ===
                        "NotFoundError" ||
                        error.name ===
                        "AbortError"
                    )
                ) {

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
        // CONNECT SERIAL / COM
        // =================================================
        /*
        PENTING:

        Fungsi ini harus dipanggil langsung
        dari event click.

        Contoh:

        button.addEventListener("click", () => {
            Printer.connectSerial();
        });

        Jangan:

        BLE → await → connectSerial()

        karena requestPort() membutuhkan
        user gesture.
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


            this.updateStatus(
                "connecting"
            );


            try {

                console.log(
                    "========================================"
                );

                console.log(
                    "SMARTPRINT SERIAL / COM CONNECT v4.1"
                );

                console.log(
                    "========================================"
                );


                /*
                =========================================
                requestPort() dipanggil langsung melalui
                Bluetooth.connectSerial().

                Fungsi ini HARUS berasal dari tombol user.
                =========================================
                */

                const result =
                    await Bluetooth.connectSerial();


                if (!result) {

                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connected =
                    this.bluetoothIsConnected();


                if (
                    this.connected
                ) {

                    if (
                        typeof Bluetooth.getDeviceName ===
                        "function"
                    ) {

                        this.printerName =
                            Bluetooth.getDeviceName();

                    }


                    this.updateStatus(
                        "connected"
                    );


                    this.saveSettings();


                    console.log(
                        "Bluetooth Classic / COM Connected:",
                        this.printerName
                    );


                    return true;

                }


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

            catch (error) {

                console.error(
                    "Serial Connect Error:",
                    error
                );


                this.connected =
                    false;


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
                        "Pemilihan COM dibatalkan pengguna."
                    );


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                /*
                SecurityError biasanya berarti
                connectSerial() dipanggil bukan langsung
                dari user gesture.

                Jangan mencoba requestPort()
                lagi secara otomatis.
                */

                if (
                    error &&
                    error.name ===
                    "SecurityError"
                ) {

                    console.error(
                        "Web Serial membutuhkan klik langsung dari pengguna."
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
        // CONNECT BRIDGE
        // =================================================

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


            this.updateStatus(
                "connecting"
            );


            try {

                const result =
                    await Bluetooth.connectBridge();


                if (!result) {

                    this.connected =
                        false;


                    this.updateStatus(
                        "disconnected"
                    );


                    return false;

                }


                this.connected =
                    this.bluetoothIsConnected();


                if (
                    this.connected
                ) {

                    if (
                        typeof Bluetooth.getDeviceName ===
                        "function"
                    ) {

                        this.printerName =
                            Bluetooth.getDeviceName();

                    }


                    this.updateStatus(
                        "connected"
                    );


                    this.saveSettings();


                    return true;

                }


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

            catch (error) {

                console.error(
                    "Bridge Connect Error:",
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


        // =================================================
        // AUTO CONNECT
        // =================================================

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


            try {

                console.log(
                    "Printer Auto Connect..."
                );


                const result =
                    await Bluetooth.autoConnect();


                this.connected =
                    !!result;


                if (
                    this.connected &&
                    typeof Bluetooth.getDeviceName ===
                    "function"
                ) {

                    this.printerName =
                        Bluetooth.getDeviceName();

                }


                this.updateStatus(
                    this.connected
                        ? "connected"
                        : "disconnected"
                );


                if (
                    this.connected
                ) {

                    this.saveSettings();

                }


                return this.connected;

            }

            catch (error) {

                console.warn(
                    "Printer Auto Connect Error:",
                    error
                );


                this.connected =
                    false;


                this.updateStatus(
                    "disconnected"
                );


                return false;

            }

        },


        // =================================================
        // LEGACY AUTO CONNECT
        // =================================================

        /*
        Untuk kompatibilitas jika ada kode lama
        yang memanggil Printer.autoConnect().
        */

        autoConnectLegacy() {

            return this.autoConnectPrinter();

        },


        // =================================================
        // BLUETOOTH CONNECTION CHECK
        // =================================================

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


            return Boolean(
                Bluetooth.connected
            );

        },


        // =================================================
        // IS CONNECTED
        // =================================================

        isConnected() {

            // =============================================
            // BLUETOOTH
            // =============================================

            if (
                this.printerType ===
                "bluetooth"
            ) {

                this.connected =
                    this.bluetoothIsConnected();


                return this.connected;

            }


            // =============================================
            // USB
            // =============================================

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


            // =============================================
            // SYSTEM
            // =============================================

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


        // =================================================
        // DISCONNECT
        // =================================================

        async disconnect() {

            console.log(
                "Printer Disconnect"
            );


            try {

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


            this.updateStatus(
                "disconnected"
            );


            return true;

        },


        // =================================================
        // PRINT
        // =================================================

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


                // =========================================
                // ESC / ESC POS
                // =========================================

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


                    result =
                        await ESCpos.print(
                            canvas,
                            this
                        );

                }


                // =========================================
                // TSPL
                // =========================================

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


                    result =
                        await TSPL.print(
                            canvas,
                            this
                        );

                }


                // =========================================
                // ZPL
                // =========================================

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


                    result =
                        await ZPL.print(
                            canvas,
                            this
                        );

                }


                // =========================================
                // CPCL
                // =========================================

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


                /*
                Printer kemungkinan masih connected.
                */

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


        // =================================================
        // SET PRINTER TYPE
        // =================================================

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
                .toLowerCase();


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


        // =================================================
        // SET PRINTER NAME
        // =================================================

        setPrinterName(name) {

            this.printerName =
                String(
                    name || ""
                );


            this.saveSettings();

        },


        // =================================================
        // SET LANGUAGE
        // =================================================

        setLanguage(language) {

            this.language =
                String(
                    language || "TSPL"
                )
                .toUpperCase();


            this.saveSettings();


            console.log(
                "Printer Language:",
                this.language
            );

        },


        // =================================================
        // SET PAPER
        // =================================================

        setPaper(width, height) {

            this.paperWidth =
                Number(width) ||
                576;


            if (
                height !== undefined
            ) {

                this.paperHeight =
                    Number(height) ||
                    1200;

            }


            this.saveSettings();

        },


        // =================================================
        // SET DPI
        // =================================================

        setDPI(dpi) {

            this.dpi =
                Number(dpi) ||
                203;


            this.saveSettings();

        },


        // =================================================
        // SET COPIES
        // =================================================

        setCopies(copies) {

            this.copies =
                Math.max(
                    1,
                    Number(copies) || 1
                );


            this.saveSettings();

        },


        // =================================================
        // SET DENSITY
        // =================================================

        setDensity(density) {

            this.density =
                Math.max(
                    0,
                    Number(density) || 0
                );


            this.saveSettings();

        },


        // =================================================
        // SET SPEED
        // =================================================

        setSpeed(speed) {

            this.speed =
                Math.max(
                    1,
                    Number(speed) || 1
                );


            this.saveSettings();

        },


        // =================================================
        // SET AUTO CONNECT
        // =================================================

        setAutoConnect(enabled) {

            this.autoConnect =
                Boolean(
                    enabled
                );


            this.saveSettings();

        },


        // =================================================
        // STATUS
        // =================================================

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
                    connected
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

                    this.printerType =
                        settings.printerType;

                }


                if (
                    settings.printerName !==
                    undefined
                ) {

                    this.printerName =
                        settings.printerName;

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
                            ) || 1
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
                            ) || 0
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
                            ) || 1
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


        // =================================================
        // SAVE SETTINGS
        // =================================================

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


        // =================================================
        // GET INFO
        // =================================================

        getInfo() {

            return {

                version:
                    this.version,

                type:
                    this.printerType,

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

                autoConnect:
                    this.autoConnect

            };

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

    window.Printer =
        PrinterManager;


    window.PrinterManager =
        PrinterManager;


    // =====================================================
    // LEGACY COMPATIBILITY
    // =====================================================

    /*
    Kode lama yang menggunakan:

        Printer.connect()

    tetap bekerja.
    */


    window.connectPrinter =
        function () {

            return PrinterManager.connect();

        };


    window.disconnectPrinter =
        function () {

            return PrinterManager.disconnect();

        };


    // =====================================================
    // DOM READY
    // =====================================================

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setTimeout(
                () => {

                    PrinterManager.init();

                },
                700
            );

        }
    );


    // =====================================================
    // READY
    // =====================================================

    console.log(
        "SmartPrint Printer Manager v4.1 Ready"
    );

})();
