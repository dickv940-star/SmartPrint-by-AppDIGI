/*
=========================================================
SmartPrint by AppDIGI
Preview Engine v5.0
=========================================================

FEATURES
---------------------------------------------------------
✓ Image Preview
✓ PDF Canvas Preview
✓ Zoom 10% - 1000%
✓ 100% = Original Image Size
✓ Fit Page
✓ Fit Width
✓ Fit Height
✓ Rotate Left 90°
✓ Rotate Right 90°
✓ Drag with Mouse
✓ Drag with Touch / Finger
✓ Drag with Pen / Stylus
✓ Pointer Events
✓ Pointer Capture
✓ Mouse Wheel Zoom
✓ Reset View
✓ Clear Preview
✓ Export PNG
✓ Export JPEG
✓ Scroll Compatible
✓ Touch Compatible
=========================================================
*/

"use strict";

console.log("Preview Engine v5.0 Loaded");


const Preview = {

    // =================================================
    // CORE
    // =================================================

    canvas: null,

    ctx: null,

    image: null,


    // =================================================
    // VIEW STATE
    // =================================================

    scale: 1,

    rotation: 0,

    posX: 0,

    posY: 0,


    // =================================================
    // DRAG STATE
    // =================================================

    dragging: false,

    pointerId: null,

    startX: 0,

    startY: 0,


    // =================================================
    // INIT
    // =================================================

    init() {

        const area =
            document.getElementById("preview");


        if (!area) {

            console.warn(
                "Preview area tidak ditemukan."
            );

            return;

        }


        // ---------------------------------------------
        // CLEAR OLD PREVIEW
        // ---------------------------------------------

        area.innerHTML = "";


        // ---------------------------------------------
        // PREVIEW AREA
        // ---------------------------------------------

        area.style.position = "relative";

        area.style.overflow = "auto";

        area.style.touchAction = "none";


        // ---------------------------------------------
        // CREATE CANVAS
        // ---------------------------------------------

        this.canvas =
            document.createElement("canvas");


        this.canvas.id =
            "previewCanvas";


        this.canvas.style.display =
            "block";


        this.canvas.style.cursor =
            "grab";


        /*
        IMPORTANT

        Agar touch tidak dianggap sebagai
        scroll oleh browser.
        */

        this.canvas.style.touchAction =
            "none";


        this.canvas.style.userSelect =
            "none";


        this.canvas.style.webkitUserSelect =
            "none";


        // ---------------------------------------------
        // CONTEXT
        // ---------------------------------------------

        this.ctx =
            this.canvas.getContext("2d");


        if (!this.ctx) {

            console.error(
                "Canvas 2D Context tidak tersedia."
            );

            return;

        }


        // ---------------------------------------------
        // IMAGE QUALITY
        // ---------------------------------------------

        this.ctx.imageSmoothingEnabled = true;

        this.ctx.imageSmoothingQuality = "high";


        // ---------------------------------------------
        // ADD CANVAS
        // ---------------------------------------------

        area.appendChild(
            this.canvas
        );


        // ---------------------------------------------
        // SIZE
        // ---------------------------------------------

        this.updateSize();


        // ---------------------------------------------
        // EVENTS
        // ---------------------------------------------

        this.bind();


        // ---------------------------------------------
        // ZOOM LABEL
        // ---------------------------------------------

        this.updateZoomLabel();


        console.log(
            "Preview Engine v5.0 Ready"
        );

    },


    // =================================================
    // UPDATE CANVAS SIZE
    // =================================================

    updateSize() {

        if (!this.canvas)
            return;


        let width = 800;

        let height = 1200;


        // ---------------------------------------------
        // READ SETTINGS
        // ---------------------------------------------

        if (
            typeof Settings !== "undefined" &&
            typeof Settings.get === "function"
        ) {

            width =
                Number(
                    Settings.get("canvasWidth")
                ) || 800;


            height =
                Number(
                    Settings.get("canvasHeight")
                ) || 1200;

        }


        // ---------------------------------------------
        // SAFETY
        // ---------------------------------------------

        width =
            Math.max(
                1,
                Math.round(width)
            );


        height =
            Math.max(
                1,
                Math.round(height)
            );


        // ---------------------------------------------
        // SET CANVAS
        // ---------------------------------------------

        this.canvas.width =
            width;


        this.canvas.height =
            height;


        // ---------------------------------------------
        // CSS SIZE
        // ---------------------------------------------

        this.canvas.style.width =
            width + "px";


        this.canvas.style.height =
            height + "px";


        // ---------------------------------------------
        // CONTEXT
        // ---------------------------------------------

        if (this.ctx) {

            this.ctx.imageSmoothingEnabled =
                true;

            this.ctx.imageSmoothingQuality =
                "high";

        }


        // ---------------------------------------------
        // RENDER
        // ---------------------------------------------

        this.render();

    },


    // =================================================
    // EVENT BINDING
    // =================================================

    bind() {

        if (!this.canvas)
            return;


        // =================================================
        // POINTER DOWN
        // Mouse / Touch / Pen
        // =================================================

        this.canvas.addEventListener(
            "pointerdown",
            (e) => {

                if (!this.image)
                    return;


                /*
                Hanya pointer utama.
                */

                if (
                    e.isPrimary === false
                ) {

                    return;

                }


                e.preventDefault();


                this.dragging = true;

                this.pointerId =
                    e.pointerId;


                this.startX =
                    e.clientX;


                this.startY =
                    e.clientY;


                // -----------------------------------------
                // POINTER CAPTURE
                // -----------------------------------------

                try {

                    this.canvas.setPointerCapture(
                        e.pointerId
                    );

                }

                catch (error) {

                    console.warn(
                        "Pointer capture gagal.",
                        error
                    );

                }


                this.canvas.style.cursor =
                    "grabbing";

            },
            {
                passive: false
            }
        );


        // =================================================
        // POINTER MOVE
        // =================================================

        this.canvas.addEventListener(
            "pointermove",
            (e) => {

                if (!this.dragging)
                    return;


                if (
                    this.pointerId !==
                    e.pointerId
                ) {

                    return;

                }


                e.preventDefault();


                const dx =
                    e.clientX -
                    this.startX;


                const dy =
                    e.clientY -
                    this.startY;


                this.posX += dx;

                this.posY += dy;


                this.startX =
                    e.clientX;


                this.startY =
                    e.clientY;


                this.render();

            },
            {
                passive: false
            }
        );


        // =================================================
        // POINTER UP
        // =================================================

        this.canvas.addEventListener(
            "pointerup",
            (e) => {

                this.stopDragging(
                    e.pointerId
                );

            }
        );


        // =================================================
        // POINTER CANCEL
        // =================================================

        this.canvas.addEventListener(
            "pointercancel",
            (e) => {

                this.stopDragging(
                    e.pointerId
                );

            }
        );


        // =================================================
        // POINTER LEAVE
        // =================================================

        this.canvas.addEventListener(
            "pointerleave",
            (e) => {

                /*
                Jangan langsung stop dragging.

                Dengan pointer capture,
                pointer masih bisa terus
                mengikuti gerakan di luar canvas.
                */

                if (!this.dragging)
                    return;

            }
        );


        // =================================================
        // WHEEL ZOOM
        // =================================================

        this.canvas.addEventListener(
            "wheel",
            (e) => {

                if (!this.image)
                    return;


                e.preventDefault();


                if (e.deltaY < 0) {

                    this.zoomIn();

                }

                else {

                    this.zoomOut();

                }

            },
            {
                passive: false
            }
        );

    },


    // =================================================
    // STOP DRAGGING
    // =================================================

    stopDragging(pointerId = null) {

        if (
            pointerId !== null &&
            this.pointerId !== null &&
            pointerId !== this.pointerId
        ) {

            return;

        }


        this.dragging = false;


        // ---------------------------------------------
        // RELEASE POINTER
        // ---------------------------------------------

        if (
            this.canvas &&
            this.pointerId !== null
        ) {

            try {

                if (
                    this.canvas.hasPointerCapture(
                        this.pointerId
                    )
                ) {

                    this.canvas.releasePointerCapture(
                        this.pointerId
                    );

                }

            }

            catch (error) {

                // Ignore
            }

        }


        this.pointerId = null;


        // ---------------------------------------------
        // CURSOR
        // ---------------------------------------------

        if (this.canvas) {

            this.canvas.style.cursor =
                "grab";

        }

    },


    // =================================================
    // UPDATE ZOOM LABEL
    // =================================================

    updateZoomLabel() {

        const zoom =
            document.getElementById(
                "zoomValue"
            );


        if (!zoom)
            return;


        zoom.textContent =
            Math.round(
                this.scale * 100
            ) + "%";

    },


    // =================================================
    // LOAD IMAGE
    // =================================================

    loadImage(file) {

        if (!file)
            return;


        if (
            !file.type ||
            !file.type.startsWith("image/")
        ) {

            console.warn(
                "File bukan image:",
                file.type
            );

            return;

        }


        // ---------------------------------------------
        // CLEAR PREVIOUS
        // ---------------------------------------------

        this.clearPreview();


        // ---------------------------------------------
        // CREATE IMAGE
        // ---------------------------------------------

        const img =
            new Image();


        const objectURL =
            URL.createObjectURL(file);


        // ---------------------------------------------
        // IMAGE LOADED
        // ---------------------------------------------

        img.onload = () => {

            this.image =
                img;


            URL.revokeObjectURL(
                objectURL
            );


            console.log(
                "Preview Image:",
                img.naturalWidth,
                "x",
                img.naturalHeight
            );


            // -----------------------------------------
            // FIT NEW FILE
            // -----------------------------------------

            this.fit();

        };


        // ---------------------------------------------
        // ERROR
        // ---------------------------------------------

        img.onerror = () => {

            URL.revokeObjectURL(
                objectURL
            );


            console.error(
                "Gagal membuka gambar."
            );


            alert(
                "Gagal membuka gambar."
            );

        };


        img.src =
            objectURL;

    },


    // =================================================
    // SET IMAGE
    // =================================================

    setImage(img) {

        if (!img)
            return;


        this.clearPreview();


        this.image =
            img;


        this.fit();

    },


    // =================================================
    // SET CANVAS
    // PDF
    // =================================================

    setCanvas(sourceCanvas) {

        if (!sourceCanvas)
            return;


        this.clearPreview();


        const img =
            new Image();


        img.onload = () => {

            this.image =
                img;


            console.log(
                "Preview Canvas Loaded:",
                img.naturalWidth,
                "x",
                img.naturalHeight
            );


            this.fit();

        };


        img.onerror = () => {

            console.error(
                "Gagal membuat image dari canvas."
            );

        };


        img.src =
            sourceCanvas.toDataURL(
                "image/png"
            );

    },


    // =================================================
    // GET IMAGE WIDTH
    // =================================================

    getImageWidth() {

        if (!this.image)
            return 0;


        return (
            this.image.naturalWidth ||
            this.image.width ||
            0
        );

    },


    // =================================================
    // GET IMAGE HEIGHT
    // =================================================

    getImageHeight() {

        if (!this.image)
            return 0;


        return (
            this.image.naturalHeight ||
            this.image.height ||
            0
        );

    },


    // =================================================
    // FIT TO PAGE
    // =================================================

    fit() {

        if (!this.image)
            return;


        if (!this.canvas)
            return;


        const cw =
            this.canvas.width;


        const ch =
            this.canvas.height;


        const iw =
            this.getImageWidth();


        const ih =
            this.getImageHeight();


        if (
            !iw ||
            !ih ||
            !cw ||
            !ch
        ) {

            return;

        }


        // ---------------------------------------------
        // SCALE
        // ---------------------------------------------

        const scaleX =
            cw / iw;


        const scaleY =
            ch / ih;


        this.scale =
            Math.min(
                scaleX,
                scaleY
            ) * 0.95;


        // ---------------------------------------------
        // SAFETY
        // ---------------------------------------------

        if (
            !Number.isFinite(
                this.scale
            ) ||
            this.scale <= 0
        ) {

            this.scale = 1;

        }


        // ---------------------------------------------
        // LIMIT
        // ---------------------------------------------

        this.scale =
            Math.max(
                0.10,
                Math.min(
                    10,
                    this.scale
                )
            );


        // ---------------------------------------------
        // RESET POSITION
        // ---------------------------------------------

        this.posX = 0;

        this.posY = 0;


        // ---------------------------------------------
        // RESET ROTATION
        // ---------------------------------------------

        this.rotation = 0;


        // ---------------------------------------------
        // STOP DRAG
        // ---------------------------------------------

        this.stopDragging();


        // ---------------------------------------------
        // RENDER
        // ---------------------------------------------

        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // ACTUAL SIZE
    // 100% = ORIGINAL IMAGE
    // =================================================

    actualSize() {

        if (!this.image)
            return;


        this.scale = 1;


        this.posX = 0;

        this.posY = 0;


        /*
        Rotation tidak diubah.

        100% hanya mengubah zoom.
        */


        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // CLEAR CANVAS
    // =================================================

    clear() {

        if (!this.ctx)
            return;


        this.ctx.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

    },


    // =================================================
    // RENDER
    // =================================================

    render() {

        if (!this.ctx)
            return;


        // ---------------------------------------------
        // CLEAR
        // ---------------------------------------------

        this.clear();


        // ---------------------------------------------
        // NO IMAGE
        // ---------------------------------------------

        if (!this.image)
            return;


        const iw =
            this.getImageWidth();


        const ih =
            this.getImageHeight();


        if (
            !iw ||
            !ih
        ) {

            return;

        }


        // ---------------------------------------------
        // SAVE
        // ---------------------------------------------

        this.ctx.save();


        // ---------------------------------------------
        // CENTER + POSITION
        // ---------------------------------------------

        this.ctx.translate(

            (this.canvas.width / 2)
            + this.posX,

            (this.canvas.height / 2)
            + this.posY

        );


        // ---------------------------------------------
        // ROTATION
        // ---------------------------------------------

        this.ctx.rotate(

            this.rotation *
            Math.PI /
            180

        );


        // ---------------------------------------------
        // ZOOM
        // ---------------------------------------------

        this.ctx.scale(

            this.scale,

            this.scale

        );


        // ---------------------------------------------
        // IMAGE
        // ---------------------------------------------

        this.ctx.drawImage(

            this.image,

            -iw / 2,

            -ih / 2,

            iw,

            ih

        );


        // ---------------------------------------------
        // RESTORE
        // ---------------------------------------------

        this.ctx.restore();

    },


    // =================================================
    // ZOOM IN
    // =================================================

    zoomIn() {

        if (!this.image)
            return;


        this.scale *= 1.10;


        if (this.scale > 10) {

            this.scale = 10;

        }


        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // ZOOM OUT
    // =================================================

    zoomOut() {

        if (!this.image)
            return;


        this.scale *= 0.90;


        if (this.scale < 0.10) {

            this.scale = 0.10;

        }


        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // SET ZOOM
    // =================================================

    setZoom(percent) {

        if (!this.image)
            return;


        percent =
            Number(percent);


        if (
            !Number.isFinite(
                percent
            )
        ) {

            return;

        }


        this.scale =
            percent / 100;


        // ---------------------------------------------
        // LIMIT
        // ---------------------------------------------

        this.scale =
            Math.max(
                0.10,
                Math.min(
                    10,
                    this.scale
                )
            );


        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // ROTATE LEFT
    // =================================================

    rotateLeft() {

        if (!this.image)
            return;


        this.rotation -= 90;


        if (this.rotation < 0) {

            this.rotation += 360;

        }


        this.render();

    },


    // =================================================
    // ROTATE RIGHT
    // =================================================

    rotateRight() {

        if (!this.image)
            return;


        this.rotation += 90;


        if (this.rotation >= 360) {

            this.rotation -= 360;

        }


        this.render();

    },


    // =================================================
    // SET ROTATION
    // =================================================

    setRotation(degrees) {

        if (!this.image)
            return;


        degrees =
            Number(degrees);


        if (
            !Number.isFinite(
                degrees
            )
        ) {

            return;

        }


        this.rotation =
            degrees % 360;


        if (this.rotation < 0) {

            this.rotation += 360;

        }


        this.render();

    },


    // =================================================
    // FIT WIDTH
    // =================================================

    fitWidth() {

        if (!this.image)
            return;


        const iw =
            this.getImageWidth();


        if (!iw)
            return;


        this.scale =
            this.canvas.width /
            iw;


        this.scale =
            Math.max(
                0.10,
                Math.min(
                    10,
                    this.scale
                )
            );


        this.posX = 0;

        this.posY = 0;


        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // FIT HEIGHT
    // =================================================

    fitHeight() {

        if (!this.image)
            return;


        const ih =
            this.getImageHeight();


        if (!ih)
            return;


        this.scale =
            this.canvas.height /
            ih;


        this.scale =
            Math.max(
                0.10,
                Math.min(
                    10,
                    this.scale
                )
            );


        this.posX = 0;

        this.posY = 0;


        this.render();


        this.updateZoomLabel();

    },


    // =================================================
    // RESET VIEW
    // =================================================

    reset() {

        if (!this.image) {

            this.clearPreview();

            return;

        }


        this.fit();

    },


    // =================================================
    // CLEAR PREVIEW
    // =================================================

    clearPreview() {

        this.stopDragging();


        this.image = null;


        this.posX = 0;

        this.posY = 0;


        this.scale = 1;


        this.rotation = 0;


        this.clear();


        this.updateZoomLabel();


        // ---------------------------------------------
        // RESET SCROLL
        // ---------------------------------------------

        const area =
            document.getElementById(
                "preview"
            );


        if (area) {

            area.scrollLeft = 0;

            area.scrollTop = 0;

        }

    },


    // =================================================
    // GET IMAGE
    // =================================================

    getImage() {

        return this.image;

    },


    // =================================================
    // GET CANVAS
    // =================================================

    getCanvas() {

        return this.canvas;

    },


    // =================================================
    // GET ZOOM
    // =================================================

    getZoom() {

        return (
            this.scale * 100
        );

    },


    // =================================================
    // GET ROTATION
    // =================================================

    getRotation() {

        return this.rotation;

    },


    // =================================================
    // GET POSITION
    // =================================================

    getPosition() {

        return {

            x: this.posX,

            y: this.posY

        };

    },


    // =================================================
    // SET POSITION
    // =================================================

    setPosition(x, y) {

        x = Number(x);

        y = Number(y);


        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {

            return;

        }


        this.posX = x;

        this.posY = y;


        this.render();

    },


    // =================================================
    // MOVE
    // =================================================

    move(dx, dy) {

        dx = Number(dx);

        dy = Number(dy);


        if (
            !Number.isFinite(dx) ||
            !Number.isFinite(dy)
        ) {

            return;

        }


        this.posX += dx;

        this.posY += dy;


        this.render();

    },


    // =================================================
    // EXPORT PNG
    // =================================================

    exportPNG() {

        if (!this.canvas)
            return null;


        return this.canvas.toDataURL(
            "image/png"
        );

    },


    // =================================================
    // EXPORT JPEG
    // =================================================

    exportJPEG(
        quality = 0.95
    ) {

        if (!this.canvas)
            return null;


        quality =
            Number(quality);


        if (
            !Number.isFinite(
                quality
            )
        ) {

            quality = 0.95;

        }


        quality =
            Math.max(
                0,
                Math.min(
                    1,
                    quality
                )
            );


        return this.canvas.toDataURL(

            "image/jpeg",

            quality

        );

    }

};


// =====================================================
// GLOBAL EXPORT
// =====================================================

window.Preview =
    Preview;


// =====================================================
// LOG
// =====================================================

console.log(
    "Preview Engine v5.0 Loaded"
);
