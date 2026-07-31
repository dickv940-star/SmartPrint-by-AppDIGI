/*
=========================================================
SmartPrint by AppDIGI
Preview Engine v4.0
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
✓ Drag / Pan
✓ Mouse Wheel Zoom
✓ Reset View
✓ Clear Preview
✓ Export PNG
✓ Export JPEG
✓ Scroll Compatible
=========================================================
*/

"use strict";


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


        // ---------------------------------------------
        // CONTEXT
        // ---------------------------------------------

        this.ctx =
            this.canvas.getContext("2d");


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
            "Preview Engine v4.0 Ready"
        );

    },


    // =================================================
    // UPDATE CANVAS SIZE
    // =================================================

    updateSize() {

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
        // SET CANVAS
        // ---------------------------------------------

        this.canvas.width =
            width;


        this.canvas.height =
            height;


        // ---------------------------------------------
        // RENDER
        // ---------------------------------------------

        this.render();

    },


    // =================================================
    // EVENT BINDING
    // =================================================

    bind() {


        // =================================================
        // MOUSE DOWN
        // =================================================

        this.canvas.addEventListener(
            "mousedown",
            (e) => {

                if (!this.image)
                    return;


                this.dragging = true;


                this.startX =
                    e.clientX;


                this.startY =
                    e.clientY;


                this.canvas.style.cursor =
                    "grabbing";

            }
        );


        // =================================================
        // MOUSE UP
        // =================================================

        window.addEventListener(
            "mouseup",
            () => {

                this.dragging = false;


                if (this.canvas) {

                    this.canvas.style.cursor =
                        "grab";

                }

            }
        );


        // =================================================
        // MOUSE MOVE
        // =================================================

        window.addEventListener(
            "mousemove",
            (e) => {

                if (!this.dragging)
                    return;


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


        // ---------------------------------------------
        // CLEAR PREVIOUS IMAGE
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


            this.fit();

        };


        img.src =
            sourceCanvas.toDataURL(
                "image/png"
            );

    },


    // =================================================
    // GET IMAGE DIMENSION
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


        const cw =
            this.canvas.width;


        const ch =
            this.canvas.height;


        const iw =
            this.getImageWidth();


        const ih =
            this.getImageHeight();


        if (!iw || !ih)
            return;


        // ---------------------------------------------
        // SCALE X
        // ---------------------------------------------

        const scaleX =
            cw / iw;


        // ---------------------------------------------
        // SCALE Y
        // ---------------------------------------------

        const scaleY =
            ch / ih;


        // ---------------------------------------------
        // FIT
        // ---------------------------------------------

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
        // RESET POSITION
        // ---------------------------------------------

        this.posX = 0;

        this.posY = 0;


        // ---------------------------------------------
        // RESET ROTATION
        // ---------------------------------------------

        this.rotation = 0;


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


        // ---------------------------------------------
        // IMPORTANT
        // ---------------------------------------------
        // Rotation tidak diubah.
        // 100% hanya mengubah zoom.
        // ---------------------------------------------


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


        if (!iw || !ih)
            return;


        // ---------------------------------------------
        // SAVE CONTEXT
        // ---------------------------------------------

        this.ctx.save();


        // ---------------------------------------------
        // CENTER
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
        // DRAW IMAGE
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

        if (this.scale < 0.10) {

            this.scale = 0.10;

        }


        if (this.scale > 10) {

            this.scale = 10;

        }


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


        // ---------------------------------------------
        // IMPORTANT
        // ---------------------------------------------
        // Scale TIDAK diubah.
        // Jadi jika zoom = 100%,
        // setelah rotate tetap 100%.
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Scale tetap.
        // ---------------------------------------------

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
    //
    // Digunakan ketika:
    //
    // Upload file baru
    // Reset workspace
    // Hapus file
    //
    // =================================================

    clearPreview() {

        this.image = null;


        this.posX = 0;

        this.posY = 0;


        this.scale = 1;


        this.rotation = 0;


        this.dragging = false;


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


        return this.canvas.toDataURL(

            "image/jpeg",

            quality

        );

    }

};


// =====================================================
// GLOBAL EXPORT
// =====================================================

window.Preview = Preview;


// =====================================================
// LOG
// =====================================================

console.log(
    "Preview Engine v4.0 Loaded"
);
