"use strict";

/*
=====================================================
 SmartPrint ESC/POS Engine v1.0
=====================================================

Arsitektur:

PrinterManager
      ↓
ESCpos.print()
      ↓
ESC/POS Command
      ↓
Bluetooth.write()
      ↓
Bluetooth Printer

Fitur:
✓ ESC/POS initialization
✓ Canvas → bitmap
✓ Print image
✓ Text
✓ Alignment
✓ Bold
✓ Barcode CODE128
✓ QR Code
✓ Feed
✓ Cut
✓ Copies
✓ Raw command
=====================================================
*/

(function () {

    "use strict";


    const ESCpos = {

        // =================================================
        // CONSTANT
        // =================================================

        ESC: 0x1B,

        GS: 0x1D,

        LF: 0x0A,

        defaultWidth: 576,

        defaultDPI: 203,


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
                "ESC/POS PRINT"
            );

            console.log(
                "========================================"
            );


            const width =
                Number(
                    printer.paperWidth
                ) ||
                this.defaultWidth;


            /*
            -------------------------------------------------
            ESC/POS printer biasanya bekerja berdasarkan
            lebar dot.

            58mm ≈ 384 dots
            80mm ≈ 576 dots
            -------------------------------------------------
            */

            const bitmap =
                this.canvasToBitmap(
                    canvas,
                    width
                );


            const commands = [];


            // =============================================
            // INITIALIZE
            // =============================================

            commands.push(
                this.init()
            );


            // =============================================
            // ALIGN CENTER
            // =============================================

            commands.push(
                this.alignCenter()
            );


            // =============================================
            // IMAGE
            // =============================================

            commands.push(
                this.bitmap(
                    bitmap
                )
            );


            // =============================================
            // FEED
            // =============================================

            commands.push(
                this.feed(3)
            );


            // =============================================
            // CUT
            // =============================================

            if (
                printer.cutPaper
            ) {

                commands.push(
                    this.cut()
                );

            }


            // =============================================
            // COMBINE
            // =============================================

            const data =
                this.concat(
                    commands
                );


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


            for (
                let i = 0;
                i < copies;
                i++
            ) {

                await Bluetooth.write(
                    data
                );

            }


            console.log(
                "ESC/POS PRINT SENT"
            );


            return true;

        },


        // =================================================
        // INITIALIZE
        // =================================================

        init() {

            return new Uint8Array([

                this.ESC,
                0x40

            ]);

        },


        // =================================================
        // ALIGN
        // =================================================

        alignLeft() {

            return new Uint8Array([

                this.ESC,
                0x61,
                0x00

            ]);

        },


        alignCenter() {

            return new Uint8Array([

                this.ESC,
                0x61,
                0x01

            ]);

        },


        alignRight() {

            return new Uint8Array([

                this.ESC,
                0x61,
                0x02

            ]);

        },


        // =================================================
        // BOLD
        // =================================================

        bold(enabled = true) {

            return new Uint8Array([

                this.ESC,
                0x45,
                enabled ? 0x01 : 0x00

            ]);

        },


        // =================================================
        // FONT SIZE
        // =================================================

        textSize(width = 1, height = 1) {

            width =
                Math.max(
                    1,
                    Math.min(
                        8,
                        Number(width) || 1
                    )
                );


            height =
                Math.max(
                    1,
                    Math.min(
                        8,
                        Number(height) || 1
                    )
                );


            const size =
                (
                    (width - 1) << 4
                ) |
                (height - 1);


            return new Uint8Array([

                this.GS,
                0x21,
                size

            ]);

        },


        // =================================================
        // TEXT
        // =================================================

        text(value = "") {

            const encoder =
                new TextEncoder();


            return this.concat([

                encoder.encode(
                    String(value)
                ),

                new Uint8Array([
                    this.LF
                ])

            ]);

        },


        // =================================================
        // FEED
        // =================================================

        feed(lines = 3) {

            lines =
                Math.max(
                    0,
                    Math.min(
                        255,
                        Number(lines) || 0
                    )
                );


            return new Uint8Array([

                this.ESC,
                0x64,
                lines

            ]);

        },


        // =================================================
        // CUT
        // =================================================

        cut() {

            return new Uint8Array([

                this.GS,
                0x56,
                0x00

            ]);

        },


        // =================================================
        // BARCODE CODE128
        // =================================================

        barcode(
            value,
            height = 80,
            width = 2
        ) {

            const encoder =
                new TextEncoder();


            const data =
                encoder.encode(
                    String(value)
                );


            height =
                Math.max(
                    1,
                    Math.min(
                        255,
                        Number(height) || 80
                    )
                );


            width =
                Math.max(
                    2,
                    Math.min(
                        6,
                        Number(width) || 2
                    )
                );


            const result = [];


            /*
            ---------------------------------------------
            HRI position below barcode
            ---------------------------------------------
            */

            result.push(

                new Uint8Array([

                    this.GS,
                    0x48,
                    0x02

                ])

            );


            /*
            ---------------------------------------------
            Barcode height
            ---------------------------------------------
            */

            result.push(

                new Uint8Array([

                    this.GS,
                    0x68,
                    height

                ])

            );


            /*
            ---------------------------------------------
            Barcode width
            ---------------------------------------------
            */

            result.push(

                new Uint8Array([

                    this.GS,
                    0x77,
                    width

                ])

            );


            /*
            ---------------------------------------------
            CODE128
            ---------------------------------------------

            m = 73
            GS k m n d...
            */

            result.push(

                new Uint8Array([

                    this.GS,
                    0x6B,
                    0x49,
                    data.length + 2,
                    0x7B,
                    0x42

                ])

            );


            result.push(
                data
            );


            result.push(

                new Uint8Array([

                    this.LF

                ])

            );


            return this.concat(
                result
            );

        },


        // =================================================
        // QR CODE
        // =================================================

        async qrCode(
            value,
            size = 6
        ) {

            const encoder =
                new TextEncoder();


            const data =
                encoder.encode(
                    String(value)
                );


            size =
                Math.max(
                    1,
                    Math.min(
                        16,
                        Number(size) || 6
                    )
                );


            const commands = [];


            /*
            ---------------------------------------------
            Model 2
            ---------------------------------------------
            */

            commands.push(

                new Uint8Array([

                    this.GS,
                    0x28,
                    0x6B,
                    0x04,
                    0x00,
                    0x31,
                    0x41,
                    0x32,
                    0x00

                ])

            );


            /*
            ---------------------------------------------
            QR size
            ---------------------------------------------
            */

            commands.push(

                new Uint8Array([

                    this.GS,
                    0x28,
                    0x6B,
                    0x03,
                    0x00,
                    0x31,
                    0x43,
                    size

                ])

            );


            /*
            ---------------------------------------------
            Error correction level M
            ---------------------------------------------
            */

            commands.push(

                new Uint8Array([

                    this.GS,
                    0x28,
                    0x6B,
                    0x03,
                    0x00,
                    0x31,
                    0x45,
                    0x31

                ])

            );


            /*
            ---------------------------------------------
            Store QR data
            ---------------------------------------------
            */

            const length =
                data.length + 3;


            const pL =
                length & 0xFF;


            const pH =
                (length >> 8) & 0xFF;


            commands.push(

                new Uint8Array([

                    this.GS,
                    0x28,
                    0x6B,
                    pL,
                    pH,
                    0x31,
                    0x50,
                    0x30

                ])

            );


            commands.push(
                data
            );


            /*
            ---------------------------------------------
            Print QR
            ---------------------------------------------
            */

            commands.push(

                new Uint8Array([

                    this.GS,
                    0x28,
                    0x6B,
                    0x03,
                    0x00,
                    0x31,
                    0x51,
                    0x30

                ])

            );


            return this.concat(
                commands
            );

        },


        // =================================================
        // BITMAP
        // =================================================

        bitmap(bitmap) {

            const width =
                bitmap.width;


            const height =
                bitmap.height;


            const bytesPerRow =
                Math.ceil(
                    width / 8
                );


            /*
            ---------------------------------------------
            GS v 0
            ---------------------------------------------

            Format:

            1D 76 30 m
            xL xH
            yL yH
            data
            ---------------------------------------------
            */

            const xL =
                bytesPerRow &
                0xFF;


            const xH =
                (bytesPerRow >> 8) &
                0xFF;


            const yL =
                height &
                0xFF;


            const yH =
                (height >> 8) &
                0xFF;


            const header =
                new Uint8Array([

                    this.GS,
                    0x76,
                    0x30,
                    0x00,

                    xL,
                    xH,

                    yL,
                    yH

                ]);


            return this.concat([

                header,

                bitmap.data

            ]);

        },


        // =================================================
        // CANVAS → BITMAP
        // =================================================

        canvasToBitmap(
            canvas,
            targetWidth
        ) {

            targetWidth =
                Math.max(
                    8,
                    Math.floor(
                        Number(targetWidth) ||
                        this.defaultWidth
                    )
                );


            /*
            ---------------------------------------------
            Tinggi mengikuti rasio canvas
            ---------------------------------------------
            */

            const ratio =
                canvas.height /
                canvas.width;


            let targetHeight =
                Math.round(
                    targetWidth *
                    ratio
                );


            /*
            ---------------------------------------------
            Pastikan kelipatan 8 untuk tinggi
            ---------------------------------------------
            */

            targetHeight =
                Math.max(
                    1,
                    targetHeight
                );


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
            ---------------------------------------------
            WHITE BACKGROUND
            ---------------------------------------------
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
            ---------------------------------------------
            DRAW
            ---------------------------------------------
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


            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight
                );


            const pixels =
                imageData.data;


            const bytesPerRow =
                Math.ceil(
                    targetWidth / 8
                );


            const bitmap =
                new Uint8Array(

                    bytesPerRow *
                    targetHeight

                );


            /*
            ---------------------------------------------
            DITHER / THRESHOLD
            ---------------------------------------------
            */

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


                    if (
                        a < 128
                    ) {

                        continue;

                    }


                    const gray =
                        (
                            r * 299 +
                            g * 587 +
                            b * 114
                        ) / 1000;


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


            const commands = [];


            commands.push(
                this.init()
            );


            commands.push(
                this.alignCenter()
            );


            commands.push(
                this.bold(true)
            );


            commands.push(
                this.text(
                    "SMARTPRINT"
                )
            );


            commands.push(
                this.bold(false)
            );


            commands.push(
                this.text(
                    "AppDIGI"
                )
            );


            commands.push(
                this.text(
                    "=============================="
                )
            );


            commands.push(
                this.alignLeft()
            );


            commands.push(
                this.text(
                    "Printer : Bluetooth"
                )
            );


            commands.push(
                this.text(
                    "Protocol: ESC/POS"
                )
            );


            commands.push(
                this.text(
                    "Status  : TEST PRINT"
                )
            );


            commands.push(
                this.feed(4)
            );


            const data =
                this.concat(
                    commands
                );


            await Bluetooth.write(
                data
            );


            console.log(
                "ESC/POS TEST PRINT SENT"
            );


            return true;

        },


        // =================================================
        // RAW
        // =================================================

        async sendRaw(data) {

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
                data
            );

        },


        // =================================================
        // CONCAT
        // =================================================

        concat(parts) {

            let totalLength =
                0;


            for (
                const part of parts
            ) {

                if (!part) {

                    continue;

                }


                totalLength +=
                    part.length;

            }


            const result =
                new Uint8Array(
                    totalLength
                );


            let offset =
                0;


            for (
                const part of parts
            ) {

                if (!part) {

                    continue;

                }


                result.set(
                    part,
                    offset
                );


                offset +=
                    part.length;

            }


            return result;

        }

    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.ESCpos =
        ESCpos;


    // =====================================================
    // TEST
    // =====================================================

    window.testESCpos =
        function () {

            return ESCpos.testPrint();

        };


    console.log(
        "SmartPrint ESC/POS Engine v1.0 Ready"
    );


})();
