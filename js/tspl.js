"use strict";

/*
=====================================================
 SmartPrint TSPL Engine v5.2
=====================================================

 TARGET
 ----------------------------------------------------
 ✓ Full Label 100 x 150 mm
 ✓ 203 DPI
 ✓ Full canvas
 ✓ WHITE background tetap WHITE
 ✓ BLACK text / barcode / QR tetap BLACK
 ✓ Transparent pixel → WHITE
 ✓ Tidak mengubah warna background desain
 ✓ Tidak invert
 ✓ 1-bit bitmap
 ✓ MSB packing
 ✓ Sharp text
 ✓ Sharp barcode
 ✓ Sharp QR
 ✓ Dither OFF
 ✓ Density
 ✓ Speed
 ✓ Copies
 ✓ Gap
 ✓ Bluetooth.write()
 ✓ Printer.write() fallback
 ✓ PrinterManager v4.x compatible

 PHYSICAL LABEL
 ----------------------------------------------------
 Width  : 100 mm
 Height : 150 mm
 DPI    : 203

 Approx:
 Width  : 799 dots
 Height : 1199 dots

 TSPL:
 SIZE 100.00 mm,150.00 mm

=====================================================
*/

(function () {

    "use strict";


    const TSPL = {

        version: "5.2.0",


        // =================================================
        // LABEL SIZE
        // =================================================

        labelWidthMm: 100,

        labelHeightMm: 150,


        // =================================================
        // DPI
        // =================================================

        dpi: 203,


        // =================================================
        // RASTER QUALITY
        // =================================================

        /*
         * 0   = black
         * 255 = white
         *
         * 128 adalah threshold netral.
         */

        threshold: 128,

        contrast: 1.0,

        brightness: 0,

        /*
         * OFF agar text/barcode tetap bersih.
         */

        dither: false,

        /*
         * NORMAL PRINT:
         *
         * false
         */

        invert: false,


        // =================================================
        // POSITION
        // =================================================

        x: 0,

        y: 0,


        // =================================================
        // TSPL
        // =================================================

        gap: 2,

        direction: 1,


        // =================================================
        // DEFAULT PRINTER
        // =================================================

        density: 10,

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
                "SMARTPRINT TSPL ENGINE v5.2"
            );

            console.log(
                "FULL LABEL 100 x 150 MM"
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
            // DPI
            // =================================================

            const dpi =
                Number(printer.dpi) ||
                this.dpi;


            // =================================================
            // FORCE FULL LABEL 100 x 150 MM
            // =================================================

            /*
             * Jangan mengambil:
             *
             * printer.paperWidth = 576
             * printer.paperHeight = 1200
             *
             * karena nilai tersebut bisa merupakan
             * ukuran DOT dari konfigurasi lama.
             *
             * Target utama SmartPrint:
             *
             * 100 x 150 mm
             */

            const widthMm =
                this.labelWidthMm;


            const heightMm =
                this.labelHeightMm;


            // =================================================
            // DOT SIZE
            // =================================================

            const widthDots =
                this.mmToDots(
                    widthMm,
                    dpi
                );


            const heightDots =
                this.mmToDots(
                    heightMm,
                    dpi
                );


            console.log(
                "Label:",
                widthMm,
                "x",
                heightMm,
                "mm"
            );


            console.log(
                "DPI:",
                dpi
            );


            console.log(
                "Target:",
                widthDots,
                "x",
                heightDots,
                "dots"
            );


            console.log(
                "Source Canvas:",
                canvas.width,
                "x",
                canvas.height
            );


            // =================================================
            // PRINTER SETTINGS
            // =================================================

            const densityValue =
                Number(printer.density);


            const finalDensity =
                Number.isFinite(
                    densityValue
                )
                    ? densityValue
                    : this.density;


            const speedValue =
                Number(printer.speed);


            const finalSpeed =
                Number.isFinite(
                    speedValue
                )
                    ? speedValue
                    : this.speed;


            const copiesValue =
                Number(printer.copies);


            const copies =
                Math.max(
                    1,
                    Number.isFinite(
                        copiesValue
                    )
                        ? copiesValue
                        : 1
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
                "Width Bytes:",
                bitmap.widthBytes
            );


            console.log(
                "Bitmap Bytes:",
                bitmap.data.length
            );


            // =================================================
            // TSPL HEADER
            // =================================================

            let command = "";


            /*
             * FISIK LABEL:
             *
             * 100 x 150 mm
             */

            command +=
                "SIZE " +
                widthMm.toFixed(2) +
                " mm," +
                heightMm.toFixed(2) +
                " mm\r\n";


            command +=
                "GAP " +
                Number(this.gap) +
                " mm,0\r\n";


            command +=
                "DIRECTION " +
                Number(this.direction) +
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
            // BITMAP COMMAND
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


            // =================================================
            // ENCODE HEADER
            // =================================================

            const encoder =
                new TextEncoder();


            const header =
                encoder.encode(
                    command
                );


            // =================================================
            // FOOTER
            // =================================================

            const footer =
                encoder.encode(
                    "\r\nPRINT " +
                    copies +
                    ",1\r\n"
                );


            // =================================================
            // FINAL OUTPUT
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
            // SEND BLUETOOTH
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
        // CANVAS → BITMAP
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
             * WAJIB NORMAL.
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


            // =================================================
            // IMAGE SMOOTHING
            // =================================================

            ctx.imageSmoothingEnabled =
                true;


            ctx.imageSmoothingQuality =
                "high";


            // =================================================
            // WHITE BACKGROUND
            // =================================================

            /*
             * Penting:
             *
             * Ini BUKAN mengganti background
             * desain asli.
             *
             * Ini hanya menjadi background
             * untuk pixel TRANSPARAN.
             *
             * Canvas hasil tetap:
             *
             * putih + content asli.
             */

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
            // CONVERT TO GRAYSCALE
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

                    const index =
                        y *
                        targetWidth +
                        x;


                    const p =
                        index * 4;


                    const r =
                        pixels[p];


                    const g =
                        pixels[p + 1];


                    const b =
                        pixels[p + 2];


                    const a =
                        pixels[p + 3];


                    // =================================================
                    // TRANSPARENT → WHITE
                    // =================================================

                    if (
                        a < 16
                    ) {

                        gray[index] =
                            255;

                        continue;

                    }


                    // =================================================
                    // ALPHA COMPOSITE TO WHITE
                    // =================================================

                    const alpha =
                        a / 255;


                    /*
                     * Background putih.
                     *
                     * Warna asli tetap dipertahankan
                     * sampai proses threshold.
                     */

                    const rr =
                        (
                            r * alpha
                        ) +
                        (
                            255 *
                            (1 - alpha)
                        );


                    const gg =
                        (
                            g * alpha
                        ) +
                        (
                            255 *
                            (1 - alpha)
                        );


                    const bb =
                        (
                            b * alpha
                        ) +
                        (
                            255 *
                            (1 - alpha)
                        );


                    // =================================================
                    // LUMINANCE
                    // =================================================

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

                    if (
                        Number.isFinite(
                            brightness
                        )
                    ) {

                        value +=
                            brightness;

                    }


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


                    gray[index] =
                        value;

                }

            }


            // =================================================
            // DITHER
            // =================================================

            if (
                dither
            ) {

                this.applyDither(
                    gray,
                    targetWidth,
                    targetHeight,
                    threshold
                );

            }


            // =================================================
            // WIDTH BYTES
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
                            (
                                byteX * 8
                            ) +
                            bit;


                        // =========================================
                        // PADDING = WHITE
                        // =========================================

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


                        if (
                            dither
                        ) {

                            black =
                                gray[index] <
                                128;

                        }

                        else {

                            black =
                                gray[index] <
                                threshold;

                        }


                        // =========================================
                        // INVERT ONLY IF EXPLICIT
                        // =========================================

                        if (
                            invert
                        ) {

                            black =
                                !black;

                        }


                        // =========================================
                        // BLACK = 1
                        // WHITE = 0
                        // =========================================

                        if (
                            black
                        ) {

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
            // DEBUG BLACK PIXEL RATIO
            // =================================================

            let blackCount =
                0;


            for (
                let i = 0;
                i < bytes.length;
                i++
            ) {

                let value =
                    bytes[i];


                while (
                    value
                ) {

                    blackCount +=
                        value & 1;


                    value >>=
                        1;

                }

            }


            const blackRatio =
                (
                    blackCount /
                    totalPixels
                ) *
                100;


            console.log(
                "TSPL Black Pixel Ratio:",
                blackRatio.toFixed(2) +
                "%"
            );


            if (
                blackRatio >
                90
            ) {

                console.warn(
                    "TSPL WARNING: Bitmap >90% hitam."
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


                    // =========================================
                    // RIGHT
                    // =========================================

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


                    // =========================================
                    // BOTTOM LEFT
                    // =========================================

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
                            3 /
                            16;

                    }


                    // =========================================
                    // BOTTOM
                    // =========================================

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


                    // =========================================
                    // BOTTOM RIGHT
                    // =========================================

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
        // MM → DOTS
        // =================================================

        mmToDots(
            mm,
            dpi
        ) {

            return Math.round(
                (
                    Number(mm) /
                    25.4
                ) *
                Number(dpi)
            );

        },


        // =================================================
        // DOTS → MM
        // =================================================

        dotsToMm(
            dots,
            dpi
        ) {

            return (
                Number(dots) /
                Number(dpi) *
                25.4
            ).toFixed(2);

        },


        // =================================================
        // QUALITY
        // =================================================

        setQuality(
            options = {}
        ) {

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
                "TSPL Quality:",
                this.getSettings()
            );

        },


        // =================================================
        // SET LABEL
        // =================================================

        setLabelSize(
            width,
            height
        ) {

            const w =
                Number(width);


            const h =
                Number(height);


            if (
                !Number.isFinite(w) ||
                w <= 0
            ) {

                throw new Error(
                    "TSPL: Lebar label tidak valid."
                );

            }


            if (
                !Number.isFinite(h) ||
                h <= 0
            ) {

                throw new Error(
                    "TSPL: Tinggi label tidak valid."
                );

            }


            this.labelWidthMm =
                w;


            this.labelHeightMm =
                h;


            console.log(
                "TSPL Label Size:",
                w,
                "x",
                h,
                "mm"
            );

        },


        // =================================================
        // SETTINGS
        // =================================================

        getSettings() {

            return {

                version:
                    this.version,

                labelWidthMm:
                    this.labelWidthMm,

                labelHeightMm:
                    this.labelHeightMm,

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
        "========================================"
    );

    console.log(
        "SmartPrint TSPL Engine v5.2 Ready"
    );

    console.log(
        "Label: 100 x 150 mm"
    );

    console.log(
        "DPI: 203"
    );

    console.log(
        "Mode: WHITE BACKGROUND / BLACK CONTENT"
    );

    console.log(
        "========================================"
    );


})();
