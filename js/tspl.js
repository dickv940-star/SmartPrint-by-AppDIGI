/*
=====================================================
 SmartPrint TSPL Engine v5.2
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
 Bitmap      : MSB first
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
 - Canvas hanya dibaca untuk proses print
 - Transparansi dianggap putih
 - Anti-black-block protection
 - Width padding dianggap putih
 - Kompatibel Bluetooth Engine
 - Kompatibel Printer Manager
=====================================================
*/


const TSPL = (() => {

    const VERSION = "5.2";

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

        transparentIsWhite: true

    };


    /*
    =================================================
     INTERNAL HELPERS
    =================================================
    */

    function number(value, fallback = 0) {

        const n = Number(value);

        return Number.isFinite(n) ? n : fallback;

    }


    function clamp(value, min, max) {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }


    function mmToDots(mm, dpi) {

        return Math.round(
            number(mm) * number(dpi) / 25.4
        );

    }


    function getSettings() {

        try {

            if (
                typeof Settings !== "undefined" &&
                Settings
            ) {

                return Settings;

            }

        } catch (e) {}


        try {

            const raw =
                localStorage.getItem(
                    "SMARTPRINT_SETTINGS"
                );

            if (raw) {

                return JSON.parse(raw);

            }

        } catch (e) {}


        return {};

    }


    /*
    =================================================
     PRINTER SETTINGS
    =================================================
    */

    function getPrinterConfig(options = {}) {

        const settings = getSettings();

        const printer =
            settings.printer ||
            settings.Printer ||
            settings;

        const label =
            settings.label ||
            settings.Label ||
            settings;

        const dpi =
            number(
                options.dpi ??
                printer.dpi ??
                settings.dpi,
                DEFAULTS.dpi
            );


        /*
         * User target:
         *
         * 100mm x 150mm
         * 203 DPI
         *
         * 100 / 25.4 * 203
         * = 799.21
         *
         * 150 / 25.4 * 203
         * = 1198.82
         *
         * Rounded:
         * 799 x 1199
         */

        const widthDots =
            number(
                options.widthDots,
                mmToDots(
                    number(
                        options.widthMM ??
                        label.labelWidth ??
                        printer.paperWidth ??
                        DEFAULTS.widthMM
                    ),
                    dpi
                )
            );


        const heightDots =
            number(
                options.heightDots,
                mmToDots(
                    number(
                        options.heightMM ??
                        label.labelHeight ??
                        printer.paperHeight ??
                        DEFAULTS.heightMM
                    ),
                    dpi
                )
            );


        const config = {

            widthMM:
                number(
                    options.widthMM ??
                    label.labelWidth,
                    DEFAULTS.widthMM
                ),

            heightMM:
                number(
                    options.heightMM ??
                    label.labelHeight,
                    DEFAULTS.heightMM
                ),

            dpi,

            widthDots,
            heightDots,

            gap:
                number(
                    options.gap ??
                    label.gap ??
                    printer.gap,
                    DEFAULTS.gap
                ),

            density:
                clamp(
                    number(
                        options.density ??
                        printer.density ??
                        settings.density,
                        DEFAULTS.density
                    ),
                    0,
                    15
                ),

            speed:
                clamp(
                    number(
                        options.speed ??
                        printer.speed ??
                        settings.speed,
                        DEFAULTS.speed
                    ),
                    1,
                    12
                ),

            copies:
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
                ),

            threshold:
                clamp(
                    number(
                        options.threshold,
                        DEFAULTS.threshold
                    ),
                    0,
                    255
                ),

            invert:
                options.invert === true,

            transparentIsWhite:
                options.transparentIsWhite !== false,

            bitmapMode:
                number(
                    options.bitmapMode,
                    DEFAULTS.bitmapMode
                )

        };


        return config;

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
                "TSPL: Object bukan HTMLCanvasElement."
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
     RESAMPLE CANVAS
    =================================================
     IMPORTANT:
     -----------------------------
     Canvas asli TIDAK disentuh.
     Kita membuat Offscreen Canvas /
     Canvas sementara.
    =================================================
    */

    function createRasterCanvas(
        sourceCanvas,
        width,
        height
    ) {

        let canvas = null;


        /*
         * Prefer OffscreenCanvas jika tersedia.
         */

        if (
            typeof OffscreenCanvas !== "undefined"
        ) {

            canvas =
                new OffscreenCanvas(
                    width,
                    height
                );

        } else {

            canvas =
                document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;

        }


        const ctx =
            canvas.getContext("2d", {
                willReadFrequently: true
            });


        if (!ctx) {

            throw new Error(
                "TSPL: Tidak dapat membuat 2D context."
            );

        }


        /*
         * Background printer selalu WHITE.
         *
         * Ini penting agar:
         * - transparansi = putih
         * - PNG transparent = putih
         * - tidak terjadi black background
         */

        ctx.save();

        ctx.fillStyle = "#FFFFFF";

        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        /*
         * Jangan mengubah source canvas.
         *
         * drawImage hanya membaca source.
         */

        ctx.imageSmoothingEnabled = true;

        ctx.imageSmoothingQuality = "high";


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


        return canvas;

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
         * Alpha 0:
         *
         * Transparent dianggap WHITE.
         */

        if (a === 0) {

            return false;

        }


        /*
         * Composite terhadap WHITE.
         *
         * Jadi pixel semi-transparent tidak
         * menghasilkan blok hitam.
         */

        if (a < 255) {

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
         * Luminance.
         *
         * Human eye weighted grayscale.
         */

        const gray =
            (
                0.299 * r +
                0.587 * g +
                0.114 * b
            );


        /*
         * Hitam jika luminance lebih rendah
         * dari threshold.
         */

        let black =
            gray < threshold;


        /*
         * Invert hanya jika explicitly diminta.
         *
         * Default FALSE.
         */

        if (false) {

            black = !black;

        }


        return black;

    }


    /*
    =================================================
     CANVAS -> BITMAP BYTES
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
         * TSPL BITMAP menggunakan BYTE WIDTH.
         *
         * 799 dots:
         *
         * ceil(799 / 8)
         * = 100 bytes
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


        const bitmap =
            new Uint8Array(
                totalBytes
            );


        /*
         * Uint8Array otomatis berisi 0.
         *
         * Dalam TSPL:
         *
         * bit 1 = BLACK
         * bit 0 = WHITE
         *
         * Jadi default 0 = WHITE.
         */

        let blackPixels = 0;


        /*
         * MSB FIRST
         *
         * Pixel pertama:
         * bit 7
         *
         * pixel kedua:
         * bit 6
         *
         * ...
         *
         * pixel kedelapan:
         * bit 0
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

                const pixelIndex =
                    (
                        y * width +
                        x
                    ) * 4;


                const r =
                    pixels[pixelIndex];

                const g =
                    pixels[pixelIndex + 1];

                const b =
                    pixels[pixelIndex + 2];

                const a =
                    pixels[pixelIndex + 3];


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


                const byteIndex =
                    rowOffset +
                    Math.floor(x / 8);


                const bit =
                    7 -
                    (x % 8);


                bitmap[byteIndex] |=
                    (1 << bit);

            }

        }


        /*
         * Statistik untuk debugging.
         */

        const totalPixels =
            width * height;


        const blackRatio =
            totalPixels
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
     BYTE ARRAY -> TSPL HEX STRING
    =================================================
    */

    function bytesToBinaryString(
        bytes
    ) {

        let result = "";

        const CHUNK =
            8192;


        /*
         * Jangan menggunakan:
         *
         * String.fromCharCode(...bytes)
         *
         * karena bitmap label besar dapat
         * menyebabkan stack overflow.
         */

        for (
            let i = 0;
            i < bytes.length;
            i += CHUNK
        ) {

            const end =
                Math.min(
                    i + CHUNK,
                    bytes.length
                );


            for (
                let j = i;
                j < end;
                j++
            ) {

                result +=
                    String.fromCharCode(
                        bytes[j]
                    );

            }

        }


        return result;

    }


    /*
    =================================================
     BINARY STRING -> UINT8 ARRAY
    =================================================
    */

    function toUint8Array(
        binary
    ) {

        if (
            binary instanceof Uint8Array
        ) {

            return binary;

        }


        if (
            binary instanceof ArrayBuffer
        ) {

            return new Uint8Array(
                binary
            );

        }


        const result =
            new Uint8Array(
                binary.length
            );


        for (
            let i = 0;
            i < binary.length;
            i++
        ) {

            result[i] =
                binary.charCodeAt(i) & 0xFF;

        }


        return result;

    }


    /*
    =================================================
     TSPL HEADER
    =================================================
    */

    function buildHeader(
        config
    ) {

        const lines = [];


        /*
         * Label size.
         */

        lines.push(
            `SIZE ${config.widthMM} mm,${config.heightMM} mm`
        );


        /*
         * Gap.
         */

        lines.push(
            `GAP ${config.gap} mm,0`
        );


        /*
         * Density mengikuti Printer.
         */

        lines.push(
            `DENSITY ${config.density}`
        );


        /*
         * Speed mengikuti Printer.
         */

        lines.push(
            `SPEED ${config.speed}`
        );


        /*
         * Clear previous job.
         */

        lines.push(
            "CLS"
        );


        return lines.join("\r\n");

    }


    /*
    =================================================
     TSPL BITMAP COMMAND
    =================================================
    */

    function buildBitmapCommand(
        bitmapData,
        config
    ) {

        const widthBytes =
            bitmapData.bytesPerRow;


        const height =
            bitmapData.height;


        /*
         * TSPL:
         *
         * BITMAP
         * x
         * y
         * width(bytes)
         * height
         * mode
         * data
         *
         * Mode 0:
         * OVERWRITE
         */

        const command =
            `BITMAP ${config.x},${config.y},${widthBytes},${height},${config.bitmapMode},`;


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

    function buildPrintCommand(
        config
    ) {

        return (
            `PRINT ${config.copies},1`
        );

    }


    /*
    =================================================
     BUILD TSPL JOB
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
         * Safety:
         *
         * Jangan mengizinkan ukuran 0.
         */

        if (
            config.widthDots <= 0 ||
            config.heightDots <= 0
        ) {

            throw new Error(
                "TSPL: Ukuran label tidak valid."
            );

        }


        /*
         * Konversi canvas.
         */

        const bitmap =
            canvasToBitmap(
                sourceCanvas,
                config
            );


        /*
         * Prevent accidental full black
         * label.
         *
         * Jika hampir seluruh pixel hitam,
         * kemungkinan canvas/transparency bermasalah.
         *
         * Kita tidak mengubah canvas.
         * Hanya menghentikan job agar printer
         * tidak mencetak label hitam.
         */

        if (
            bitmap.blackRatio >= 0.98
        ) {

            throw new Error(
                "TSPL: Raster terdeteksi hampir seluruhnya hitam. " +
                "Job dibatalkan untuk mencegah label menjadi blok hitam."
            );

        }


        const header =
            buildHeader(
                config
            );


        const bitmapCommand =
            buildBitmapCommand(
                bitmap,
                config
            );


        const printCommand =
            buildPrintCommand(
                config
            );


        /*
         * TSPL job:
         *
         * Header
         * BITMAP
         * Binary bitmap
         * PRINT
         */

        const prefix =
            header +
            "\r\n" +
            bitmapCommand.command;


        const suffix =
            "\r\n" +
            printCommand +
            "\r\n";


        /*
         * Encode ASCII command + raw bitmap.
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


        const totalLength =
            prefixBytes.length +
            bitmap.bitmap.length +
            suffixBytes.length;


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


        return {

            data: output,

            config,

            bitmap,

            prefix,

            suffix

        };

    }


    /*
    =================================================
     BUILD FROM PREVIEW CANVAS
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


        /*
         * Jika Printer Manager tersedia,
         * gunakan API yang tersedia.
         */

        if (
            typeof Printer !== "undefined"
        ) {

            /*
             * printRaw()
             */

            if (
                typeof Printer.printRaw ===
                "function"
            ) {

                return await Printer.printRaw(
                    job.data
                );

            }


            /*
             * send()
             */

            if (
                typeof Printer.send ===
                "function"
            ) {

                return await Printer.send(
                    job.data
                );

            }


            /*
             * write()
             */

            if (
                typeof Printer.write ===
                "function"
            ) {

                return await Printer.write(
                    job.data
                );

            }

        }


        /*
         * SmartPrint Printer Manager v4.1
         */

        if (
            typeof PrinterManager !==
            "undefined"
        ) {

            if (
                typeof PrinterManager.printRaw ===
                "function"
            ) {

                return await PrinterManager.printRaw(
                    job.data
                );

            }


            if (
                typeof PrinterManager.send ===
                "function"
            ) {

                return await PrinterManager.send(
                    job.data
                );

            }


            if (
                typeof PrinterManager.write ===
                "function"
            ) {

                return await PrinterManager.write(
                    job.data
                );

            }

        }


        /*
         * SmartPrint Bluetooth Engine
         */

        if (
            typeof Bluetooth !== "undefined"
        ) {

            if (
                typeof Bluetooth.send ===
                "function"
            ) {

                return await Bluetooth.send(
                    job.data
                );

            }


            if (
                typeof Bluetooth.write ===
                "function"
            ) {

                return await Bluetooth.write(
                    job.data
                );

            }

        }


        throw new Error(
            "TSPL: Tidak ditemukan Printer Manager / Bluetooth transport."
        );

    }


    /*
    =================================================
     DEBUG INFORMATION
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

            version: VERSION,

            config: job.config,

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

            tsplPrefix:
                job.prefix,

            tsplSuffix:
                job.suffix,

            dataSize:
                job.data.length

        };

    }


    /*
    =================================================
     TEST BITMAP
    =================================================
    */

    function test(
        canvas,
        options = {}
    ) {

        try {

            const info =
                inspect(
                    canvas,
                    options
                );


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
                info.config.widthMM,
                "x",
                info.config.heightMM,
                "mm"
            );

            console.log(
                "DPI:",
                info.config.dpi
            );

            console.log(
                "Dots:",
                info.widthDots,
                "x",
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
                "Data:",
                info.dataSize,
                "bytes"
            );

            console.log(
                "===================================="
            );


            return info;

        } catch (error) {

            console.error(
                "TSPL Test Error:",
                error
            );

            throw error;

        }

    }


    /*
    =================================================
     PUBLIC API
    =================================================
    */

    return {

        version: VERSION,

        defaults: DEFAULTS,

        getPrinterConfig,

        createRasterCanvas,

        canvasToBitmap,

        buildHeader,

        buildBitmapCommand,

        buildPrintCommand,

        buildJob,

        fromCanvas,

        print,

        inspect,

        test

    };

})();


/*
=====================================================
 GLOBAL EXPORT
=====================================================
*/

window.TSPL = TSPL;


/*
=====================================================
 COMPATIBILITY ALIASES
=====================================================
*/

window.TSPL_ENGINE = TSPL;
window.TSPLPrinter = TSPL;


/*
=====================================================
 READY LOG
=====================================================
*/

console.log(
    "SmartPrint TSPL Engine v5.2 Ready"
);

console.log(
    "Target: 100 x 150 mm | 203 DPI | 799 x 1199 dots"
);
