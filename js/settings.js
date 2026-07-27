/*
=========================================================
RAWbt by AppDIGI
Settings Manager v1.0
=========================================================
*/

"use strict";

const Settings = {

    key: "RAWBT_SETTINGS",

    data: {

        /* =========================
           APP
        ========================= */

        appName: "RAWbt by AppDIGI",

        version: "4.0.0",

        language: "id",

        theme: "yellow",

        darkMode: false,

        autoSave: true,

        /* =========================
           PRINTER
        ========================= */

        printerName: "",

        printerType: "ESC",

        paperWidth: 80,

        paperHeight: 150,

        dpi: 203,

        copies: 1,

        density: 8,

        speed: 4,

        cutPaper: false,

        openDrawer: false,

        autoConnect: true,

        /* =========================
           LABEL
        ========================= */

        labelWidth: 100,

        labelHeight: 150,

        gap: 2,

        marginLeft: 0,

        marginTop: 0,

        rotate: 0,

        /* =========================
           PREVIEW
        ========================= */

        zoom: 1,

        fitScreen: true,

        showGrid: false,

        showRuler: true,

        snapToGrid: true,

        /* =========================
           BARCODE
        ========================= */

        barcodeType: "CODE128",

        barcodeWidth: 2,

        barcodeHeight: 80,

        barcodeText: true,

        /* =========================
           QR CODE
        ========================= */

        qrSize: 200,

        qrMargin: 2,

        qrCorrection: "M"

    },

    load() {

        const json = localStorage.getItem(this.key);

        if (!json) {

            this.save();

            return;

        }

        try {

            this.data = JSON.parse(json);

        } catch (e) {

            console.error(e);

            this.save();

        }

    },

    save() {

        localStorage.setItem(

            this.key,

            JSON.stringify(this.data)

        );

    },

    reset() {

        localStorage.removeItem(this.key);

        location.reload();

    },

    get(name) {

        return this.data[name];

    },

    set(name, value) {

        this.data[name] = value;

        this.save();

    },

    toggleDarkMode() {

        this.data.darkMode = !this.data.darkMode;

        this.save();

    },

    setTheme(theme) {

        this.data.theme = theme;

        this.save();

    }

};

Settings.load();
