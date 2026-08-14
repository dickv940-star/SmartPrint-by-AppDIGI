"use strict";

/*
=====================================================
 SmartPrint Settings Manager v4.2
=====================================================

 RESPONSIBILITY
 ----------------------------------------------------
 - Menyimpan konfigurasi aplikasi
 - Printer language
 - Paper / label size
 - DPI
 - Preview settings
 - Barcode settings
 - Printer settings
 - Sinkronisasi dengan Printer Manager

 IMPORTANT
 ----------------------------------------------------
 Settings TIDAK mengirim data printer.

 Settings hanya menyimpan konfigurasi.

 Printer Manager menangani koneksi dan printing.
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
        =============================================
         PRINTER
        =============================================
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
        =============================================
         LABEL
        =============================================
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
        =============================================
         PREVIEW
        =============================================
        */

        preview: {

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

            transparentBackground:
                true

        },


        /*
        =============================================
         BARCODE
        =============================================
        */

        barcodeType:
            "CODE128",

        barcodeWidth:
            2,

        barcodeHeight:
            60,

        barcodeText:
            true,


        /*
        =============================================
         QR
        =============================================
        */

        qrSize:
            200,

        qrErrorCorrection:
            "M",


        /*
        =============================================
         DESIGN
        =============================================
        */

        background:
            "transparent",

        inkColor:
            "#000000"

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
     UTILITY
    =================================================
    */

    function clone(value) {

        return JSON.parse(
            JSON.stringify(value)
        );

    }


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
     NORMALIZE LANGUAGE
    =================================================
    */

    function normalizeLanguage(language) {

        const value =
            String(
                language ||
                "ESC"
            )
            .trim()
            .toUpperCase();


        const allowed = [

            "ESC",
            "ESCPOS",
            "TSPL",
            "ZPL",
            "CPCL"

        ];


        if (
            allowed.includes(value)
        ) {

            if (
                value === "ESCPOS"
            ) {

                return "ESC";

            }

            return value;

        }


        warn(
            "Printer language tidak dikenal:",
            language,
            "→ ESC"
        );


        return "ESC";

    }


    /*
    =================================================
     NUMBER
    =================================================
    */

    function number(
        value,
        fallback
    ) {

        const n =
            Number(value);


        if (
            Number.isFinite(n)
        ) {

            return n;

        }


        return fallback;

    }


    /*
    =================================================
     LOAD
    =================================================
    */

    function load() {

        let saved =
            null;


        try {

            const raw =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (raw) {

                saved =
                    JSON.parse(raw);

            }

        }

        catch (err) {

            warn(
                "Gagal membaca settings:",
                err
            );

        }


        if (
            saved &&
            typeof saved === "object"
        ) {

            data =
                merge(
                    clone(DEFAULTS),
                    saved
                );

        }

        else {

            data =
                clone(DEFAULTS);

        }


        normalize();


        return getAll();

    }


    /*
    =================================================
     MERGE
    =================================================
    */

    function merge(
        target,
        source
    ) {

        Object.keys(source).forEach(
            key => {

                if (
                    source[key] &&
                    typeof source[key] === "object" &&
                    !Array.isArray(source[key]) &&

                    target[key] &&
                    typeof target[key] === "object" &&
                    !Array.isArray(target[key])
                ) {

                    target[key] =
                        merge(
                            target[key],
                            source[key]
                        );

                }

                else {

                    target[key] =
                        source[key];

                }

            }
        );


        return target;

    }


    /*
    =================================================
     NORMALIZE
    =================================================
    */

    function normalize() {

        data.printLanguage =
            normalizeLanguage(
                data.printLanguage
            );


        data.paperWidth =
            number(
                data.paperWidth,
                100
            );


        data.paperHeight =
            number(
                data.paperHeight,
                150
            );


        data.labelWidth =
            number(
                data.labelWidth,
                data.paperWidth
            );


        data.labelHeight =
            number(
                data.labelHeight,
                data.paperHeight
            );


        data.dpi =
            number(
                data.dpi,
                203
            );


        data.copies =
            Math.max(
                1,
                Math.floor(
                    number(
                        data.copies,
                        1
                    )
                )
            );


        data.density =
            number(
                data.density,
                8
            );


        data.speed =
            number(
                data.speed,
                4
            );


        data.gap =
            number(
                data.gap,
                2
            );


        data.marginLeft =
            number(
                data.marginLeft,
                0
            );


        data.marginTop =
            number(
                data.marginTop,
                0
            );


        data.rotate =
            number(
                data.rotate,
                0
            );


        if (
            !data.preview ||
            typeof data.preview !== "object"
        ) {

            data.preview =
                clone(
                    DEFAULTS.preview
                );

        }


        data.preview.transparentBackground =
            Boolean(
                data.preview.transparentBackground
            );


        /*
         * Canvas dot calculation.
         *
         * 100 mm @ 203 DPI ≈ 799 dots
         * 150 mm @ 203 DPI ≈ 1199 dots
         */

        data.canvasWidth =
            Math.round(
                data.paperWidth /
                25.4 *
                data.dpi
            );


        data.canvasHeight =
            Math.round(
                data.paperHeight /
                25.4 *
                data.dpi
            );


        data.background =
            "transparent";


        data.inkColor =
            "#000000";

    }


    /*
    =================================================
     SAVE
    =================================================
    */

    function save() {

        normalize();


        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );


            return true;

        }

        catch (err) {

            warn(
                "Gagal menyimpan settings:",
                err
            );


            return false;

        }

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
     GET
    =================================================
    */

    function get(
        key,
        fallback = null
    ) {

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

    function set(
        key,
        value
    ) {

        if (
            key === "printLanguage"
        ) {

            value =
                normalizeLanguage(
                    value
                );

        }


        data[key] =
            value;


        normalize();


        if (
            data.autoSave !== false
        ) {

            save();

        }


        syncPrinter();


        return data[key];

    }


    /*
    =================================================
     SET LANGUAGE
    =================================================
    */

    function setLanguage(
        language
    ) {

        const value =
            normalizeLanguage(
                language
            );


        data.printLanguage =
            value;


        if (
            data.autoSave !== false
        ) {

            save();

        }


        syncPrinter();


        log(
            "Printer Language:",
            value
        );


        return value;

    }


    /*
    =================================================
     GET LANGUAGE
    =================================================
    */

    function getLanguage() {

        return data.printLanguage;

    }


    /*
    =================================================
     SET PAPER
    =================================================
    */

    function setPaper(
        width,
        height
    ) {

        data.paperWidth =
            number(
                width,
                100
            );


        data.paperHeight =
            number(
                height,
                150
            );


        data.labelWidth =
            data.paperWidth;


        data.labelHeight =
            data.paperHeight;


        normalize();


        save();


        syncPrinter();


        return {

            width:
                data.paperWidth,

            height:
                data.paperHeight,

            dpi:
                data.dpi

        };

    }


    /*
    =================================================
     SET DPI
    =================================================
    */

    function setDPI(
        dpi
    ) {

        data.dpi =
            number(
                dpi,
                203
            );


        normalize();


        save();


        syncPrinter();


        return data.dpi;

    }


    /*
    =================================================
     PRINTER SYNC
    =================================================
    */

    function syncPrinter() {

        if (
            typeof window === "undefined"
        ) {

            return;

        }


        if (
            !window.Printer
        ) {

            return;

        }


        try {

            if (
                typeof Printer.setLanguage ===
                "function"
            ) {

                Printer.setLanguage(
                    data.printLanguage,
                    {
                        silent:
                            true
                    }
                );

            }


            if (
                typeof Printer.setPaperSize ===
                "function"
            ) {

                Printer.setPaperSize(
                    data.paperWidth,
                    data.paperHeight,
                    data.dpi,
                    {
                        silent:
                            true
                    }
                );

            }

        }

        catch (err) {

            warn(
                "Printer sync gagal:",
                err
            );

        }

    }


    /*
    =================================================
     RESET
    =================================================
    */

    function reset() {

        data =
            clone(
                DEFAULTS
            );


        save();


        syncPrinter();


        return getAll();

    }


    /*
    =================================================
     INIT
    =================================================
    */

    function init() {

        load();


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
            "DPI:",
            data.dpi
        );


        log(
            "Transparent background:",
            data.preview.transparentBackground
        );


        log(
            "========================================"
        );


        /*
         * Printer mungkin belum dibuat
         * saat Settings pertama kali init.
         *
         * Sync ditunda sebentar.
         */

        setTimeout(
            syncPrinter,
            50
        );


        return getAll();

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

        init,

        load,

        save,

        reset,

        get,

        set,

        getAll,

        setLanguage,

        getLanguage,

        setPaper,

        setDPI,

        syncPrinter

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
     AUTO INIT
    =================================================
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                Settings.init();

            },
            {
                once:
                    true
            }
        );

    }

    else {

        Settings.init();

    }

})();
