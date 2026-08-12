"use strict";

/*
=====================================================
 SmartPrint TSPL Engine v1.0
=====================================================

Canvas
  ↓
Bitmap Converter
  ↓
TSPL Command
  ↓
Bluetooth.write()
  ↓
Bluetooth Printer

Target:
- TSPL label printer
- Bluetooth BLE
- DPI 203
- Label mm
=====================================================
*/

(function () {

    "use strict";


    const TSPL = {


        // =================================================
        // DEFAULT
        // =================================================

        defaultDPI: 203,

        defaultLabelWidth: 100,

        defaultLabelHeight: 150,

        defaultGap: 2,


        // =================================================
        // PRINT
        // =================================================

        async print(canvas, printer) {

            if (!canvas) {

                throw new Error(
                    "Canvas tidak tersedia."
                );

            }


            if (!printer) {

                throw new Error(
                    "Printer Manager tidak tersedia."
                );

            }


            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                throw new Error(
                    "Bluetooth Engine tidak ditemukan."
                );

            }


            if (
                !Bluetooth.isConnected()
            ) {

                throw new Error(
                    "Bluetooth Printer belum terhubung."
                );

            }


            console.log(
                "========================================"
            );

            console.log(
                "TSPL PRINT"
            );

            console.log(
                "========================================"
            );


            // =============================================
            // SETTINGS
            // =============================================

            const dpi =
                Number(
                    printer.dpi
                ) ||
                this.defaultDPI;


            /*
            Printer.paperWidth / paperHeight
            di PrinterManager adalah pixel/dot.

            Jika tersedia Settings label mm,
            kita gunakan labelWidth / labelHeight.
            */

            let labelWidthMM =
                this.defaultLabelWidth;


            let labelHeightMM =
                this.defaultLabelHeight;


            let gapMM =
                this.defaultGap;


            if (
                typeof Settings !==
                "undefined"
            ) {

                if (
                    Settings.labelWidth
                ) {

                    labelWidthMM =
                        Number(
                            Settings.labelWidth
                        );

                }


                if (
                    Settings.labelHeight
                ) {

                    labelHeightMM =
                        Number(
                            Settings.labelHeight
                        );

                }


                if (
                    Settings.gap !==
                    undefined
                ) {

                    gapMM =
                        Number(
                            Settings.gap
                        );

                }

            }


            // =============================================
            // MM → DOT
            // =============================================

            const widthDot =
                this.mmToDot(
                    labelWidthMM,
                    dpi
                );


            const heightDot =
                this.mmToDot(
                    labelHeightMM,
                    dpi
                );


            const gapDot =
                this.mmToDot(
                    gapMM,
                    dpi
                );


            console.log(
                "Label:",
                labelWidthMM,
                "x",
                labelHeightMM,
                "mm"
            );


            console.log(
                "Dots:",
                widthDot,
                "x",
                heightDot
            );


            // =============================================
            // CONVERT CANVAS
            // =============================================

            const bitmap =
                this.canvasToBitmap(
                    canvas,
                    widthDot,
                    heightDot
                );


            // =============================================
            // BUILD TSPL
            // =============================================

            const command =
                this.buildCommand({

                    widthMM:
                        labelWidthMM,

                    heightMM:
                        labelHeightMM,

                    gapMM:
                        gapMM,

                    widthDot:
                        widthDot,

                    heightDot:
                        heightDot,

                    gapDot:
                        gapDot,

                    bitmap:
                        bitmap,

                    printer:
                        printer

                });


            console.log(
                "TSPL command size:",
                command.length
            );


            // =============================================
            // SEND
            // =============================================

            const result =
                await Bluetooth.write(
                    command
                );


            if (!result) {

                throw new Error(
                    "TSPL data gagal dikirim."
                );

            }


            console.log(
                "TSPL PRINT SENT"
            );


            return true;

        },


        // =================================================
        // MM → DOT
        // =================================================

        mmToDot(mm, dpi) {

            return Math.round(
                Number(mm) *
                Number(dpi) /
                25.4
            );

        },


        // =================================================
        // CANVAS → BITMAP
        // =================================================

        canvasToBitmap(
            canvas,
            targetWidth,
            targetHeight
        ) {

            /*
            =============================================
            Temporary Canvas
            =============================================
            */

            const tempCanvas =
                document.createElement(
                    "canvas"
                );


            tempCanvas.width =
                targetWidth;


            tempCanvas.height =
                targetHeight;


            const ctx =
                tempCanvas.getContext(
                    "2d",
                    {
                        willReadFrequently: true
                    }
                );


            /*
            =============================================
            WHITE BACKGROUND
            =============================================
            */

            ctx.fillStyle =
                "#FFFFFF";


            ctx.fillRect(
                0,
                0,
                targetWidth,
                targetHeight
            );


            /*
            =============================================
            DRAW SOURCE
            =============================================
            */

            ctx.drawImage(

                canvas,

                0,
                0,
                canvas.width,
                canvas.height,

                0,
                0,
                targetWidth,
                targetHeight

            );


            /*
            =============================================
            IMAGE DATA
            =============================================
            */

            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight
                );


            const data =
                imageData.data;


            /*
            =============================================
            TSPL BITMAP

            1 bit per pixel

            Black = 1
            White = 0
            =============================================
            */

            const bytesPerRow =
                Math.ceil(
                    targetWidth / 8
                );


            const bitmap =
                new Uint8Array(
                    bytesPerRow *
                    targetHeight
                );


            for (
                let y = 0;
                y < targetHeight;
                y++
            ) {

                for (
                    let x = 0;
                    x < targetWidth;
                    x++
                ) {

                    const index =
                        (
                            y *
                            targetWidth +
                            x
                        ) * 4;


                    const r =
                        data[index];


                    const g =
                        data[index + 1];


                    const b =
                        data[index + 2];


                    const a =
                        data[index + 3];


                    /*
                    -------------------------------------
                    Alpha
                    -------------------------------------
                    */

                    if (a < 128) {

                        continue;

                    }


                    /*
                    -------------------------------------
                    Grayscale
                    -------------------------------------
                    */

                    const gray =
                        (
                            r * 299 +
                            g * 587 +
                            b * 114
                        ) / 1000;


                    /*
                    -------------------------------------
                    Threshold
                    -------------------------------------
                    */

                    if (
                        gray < 128
                    ) {

                        const byteIndex =
                            y *
                            bytesPerRow +
                            Math.floor(
                                x / 8
                            );


                        const bit =
                            7 -
                            (
                                x % 8
                            );


                        bitmap[
                            byteIndex
                        ] |=
                            (
                                1 << bit
                            );

                    }

                }

            }


            return {

                data:
                    bitmap,

                width:
                    targetWidth,

                height:
                    targetHeight,

                bytesPerRow:
                    bytesPerRow

            };

        },


        // =================================================
        // BUILD TSPL COMMAND
        // =================================================

        buildCommand(options) {

            const {

                widthMM,

                heightMM,

                gapMM,

                widthDot,

                heightDot,

                bitmap,

                printer

            } = options;


            let tspl = "";


            // =============================================
            // SIZE
            // =============================================

            tspl +=
                `SIZE ${this.cleanNumber(widthMM)} mm,${this.cleanNumber(heightMM)} mm\n`;


            // =============================================
            // GAP
            // =============================================

            tspl +=
                `GAP ${this.cleanNumber(gapMM)} mm,0\n`;


            // =============================================
            // SPEED
            // =============================================

            if (
                printer &&
                printer.speed
            ) {

                tspl +=
                    `SPEED ${Number(printer.speed)}\n`;

            }


            // =============================================
            // DENSITY
            // =============================================

            if (
                printer &&
                printer.density !==
                undefined
            ) {

                tspl +=
                    `DENSITY ${Number(printer.density)}\n`;

            }


            // =============================================
            // CLS
            // =============================================

            tspl +=
                "CLS\n";


            // =============================================
            // BITMAP
            // =============================================

            tspl +=
                `BITMAP 0,0,${bitmap.bytesPerRow},${heightDot},0,`;


            /*
            =============================================
            BITMAP DATA

            TSPL BITMAP expects binary data.

            Header is ASCII.
            Bitmap itself must be raw bytes.
            =============================================
            */

            const header =
                new TextEncoder().encode(
                    tspl
                );


            const bitmapData =
                bitmap.data;


            // =============================================
            // PRINT
            // =============================================

            const copies =
                Math.max(
                    1,
                    Number(
                        printer.copies
                    ) || 1
                );


            const printCommand =
                new TextEncoder().encode(
                    `\nPRINT ${copies}\n`
                );


            /*
            =============================================
            COMBINE
            =============================================
            */

            const result =
                new Uint8Array(

                    header.length +
                    bitmapData.length +
                    printCommand.length

                );


            result.set(
                header,
                0
            );


            result.set(
                bitmapData,
                header.length
            );


            result.set(
                printCommand,

                header.length +
                bitmapData.length

            );


            return result;

        },


        // =================================================
        // TEST PRINT
        // =================================================

        async testPrint() {

            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                throw new Error(
                    "Bluetooth Engine tidak ditemukan."
                );

            }


            if (
                !Bluetooth.isConnected()
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            const command =

                `SIZE 58 mm,40 mm
GAP 3 mm,0
CLS
TEXT 50,50,"3",0,1,1,"SMARTPRINT"
BARCODE 50,100,"128",80,1,0,2,2,"123456"
PRINT 1
`;


            await Bluetooth.write(
                command
            );


            console.log(
                "TSPL TEST PRINT SENT"
            );


            return true;

        },


        // =================================================
        // RAW COMMAND
        // =================================================

        async sendRaw(command) {

            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                throw new Error(
                    "Bluetooth Engine tidak ditemukan."
                );

            }


            if (
                !Bluetooth.isConnected()
            ) {

                throw new Error(
                    "Printer belum terhubung."
                );

            }


            return await Bluetooth.write(
                command
            );

        },


        // =================================================
        // CLEAN NUMBER
        // =================================================

        cleanNumber(value) {

            const number =
                Number(value);


            if (
                !Number.isFinite(number)
            ) {

                return "0";

            }


            return String(
                Number(
                    number.toFixed(2)
                )
            );

        }

    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.TSPL =
        TSPL;


    // =====================================================
    // LEGACY
    // =====================================================

    window.testTSPL =
        function () {

            return TSPL.testPrint();

        };


    console.log(
        "SmartPrint TSPL Engine v1.0 Ready"
    );


})();
