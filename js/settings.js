"use strict";

/*
=====================================================
 SmartPrint Settings Manager v4.2.0
=====================================================

 PURPOSE
 ----------------------------------------------------
 Central settings manager untuk SmartPrint.

 COMPATIBILITY
 ----------------------------------------------------
 app.js
 printer.js
 preview.js
 barcode.js
 bluetooth.js
 tspl.js
 escpos.js
 zpl.js
 cpcl.js

 IMPORTANT API
 ----------------------------------------------------
 Settings.get()
 Settings.set()
 Settings.getAll()
 Settings.sync()
 Settings.reset()
 Settings.save()
 Settings.load()

 Printer membaca Settings secara langsung.

=====================================================
*/

(function () {

    const VERSION = "4.2.0";

    const STORAGE_KEY = "SMARTPRINT_SETTINGS";


    /*
    =================================================
     DEFAULT SETTINGS
    =================================================
    */

    const DEFAULTS = {

        /*
        ---------------------------------------------
         APPLICATION
        ---------------------------------------------
        */

        appName:
            "SmartPrint by AppDIGI",

        version:
            VERSION,

        language:
            "id",

        theme:
            "blue",

        darkMode:
            false,

        autoSave:
            true,


        /*
        ---------------------------------------------
         PRINTER
        ---------------------------------------------
        */

        printerName:
            "",

        printLanguage:
            "ESC",

        paperWidth:
            100,

        paperHeight:
            150,

        canvasWidth:
            799,

        canvasHeight:
            1199,

        dpi:
            203,

        copies:
            1,

        density:
            8,

        speed:
            4,

        cutPaper:
            false,

        openDrawer:
            false,

        autoConnect:
            true,


        /*
        ---------------------------------------------
         LABEL
        ---------------------------------------------
        */

        labelWidth:
            100,

        labelHeight:
            150,

        gap:
            2,

        marginLeft:
            0,

        marginTop:
            0,

        rotate:
            0,


        /*
        ---------------------------------------------
         PREVIEW
        ---------------------------------------------
        */

        zoom:
            1,

        fitScreen:
            true,

        showGrid:
            false,

        showRuler:
            true,

        snapToGrid:
            true,


        /*
        ---------------------------------------------
         BACKGROUND
        ---------------------------------------------
        */

        transparentBackground:
            true,


        /*
        ---------------------------------------------
         COLOR
        ---------------------------------------------
        */

        foreground:
            "#000000",

        background:
            "transparent",


        /*
        ---------------------------------------------
         BARCODE
        ---------------------------------------------
        */

        barcodeType:
            "CODE128",

        barcodeWidth:
            2,

        barcodeHeight:
            60,

        barcodeDisplayValue:
            true,

        barcodeFontSize:
            14,


        /*
        ---------------------------------------------
         QR
        ---------------------------------------------
        */

        qrSize:
            150,

        qrErrorCorrection:
            "M",


        /*
        ---------------------------------------------
         CONNECTION
        ---------------------------------------------
        */

        connectionType:
            "BLE",


        /*
        ---------------------------------------------
         BRIDGE
        ---------------------------------------------
        */

        bridgeURL:
            "http://127.0.0.1:18181"

    };


    /*
    =================================================
     INTERNAL STATE
    =================================================
    */

    let data =
        clone(DEFAULTS);


    /*
    =================================================
     CLONE
    =================================================
    */

    function clone(object) {

        return JSON.parse(
            JSON.stringify(object)
        );

    }


    /*
    =================================================
     LOG
    =================================================
    */

    function log(...args) {

        console.log(
            "[SmartPrint Settings]",
            ...args
        );

    }


    function warn(...args) {

        console.warn(
            "[SmartPrint Settings]",
            ...args
        );

    }


    /*
    =================================================
     LOAD
    =================================================
    */

    function load() {

        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!raw) {

                data =
                    clone(DEFAULTS);

                return data;

            }


            const saved =
                JSON.parse(raw);


            if (
                saved &&
                typeof saved === "object"
            ) {

                data =
                    Object.assign(
                        clone(DEFAULTS),
                        saved
                    );

            }

        }

        catch (error) {

            warn(
                "Gagal load settings:",
                error
            );


            data =
                clone(DEFAULTS);

        }


        return data;

    }


    /*
    =================================================
     SAVE
    =================================================
    */

    function save() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );


            return true;

        }

        catch (error) {

            warn(
                "Gagal save settings:",
                error
            );


            return false;

        }

    }


    /*
    =================================================
     GET
    =================================================
    */

    function get(key, fallback = null) {

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                key
            )
        ) {

            return data[key];

        }


        return fallback;

    }


    /*
    =================================================
     SET
    =================================================
    */

    function set(key, value) {

        if (
            typeof key === "object" &&
            key !== null
        ) {

            Object.keys(key).forEach(
                name => {

                    data[name] =
                        key[name];

                }
            );

        }

        else {

            data[key] =
                value;

        }


        normalize();


        if (
            data.autoSave !== false
        ) {

            save();

        }


        dispatch();


        return true;

    }


    /*
    =================================================
     GET ALL
    =================================================
    */

    function getAll() {

        return clone(data);

    }


    /*
    =================================================
     NORMALIZE
    =================================================
    */

    function normalize() {

        /*
         * Language
         */

        if (
            !data.printLanguage
        ) {

            data.printLanguage =
                "ESC";

        }


        data.printLanguage =
            String(
                data.printLanguage
            ).toUpperCase();


        /*
         * DPI
         */

        data.dpi =
            Number(data.dpi) ||
            203;


        /*
         * Label width
         */

        data.labelWidth =
            Number(data.labelWidth) ||
            100;


        /*
         * Label height
         */

        data.labelHeight =
            Number(data.labelHeight) ||
            150;


        /*
         * Paper mengikuti label
         *
         * kecuali user memang menggunakan
         * paper size berbeda.
         */

        if (
            !Number(data.paperWidth)
        ) {

            data.paperWidth =
                data.labelWidth;

        }


        if (
            !Number(data.paperHeight)
        ) {

            data.paperHeight =
                data.labelHeight;

        }


        /*
         * Canvas pixel berdasarkan DPI.
         *
         * 100 mm @ 203 DPI ≈ 799 dots
         * 150 mm @ 203 DPI ≈ 1199 dots
         */

        data.canvasWidth =
            Math.round(
                data.labelWidth /
                25.4 *
                data.dpi
            );


        data.canvasHeight =
            Math.round(
                data.labelHeight /
                25.4 *
                data.dpi
            );


        /*
         * Copies
         */

        data.copies =
            Math.max(
                1,
                Number(data.copies) || 1
            );


        /*
         * Density
         */

        data.density =
            Math.max(
                0,
                Math.min(
                    15,
                    Number(data.density) || 8
                )
            );


        /*
         * Speed
         */

        data.speed =
            Math.max(
                1,
                Number(data.speed) || 4
            );


        /*
         * Transparent
         */

        data.transparentBackground =
            Boolean(
                data.transparentBackground
            );


        /*
         * Background
         */

        if (
            data.transparentBackground
        ) {

            data.background =
                "transparent";

        }

    }


    /*
    =================================================
     SYNC
    =================================================

     Dipanggil oleh:

        Settings.sync()

     setelah aplikasi mulai.

    =================================================
    */

    function sync() {

        load();

        normalize();

        save();


        /*
         * Sync printer language
         */

        if (
            window.Printer &&
            typeof window.Printer.setLanguage ===
            "function"
        ) {

            try {

                window.Printer.setLanguage(
                    data.printLanguage
                );

            }

            catch (error) {

                warn(
                    "Printer.setLanguage gagal:",
                    error
                );

            }

        }


        /*
         * Sync bridge URL
         */

        if (
            window.Bluetooth &&
            typeof window.Bluetooth.setBridgeURL ===
            "function"
        ) {

            try {

                window.Bluetooth.setBridgeURL(
                    data.bridgeURL
                );

            }

            catch (error) {}

        }


        log(
            "========================================"
        );

        log(
            "SmartPrint Settings Manager v" +
            VERSION
        );

        log(
            "Language:",
            data.printLanguage
        );

        log(
            "Paper:",
            data.paperWidth +
            " x " +
            data.paperHeight +
            " mm"
        );

        log(
            "Label:",
            data.labelWidth +
            " x " +
            data.labelHeight +
            " mm"
        );

        log(
            "DPI:",
            data.dpi
        );

        log(
            "Canvas:",
            data.canvasWidth +
            " x " +
            data.canvasHeight
        );

        log(
            "Transparent background:",
            data.transparentBackground
        );

        log(
            "========================================"
        );


        return getAll();

    }


    /*
    =================================================
     RESET
    =================================================
    */

    function reset() {

        data =
            clone(DEFAULTS);

        normalize();

        save();

        dispatch();

        sync();


        return getAll();

    }


    /*
    =================================================
     EVENT
    =================================================
    */

    function dispatch() {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "smartprint-settings-changed",
                    {
                        detail:
                            getAll()
                    }
                )
            );

        }

        catch (error) {}

    }


    /*
    =================================================
     LABEL SIZE
    =================================================
    */

    function setLabelSize(
        width,
        height
    ) {

        width =
            Number(width);

        height =
            Number(height);


        if (
            !width ||
            !height
        ) {

            return false;

        }


        data.labelWidth =
            width;

        data.labelHeight =
            height;

        data.paperWidth =
            width;

        data.paperHeight =
            height;


        normalize();

        save();

        dispatch();


        return true;

    }


    /*
    =================================================
     PRINTER LANGUAGE
    =================================================
    */

    function setLanguage(
        language
    ) {

        language =
            String(
                language ||
                "ESC"
            ).toUpperCase();


        const allowed = [
            "ESC",
            "ESCPOS",
            "TSPL",
            "ZPL",
            "CPCL"
        ];


        if (
            !allowed.includes(language)
        ) {

            warn(
                "Printer language tidak dikenal:",
                language
            );


            return false;

        }


        data.printLanguage =
            language;


        save();

        dispatch();


        if (
            window.Printer &&
            typeof window.Printer.setLanguage ===
            "function"
        ) {

            window.Printer.setLanguage(
                language
            );

        }


        return true;

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    const Settings = {

        version:
            VERSION,

        defaults:
            clone(DEFAULTS),

        load,

        save,

        sync,

        get,

        set,

        getAll,

        reset,

        normalize,

        setLabelSize,

        setLanguage

    };


    /*
    =================================================
     GLOBAL
    =================================================
    */

    window.Settings =
        Settings;


    window.SmartPrintSettings =
        Settings;


    /*
    =================================================
     INITIAL LOAD
    =================================================
    */

    load();

    normalize();


    console.log(
        "[SmartPrint Settings] Settings Manager v" +
        VERSION +
        " Ready"
    );

})();
