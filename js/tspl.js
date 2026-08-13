"use strict";

/*
=====================================================
 SmartPrint TSPL Engine v5.3
=====================================================

 TARGET
 ----------------------------------------------------
 Label       : 100 x 150 mm
 DPI         : 203
 Width       : 799 dots
 Height      : 1199 dots

 OUTPUT
 ----------------------------------------------------
 TSPL BITMAP
 Bitmap mode : 0
 Bitmap      : RAW Uint8Array
 Bit order   : MSB FIRST
 PRINT       : PRINT copies,1

 COLOR
 ----------------------------------------------------
 Background  : WHITE
 Text        : BLACK
 Barcode     : BLACK
 QR          : BLACK
 Transparent : WHITE
 Invert      : FALSE

 IMPORTANT
 ----------------------------------------------------
 - Tidak mengubah canvas asli
 - Tidak mengubah preview
 - Tidak mengubah warna canvas
 - Canvas hanya dibaca
 - Transparansi dianggap putih
 - Padding dianggap putih
 - Tidak invert
 - Tidak HEX encode bitmap
 - Bitmap dikirim sebagai RAW bytes
 - Anti black-block protection
 - Kompatibel Printer Manager v4.1
 - Kompatibel Bluetooth Engine v5.4
=====================================================
*/


/*
=====================================================
 GLOBAL NAMESPACE
=====================================================

 IMPORTANT:
 Jangan gunakan:

 const TSPL = ...

 Karena file ini mungkin dimuat setelah engine
 lain yang sudah membuat TSPL.

 Kita gunakan satu global namespace.
=====================================================
*/

(function (global) {

    /*
    =================================================
    VERSION
    =================================================
    */

    const VERSION = "5.3";


    /*
    =================================================
    CONSTANTS
    =================================================
    */

    const TARGET = {

        widthMM: 100,

        heightMM: 150,

        dpi: 203,

        widthDots: 799,

        heightDots: 1199,

        bytesPerRow: 100

    };


    /*
    =================================================
    DEFAULT CONFIG
    =================================================
    */

    const DEFAULTS = {

        widthMM: TARGET.widthMM,

        heightMM: TARGET.heightMM,

        dpi: TARGET.dpi,

        widthDots: TARGET.widthDots,

        heightDots: TARGET.heightDots,

        gap: 2,

        density: 8,

        speed: 4,

        copies: 1,

        x: 0,

        y: 0,

        bitmapMode: 0,

        threshold: 180,

        invert: false,

        transparentIsWhite: true

    };


    /*
    =================================================
    NUMBER
    =================================================
    */

    function number(value, fallback) {

        const n = Number(value);

        if (Number.isFinite(n)) {

            return n;

        }

        return fallback;

    }


    /*
    =================================================
    CLAMP
    =================================================
    */

    function clamp(value, min, max) {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }


    /*
    =================================================
    MM -> DOTS
    =================================================
    */

    function mmToDots(mm, dpi) {

        return Math.round(
            number(mm, 0) *
            number(dpi, TARGET.dpi) /
            25.4
        );

    }


    /*
    =================================================
    SETTINGS
    =================================================
    */

    function getSettings() {

        /*
         * SmartPrint Settings object.
         */

        try {

            if (
                typeof global.Settings !== "undefined" &&
                global.Settings
            ) {

                return global.Settings;

            }

        } catch (error) {}


        /*
         * LocalStorage fallback.
         */

        try {

            const raw =
                global.localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );


            if (raw) {

                const parsed =
                    JSON.parse(raw);


                if (
                    parsed &&
                    typeof parsed === "object"
                ) {

                    return parsed;

                }

            }

        } catch (error) {}


        return {};

    }


    /*
    =================================================
    PRINTER CONFIG
    =================================================
    */

    function getPrinterConfig(options = {}) {

        const settings =
            getSettings();


        const printer =
            settings.printer ||
            settings.Printer ||
            settings;


        const label =
            settings.label ||
            settings.Label ||
            settings;


        /*
        ------------------------------------------------
        DPI
        ------------------------------------------------
        */

        const dpi =
            TARGET.dpi;


        /*
        ------------------------------------------------
        LABEL SIZE
        ------------------------------------------------

        Untuk printer target ini kita pertahankan:

        100 x 150 mm
        203 DPI
        799 x 1199 dots

        Jangan mengambil paperWidth 80 dari printer
        karena itu dapat menyebabkan raster 80 mm.
        ------------------------------------------------
        */

        const widthMM =
            number(
                options.widthMM,
                TARGET.widthMM
            );


        const heightMM =
            number(
                options.heightMM,
                TARGET.heightMM
            );


        /*
        ------------------------------------------------
        DOT SIZE
        ------------------------------------------------
        */

        const widthDots =
            number(
                options.widthDots,
                TARGET.widthDots
            );


        const heightDots =
            number(
                options.heightDots,
                TARGET.heightDots
            );


        /*
        ------------------------------------------------
        GAP
        ------------------------------------------------
        */

        const gap =
            number(
                options.gap ??
                label.gap ??
                printer.gap,
                DEFAULTS.gap
            );


        /*
        ------------------------------------------------
        DENSITY
        ------------------------------------------------
        */

        const density =
            clamp(
                number(
                    options.density ??
                    printer.density ??
                    settings.density,
                    DEFAULTS.density
                ),
                0,
                15
            );


        /*
        ------------------------------------------------
        SPEED
        ------------------------------------------------
        */

        const speed =
            clamp(
                number(
                    options.speed ??
                    printer.speed ??
                    settings.speed,
                    DEFAULTS.speed
                ),
                1,
                12
            );


        /*
        ------------------------------------------------
        COPIES
        ------------------------------------------------
        */

        const copies =
            Math.max(
                1,
                Math.floor(
                    number(
                        options.copies ??
                        printer.copies ??
                        settings.copies,
                        DEFAULTS.copies
                    )
                )
            );


        /*
        ------------------------------------------------
        THRESHOLD
        ------------------------------------------------
        */

        const threshold =
            clamp(
                number(
                    options.threshold,
                    DEFAULTS.threshold
                ),
                0,
                255
            );


        /*
        ------------------------------------------------
        RETURN
        ------------------------------------------------
        */

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
                Math.max(
                    0,
                    Math.floor(
                        number(
                            options.x,
                            DEFAULTS.x
                        )
                    )
                ),

            y:
                Math.max(
                    0,
                    Math.floor(
                        number(
                            options.y,
                            DEFAULTS.y
                        )
                    )
                ),

            bitmapMode: 0,

            threshold,

            /*
             * Selalu OFF.
             */

            invert: false,

            transparentIsWhite: true

        };

    }


    /*
    =================================================
    CANVAS VALIDATION
    =================================================
    */

    function validateCanvas(canvas) {

        if (!canvas) {

            throw new Error(
                "TSPL: Canvas tidak ditemukan."
            );

        }


        if (
            typeof canvas.getContext !== "function"
        ) {

            throw new Error(
                "TSPL: Object bukan canvas."
            );

        }


        if (
            !canvas.width ||
            !canvas.height
        ) {

            throw new Error(
                "TSPL: Canvas memiliki ukuran 0."
            );

        }

    }


    /*
    =================================================
    CREATE RASTER CANVAS
    =================================================

    Canvas asli TIDAK disentuh.

    Semua proses dilakukan pada canvas sementara.
    =================================================
    */

    function createRasterCanvas(
        sourceCanvas,
        width,
        height
    ) {

        let raster;


        /*
        ------------------------------------------------
        OFFSCREEN CANVAS
        ------------------------------------------------
        */

        if (
            typeof global.OffscreenCanvas !==
            "undefined"
        ) {

            raster =
                new global.OffscreenCanvas(
                    width,
                    height
                );

        } else {

            raster =
                global.document.createElement(
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
                    willReadFrequently: true
                }
            );


        if (!ctx) {

            throw new Error(
                "TSPL: 2D context tidak tersedia."
            );

        }


        /*
        ------------------------------------------------
        IMPORTANT
        ------------------------------------------------

        Bersihkan canvas terlebih dahulu.

        Kemudian isi PUTIH.

        Ini mencegah:

        transparent -> black
        ------------------------------------------------
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
            width,
            height
        );


        /*
        ------------------------------------------------
        IMAGE SMOOTHING
        ------------------------------------------------
        */

        ctx.imageSmoothingEnabled =
            true;


        try {

            ctx.imageSmoothingQuality =
                "high";

        } catch (error) {}


        /*
        ------------------------------------------------
        COPY SOURCE
        ------------------------------------------------

        Hanya membaca source canvas.

        Tidak ada:

        clearRect(source)
        fillRect(source)
        filter(source)
        invert(source)
        ------------------------------------------------
        */

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
    PIXEL -> BLACK / WHITE
    =================================================
    */

    function pixelToBlack(
        r,
        g,
        b,
        a,
        threshold
    ) {

        /*
        ------------------------------------------------
        TRANSPARENT
        ------------------------------------------------
        */

        if (
            a === 0
        ) {

            return false;

        }


        /*
        ------------------------------------------------
        ALPHA COMPOSITE TO WHITE
        ------------------------------------------------

        Semi transparent black:

        black + white
        =
        gray

        bukan black block.
        ------------------------------------------------
        */

        if (
            a < 255
        ) {

            const alpha =
                a / 255;


            r =
                Math.round(
                    r * alpha +
                    255 * (1 - alpha)
                );


            g =
                Math.round(
                    g * alpha +
                    255 * (1 - alpha)
                );


            b =
                Math.round(
                    b * alpha +
                    255 * (1 - alpha)
                );

        }


        /*
        ------------------------------------------------
        LUMINANCE
        ------------------------------------------------
        */

        const gray =
            (
                0.299 * r +
                0.587 * g +
                0.114 * b
            );


        /*
        ------------------------------------------------
        BLACK
        ------------------------------------------------
        */

        /*
         * Invert sengaja TIDAK dilakukan.
         */

        return gray < threshold;

    }


    /*
    =================================================
    CANVAS -> RAW BITMAP
    =================================================
    */

    function canvasToBitmap(
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
        ------------------------------------------------
        BYTE WIDTH
        ------------------------------------------------

        799 dots / 8

        = 99.875

        ceil = 100 bytes

        Padding:

        100 * 8 = 800 dots

        Dot ke-800 HARUS WHITE.
        ------------------------------------------------
        */

        const bytesPerRow =
            Math.ceil(
                width / 8
            );


        const totalBytes =
            bytesPerRow *
            height;


        const raster =
            createRasterCanvas(
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


        const imageData =
            ctx.getImageData(
                0,
                0,
                width,
                height
            );


        const pixels =
            imageData.data;


        /*
        ------------------------------------------------
        RAW BITMAP
        ------------------------------------------------

        Uint8Array otomatis:

        0 = WHITE
        ------------------------------------------------
        */

        const bitmap =
            new Uint8Array(
                totalBytes
            );


        let blackPixels = 0;


        /*
        =================================================
        RASTER LOOP
        =================================================
        */

        for (
            let y = 0;
            y < height;
            y++
        ) {

            const rowOffset =
                y * bytesPerRow;


            for (
                let x = 0;
                x < width;
                x++
            ) {

                /*
                ------------------------------------------------
                PADDING PROTECTION
                ------------------------------------------------

                Walaupun width berubah suatu saat,
                pixel di luar width tidak pernah diproses.
                ------------------------------------------------
                */

                if (
                    x >= width
                ) {

                    continue;

                }


                const pixelIndex =
                    (
                        y * width +
                        x
                    ) * 4;


                const r =
                    pixels[
                        pixelIndex
                    ];


                const g =
                    pixels[
                        pixelIndex + 1
                    ];


                const b =
                    pixels[
                        pixelIndex + 2
                    ];


                const a =
                    pixels[
                        pixelIndex + 3
                    ];


                const black =
                    pixelToBlack(
                        r,
                        g,
                        b,
                        a,
                        config.threshold
                    );


                if (!black) {

                    continue;

                }


                blackPixels++;


                /*
                ------------------------------------------------
                BYTE INDEX
                ------------------------------------------------
                */

                const byteIndex =
                    rowOffset +
                    Math.floor(
                        x / 8
                    );


                /*
                ------------------------------------------------
                MSB FIRST
                ------------------------------------------------

                x 0 -> bit 7
                x 1 -> bit 6
                x 2 -> bit 5
                ...
                x 7 -> bit 0
                ------------------------------------------------
                */

                const bit =
                    7 -
                    (x % 8);


                bitmap[
                    byteIndex
                ] |=
                    (1 << bit);

            }


            /*
            ------------------------------------------------
            FORCE LAST BYTE PADDING WHITE
            ------------------------------------------------

            799 dots menggunakan:

            bit 7 ... bit 1

            pada byte terakhir.

            bit 0 = padding.

            Pastikan bit 0 selalu 0.
            ------------------------------------------------
            */

            if (
                width % 8 !== 0
            ) {

                const lastByte =
                    rowOffset +
                    bytesPerRow -
                    1;


                const validBits =
                    width % 8;


                const mask =
                    0xFF <<
                    (8 - validBits);


                bitmap[
                    lastByte
                ] &=
                    mask;

            }

        }


        const totalPixels =
            width *
            height;


        const blackRatio =
            totalPixels > 0
                ? blackPixels / totalPixels
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
    TSPL HEADER
    =================================================
    */

    function buildHeader(config) {

        return [

            `SIZE ${config.widthMM} mm,${config.heightMM} mm`,

            `GAP ${config.gap} mm,0`,

            `DENSITY ${config.density}`,

            `SPEED ${config.speed}`,

            "CLS"

        ].join("\r\n");

    }


    /*
    =================================================
    BITMAP COMMAND
    =================================================
    */

    function buildBitmapCommand(
        bitmapData,
        config
    ) {

        const command =
            `BITMAP ${config.x},${config.y},` +
            `${bitmapData.bytesPerRow},` +
            `${bitmapData.height},` +
            `0,`;


        return {

            command,

            data:
                bitmapData.bitmap

        };

    }


    /*
    =================================================
    PRINT COMMAND
    =================================================
    */

    function buildPrintCommand(config) {

        return (
            `PRINT ${config.copies},1`
        );

    }


    /*
    =================================================
    BUILD JOB
    =================================================
    */

    function buildJob(
        sourceCanvas,
        options = {}
    ) {

        const config =
            getPrinterConfig(
                options
            );


        /*
        ------------------------------------------------
        VALIDATION
        ------------------------------------------------
        */

        if (
            config.widthDots !==
            TARGET.widthDots ||
            config.heightDots !==
            TARGET.heightDots
        ) {

            console.warn(
                "TSPL: Target raster:",
                config.widthDots,
                "x",
                config.heightDots
            );

        }


        /*
        ------------------------------------------------
        CANVAS -> BITMAP
        ------------------------------------------------
        */

        const bitmap =
            canvasToBitmap(
                sourceCanvas,
                config
            );


        /*
        =================================================
        BLACK BLOCK PROTECTION
        =================================================

        Jangan kirim label jika bitmap benar-benar
        hampir seluruhnya hitam.

        Ini bukan transformasi canvas.

        Hanya safety check.
        =================================================
        */

        if (
            bitmap.blackRatio >= 0.98
        ) {

            throw new Error(
                "TSPL: Bitmap terdeteksi " +
                (bitmap.blackRatio * 100).toFixed(2) +
                "% hitam. " +
                "Job dibatalkan untuk mencegah " +
                "label menjadi blok hitam."
            );

        }


        /*
        ------------------------------------------------
        HEADER
        ------------------------------------------------
        */

        const header =
            buildHeader(
                config
            );


        /*
        ------------------------------------------------
        BITMAP
        ------------------------------------------------
        */

        const bitmapCommand =
            buildBitmapCommand(
                bitmap,
                config
            );


        /*
        ------------------------------------------------
        PRINT
        ------------------------------------------------
        */

        const printCommand =
            buildPrintCommand(
                config
            );


        /*
        ------------------------------------------------
        PREFIX
        ------------------------------------------------

        TSPL command + separator.

        Setelah comma pada BITMAP command,
        langsung masuk raw bitmap.
        ------------------------------------------------
        */

        const prefix =
            header +
            "\r\n" +
            bitmapCommand.command;


        /*
        ------------------------------------------------
        SUFFIX
        ------------------------------------------------
        */

        const suffix =
            "\r\n" +
            printCommand +
            "\r\n";


        /*
        ------------------------------------------------
        ENCODE COMMAND ONLY
        ------------------------------------------------

        Bitmap TIDAK di-encode.

        Bitmap tetap raw Uint8Array.
        ------------------------------------------------
        */

        const encoder =
            new TextEncoder();


        const prefixBytes =
            encoder.encode(
                prefix
            );


        const suffixBytes =
            encoder.encode(
                suffix
            );


        /*
        ------------------------------------------------
        TOTAL
        ------------------------------------------------
        */

        const totalLength =
            prefixBytes.length +
            bitmap.bitmap.length +
            suffixBytes.length;


        /*
        ------------------------------------------------
        FINAL RAW JOB
        ------------------------------------------------
        */

        const output =
            new Uint8Array(
                totalLength
            );


        let offset = 0;


        output.set(
            prefixBytes,
            offset
        );


        offset +=
            prefixBytes.length;


        output.set(
            bitmap.bitmap,
            offset
        );


        offset +=
            bitmap.bitmap.length;


        output.set(
            suffixBytes,
            offset
        );


        /*
        ------------------------------------------------
        RESULT
        ------------------------------------------------
        */

        return {

            data: output,

            config,

            bitmap,

            prefix,

            suffix,

            prefixBytes,

            suffixBytes

        };

    }


    /*
    =================================================
    FROM CANVAS
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
    RAW TRANSPORT
    =================================================
    */

    async function sendRaw(data) {

        if (
            !(data instanceof Uint8Array)
        ) {

            if (
                data instanceof ArrayBuffer
            ) {

                data =
                    new Uint8Array(
                        data
                    );

            } else {

                throw new Error(
                    "TSPL: Data harus Uint8Array."
                );

            }

        }


        /*
        =================================================
        1. Printer Manager
        =================================================
        */

        if (
            typeof global.Printer !==
            "undefined" &&
            global.Printer
        ) {

            if (
                typeof global.Printer.printRaw ===
                "function"
            ) {

                return await global.Printer.printRaw(
                    data
                );

            }


            if (
                typeof global.Printer.sendRaw ===
                "function"
            ) {

                return await global.Printer.sendRaw(
                    data
                );

            }


            if (
                typeof global.Printer.send ===
                "function"
            ) {

                return await global.Printer.send(
                    data
                );

            }


            if (
                typeof global.Printer.write ===
                "function"
            ) {

                return await global.Printer.write(
                    data
                );

            }

        }


        /*
        =================================================
        2. PrinterManager
        =================================================
        */

        if (
            typeof global.PrinterManager !==
            "undefined" &&
            global.PrinterManager
        ) {

            if (
                typeof global.PrinterManager.printRaw ===
                "function"
            ) {

                return await global.PrinterManager.printRaw(
                    data
                );

            }


            if (
                typeof global.PrinterManager.sendRaw ===
                "function"
            ) {

                return await global.PrinterManager.sendRaw(
                    data
                );

            }


            if (
                typeof global.PrinterManager.send ===
                "function"
            ) {

                return await global.PrinterManager.send(
                    data
                );

            }


            if (
                typeof global.PrinterManager.write ===
                "function"
            ) {

                return await global.PrinterManager.write(
                    data
                );

            }

        }


        /*
        =================================================
        3. Bluetooth
        =================================================
        */

        if (
            typeof global.Bluetooth !==
            "undefined" &&
            global.Bluetooth
        ) {

            if (
                typeof global.Bluetooth.sendRaw ===
                "function"
            ) {

                return await global.Bluetooth.sendRaw(
                    data
                );

            }


            if (
                typeof global.Bluetooth.writeRaw ===
                "function"
            ) {

                return await global.Bluetooth.writeRaw(
                    data
                );

            }


            if (
                typeof global.Bluetooth.send ===
                "function"
            ) {

                return await global.Bluetooth.send(
                    data
                );

            }


            if (
                typeof global.Bluetooth.write ===
                "function"
            ) {

                return await global.Bluetooth.write(
                    data
                );

            }

        }


        throw new Error(
            "TSPL: Tidak ditemukan RAW transport."
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


        return await sendRaw(
            job.data
        );

    }


    /*
    =================================================
    INSPECT
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


        return {

            version:
                VERSION,

            target: {
                widthMM:
                    TARGET.widthMM,

                heightMM:
                    TARGET.heightMM,

                dpi:
                    TARGET.dpi,

                widthDots:
                    TARGET.widthDots,

                heightDots:
                    TARGET.heightDots,

                bytesPerRow:
                    TARGET.bytesPerRow
            },

            config:
                job.config,

            widthDots:
                job.bitmap.width,

            heightDots:
                job.bitmap.height,

            bytesPerRow:
                job.bitmap.bytesPerRow,

            bitmapBytes:
                job.bitmap.totalBytes,

            blackPixels:
                job.bitmap.blackPixels,

            totalPixels:
                job.bitmap.totalPixels,

            blackRatio:
                job.bitmap.blackRatio,

            blackPercent:
                (
                    job.bitmap.blackRatio *
                    100
                ).toFixed(2) + "%",

            prefix:
                job.prefix,

            suffix:
                job.suffix,

            dataSize:
                job.data.length

        };

    }


    /*
    =================================================
    TEST
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


        console.log(
            "========================================"
        );


        console.log(
            "SmartPrint TSPL Engine v" +
            VERSION
        );


        console.log(
            "========================================"
        );


        console.log(
            "Target:",
            TARGET.widthMM +
            " x " +
            TARGET.heightMM +
            " mm"
        );


        console.log(
            "DPI:",
            TARGET.dpi
        );


        console.log(
            "Dots:",
            info.widthDots +
            " x " +
            info.heightDots
        );


        console.log(
            "Bytes / Row:",
            info.bytesPerRow
        );


        console.log(
            "Bitmap:",
            info.bitmapBytes,
            "bytes"
        );


        console.log(
            "Black:",
            info.blackPercent
        );


        console.log(
            "Threshold:",
            info.config.threshold
        );


        console.log(
            "Invert:",
            info.config.invert
        );


        console.log(
            "Bitmap Mode:",
            info.config.bitmapMode
        );


        console.log(
            "Data:",
            info.dataSize,
            "bytes"
        );


        console.log(
            "========================================"
        );


        return info;

    }


    /*
    =================================================
    PUBLIC API
    =================================================
    */

    const API = {

        version:
            VERSION,

        target:
            TARGET,

        defaults:
            DEFAULTS,

        getSettings,

        getPrinterConfig,

        createRasterCanvas,

        canvasToBitmap,

        buildHeader,

        buildBitmapCommand,

        buildPrintCommand,

        buildJob,

        fromCanvas,

        sendRaw,

        print,

        inspect,

        test

    };


    /*
    =================================================
    GLOBAL EXPORT
    =================================================

    IMPORTANT:

    Jangan:

    const TSPL = ...

    Kita hanya assign ke window/global.
    =================================================
    */

    global.TSPL =
        API;


    /*
    Compatibility aliases
    */

    global.TSPL_ENGINE =
        API;


    global.TSPLPrinter =
        API;


    /*
    =================================================
    READY
    =================================================
    */

    console.log(
        "SmartPrint TSPL Engine v" +
        VERSION +
        " Ready"
    );


    console.log(
        "Target: 100 x 150 mm | " +
        "203 DPI | " +
        "799 x 1199 dots"
    );


    console.log(
        "Bitmap: RAW Uint8Array | " +
        "MSB FIRST | Mode 0"
    );


})(window);
