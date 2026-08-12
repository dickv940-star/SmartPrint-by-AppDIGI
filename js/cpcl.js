"use strict";

/*
=====================================================
 SmartPrint CPCL Engine v1.0
=====================================================

Target:
- CPCL compatible printer
- Bluetooth
- Mobile / portable printer

Fitur:
✓ Canvas → 1-bit bitmap
✓ ! 0 200 200
✓ PAGE-WIDTH
✓ TONE
✓ SPEED
✓ CG / compressed bitmap
✓ TEXT
✓ BARCODE
✓ QR CODE
✓ PRINT
✓ Copies
✓ Raw CPCL
✓ Test Print

=====================================================
*/


(function () {

    "use strict";


    const CPCL = {


        // =================================================
        // DEFAULT
        // =================================================

        defaultDPI: 203,

        defaultWidthMM: 58,

        defaultHeightMM: 40,

        defaultWidthDot: 464,

        defaultHeightDot: 320,


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
                    "Printer Bluetooth belum terhubung."
                );

            }


            console.log(
                "========================================"
            );

            console.log(
                "CPCL PRINT"
            );

            console.log(
                "========================================"
            );


            // =============================================
            // DPI
            // =============================================

            const dpi =
                Number(
                    printer.dpi
                ) ||
                this.defaultDPI;


            // =============================================
            // LABEL SIZE
            // =============================================

            let widthMM =
                this.defaultWidthMM;


            let heightMM =
                this.defaultHeightMM;


            if (
                typeof Settings !==
                "undefined"
            ) {

                if (
                    Settings.labelWidth
                ) {

                    widthMM =
                        Number(
                            Settings.labelWidth
                        );

                }


                if (
                    Settings.labelHeight
                ) {

                    heightMM =
                        Number(
                            Settings.labelHeight
                        );

                }

            }


            // =============================================
            // MM → DOT
            // =============================================

            const widthDot =
                this.mmToDot(
                    widthMM,
                    dpi
                );


            const heightDot =
                this.mmToDot(
                    heightMM,
                    dpi
                );


            // =============================================
            // CANVAS → BITMAP
            // =============================================

            const bitmap =
                this.canvasToBitmap(
                    canvas,
                    widthDot,
                    heightDot
                );


            // =============================================
            // BUILD CPCL
            // =============================================

            const cpcl =
                this.buildImageCPCL({

                    bitmap:
                        bitmap,

                    widthDot:
                        widthDot,

                    heightDot:
                        heightDot,

                    printer:
                        printer

                });


            // =============================================
            // SEND
            // =============================================

            await Bluetooth.write(
                cpcl
            );


            console.log(
                "CPCL PRINT SENT"
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

            targetWidth =
                Math.max(
                    8,
                    Math.floor(
                        targetWidth
                    )
                );


            targetHeight =
                Math.max(
                    1,
                    Math.floor(
                        targetHeight
                    )
                );


            // =============================================
            // TEMP CANVAS
            // =============================================

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


            // =============================================
            // WHITE BACKGROUND
            // =============================================

            ctx.fillStyle =
                "#FFFFFF";


            ctx.fillRect(
                0,
                0,
                targetWidth,
                targetHeight
            );


            // =============================================
            // DRAW
            // =============================================

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


            // =============================================
            // PIXELS
            // =============================================

            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight
                );


            const pixels =
                imageData.data;


            // =============================================
            // BYTES PER ROW
            // =============================================

            const bytesPerRow =
                Math.ceil(
                    targetWidth / 8
                );


            const data =
                new Uint8Array(

                    bytesPerRow *
                    targetHeight

                );


            // =============================================
            // CONVERT
            // =============================================

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
                        pixels[index];


                    const g =
                        pixels[index + 1];


                    const b =
                        pixels[index + 2];


                    const a =
                        pixels[index + 3];


                    // -------------------------------------
                    // TRANSPARENT
                    // -------------------------------------

                    if (
                        a < 128
                    ) {

                        continue;

                    }


                    // -------------------------------------
                    // GRAYSCALE
                    // -------------------------------------

                    const gray =
                        (
                            r * 299 +
                            g * 587 +
                            b * 114
                        ) / 1000;


                    // -------------------------------------
                    // BLACK
                    // -------------------------------------

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


                        data[
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
                    data,

                width:
                    targetWidth,

                height:
                    targetHeight,

                bytesPerRow:
                    bytesPerRow

            };

        },


        // =================================================
        // BITMAP → CPCL HEX
        // =================================================

        bitmapToHex(bitmap) {

            let result =
                "";


            for (
                const byte of bitmap.data
            ) {

                result +=
                    byte
                        .toString(16)
                        .padStart(
                            2,
                            "0"
                        )
                        .toUpperCase();

            }


            return result;

        },


        // =================================================
        // BUILD CPCL IMAGE
        // =================================================

        buildImageCPCL(options) {

            const {

                bitmap,

                widthDot,

                heightDot,

                printer

            } = options;


            const copies =
                Math.max(
                    1,
                    Number(
                        printer.copies
                    ) || 1
                );


            let cpcl =
                "";


            // =============================================
            // CPCL HEADER
            // =============================================

            cpcl +=
                `! 0 200 200 ${heightDot} ${copies}\n`;


            // =============================================
            // PAGE WIDTH
            // =============================================

            cpcl +=
                `PAGE-WIDTH ${widthDot}\n`;


            // =============================================
            // TONE
            // =============================================

            if (
                printer.density !==
                undefined
            ) {

                cpcl +=
                    `TONE ${Number(printer.density)}\n`;

            }


            // =============================================
            // SPEED
            // =============================================

            if (
                printer.speed
            ) {

                cpcl +=
                    `SPEED ${Number(printer.speed)}\n`;

            }


            // =============================================
            // IMAGE
            // =============================================

            /*
            ---------------------------------------------
            CPCL CG

            Format:

            CG width height x y data
            ---------------------------------------------
            */

            cpcl +=
                `CG ${bitmap.bytesPerRow} ${bitmap.height} 0 0 `;


            cpcl +=
                this.bitmapToHex(
                    bitmap
                );


            cpcl +=
                "\n";


            // =============================================
            // PRINT
            // =============================================

            cpcl +=
                "FORM\n";


            cpcl +=
                "PRINT\n";


            return cpcl;

        },


        // =================================================
        // TEXT
        // =================================================

        text(
            value,
            x = 0,
            y = 0,
            font = 0,
            size = 0
        ) {

            return (

                `TEXT ${font} ${size} ${x} ${y} ` +
                `${this.escapeText(value)}\n`

            );

        },


        // =================================================
        // BARCODE
        // =================================================

        barcode(
            value,
            x = 0,
            y = 0,
            height = 80,
            width = 2
        ) {

            return (

                `BARCODE 128 1 ${width} ${height} ${x} ${y} ` +
                `${this.escapeText(value)}\n`

            );

        },


        // =================================================
        // QR CODE
        // =================================================

        qrCode(
            value,
            x = 0,
            y = 0,
            size = 5
        ) {

            /*
            ---------------------------------------------
            CPCL printer support terhadap QR command
            berbeda antar firmware.

            Kita tetap menyediakan API ini agar
            engine memiliki interface yang konsisten.
            ---------------------------------------------
            */

            return (

                `BARCODE QR ${x} ${y} M 2 U ${size}\n` +

                `MA,${this.escapeText(value)}\n` +

                "ENDQR\n"

            );

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


            const cpcl =

                "! 0 200 200 400 1\n" +

                "PAGE-WIDTH 464\n" +

                "TEXT 4 0 40 40 SMARTPRINT\n" +

                "TEXT 0 0 40 90 AppDIGI\n" +

                "TEXT 0 0 40 130 CPCL TEST PRINT\n" +

                "BARCODE 128 1 2 80 40 180 123456789\n" +

                "FORM\n" +

                "PRINT\n";


            await Bluetooth.write(
                cpcl
            );


            console.log(
                "CPCL TEST PRINT SENT"
            );


            return true;

        },


        // =================================================
        // RAW CPCL
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
        // ESCAPE
        // =================================================

        escapeText(value) {

            return String(
                value ?? ""
            )
                .replace(
                    /\r/g,
                    " "
                )
                .replace(
                    /\n/g,
                    " "
                );

        }

    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.CPCL =
        CPCL;


    // =====================================================
    // TEST
    // =====================================================

    window.testCPCL =
        function () {

            return CPCL.testPrint();

        };


    console.log(
        "SmartPrint CPCL Engine v1.0 Ready"
    );


})();
