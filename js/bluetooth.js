/*
=========================================================
SmartPrint by AppDIGI
Printer Manager v3.0
=========================================================
*/

"use strict";


const Printer = {

    language: "ESC",

    paperWidth: 576,

    dpi: 203,

    copies: 1,

    connected: false,


    // =================================
    // CONNECT
    // =================================

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

            return false;

        }


        try {

            const result =
                await Bluetooth.connect();


            /*
            -----------------------------------------
            Bluetooth.connect() harus mengembalikan
            true hanya jika benar-benar connected.
            -----------------------------------------
            */

            if (!result) {

                console.warn(
                    "Printer connection dibatalkan atau gagal."
                );

                this.connected = false;

                return false;

            }


            /*
            -----------------------------------------
            Verifikasi tambahan
            -----------------------------------------
            */

            if (
                typeof Bluetooth.isConnected === "function"
            ) {

                if (
                    !Bluetooth.isConnected()
                ) {

                    console.warn(
                        "Bluetooth belum benar-benar connected."
                    );

                    this.connected = false;

                    return false;

                }

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


    // =================================
    // CHECK CONNECTION
    // =================================

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


    // =================================
    // DISCONNECT
    // =================================

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


    // =================================
    // PRINT
    // =================================

    async print(canvas) {


        /*
        -----------------------------------------
        Jangan print jika belum benar-benar
        connected.
        -----------------------------------------
        */

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


        let result;


        switch (this.language) {


            case "ESC":


                if (
                    typeof ESCpos === "undefined"
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


                break;


            case "TSPL":


                if (
                    typeof TSPL === "undefined"
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


                break;


            case "ZPL":


                if (
                    typeof ZPL === "undefined"
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


                break;


            case "CPCL":


                if (
                    typeof CPCL === "undefined"
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


                break;


            default:


                throw new Error(
                    "Printer language tidak didukung: " +
                    this.language
                );

        }


        return result;

    },


    // =================================
    // UPDATE STATUS
    // =================================

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

            status.innerText =
                connected
                    ? "Printer Connected"
                    : "No Printer";

        }


        if (dot) {

            if (connected) {

                dot.classList.add(
                    "connected"
                );

            }

            else {

                dot.classList.remove(
                    "connected"
                );

            }

        }

    },


    // =================================
    // SETTINGS
    // =================================

    setLanguage(lang) {

        this.language =
            lang;

    },


    setPaper(width) {

        this.paperWidth =
            width;

    },


    setDPI(dpi) {

        this.dpi =
            dpi;

    },


    setCopies(num) {

        this.copies =
            Math.max(
                1,
                Number(num) || 1
            );

    }

};


window.Printer = Printer;
