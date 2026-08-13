"use strict";

/*
=====================================================
 SmartPrint TSPL Engine v5.1
=====================================================

 FOCUS
 ----------------------------------------------------
 ✓ TSPL native
 ✓ Bluetooth v5.3 compatible
 ✓ PrinterManager v4.x compatible
 ✓ 203 DPI
 ✓ WHITE background
 ✓ BLACK text / barcode / QR
 ✓ Transparent pixel → WHITE
 ✓ Canvas → 1 bit bitmap
 ✓ Correct MSB packing
 ✓ No inverted bitmap
 ✓ No black background
 ✓ Sharp text
 ✓ Sharp barcode
 ✓ Sharp QR
 ✓ Optional dithering
 ✓ Copies
 ✓ Density
 ✓ Speed
 ✓ Paper size
 ✓ Gap
=====================================================
*/

(function () {

    "use strict";


    const TSPL = {

        version: "5.1.0",


        // =================================================
        // DEFAULT QUALITY
        // =================================================

        dpi: 203,

        /*
         * 0   = sangat hitam
         * 255 = putih
         *
         * Nilai 200 cukup aman untuk:
         * - text
         * - barcode
         * - QR
         * - garis
         */

        threshold: 200,

        /*
         * Jangan terlalu tinggi.
         * Kontras berlebihan dapat membuat
         * background ikut menjadi hitam.
         */

        contrast: 1.0,

        brightness: 0,

        /*
         * Default OFF.
         * Dithering dapat membuat barcode/text
         * menjadi kurang bersih.
         */

        dither: false,

        /*
         * WAJIB false untuk normal printing.
         */

        invert: false,


        // =================================================
        // TSPL POSITION
        // =================================================

        x: 0,

        y: 0,

        gap: 2,

        direction: 1,


        // =================================================
        // PRINTER DEFAULT
        // =================================================

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


            console.log(
                "========================================"
            );

            console.log(
                "SMARTPRINT TSPL ENGINE v5.1"
            );

            console.log(
                "WHITE BACKGROUND / BLACK CONTENT"
            );

            console.log(
                "========================================"
            );


            // =================================================
            // CHECK CONNECTION
            // =================================================

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


            // =================================================
            // PRINTER SETTINGS
            // =================================================

            const dpi =
                Number(printer.dpi) ||
                this.dpi;


            const density =
                Number(printer.density);

            const finalDensity =
                Number.isFinite(density)
                    ? density
                    : this.density;


            const speed =
                Number(printer.speed);

            const finalSpeed =
                Number.isFinite(speed)
                    ? speed
                    : this.speed;


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
                finalDensity
            );

            console.log(
                "Speed:",
                finalSpeed
            );

            console.log(
                "Copies:",
                copies
            );


            // =================================================
            // DIMENSION
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
                "Source Canvas:",
                canvas.width,
                "x",
                canvas.height
            );


            console.log(
                "Print Size:",
                widthDots,
                "x",
                heightDots,
                "dots"
            );


            // =================================================
            // RASTER
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
                            false

                    }
                );


            console.log(
                "Bitmap:",
                bitmap.width,
                "x",
                bitmap.height
            );


            console.log(
                "Bitmap Width Bytes:",
                bitmap.widthBytes
            );


            console.log(
                "Bitmap Data:",
                bitmap.data.length,
                "bytes"
            );


            // =================================================
            // TSPL HEADER
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
                finalDensity +
                "\r\n";


            command +=
                "SPEED " +
                finalSpeed +
                "\r\n";


            command +=
                "CLS\r\n";


            // =================================================
            // BITMAP
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


            const encoder =
                new TextEncoder();


            const header =
                encoder.encode(
                    command
                );


            const footer =
                encoder.encode(
                    "\r\nPRINT " +
                    copies +
                    ",1\r\n"
                );


            // =================================================
            // OUTPUT
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
            // BLUETOOTH
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
            // PRINTER FALLBACK
            // =================================================

            if (
                typeof printer.write ===
                "function"
            ) {

                await printer.write(
                    output
                );


                console.log(
                    "TSPL → Printer.write()"
                );


                return true;

            }


            throw new Error(
                "TSPL: Bluetooth.write() / Printer.write() tidak tersedia."
            );

        },


        // =================================================
        // CANVAS → 1 BIT BITMAP
        // =================================================

        canvasToBitmap(
            sourceCanvas,
            targetWidth,
            targetHeight,
            options = {}
        ) {

            const threshold =
                Number(
                    options.threshold ??
                    this.threshold
                );


            const contrast =
                Number(
                    options.contrast ??
                    this.contrast
                );


            const brightness =
                Number(
                    options.brightness ??
                    this.brightness
                );


            const dither =
                Boolean(
                    options.dither ??
                    false
                );


            /*
             * Untuk keamanan printing:
             *
             * invert TIDAK boleh aktif
             * kecuali memang sengaja dipilih.
             */

            const invert =
                Boolean(
                    options.invert ??
                    false
                );


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


            if (!ctx) {

                throw new Error(
                    "TSPL: Canvas 2D context tidak tersedia."
                );

            }


            /*
             * Scaling dilakukan dengan smoothing.
             *
             * Ini lebih baik untuk image.
             */

            ctx.imageSmoothingEnabled =
                true;


            ctx.imageSmoothingQuality =
                "high";


            // =================================================
            // FORCE WHITE BACKGROUND
            // =================================================

            ctx.save();


            ctx.globalCompositeOperation =
                "source-over";


            ctx.globalAlpha =
                1;


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


            ctx.restore();


            // =================================================
            // READ PIXELS
            // =================================================

            const imageData =
                ctx.getImageData(
                    0,
                    0,
                    targetWidth,
                    targetHeight
                );


            const pixels =
                imageData.data;


            const totalPixels =
                targetWidth *
                targetHeight;


            const gray =
                new Float32Array(
                    totalPixels
                );


            // =================================================
            // GRAYSCALE
            // =================================================

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

                    const pixelIndex =
                        (
                            y *
                            targetWidth +
                            x
                        );


                    const p =
                        pixelIndex * 4;


                    const r =
                        pixels[p];


                    const g =
                        pixels[p + 1];


                    const b =
                        pixels[p + 2];


                    const a =
                        pixels[p + 3];


                    /*
                     * PENTING
                     *
                     * Alpha transparan dianggap
                     * WHITE, bukan black.
                     *
                     * Ini mencegah background hitam.
                     */

                    if (a < 16) {

                        gray[pixelIndex] =
                            255;

                        continue;

                    }


                    /*
                     * Composite alpha terhadap
                     * background putih.
                     *
                     * Rumus:
                     *
                     * final =
                     * pixel * alpha +
                     * white * (1-alpha)
                     */

                    const alpha =
                        a / 255;


                    const rr =
                        r * alpha +
                        255 * (1 - alpha);


                    const gg =
                        g * alpha +
                        255 * (1 - alpha);


                    const bb =
                        b * alpha +
                        255 * (1 - alpha);


                    let value =
                        (
                            0.299 * rr +
                            0.587 * gg +
                            0.114 * bb
                        );


                    // =================================================
                    // CONTRAST
                    // =================================================

                    if (
                        Number.isFinite(
                            contrast
                        ) &&
                        contrast !== 1
                    ) {

                        value =
                            (
                                value - 128
                            ) *
                            contrast +
                            128;

                    }


                    // =================================================
                    // BRIGHTNESS
                    // =================================================

                    value +=
                        brightness;


                    // =================================================
                    // CLAMP
                    // =================================================

                    value =
                        Math.max(
                            0,
                            Math.min(
                                255,
                                value
                            )
                        );


                    gray[pixelIndex] =
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
            // WIDTH → BYTE
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


            // =================================================
            // PACK MSB
            // =================================================

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

                    let packed =
                        0;


                    for (
                        let bit = 0;
                        bit < 8;
                        bit++
                    ) {

                        const x =
                            byteX * 8 +
                            bit;


                        /*
                         * Padding sebelah kanan
                         * HARUS PUTIH.
                         */

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


                        /*
                         * Normal:
                         *
                         * black = 1
                         * white = 0
                         */

                        if (invert) {

                            black =
                                !black;

                        }


                        if (black) {

                            packed |=
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
                        packed;

                }

            }


            // =================================================
            // DEBUG
            // =================================================

            let blackCount = 0;


            for (
                let i = 0;
                i < bytes.length;
                i++
            ) {

                let byte =
                    bytes[i];


                while (byte) {

                    blackCount +=
                        byte & 1;


                    byte >>=
                        1;

                }

            }


            const blackRatio =
                (
                    blackCount /
                    totalPixels
                ) * 100;


            console.log(
                "TSPL Black Pixel Ratio:",
                blackRatio.toFixed(2) + "%"
            );


            /*
             * Jika hampir seluruh bitmap hitam,
             * kemungkinan ada masalah pada source
             * atau threshold.
             */

            if (
                blackRatio >
                90
            ) {

                console.warn(
                    "TSPL WARNING: bitmap >90% hitam."
                );

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
        // NORMALIZE DIMENSION
        // =================================================

        normalizeDimension(
            value,
            fallback,
            dpi
        ) {

            const n =
                Number(value);


            if (
                !Number.isFinite(n) ||
                n <= 0
            ) {

                return fallback;

            }


            /*
             * <=300 dianggap MM
             *
             * Contoh:
             *
             * 100 mm
             * 150 mm
             *
             * menjadi:
             *
             * 799 dots
             * 1199 dots
             */

            if (n <= 300) {

                return Math.round(
                    (
                        n /
                        25.4
                    ) *
                    dpi
                );

            }


            /*
             * Nilai besar dianggap DOT.
             */

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
        // QUALITY
        // =================================================

        setQuality(options = {}) {

            if (
                options.threshold !==
                undefined
            ) {

                this.threshold =
                    Math.max(
                        0,
                        Math.min(
                            255,
                            Number(
                                options.threshold
                            )
                        )
                    );

            }


            if (
                options.contrast !==
                undefined
            ) {

                this.contrast =
                    Math.max(
                        0.1,
                        Math.min(
                            3,
                            Number(
                                options.contrast
                            )
                        )
                    );

            }


            if (
                options.brightness !==
                undefined
            ) {

                this.brightness =
                    Math.max(
                        -255,
                        Math.min(
                            255,
                            Number(
                                options.brightness
                            )
                        )
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


            /*
             * Jangan invert kecuali
             * benar-benar diminta.
             */

            if (
                options.invert !==
                undefined
            ) {

                this.invert =
                    Boolean(
                        options.invert
                    );

            }


            console.log(
                "TSPL Quality Updated:",
                this.getSettings()
            );

        },


        // =================================================
        // SETTINGS
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
        "SmartPrint TSPL Engine v5.1 Ready"
    );

    console.log(
        "TSPL → WHITE BACKGROUND / BLACK CONTENT"
    );


})();
