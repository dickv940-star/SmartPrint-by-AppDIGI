/*
=========================================================
RAWbt by AppDIGI
Printer Manager v1.0
=========================================================
*/

"use strict";

const Printer = {

    language: "ESC",

    paperWidth: 576,

    dpi: 203,

    copies: 1,

    async printCanvas(canvas){

        switch(this.language){

            case "ESC":
                return ESCPrinter.print(canvas);

            case "TSPL":
                return TSPLPrinter.print(canvas);

            case "ZPL":
                return ZPLPrinter.print(canvas);

            case "CPCL":
                return CPCLPrinter.print(canvas);

            default:

                console.error("Printer language not supported");

        }

    },

    setLanguage(lang){

        this.language=lang;

    },

    setPaper(width){

        this.paperWidth=width;

    },

    setDPI(dpi){

        this.dpi=dpi;

    }

};
