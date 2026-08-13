"use strict";

/*
=====================================================
 SmartPrint TSPL Engine v5.3
=====================================================

 TARGET
 ----------------------------------------------------
 Label       : 100 x 150 mm
 DPI         : 203
 Canvas      : TIDAK DIUBAH
 Printer     : TSPL / TSPL2 compatible

 TARGET DOT
 ----------------------------------------------------
 Width       : 799 dots
 Height      : 1199 dots
 Bytes/Row   : 100 bytes
 Bitmap      : 119,900 bytes

 BITMAP
 ----------------------------------------------------
 Mode        : 0 = OVERWRITE
 Bit order   : MSB FIRST
 1           : BLACK
 0           : WHITE

 COLOR
 ----------------------------------------------------
 Background  : WHITE
 Transparent : WHITE
 Text        : BLACK
 Barcode     : BLACK
 QR          : BLACK
 Invert      : FALSE

 PRINT
 ----------------------------------------------------
 PRINT copies,1

 COMPATIBILITY
 ----------------------------------------------------
 SmartPrint Printer Manager v4.1
 SmartPrint Bluetooth Engine v5.4
 Web Bluetooth / Web Serial / Bridge

 IMPORTANT
 ----------------------------------------------------
 1. Canvas asli TIDAK pernah diubah.
 2. Bitmap dibuat pada canvas sementara.
 3. Bitmap TIDAK di-TextEncoder.
 4. Bitmap dikirim sebagai RAW Uint8Array.
 5. Header/footer menggunakan ASCII bytes.
 6. Tidak ada invert.
 7. Transparansi dianggap WHITE.
 8. Padding sisi kanan dianggap WHITE.
 9. Proteksi full-black.
=====================================================
*/


const TSPL = (() => {

    const VERSION = "5.3";


    /*
    =================================================
     DEFAULT CONFIG
    =================================================
    */

    const DEFAULTS = {

        widthMM: 100,
        heightMM: 150,

        dpi: 203,

        widthDots: 799,
        heightDots: 1199,

        gap: 2,

        density: 8,
        speed: 4,

        copies: 1,

        x: 0,
        y: 0,

        bitmapMode: 0,

        threshold: 180,

        invert: false,

        transparentIsWhite: true,

        debug: true

    };


    /*
    =================================================
     BASIC HELPERS
    =================================================
    */

    function num(value, fallback = 0) {

        const n = Number(value);

        return Number.isFinite(n)
            ? n
            : fallback;

    }


    function int(value, fallback = 0) {

        const n = parseInt(
            value,
            10
        );

        return Number.isFinite(n)
            ? n
            : fallback;

    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }


    function mmToDots(
        mm,
        dpi
    ) {

        return Math.round(
            num(mm) *
            num(dpi) /
            25.4
        );

    }


    /*
    =================================================
     GET SETTINGS
    =================================================
    */

    function getSettings() {

        /*
         * SmartPrint Settings object
         */

        try {

            if (
                typeof Settings !== "undefined" &&
                Settings
            ) {

                return Settings;

            }

        } catch (error) {}


        /*
         * localStorage fallback
         */

        try {

            const raw =
                localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );


            if (raw) {

                return JSON.parse(raw);

            }

        } catch (error) {}


        return {};

    }


    /*
    =================================================
     FIND PRINTER SETTINGS
    =================================================
    */

    function getPrinterSettings() {

        const settings =
            getSettings();


        return (
            settings.printer ||
            settings.Printer ||
            settings
        );

    }


    /*
    =================================================
     FIND LABEL SETTINGS
    =================================================
    */

    function getLabelSettings() {

        const settings =
            getSettings();


        return (
            settings.label ||
            settings.Label ||
            settings
        );

    }


    /*
    =================================================
     BUILD CONFIG
    =================================================
    */

    function getConfig(
        options = {}
    ) {

        const settings =
            getSettings();


        const printer =
            getPrinterSettings();


        const label =
            getLabelSettings();


        /*
         * DPI
         */

        const dpi =
            int(
                options.dpi ??
                printer.dpi ??
                settings.dpi,
                DEFAULTS.dpi
            );


        /*
         * FORCE TARGET 100 x 150
         *
         * Jika tidak diberikan override,
         * gunakan target SmartPrint.
         */

        const widthMM =
            num(
                options.widthMM ??
                label.labelWidth,
                DEFAULTS.widthMM
            );


        const heightMM =
            num(
                options.heightMM ??
                label.labelHeight,
                DEFAULTS.heightMM
            );


        /*
         * Untuk target 100 x 150 @ 203 DPI:
         *
         * 100 / 25.4 * 203 = 799.21
         * 150 / 25.4 * 203 = 1198.82
         *
         * => 799 x 1199
         */

        const widthDots =
            int(
                options.widthDots ??
                (
                    widthMM === 100 &&
                    heightMM === 150 &&
                    dpi === 203
                        ? 799
                        : mmToDots(
                            widthMM,
                            dpi
                        )
                ),
                DEFAULTS.widthDots
            );


        const heightDots =
            int(
                options.heightDots ??
                (
                    widthMM === 100 &&
                    heightMM === 150 &&
                    dpi === 203
                        ? 1199
                        : mmToDots(
                            heightMM,
                            dpi
                        )
                ),
                DEFAULTS.heightDots
            );


        /*
         * GAP
         */

        const gap =
            num(
                options.gap ??
                label.gap ??
                printer.gap,
                DEFAULTS.gap
            );


        /*
         * DENSITY
         */

        const density =
            clamp(
                int(
                    options.density ??
                    printer.density ??
                    settings.density,
                    DEFAULTS.density
                ),
                0,
                15
            );


        /*
         * SPEED
         */

        const speed =
            clamp(
                num(
                    options.speed ??
                    printer.speed ??
                    settings.speed,
                    DEFAULTS.speed
                ),
                1,
                12
            );


        /*
         * COPIES
         */

        const copies =
            Math.max(
                1,
                int(
                    options.copies ??
                    printer.copies ??
                    settings.copies,
                    DEFAULTS.copies
                )
            );


        /*
         * THRESHOLD
         */

        const threshold =
            clamp(
                int(
                    options.threshold,
                    DEFAULTS.threshold
                ),
                0,
                255
            );


        return {

            widthMM,
            heightMM,

            dpi,

            widthDots,
            heightDots,

            gap,

            density,
            speed,

            copies,

            x:
                int(
                    options.x,
                    DEFAULTS.x
                ),

            y:
                int(
                    options.y,
                    DEFAULTS.y
                ),

            bitmapMode:
                int(
                    options.bitmapMode,
                    DEFAULTS.bitmapMode
                ),

            threshold,

            /*
             * IMPORTANT:
             * v5.3 selalu default FALSE.
             */

            invert: false,

            transparentIsWhite: true,

            debug:
                options.debug !== false

        };

    }


    /*
    =================================================
     VALIDATE CANVAS
    =================================================
    */

    function validateCanvas(
        canvas
    ) {

        if (!canvas) {

            throw new Error(
                "TSPL v5.3: previewCanvas tidak ditemukan."
            );

        }


        if (
            typeof canvas.getContext !==
            "function"
        ) {

            throw new Error(
                "TSPL v5.3: object bukan canvas."
            );

        }


        if (
            canvas.width <= 0 ||
            canvas.height <= 0
        ) {

            throw new Error(
                "TSPL v5.3: ukuran canvas tidak valid."
            );

        }

    }


    /*
    =================================================
     CREATE TEMPORARY RASTER
    =================================================
    */

    function createRaster(
        sourceCanvas,
        width,
        height
    ) {

        let raster;


        /*
         * OffscreenCanvas jika tersedia.
         */

        if (
            typeof OffscreenCanvas !==
            "undefined"
        ) {

            raster =
                new OffscreenCanvas(
                    width,
                    height
                );

        } else {

            raster =
                document.createElement(
                    "canvas"
                );

            raster.width =
                width;

            raster.height =
                height;

        }


        const ctx =
            raster.getContext(
                "2d",
                {
                    alpha: false,
                    willReadFrequently: true
                }
            );


        if (!ctx) {

            throw new Error(
                "TSPL v5.3: gagal membuat raster context."
            );

        }


        /*
         * WHITE BACKGROUND
         *
         * Ini sangat penting.
         *
         * Canvas transparent:
         *     -> WHITE
         *
         * Bukan BLACK.
         */

        ctx.save();

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 1;

        ctx.fillStyle =
            "#FFFFFF";

        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        /*
         * Ambil desain dari canvas.
         *
         * Canvas asli hanya dibaca.
         */

        ctx.globalCompositeOperation =
            "source-over";

        ctx.globalAlpha = 1;

        ctx.imageSmoothingEnabled =
            true;

        ctx.imageSmoothingQuality =
            "high";


        ctx.drawImage(
            sourceCanvas,

            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,

            0,
            0,
            width,
            height
        );


        ctx.restore();


        return raster;

    }


    /*
    =================================================
     RGB -> GRAYSCALE
    =================================================
    */

    function grayscale(
        r,
        g,
        b
    ) {

        return (
            0.299 * r +
            0.587 * g +
            0.114 * b
        );

    }


    /*
    =================================================
     PIXEL -> BLACK / WHITE
    =================================================
    */

    function isBlack(
        r,
        g,
        b,
        a,
        threshold
    ) {

        /*
         * Transparent = WHITE
         */

        if (a === 0) {

            return false;

        }


        /*
         * Composite semi-transparent pixel
         * terhadap WHITE.
         */

        if (a < 255) {

            const alpha =
                a / 255;


            r =
                r * alpha +
                255 * (1 - alpha);


            g =
                g * alpha +
                255 * (1 - alpha);


            b =
                b * alpha +
                255 * (1 - alpha);

        }


        const gray =
            grayscale(
                r,
                g,
                b
            );


        /*
         * FALSE = normal.
         *
         * Gelap -> BLACK
         * Terang -> WHITE
         */

        return gray < threshold;

    }


    /*
    =================================================
     CANVAS -> RAW BITMAP
    =================================================
    */

    function rasterize(
        sourceCanvas,
        config
    ) {

        validateCanvas(
            sourceCanvas
        );


        const width =
            config.widthDots;


        const height =
            config.heightDots;


        /*
         * TSPL width adalah BYTE,
         * bukan DOT.
         */

        const bytesPerRow =
            Math.ceil(
                width / 8
            );


        /*
         * 799 dots:
         *
         * ceil(799 / 8)
         * = 100 bytes
         */

        const totalBytes =
            bytesPerRow *
            height;


        /*
         * Temporary raster.
         */

        const raster =
            createRaster(
                sourceCanvas,
                width,
                height
            );


        const ctx =
            raster.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );


        const image =
            ctx.getImageData(
                0,
                0,
                width,
                height
            );


        const pixels =
            image.data;


        /*
         * RAW bitmap.
         *
         * Jangan String.
         * Jangan Base64.
         * Jangan TextEncoder.
         */

        const bitmap =
            new Uint8Array(
                totalBytes
            );


        let blackPixels = 0;


        /*
         * =================================================
         * MSB FIRST
         *
         * x=0 -> bit 7
         * x=1 -> bit 6
         * x=2 -> bit 5
         * ...
         * x=7 -> bit 0
         *
         * =================================================
         */

        for (
            let y = 0;
            y < height;
            y++
        ) {

            const rowStart =
                y *
                bytesPerRow;


            for (
                let x = 0;
                x < width;
                x++
            ) {

                const pixel =
                    (
                        y *
                        width +
                        x
                    ) * 4;


                const r =
                    pixels[pixel];


                const g =
                    pixels[pixel + 1];


                const b =
                    pixels[pixel + 2];


                const a =
                    pixels[pixel + 3];


                const black =
                    isBlack(
                        r,
                        g,
                        b,
                        a,
                        config.threshold
                    );


                if (!black) {

                    /*
                     * 0 = WHITE
                     */

                    continue;

                }


                blackPixels++;


                const byteIndex =
                    rowStart +
                    Math.floor(
                        x / 8
                    );


                const bitIndex =
                    7 -
                    (x % 8);


                /*
                 * BLACK = 1
                 */

                bitmap[byteIndex] |=
                    (
                        1 <<
                        bitIndex
                    );

            }

        }


        /*
         * =================================================
         * SAFETY CHECK
         * =================================================
         */

        const totalPixels =
            width *
            height;


        const blackRatio =
            totalPixels > 0
                ? blackPixels /
                  totalPixels
                : 0;


        return {

            bitmap,

            width,

            height,

            bytesPerRow,

            totalBytes,

            blackPixels,

            totalPixels,

            blackRatio

        };

    }


    /*
    =================================================
     ASCII -> UINT8
    =================================================
    */

    function asciiBytes(
        text
    ) {

        /*
         * Header/footer adalah ASCII TSPL.
         *
         * HANYA bagian ini menggunakan
         * TextEncoder.
         */

        return new TextEncoder()
            .encode(text);

    }


    /*
    =================================================
     CONCAT RAW UINT8 ARRAYS
    =================================================
    */

    function concatBytes(
        ...arrays
    ) {

        let total = 0;


        for (
            const array of arrays
        ) {

            if (!array) {

                continue;

            }


            total +=
                array.length;

        }


        const output =
            new Uint8Array(
                total
            );


        let offset = 0;


        for (
            const array of arrays
        ) {

            if (!array) {

                continue;

            }


            output.set(
                array,
                offset
            );


            offset +=
                array.length;

        }


        return output;

    }


    /*
    =================================================
     BUILD TSPL HEADER
    =================================================
    */

    function buildHeader(
        config
    ) {

        return [

            `SIZE ${config.widthMM} mm,${config.heightMM} mm`,

            `GAP ${config.gap} mm,0`,

            `DENSITY ${config.density}`,

            `SPEED ${config.speed}`,

            `CLS`,

            `BITMAP ${config.x},${config.y},`

        ].join("\r\n");

    }


    /*
    =================================================
     IMPORTANT:
     BUILD BITMAP PREFIX
    =================================================
    */

    function buildBitmapPrefix(
        config,
        bitmap
    ) {

        /*
         * Jangan masukkan bitmap ke string.
         *
         * Prefix berhenti tepat setelah comma.
         */

        return (
            `BITMAP ` +
            `${config.x},` +
            `${config.y},` +
            `${bitmap.bytesPerRow},` +
            `${bitmap.height},` +
            `${config.bitmapMode},`
        );

    }


    /*
    =================================================
     BUILD PRINT
    =================================================
    */

    function buildPrint(
        config
    ) {

        return (
            `PRINT ${config.copies},1\r\n`
        );

    }


    /*
    =================================================
     BUILD RAW JOB
    =================================================
    */

    function buildJob(
        sourceCanvas,
        options = {}
    ) {

        const config =
            getConfig(
                options
            );


        const bitmap =
            rasterize(
                sourceCanvas,
                config
            );


        /*
         * =================================================
         * BLACK BLOCK PROTECTION
         * =================================================
         *
         * > 98% hitam:
         * hampir pasti masalah raster/
         * transparency/transport.
         */

        if (
            bitmap.blackRatio >= 0.98
        ) {

            throw new Error(
                "TSPL v5.3: JOB DIBATALKAN. " +
                "Bitmap terdeteksi >=98% hitam. " +
                "Canvas asli tidak diubah."
            );

        }


        /*
         * =================================================
         * HEADER
         * =================================================
         */

        const header =
            [
                `SIZE ${config.widthMM} mm,${config.heightMM} mm`,
                `GAP ${config.gap} mm,0`,
                `DENSITY ${config.density}`,
                `SPEED ${config.speed}`,
                `CLS`
            ].join("\r\n");


        /*
         * =================================================
         * BITMAP PREFIX
         * =================================================
         */

        const bitmapPrefix =
            buildBitmapPrefix(
                config,
                bitmap
            );


        /*
         * =================================================
         * FOOTER
         * =================================================
         *
         * Tidak ada data bitmap di string.
         */

        const footer =
            "\r\n" +
            buildPrint(
                config
            );


        /*
         * =================================================
         * CONVERT ASCII ONLY
         * =================================================
         */

        const headerBytes =
            asciiBytes(
                header +
                "\r\n"
            );


        const bitmapPrefixBytes =
            asciiBytes(
                bitmapPrefix
            );


        const footerBytes =
            asciiBytes(
                footer
            );


        /*
         * =================================================
         * RAW JOB
         * =================================================
         *
         * HEADER ASCII
         * +
         * BITMAP PREFIX ASCII
         * +
         * RAW BITMAP
         * +
         * FOOTER ASCII
         */

        const data =
            concatBytes(

                headerBytes,

                bitmapPrefixBytes,

                bitmap.bitmap,

                footerBytes

            );


        return {

            data,

            config,

            bitmap,

            headerBytes,

            bitmapPrefixBytes,

            footerBytes

        };

    }


    /*
    =================================================
     HEX PREVIEW
    =================================================
    */

    function hex(
        bytes,
        max = 64
    ) {

        const limit =
            Math.min(
                bytes.length,
                max
            );


        const output = [];


        for (
            let i = 0;
            i < limit;
            i++
        ) {

            output.push(
                bytes[i]
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
                    .toUpperCase()
            );

        }


        return output.join(" ");

    }


    /*
    =================================================
     CHECK BITMAP
    =================================================
    */

    function inspect(
        canvas,
        options = {}
    ) {

        const job =
            buildJob(
                canvas,
                options
            );


        const bitmap =
            job.bitmap;


        /*
         * Hitam pertama.
         */

        let firstBlack =
            -1;


        for (
            let i = 0;
            i < bitmap.bitmap.length;
            i++
        ) {

            if (
                bitmap.bitmap[i] !== 0
            ) {

                firstBlack =
                    i;

                break;

            }

        }


        /*
         * Hitam terakhir.
         */

        let lastBlack =
            -1;


        for (
            let i =
                bitmap.bitmap.length - 1;
            i >= 0;
            i--
        ) {

            if (
                bitmap.bitmap[i] !== 0
            ) {

                lastBlack =
                    i;

                break;

            }

        }


        return {

            version:
                VERSION,

            label:
                `${job.config.widthMM} x ` +
                `${job.config.heightMM} mm`,

            dpi:
                job.config.dpi,

            widthDots:
                bitmap.width,

            heightDots:
                bitmap.height,

            bytesPerRow:
                bitmap.bytesPerRow,

            bitmapBytes:
                bitmap.totalBytes,

            blackPixels:
                bitmap.blackPixels,

            totalPixels:
                bitmap.totalPixels,

            blackRatio:
                bitmap.blackRatio,

            blackPercent:
                (
                    bitmap.blackRatio *
                    100
                ).toFixed(2) + "%",

            firstBlackByte:
                firstBlack,

            lastBlackByte:
                lastBlack,

            first64BitmapBytes:
                hex(
                    bitmap.bitmap,
                    64
                ),

            first64JobBytes:
                hex(
                    job.data,
                    64
                ),

            totalJobBytes:
                job.data.length

        };

    }


    /*
    =================================================
     PRINT TRANSPORT RESOLVER
    =================================================
    */

    async function sendRaw(
        data
    ) {

        if (
            !(data instanceof Uint8Array)
        ) {

            throw new Error(
                "TSPL v5.3: transport membutuhkan Uint8Array."
            );

        }


        /*
         * =================================================
         * 1. SmartPrint Printer Manager v4.1
         * =================================================
         */

        if (
            typeof PrinterManager !==
            "undefined" &&
            PrinterManager
        ) {

            /*
             * raw()
             */

            if (
                typeof PrinterManager.raw ===
                "function"
            ) {

                return await PrinterManager.raw(
                    data
                );

            }


            /*
             * printRaw()
             */

            if (
                typeof PrinterManager.printRaw ===
                "function"
            ) {

                return await PrinterManager.printRaw(
                    data
                );

            }


            /*
             * sendRaw()
             */

            if (
                typeof PrinterManager.sendRaw ===
                "function"
            ) {

                return await PrinterManager.sendRaw(
                    data
                );

            }


            /*
             * send()
             */

            if (
                typeof PrinterManager.send ===
                "function"
            ) {

                return await PrinterManager.send(
                    data
                );

            }


            /*
             * write()
             */

            if (
                typeof PrinterManager.write ===
                "function"
            ) {

                return await PrinterManager.write(
                    data
                );

            }


            /*
             * print()
             */

            if (
                typeof PrinterManager.print ===
                "function"
            ) {

                return await PrinterManager.print(
                    data
                );

            }

        }


        /*
         * =================================================
         * 2. SmartPrint Printer v4.1
         * =================================================
         */

        if (
            typeof Printer !==
            "undefined" &&
            Printer
        ) {

            if (
                typeof Printer.raw ===
                "function"
            ) {

                return await Printer.raw(
                    data
                );

            }


            if (
                typeof Printer.printRaw ===
                "function"
            ) {

                return await Printer.printRaw(
                    data
                );

            }


            if (
                typeof Printer.sendRaw ===
                "function"
            ) {

                return await Printer.sendRaw(
                    data
                );

            }


            if (
                typeof Printer.send ===
                "function"
            ) {

                return await Printer.send(
                    data
                );

            }


            if (
                typeof Printer.write ===
                "function"
            ) {

                return await Printer.write(
                    data
                );

            }

        }


        /*
         * =================================================
         * 3. Bluetooth Engine v5.4
         * =================================================
         */

        if (
            typeof Bluetooth !==
            "undefined" &&
            Bluetooth
        ) {

            if (
                typeof Bluetooth.sendRaw ===
                "function"
            ) {

                return await Bluetooth.sendRaw(
                    data
                );

            }


            if (
                typeof Bluetooth.raw ===
                "function"
            ) {

                return await Bluetooth.raw(
                    data
                );

            }


            if (
                typeof Bluetooth.send ===
                "function"
            ) {

                return await Bluetooth.send(
                    data
                );

            }


            if (
                typeof Bluetooth.write ===
                "function"
            ) {

                return await Bluetooth.write(
                    data
                );

            }


            if (
                typeof Bluetooth.writeRaw ===
                "function"
            ) {

                return await Bluetooth.writeRaw(
                    data
                );

            }

        }


        /*
         * =================================================
         * 4. SmartPrint BluetoothEngine
         * =================================================
         */

        if (
            typeof BluetoothEngine !==
            "undefined" &&
            BluetoothEngine
        ) {

            if (
                typeof BluetoothEngine.sendRaw ===
                "function"
            ) {

                return await BluetoothEngine.sendRaw(
                    data
                );

            }


            if (
                typeof BluetoothEngine.raw ===
                "function"
            ) {

                return await BluetoothEngine.raw(
                    data
                );

            }


            if (
                typeof BluetoothEngine.send ===
                "function"
            ) {

                return await BluetoothEngine.send(
                    data
                );

            }


            if (
                typeof BluetoothEngine.write ===
                "function"
            ) {

                return await BluetoothEngine.write(
                    data
                );

            }

        }


        throw new Error(
            "TSPL v5.3: Tidak ditemukan RAW transport pada Printer Manager / Bluetooth Engine."
        );

    }


    /*
    =================================================
     PRINT
    =================================================
    */

    async function print(
        canvas,
        options = {}
    ) {

        const job =
            buildJob(
                canvas,
                options
            );


        if (
            options.debug !== false
        ) {

            console.log(
                "===================================="
            );

            console.log(
                "SmartPrint TSPL Engine v" +
                VERSION
            );

            console.log(
                "===================================="
            );

            console.log(
                "Label:",
                job.config.widthMM,
                "x",
                job.config.heightMM,
                "mm"
            );

            console.log(
                "DPI:",
                job.config.dpi
            );

            console.log(
                "Dots:",
                job.bitmap.width,
                "x",
                job.bitmap.height
            );

            console.log(
                "Bytes / Row:",
                job.bitmap.bytesPerRow
            );

            console.log(
                "Bitmap:",
                job.bitmap.totalBytes,
                "bytes"
            );

            console.log(
                "Black:",
                (
                    job.bitmap.blackRatio *
                    100
                ).toFixed(2) +
                "%"
            );

            console.log(
                "RAW Job:",
                job.data.length,
                "bytes"
            );

            console.log(
                "Bitmap first bytes:",
                hex(
                    job.bitmap.bitmap,
                    32
                )
            );

            console.log(
                "===================================="
            );

        }


        /*
         * PENTING:
         *
         * Kirim Uint8Array.
         *
         * BUKAN string.
         *
         * BUKAN Base64.
         */

        return await sendRaw(
            job.data
        );

    }


    /*
    =================================================
     SIMPLE BUILD API
    =================================================
    */

    function fromCanvas(
        canvas,
        options = {}
    ) {

        return buildJob(
            canvas,
            options
        );

    }


    /*
    =================================================
     TEST API
    =================================================
    */

    function test(
        canvas,
        options = {}
    ) {

        const info =
            inspect(
                canvas,
                options
            );


        console.group(
            "SmartPrint TSPL v5.3"
        );


        console.log(
            "Label:",
            info.label
        );


        console.log(
            "DPI:",
            info.dpi
        );


        console.log(
            "Dots:",
            info.widthDots,
            "x",
            info.heightDots
        );


        console.log(
            "Bytes/Row:",
            info.bytesPerRow
        );


        console.log(
            "Bitmap Bytes:",
            info.bitmapBytes
        );


        console.log(
            "Black:",
            info.blackPercent
        );


        console.log(
            "First Black Byte:",
            info.firstBlackByte
        );


        console.log(
            "Last Black Byte:",
            info.lastBlackByte
        );


        console.log(
            "Bitmap HEX:",
            info.first64BitmapBytes
        );


        console.log(
            "Job HEX:",
            info.first64JobBytes
        );


        console.log(
            "Total Job:",
            info.totalJobBytes
        );


        console.groupEnd();


        return info;

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    return {

        version:
            VERSION,

        defaults:
            DEFAULTS,

        getConfig,

        validateCanvas,

        createRaster,

        rasterize,

        buildHeader,

        buildBitmapPrefix,

        buildPrint,

        buildJob,

        fromCanvas,

        inspect,

        test,

        sendRaw,

        print

    };

})();


/*
=====================================================
 GLOBAL
=====================================================
*/

window.TSPL = TSPL;


/*
=====================================================
 COMPATIBILITY
=====================================================
*/

window.TSPLEngine = TSPL;

window.TSPL_ENGINE = TSPL;

window.SmartPrintTSPL = TSPL;


/*
=====================================================
 READY
=====================================================
*/

console.log(
    "SmartPrint TSPL Engine v5.3 Ready"
);

console.log(
    "Target: 100 x 150 mm | 203 DPI | 799 x 1199 dots"
);

console.log(
    "Bitmap: RAW Uint8Array | MSB FIRST | Mode 0"
);
