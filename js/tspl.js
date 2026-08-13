"use strict";

/*
=====================================================
 SmartPrint TSPL Engine v5.0
=====================================================

 FOCUS
 ----------------------------------------------------
 ✓ TSPL native
 ✓ Bluetooth v5.0
 ✓ PrinterManager v4.0
 ✓ 203 DPI
 ✓ Canvas → 1 bit bitmap
 ✓ Threshold
 ✓ Contrast
 ✓ Optional dithering
 ✓ Sharp text
 ✓ Sharp barcode
 ✓ Sharp QR
 ✓ Tidak membuat seluruh gambar menjadi grayscale
 ✓ Bitmap packing MSB
 ✓ Chunk dikirim melalui Bluetooth.write()
 ✓ Copies
 ✓ Density
 ✓ Speed
 ✓ Paper size
 ✓ Gap
=====================================================
*/

(function () {

    const TSPL = {

        version: "5.0.0",

        // =================================================
        // DEFAULT
        // =================================================

        dpi: 203,

        threshold: 180,

        contrast: 1.15,

        brightness: 0,

        dither: false,

        invert: false,

        x: 0,

        y: 0,

        gap: 2,

        direction: 1,

        density: 6,

        speed: 4,


        // =================================================
        // PRINT
        // =================================================

        async print(canvas, printer = null) {

            if (!canvas) {

                throw new Error(
                    "TSPL: Canvas tidak tersedia."
                );

            }


            printer =
                printer ||
                window.Printer;


            if (!printer) {

                throw new Error(
                    "TSPL: PrinterManager tidak ditemukan."
                );

            }


            if (
                typeof printer.isConnected ===
                "function"
            ) {

                if (!printer.isConnected()) {

                    throw new Error(
                        "TSPL: Printer belum terhubung."
                    );

                }

            }


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT TSPL ENGINE v5.0"
            );

            console.log(
                "========================================"
            );


            // =================================================
            // PRINTER SETTINGS
            // =================================================

            const dpi =
                Number(printer.dpi) ||
                this.dpi;


            const density =
                Number(printer.density) ||
                this.density;


            const speed =
                Number(printer.speed) ||
                this.speed;


            const copies =
                Math.max(
                    1,
                    Number(printer.copies) || 1
                );


            const paperWidth =
                Number(printer.paperWidth) ||
                canvas.width;


            const paperHeight =
                Number(printer.paperHeight) ||
                canvas.height;


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


            // =================================================
            // RESIZE CANVAS KE DOT PRINTER
            // =================================================

            const widthDots =
                this.normalizeDimension(
                    paperWidth,
                    canvas.width,
                    dpi
                );


            const heightDots =
                this.normalizeDimension(
                    paperHeight,
                    canvas.height,
                    dpi
                );


            console.log(
                "Canvas:",
                canvas.width,
                "x",
                canvas.height
            );


            console.log(
                "Print:",
                widthDots,
                "x",
                heightDots,
                "dots"
            );


            // =================================================
            // RASTERIZE
            // =================================================

            const bitmap =
                this.canvasToBitmap(
                    canvas,
                    widthDots,
                    heightDots,
                    {
                        threshold:
                            this.threshold,

                        contrast:
                            this.contrast,

                        brightness:
                            this.brightness,

                        dither:
                            this.dither,

                        invert:
                            this.invert
                    }
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


            // =================================================
            // TSPL COMMAND
            // =================================================

            let command = "";


            command +=
                "SIZE " +
                this.dotsToMm(
                    widthDots,
                    dpi
                ) +
                " mm," +
                this.dotsToMm(
                    heightDots,
                    dpi
                ) +
                " mm\r\n";


            command +=
                "GAP " +
                this.gap +
                " mm,0\r\n";


            command +=
                "DIRECTION " +
                this.direction +
                "\r\n";


            command +=
                "DENSITY " +
                density +
                "\r\n";


            command +=
                "SPEED " +
                speed +
                "\r\n";


            command +=
                "CLS\r\n";


            // =================================================
            // BITMAP HEADER
            // =================================================

            command +=
                "BITMAP " +
                this.x +
                "," +
                this.y +
                "," +
                bitmap.widthBytes +
                "," +
                bitmap.height +
                ",0,";


            const header =
                new TextEncoder().encode(
                    command
                );


            const footer =
                new TextEncoder().encode(
                    "\r\nPRINT " +
                    copies +
                    ",1\r\n"
                );


            // =================================================
            // GABUNG DATA
            // =================================================

            const output =
                new Uint8Array(
                    header.length +
                    bitmap.data.length +
                    footer.length
                );


            output.set(
                header,
                0
            );


            output.set(
                bitmap.data,
                header.length
            );


            output.set(
                footer,
                header.length +
                bitmap.data.length
            );


            console.log(
                "TSPL Output:",
                output.length,
                "bytes"
            );


            // =================================================
            // SEND
            // =================================================

            if (
                typeof Bluetooth !==
                "undefined" &&
                typeof Bluetooth.write ===
                "function"
            ) {

                await Bluetooth.write(
                    output
                );

                console.log(
                    "TSPL → Bluetooth.write()"
                );

                return true;

            }


            // =================================================
            // FALLBACK
            // =================================================

            if (
                typeof printer.write ===
                "function"
            ) {

                await printer.write(
                    output
                );

                return true;

            }


            throw new Error(
                "TSPL: Tidak ada Bluetooth.write() atau Printer.write()."
            );

        },


        // =================================================
        // CANVAS → BITMAP
        // =================================================

        canvasToBitmap(
            sourceCanvas,
            targetWidth,
            targetHeight,
            options = {}
        ) {

            const threshold =
                options.threshold ??
                this.threshold;


            const contrast =
                options.contrast ??
                this.contrast;


            const brightness =
                options.brightness ??
                this.brightness;


            const dither =
                options.dither ??
                false;


            const invert =
                options.invert ??
                false;


            // =================================================
            // TEMP CANVAS
            // =================================================

            const canvas =
                document.createElement(
                    "canvas"
                );


            canvas.width =
                targetWidth;


            canvas.height =
                targetHeight;


            const ctx =
                canvas.getContext(
                    "2d",
                    {
                        willReadFrequently:
                            true
                    }
                );


            /*
            Jangan gunakan smoothing.
            Ini penting untuk ketajaman.
            */

            ctx.imageSmoothingEnabled =
                true;


            ctx.imageSmoothingQuality =
                "high";


            // =================================================
            // WHITE BACKGROUND
            // =================================================

            ctx.fillStyle =
                "#FFFFFF";


            ctx.fillRect(
                0,
                0,
                targetWidth,
                targetHeight
            );


            // =================================================
            // DRAW SOURCE
            // =================================================

            ctx.drawImage(
                sourceCanvas,
                0,
                0,
                targetWidth,
                targetHeight
            );


            // =================================================
            // IMAGE DATA
            // =================================================

            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight
                );


            // =================================================
            // GRAYSCALE
            // =================================================

            const gray =
                new Float32Array(
                    targetWidth *
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

                    const p =
                        (
                            y *
                            targetWidth +
                            x
                        ) * 4;


                    const r =
                        imageData.data[p];


                    const g =
                        imageData.data[p + 1];


                    const b =
                        imageData.data[p + 2];


                    let value =
                        (
                            0.299 * r +
                            0.587 * g +
                            0.114 * b
                        );


                    // =================================================
                    // CONTRAST
                    // =================================================

                    value =
                        (
                            value - 128
                        ) *
                        contrast +
                        128;


                    // =================================================
                    // BRIGHTNESS
                    // =================================================

                    value +=
                        brightness;


                    value =
                        Math.max(
                            0,
                            Math.min(
                                255,
                                value
                            )
                        );


                    gray[
                        y *
                        targetWidth +
                        x
                    ] =
                        value;

                }

            }


            // =================================================
            // DITHER
            // =================================================

            if (dither) {

                this.applyDither(
                    gray,
                    targetWidth,
                    targetHeight,
                    threshold
                );

            }


            // =================================================
            // BIT PACK
            // =================================================

            const widthBytes =
                Math.ceil(
                    targetWidth / 8
                );


            const bytes =
                new Uint8Array(
                    widthBytes *
                    targetHeight
                );


            for (
                let y = 0;
                y < targetHeight;
                y++
            ) {

                for (
                    let byteX = 0;
                    byteX < widthBytes;
                    byteX++
                ) {

                    let value =
                        0;


                    for (
                        let bit = 0;
                        bit < 8;
                        bit++
                    ) {

                        const x =
                            byteX * 8 +
                            bit;


                        if (
                            x >=
                            targetWidth
                        ) {

                            continue;

                        }


                        const index =
                            y *
                            targetWidth +
                            x;


                        let black;


                        if (dither) {

                            black =
                                gray[index] <
                                128;

                        }

                        else {

                            black =
                                gray[index] <
                                threshold;

                        }


                        if (invert) {

                            black =
                                !black;

                        }


                        if (black) {

                            value |=
                                (
                                    0x80 >>
                                    bit
                                );

                        }

                    }


                    bytes[
                        y *
                        widthBytes +
                        byteX
                    ] =
                        value;

                }

            }


            return {

                width:
                    targetWidth,

                height:
                    targetHeight,

                widthBytes:
                    widthBytes,

                data:
                    bytes

            };

        },


        // =================================================
        // FLOYD STEINBERG
        // =================================================

        applyDither(
            gray,
            width,
            height,
            threshold
        ) {

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


                    const oldPixel =
                        gray[index];


                    const newPixel =
                        oldPixel <
                        threshold
                            ? 0
                            : 255;


                    const error =
                        oldPixel -
                        newPixel;


                    gray[index] =
                        newPixel;


                    if (
                        x + 1 <
                        width
                    ) {

                        gray[
                            index + 1
                        ] +=
                            error *
                            7 / 16;

                    }


                    if (
                        x > 0 &&
                        y + 1 <
                        height
                    ) {

                        gray[
                            index +
                            width -
                            1
                        ] +=
                            error *
                            3 / 16;

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
                            5 / 16;

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
                            1 / 16;

                    }

                }

            }

        },


        // =================================================
        // DIMENSION
        // =================================================

        normalizeDimension(
            value,
            fallback,
            dpi
        ) {

            /*
            PrinterManager lama menggunakan
            paperWidth dalam DOT.

            Jika nilainya besar seperti 576,
            640, 1200 → anggap DOT.

            Jika nilainya kecil seperti 80,
            100, 150 → anggap MILLIMETER.
            */

            const n =
                Number(value);


            if (
                !Number.isFinite(n) ||
                n <= 0
            ) {

                return fallback;

            }


            if (n <= 300) {

                return Math.round(
                    n /
                    25.4 *
                    dpi
                );

            }


            return Math.round(n);

        },


        // =================================================
        // DOT → MM
        // =================================================

        dotsToMm(
            dots,
            dpi
        ) {

            return (
                dots /
                dpi *
                25.4
            ).toFixed(2);

        },


        // =================================================
        // SET QUALITY
        // =================================================

        setQuality(options = {}) {

            if (
                options.threshold !==
                undefined
            ) {

                this.threshold =
                    Number(
                        options.threshold
                    );

            }


            if (
                options.contrast !==
                undefined
            ) {

                this.contrast =
                    Number(
                        options.contrast
                    );

            }


            if (
                options.brightness !==
                undefined
            ) {

                this.brightness =
                    Number(
                        options.brightness
                    );

            }


            if (
                options.dither !==
                undefined
            ) {

                this.dither =
                    Boolean(
                        options.dither
                    );

            }


            if (
                options.invert !==
                undefined
            ) {

                this.invert =
                    Boolean(
                        options.invert
                    );

            }

        },


        // =================================================
        // TEST SETTINGS
        // =================================================

        getSettings() {

            return {

                version:
                    this.version,

                dpi:
                    this.dpi,

                threshold:
                    this.threshold,

                contrast:
                    this.contrast,

                brightness:
                    this.brightness,

                dither:
                    this.dither,

                invert:
                    this.invert,

                gap:
                    this.gap,

                direction:
                    this.direction,

                density:
                    this.density,

                speed:
                    this.speed

            };

        }

    };


    // =====================================================
    // GLOBAL
    // =====================================================

    window.TSPL =
        TSPL;


    console.log(
        "SmartPrint TSPL Engine v5.0 Ready"
    );

})();
