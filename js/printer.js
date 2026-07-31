/*
=========================================================
SmartPrint by AppDIGI
Printer Manager v3.0
=========================================================
*/

"use strict";

(function () {

    const PrinterManager = {

        language: "ESC",

        paperWidth: 576,

        dpi: 203,

        copies: 1,

        connected: false,


        // =========================================
        // CONNECT
        // =========================================

        async connect() {

            console.log("----------------------------------------");
            console.log("PRINTER MANAGER CONNECT");
            console.log("----------------------------------------");

            if (
                typeof Bluetooth === "undefined"
            ) {

                console.error(
                    "Bluetooth Engine tidak ditemukan."
                );

                this.connected = false;

                this.updateStatus(false);

                return false;
            }

            try {

                const result =
                    await Bluetooth.connect();

                if (!result) {

                    console.warn(
                        "Printer connection dibatalkan."
                    );

                    this.connected = false;

                    this.updateStatus(false);

                    return false;
                }


                if (
                    typeof Bluetooth.isConnected === "function" &&
                    !Bluetooth.isConnected()
                ) {

                    console.warn(
                        "Bluetooth belum benar-benar connected."
                    );

                    this.connected = false;

                    this.updateStatus(false);

                    return false;
                }


                this.connected = true;

                console.log(
                    "Printer Connected"
                );

                this.updateStatus(true);

                return true;

            }

            catch (error) {

                console.error(
                    "Printer Connect Error",
                    error
                );

                this.connected = false;

                this.updateStatus(false);

                return false;
            }
        },


        // =========================================
        // IS CONNECTED
        // =========================================

        isConnected() {

            if (!this.connected) {

                return false;
            }

            if (
                typeof Bluetooth !== "undefined" &&
                typeof Bluetooth.isConnected === "function"
            ) {

                return Bluetooth.isConnected();
            }

            return true;
        },


        // =========================================
        // DISCONNECT
        // =========================================

        disconnect() {

            console.log(
                "Printer Disconnect"
            );

            try {

                if (
                    typeof Bluetooth !== "undefined" &&
                    typeof Bluetooth.disconnect === "function"
                ) {

                    Bluetooth.disconnect();
                }

            }

            catch (error) {

                console.error(
                    "Printer Disconnect Error",
                    error
                );
            }

            this.connected = false;

            this.updateStatus(false);
        },


        // =========================================
        // PRINT
        // =========================================

        async print(canvas) {

            if (!this.isConnected()) {

                throw new Error(
                    "Printer belum terhubung."
                );
            }


            if (!canvas) {

                throw new Error(
                    "Canvas tidak tersedia."
                );
            }


            switch (this.language) {

                case "ESC":

                    if (
                        typeof ESCpos === "undefined"
                    ) {

                        throw new Error(
                            "ESCpos Engine tidak ditemukan."
                        );
                    }

                    return await ESCpos.print(
                        canvas,
                        this
                    );


                case "TSPL":

                    if (
                        typeof TSPL === "undefined"
                    ) {

                        throw new Error(
                            "TSPL Engine tidak ditemukan."
                        );
                    }

                    return await TSPL.print(
                        canvas,
                        this
                    );


                case "ZPL":

                    if (
                        typeof ZPL === "undefined"
                    ) {

                        throw new Error(
                            "ZPL Engine tidak ditemukan."
                        );
                    }

                    return await ZPL.print(
                        canvas,
                        this
                    );


                case "CPCL":

                    if (
                        typeof CPCL === "undefined"
                    ) {

                        throw new Error(
                            "CPCL Engine tidak ditemukan."
                        );
                    }

                    return await CPCL.print(
                        canvas,
                        this
                    );


                default:

                    throw new Error(
                        "Printer language tidak didukung: " +
                        this.language
                    );
            }
        },


        // =========================================
        // STATUS
        // =========================================

        updateStatus(connected) {

            const status =
                document.getElementById(
                    "printerStatus"
                );

            const dot =
                document.querySelector(
                    ".dot"
                );


            if (status) {

                status.textContent =
                    connected
                        ? "Printer Connected"
                        : "No Printer";
            }


            if (dot) {

                dot.classList.toggle(
                    "connected",
                    connected
                );
            }
        },


        // =========================================
        // SETTINGS
        // =========================================

        setLanguage(lang) {

            this.language =
                lang;
        },


        setPaper(width) {

            this.paperWidth =
                Number(width) || 576;
        },


        setDPI(dpi) {

            this.dpi =
                Number(dpi) || 203;
        },


        setCopies(num) {

            this.copies =
                Math.max(
                    1,
                    Number(num) || 1
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


    console.log(
        "SmartPrint Printer Manager v3.0 Ready"
    );

})();
