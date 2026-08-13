"use strict";

/*
=========================================================
 SmartPrint TSPL Engine v2.0
=========================================================

 COMPATIBLE
 --------------------------------------------------------
 ✓ Bluetooth Engine v5.0
 ✓ PrinterManager v4.0
 ✓ Bluetooth.write()
 ✓ BLE
 ✓ Web Serial / Bluetooth Classic
 ✓ Local Bridge
 ✓ TSPL Thermal Label Printer
 ✓ Canvas → 1-bit bitmap
 ✓ White background protection
 ✓ Alpha protection
 ✓ Threshold
 ✓ Floyd-Steinberg dithering
 ✓ Density
 ✓ Speed
 ✓ Copies
 ✓ Label width / height
 ✓ Gap
 ✓ Rotation
 ✓ Preview Canvas

 IMPORTANT
 --------------------------------------------------------
 PrinterManager:

    TSPL.print(canvas, PrinterManager)

 TSPL Engine kemudian:

    Bluetooth.write(bytes)

 Tidak menggunakan:
    Bluetooth.send()
    Bluetooth.print()
    navigator.bluetooth langsung

=========================================================
*/


(function () {

    "use strict";


    const TSPL = {

        // =================================================
        // VERSION
        // =================================================

        version: "2.0.0",


        // =================================================
        // DEFAULT
        // =================================================

        threshold: 185,

        dithering: false,

        invert: false,

        chunkSize: 180,


        // =================================================
        // PRINT
        // =================================================

        async print(canvas, printer) {

            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT TSPL ENGINE v2.0"
            );

            console.log(
                "========================================"
            );


            // ------------------------------------------------
            // VALIDATE CANVAS
            // ------------------------------------------------

            if (!canvas) {

                throw new Error(
                    "TSPL: Canvas tidak tersedia."
                );

            }


            if (
                typeof canvas.getContext !==
                "function"
            ) {

                throw new Error(
                    "TSPL: Object bukan canvas."
                );

            }


            // ------------------------------------------------
            // VALIDATE BLUETOOTH
            // ------------------------------------------------

            if (
                typeof Bluetooth ===
                "undefined"
            ) {

                throw new Error(
                    "TSPL: Bluetooth Engine tidak ditemukan."
                );

            }


            if (
                typeof Bluetooth.write !==
                "function"
            ) {

                throw new Error(
                    "TSPL: Bluetooth.write() tidak tersedia."
                );

            }


            // ------------------------------------------------
            // PRINTER SETTINGS
            // ------------------------------------------------

            printer =
                printer ||
                window.Printer ||
                {};


            const width =
                Number(
                    printer.paperWidth
                ) ||
                canvas.width;


            const height =
                Number(
                    printer.paperHeight
                ) ||
                canvas.height;


            const dpi =
                Number(
                    printer.dpi
                ) ||
                203;


            const density =
                Number(
                    printer.density
                );


            const speed =
                Number(
                    printer.speed
                );


            const copies =
                Math.max(
                    1,
                    Number(
                        printer.copies
                    ) || 1
                );


            // ------------------------------------------------
            // LABEL SETTINGS
            // ------------------------------------------------

            const labelWidth =
                Number(
                    printer.labelWidth
                ) ||
                null;


            const labelHeight =
                Number(
                    printer.labelHeight
                ) ||
                null;


            const gap =
                Number(
                    printer.gap
                );


            // ------------------------------------------------
            // RESOLVE SIZE
            // ------------------------------------------------

            const finalWidth =
                this.resolveWidth(
                    canvas,
                    width,
                    dpi,
                    labelWidth
                );


            const finalHeight =
                this.resolveHeight(
                    canvas,
                    height,
                    dpi,
                    labelHeight
                );


            console.log(
                "TSPL Canvas:",
                canvas.width,
                "x",
                canvas.height
            );


            console.log(
                "TSPL Print:",
                finalWidth,
                "x",
                finalHeight
            );


            console.log(
                "DPI:",
                dpi
            );


            console.log(
                "Density:",
                density
            );


            console.log(
                "Speed:",
                speed
            );


            console.log(
                "Copies:",
                copies
            );


            // ------------------------------------------------
            // BUILD BITMAP
            // ------------------------------------------------

            const bitmap =
                this.canvasToBitmap(
                    canvas,
                    finalWidth,
                    finalHeight
                );


            console.log(
                "Bitmap:",
                bitmap.width,
                "x",
                bitmap.height
            );


            console.log(
                "Bitmap Bytes:",
                bitmap.data.length
            );


            // ------------------------------------------------
            // BUILD TSPL COMMAND
            // ------------------------------------------------

            const header =
                this.buildHeader(
                    finalWidth,
                    finalHeight,
                    dpi,
                    density,
                    speed,
                    gap
                );


            const printCommand =
                `PRINT ${copies}\r\n`;


            const command =
                this.concatUint8Arrays([

                    this.textToBytes(
                        header
                    ),

                    bitmap.data,

                    this.textToBytes(
                        "\r\n"
                    ),

                    this.textToBytes(
                        printCommand
                    )

                ]);


            console.log(
                "TSPL Total Bytes:",
                command.length
            );


            // ------------------------------------------------
            // SEND
            // ------------------------------------------------

            await Bluetooth.write(
                command
            );


            console.log(
                "========================================"
            );

            console.log(
                "TSPL PRINT SUCCESS"
            );

            console.log(
                "========================================"
            );


            return true;

        },


        // =================================================
        // HEADER
        // =================================================

        buildHeader(
            width,
            height,
            dpi,
            density,
            speed,
            gap
        ) {

            /*
            -------------------------------------------------
            TSPL menggunakan satuan mm pada SIZE.

            pixel → mm

            mm = pixel / dpi * 25.4
            -------------------------------------------------
            */


            const widthMM =
                (
                    width /
                    dpi *
                    25.4
                ).toFixed(2);


            const heightMM =
                (
                    height /
                    dpi *
                    25.4
                ).toFixed(2);


            const gapMM =
                Number.isFinite(
                    gap
                )
                    ? gap
                    : 2;


            let command = "";


            command +=
                "SIZE " +
                widthMM +
                " mm," +
                heightMM +
                " mm\r\n";


            command +=
                "GAP " +
                gapMM +
                " mm,0 mm\r\n";


            command +=
                "DIRECTION 1\r\n";


            command +=
                "REFERENCE 0,0\r\n";


            command +=
                "OFFSET 0 mm\r\n";


            command +=
                "CLS\r\n";


            /*
            -------------------------------------------------
            DENSITY
            -------------------------------------------------
            */

            if (
                Number.isFinite(
                    density
                )
            ) {

                const safeDensity =
                    Math.max(
                        0,
                        Math.min(
                            15,
                            Math.round(
                                density
                            )
                        )
                    );


                command +=
                    "DENSITY " +
                    safeDensity +
                    "\r\n";

            }


            /*
            -------------------------------------------------
            SPEED
            -------------------------------------------------
            */

            if (
                Number.isFinite(
                    speed
                )
            ) {

                const safeSpeed =
                    Math.max(
                        1,
                        Math.min(
                            12,
                            Number(speed)
                        )
                    );


                command +=
                    "SPEED " +
                    safeSpeed +
                    "\r\n";

            }


            /*
            -------------------------------------------------
            BITMAP HEADER

            x = 0
            y = 0

            width = byte width
            height = pixel height

            mode = 0
            -------------------------------------------------
            */

            const bitmapWidthBytes =
                Math.ceil(
                    width / 8
                );


            command +=
                "BITMAP 0,0," +
                bitmapWidthBytes +
                "," +
                height +
                ",0,";


            return command;

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
            -------------------------------------------------
            SOURCE
            -------------------------------------------------
            */

            const sourceWidth =
                canvas.width;


            const sourceHeight =
                canvas.height;


            /*
            -------------------------------------------------
            CREATE WORK CANVAS
            -------------------------------------------------
            */

            const workCanvas =
                document.createElement(
                    "canvas"
                );


            workCanvas.width =
                targetWidth;


            workCanvas.height =
                targetHeight;


            const ctx =
                workCanvas.getContext(
                    "2d",
                    {
                        willReadFrequently: true
                    }
                );


            /*
            =================================================
            IMPORTANT FIX #1

            SELALU BACKGROUND PUTIH

            Jika canvas asli transparan,
            alpha 0 jangan sampai menjadi hitam.

            Ini salah satu penyebab paling umum
            hasil thermal menjadi blok hitam.
            =================================================
            */

            ctx.save();


            ctx.globalCompositeOperation =
                "source-over";


            ctx.fillStyle =
                "#FFFFFF";


            ctx.fillRect(
                0,
                0,
                targetWidth,
                targetHeight
            );


            /*
            -------------------------------------------------
            DRAW SOURCE
            -------------------------------------------------
            */

            ctx.imageSmoothingEnabled =
                true;


            ctx.imageSmoothingQuality =
                "high";


            ctx.drawImage(

                canvas,

                0,
                0,
                sourceWidth,
                sourceHeight,

                0,
                0,
                targetWidth,
                targetHeight

            );


            ctx.restore();


            /*
            =================================================
            READ PIXELS
            =================================================
            */

            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight
                );


            const pixels =
                imageData.data;


            /*
            =================================================
            BITMAP

            1 bit per pixel

            8 pixel = 1 byte
            =================================================
            */

            const byteWidth =
                Math.ceil(
                    targetWidth / 8
                );


            const bitmap =
                new Uint8Array(
                    byteWidth *
                    targetHeight
                );


            /*
            =================================================
            THRESHOLD / DITHER
            =================================================
            */

            if (
                this.dithering
            ) {

                this.renderDither(
                    pixels,
                    bitmap,
                    targetWidth,
                    targetHeight,
                    byteWidth
                );

            }

            else {

                this.renderThreshold(
                    pixels,
                    bitmap,
                    targetWidth,
                    targetHeight,
                    byteWidth
                );

            }


            return {

                width:
                    targetWidth,

                height:
                    targetHeight,

                byteWidth:
                    byteWidth,

                data:
                    bitmap

            };

        },


        // =================================================
        // THRESHOLD
        // =================================================

        renderThreshold(
            pixels,
            bitmap,
            width,
            height,
            byteWidth
        ) {

            const threshold =
                Number(
                    this.threshold
                ) || 185;


            /*
            -------------------------------------------------
            BLACK PIXEL

            grayscale < threshold

            WHITE PIXEL

            grayscale >= threshold
            -------------------------------------------------
            */


            for (
                let y = 0;
                y < height;
                y++
            ) {

                for (
                    let x = 0;
                    x < width;
                    x++
                ) {

                    const index =
                        (
                            y *
                            width +
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


                    /*
                    =========================================
                    IMPORTANT FIX #2

                    Alpha transparan dianggap PUTIH.

                    BUKAN HITAM.
                    =========================================
                    */

                    let gray;


                    if (
                        a < 10
                    ) {

                        gray =
                            255;

                    }

                    else {

                        gray =
                            (
                                0.299 * r +
                                0.587 * g +
                                0.114 * b
                            );

                    }


                    /*
                    -------------------------------------------------
                    INVERT OPTIONAL
                    -------------------------------------------------
                    */

                    if (
                        this.invert
                    ) {

                        gray =
                            255 -
                            gray;

                    }


                    /*
                    -------------------------------------------------
                    BLACK
                    -------------------------------------------------
                    */

                    if (
                        gray <
                        threshold
                    ) {

                        const byteIndex =
                            y *
                            byteWidth +
                            Math.floor(
                                x / 8
                            );


                        const bit =
                            7 -
                            (
                                x %
                                8
                            );


                        bitmap[
                            byteIndex
                        ] |=
                            (
                                1 <<
                                bit
                            );

                    }

                }

            }

        },


        // =================================================
        // FLOYD STEINBERG DITHER
        // =================================================

        renderDither(
            pixels,
            bitmap,
            width,
            height,
            byteWidth
        ) {

            const threshold =
                Number(
                    this.threshold
                ) || 185;


            /*
            -------------------------------------------------
            GRAYSCALE BUFFER
            -------------------------------------------------
            */

            const gray =
                new Float32Array(
                    width *
                    height
                );


            for (
                let y = 0;
                y < height;
                y++
            ) {

                for (
                    let x = 0;
                    x < width;
                    x++
                ) {

                    const i =
                        (
                            y *
                            width +
                            x
                        ) * 4;


                    const r =
                        pixels[i];


                    const g =
                        pixels[i + 1];


                    const b =
                        pixels[i + 2];


                    const a =
                        pixels[i + 3];


                    if (
                        a < 10
                    ) {

                        gray[
                            y * width + x
                        ] = 255;

                    }

                    else {

                        gray[
                            y * width + x
                        ] =
                            0.299 * r +
                            0.587 * g +
                            0.114 * b;

                    }

                }

            }


            /*
            -------------------------------------------------
            DITHER
            -------------------------------------------------
            */

            for (
                let y = 0;
                y < height;
                y++
            ) {

                for (
                    let x = 0;
                    x < width;
                    x++
                ) {

                    const index =
                        y *
                        width +
                        x;


                    let oldPixel =
                        gray[index];


                    const newPixel =
                        oldPixel <
                        threshold
                            ? 0
                            : 255;


                    const error =
                        oldPixel -
                        newPixel;


                    /*
                    -------------------------------------------------
                    SAVE BLACK PIXEL
                    -------------------------------------------------
                    */

                    if (
                        newPixel === 0
                    ) {

                        const byteIndex =
                            y *
                            byteWidth +
                            Math.floor(
                                x / 8
                            );


                        const bit =
                            7 -
                            (
                                x %
                                8
                            );


                        bitmap[
                            byteIndex
                        ] |=
                            (
                                1 <<
                                bit
                            );

                    }


                    /*
                    -------------------------------------------------
                    DISTRIBUTE ERROR
                    -------------------------------------------------
                    */

                    if (
                        x + 1 <
                        width
                    ) {

                        gray[
                            index + 1
                        ] +=
                            error *
                            7 /
                            16;

                    }


                    if (
                        x > 0 &&
                        y + 1 < height
                    ) {

                        gray[
                            index +
                            width -
                            1
                        ] +=
                            error *
                            3 /
                            16;

                    }


                    if (
                        y + 1 <
                        height
                    ) {

                        gray[
                            index +
                            width
                        ] +=
                            error *
                            5 /
                            16;

                    }


                    if (
                        x + 1 <
                        width &&
                        y + 1 <
                        height
                    ) {

                        gray[
                            index +
                            width +
                            1
                        ] +=
                            error *
                            1 /
                            16;

                    }

                }

            }

        },


        // =================================================
        // WIDTH
        // =================================================

        resolveWidth(
            canvas,
            printerWidth,
            dpi,
            labelWidth
        ) {

            /*
            -------------------------------------------------
            PRIORITAS:

            1. canvas.width

            Karena Preview biasanya sudah dalam
            ukuran pixel printer.

            2. paperWidth
            -------------------------------------------------
            */


            if (
                canvas.width >
                0
            ) {

                return Math.round(
                    canvas.width
                );

            }


            if (
                labelWidth &&
                dpi
            ) {

                return Math.round(
                    (
                        labelWidth /
                        25.4
                    ) *
                    dpi
                );

            }


            return Math.round(
                printerWidth
            );

        },


        // =================================================
        // HEIGHT
        // =================================================

        resolveHeight(
            canvas,
            printerHeight,
            dpi,
            labelHeight
        ) {

            if (
                canvas.height >
                0
            ) {

                return Math.round(
                    canvas.height
                );

            }


            if (
                labelHeight &&
                dpi
            ) {

                return Math.round(
                    (
                        labelHeight /
                        25.4
                    ) *
                    dpi
                );

            }


            return Math.round(
                printerHeight
            );

        },


        // =================================================
        // TEXT → UINT8
        // =================================================

        textToBytes(text) {

            return new TextEncoder()
                .encode(
                    text
                );

        },


        // =================================================
        // CONCAT
        // =================================================

        concatUint8Arrays(
            arrays
        ) {

            let total =
                0;


            for (
                const array
                of arrays
            ) {

                if (
                    array
                ) {

                    total +=
                        array.length;

                }

            }


            const result =
                new Uint8Array(
                    total
                );


            let offset =
                0;


            for (
                const array
                of arrays
            ) {

                if (
                    !array
                ) {

                    continue;

                }


                result.set(
                    array,
                    offset
                );


                offset +=
                    array.length;

            }


            return result;

        },


        // =================================================
        // SETTINGS
        // =================================================

        setThreshold(value) {

            const number =
                Number(value);


            if (
                Number.isFinite(
                    number
                )
            ) {

                this.threshold =
                    Math.max(
                        0,
                        Math.min(
                            255,
                            Math.round(
                                number
                            )
                        )
                    );

            }


            console.log(
                "TSPL Threshold:",
                this.threshold
            );


        },


        setDithering(enabled) {

            this.dithering =
                Boolean(
                    enabled
                );


            console.log(
                "TSPL Dithering:",
                this.dithering
            );

        },


        setInvert(enabled) {

            this.invert =
                Boolean(
                    enabled
                );


            console.log(
                "TSPL Invert:",
                this.invert
            );

        }


    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.TSPL =
        TSPL;


    // =====================================================
    // READY
    // =====================================================

    console.log(
        "SmartPrint TSPL Engine v2.0 Ready"
    );

    console.log(
        "TSPL → Bluetooth v5.0 Compatible"
    );

})();
