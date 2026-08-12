"use strict";

/*
=====================================================
 SmartPrint ZPL Engine v1.0
=====================================================

Target:
- Zebra / ZPL compatible printer
- Bluetooth
- ZPL protocol
- Canvas printing

Fitur:
✓ Canvas → 1-bit bitmap
✓ ^XA / ^XZ
✓ ^PW
✓ ^LL
✓ ^FO
✓ ^GFA
✓ ^PR
✓ ^MD
✓ Copies
✓ Text
✓ Barcode CODE128
✓ QR Code
✓ Feed
✓ Raw ZPL
✓ Test Print

=====================================================
*/


(function () {

    "use strict";


    const ZPL = {


        // =================================================
        // DEFAULT
        // =================================================

        defaultDPI: 203,

        defaultWidthMM: 100,

        defaultHeightMM: 150,

        defaultWidthDot: 800,

        defaultHeightDot: 1200,


        // =================================================
        // PRINT CANVAS
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
                "ZPL PRINT"
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


            console.log(
                "ZPL Label:",
                widthMM,
                "x",
                heightMM,
                "mm"
            );


            console.log(
                "ZPL Dots:",
                widthDot,
                "x",
                heightDot
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
            // BUILD ZPL
            // =============================================

            const zpl =
                this.buildImageZPL({

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
            // COPIES
            // =============================================

            const copies =
                Math.max(
                    1,
                    Number(
                        printer.copies
                    ) || 1
                );


            let finalZPL =
                zpl;


            if (
                copies > 1
            ) {

                finalZPL =
                    finalZPL.replace(
                        "^PQ1",
                        `^PQ${copies}`
                    );

            }


            // =============================================
            // SEND
            // =============================================

            await Bluetooth.write(
                finalZPL
            );


            console.log(
                "ZPL PRINT SENT"
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
            // DRAW SOURCE
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
            // PIXEL DATA
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


            const totalBytes =
                bytesPerRow *
                targetHeight;


            const data =
                new Uint8Array(
                    totalBytes
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
                    // TRANSPARENT = WHITE
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
                    // BLACK PIXEL
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
                    bytesPerRow,

                totalBytes:
                    totalBytes

            };

        },


        // =================================================
        // BITMAP → HEX
        // =================================================

        bitmapToHex(bitmap) {

            let hex =
                "";


            const data =
                bitmap.data;


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                hex +=
                    data[i]
                        .toString(16)
                        .padStart(
                            2,
                            "0"
                        )
                        .toUpperCase();

            }


            return hex;

        },


        // =================================================
        // BUILD IMAGE ZPL
        // =================================================

        buildImageZPL(options) {

            const {

                bitmap,

                widthDot,

                heightDot,

                printer

            } = options;


            const hex =
                this.bitmapToHex(
                    bitmap
                );


            const bytesPerRow =
                bitmap.bytesPerRow;


            const totalBytes =
                bitmap.totalBytes;


            let zpl =
                "";


            // =============================================
            // START
            // =============================================

            zpl +=
                "^XA\n";


            // =============================================
            // LABEL WIDTH
            // =============================================

            zpl +=
                `^PW${widthDot}\n`;


            // =============================================
            // LABEL LENGTH
            // =============================================

            zpl +=
                `^LL${heightDot}\n`;


            // =============================================
            // PRINT DARKNESS
            // =============================================

            if (
                printer &&
                printer.density !==
                undefined
            ) {

                zpl +=
                    `^MD${Number(printer.density)}\n`;

            }


            // =============================================
            // PRINT SPEED
            // =============================================

            if (
                printer &&
                printer.speed
            ) {

                zpl +=
                    `^PR${Number(printer.speed)}\n`;

            }


            // =============================================
            // IMAGE
            // =============================================

            zpl +=
                "^FO0,0\n";


            zpl +=
                `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hex}\n`;


            // =============================================
            // COPIES
            // =============================================

            zpl +=
                "^PQ1\n";


            // =============================================
            // END
            // =============================================

            zpl +=
                "^XZ\n";


            return zpl;

        },


        // =================================================
        // TEXT
        // =================================================

        text(
            value,
            x = 0,
            y = 0,
            fontHeight = 30,
            fontWidth = 30
        ) {

            return (

                `^FO${x},${y}` +

                `^A0N,${fontHeight},${fontWidth}` +

                `^FD${this.escapeText(value)}^FS`

            );

        },


        // =================================================
        // CODE128
        // =================================================

        barcode(
            value,
            x = 0,
            y = 0,
            height = 80,
            width = 2
        ) {

            return (

                `^FO${x},${y}` +

                `^BY${width},2,${height}` +

                `^BCN,${height},Y,N,N` +

                `^FD${this.escapeText(value)}^FS`

            );

        },


        // =================================================
        // QR CODE
        // =================================================

        qrCode(
            value,
            x = 0,
            y = 0,
            magnification = 5
        ) {

            magnification =
                Math.max(
                    1,
                    Math.min(
                        10,
                        Number(
                            magnification
                        ) || 5
                    )
                );


            return (

                `^FO${x},${y}` +

                `^BQN,2,${magnification}` +

                `^FDLA,${this.escapeText(value)}^FS`

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


            const zpl =

                "^XA\n" +

                "^PW600\n" +

                "^LL400\n" +

                "^FO50,50\n" +

                "^A0N,40,40\n" +

                "^FDSMARTPRINT^FS\n" +

                "^FO50,120\n" +

                "^BY2,2,80\n" +

                "^BCN,80,Y,N,N\n" +

                "^FD123456789^FS\n" +

                "^FO50,230\n" +

                "^BQN,2,5\n" +

                "^FDLA,SmartPrint AppDIGI^FS\n" +

                "^PQ1\n" +

                "^XZ\n";


            await Bluetooth.write(
                zpl
            );


            console.log(
                "ZPL TEST PRINT SENT"
            );


            return true;

        },


        // =================================================
        // RAW ZPL
        // =================================================

        async sendRaw(zpl) {

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
                zpl
            );

        },


        // =================================================
        // ESCAPE TEXT
        // =================================================

        escapeText(value) {

            return String(
                value ?? ""
            )
                .replace(
                    /\^/g,
                    " "
                )
                .replace(
                    /~/g,
                    " "
                );

        }

    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.ZPL =
        ZPL;


    // =====================================================
    // TEST FUNCTION
    // =====================================================

    window.testZPL =
        function () {

            return ZPL.testPrint();

        };


    console.log(
        "SmartPrint ZPL Engine v1.0 Ready"
    );


})();
