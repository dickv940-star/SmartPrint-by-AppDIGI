/*
=========================================================
SmartPrint by AppDIGI
Preview Engine v4.0
=========================================================
*/

"use strict";

const Preview = {

    canvas: null,
    ctx: null,

    image: null,

    // =========================================
    // VIEW STATE
    // =========================================

    scale: 1,
    rotation: 0,

    posX: 0,
    posY: 0,

    dragging: false,

    startX: 0,
    startY: 0,

    // =========================================
    // INIT
    // =========================================

    init() {

        const area =
            document.getElementById("preview");

        if (!area) {
            console.warn(
                "Preview area tidak ditemukan."
            );
            return;
        }

        area.innerHTML = "";

        // Pastikan area dapat melakukan scroll
        area.style.overflow = "auto";
        area.style.position = "relative";

        this.canvas =
            document.createElement("canvas");

        this.canvas.id =
            "previewCanvas";

        this.canvas.style.display = "block";

        this.ctx =
            this.canvas.getContext("2d");

        area.appendChild(this.canvas);

        this.updateSize();

        this.bind();

        this.updateZoomLabel();

    },

    // =========================================
    // UPDATE CANVAS SIZE
    // =========================================

    updateSize() {

        let width = 800;
        let height = 1200;

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

        this.canvas.width = width;
        this.canvas.height = height;

        this.render();

    },

    // =========================================
    // EVENTS
    // =========================================

    bind() {

        // -------------------------------
        // MOUSE DOWN
        // -------------------------------

        this.canvas.addEventListener(
            "mousedown",
            (e) => {

                this.dragging = true;

                this.startX =
                    e.clientX;

                this.startY =
                    e.clientY;

                this.canvas.style.cursor =
                    "grabbing";

            }
        );


        // -------------------------------
        // MOUSE UP
        // -------------------------------

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


        // -------------------------------
        // MOUSE MOVE
        // -------------------------------

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


        // -------------------------------
        // WHEEL ZOOM
        // -------------------------------

        this.canvas.addEventListener(
            "wheel",
            (e) => {

                e.preventDefault();

                if (e.deltaY < 0) {

                    this.zoomIn();

                } else {

                    this.zoomOut();

                }

            },
            { passive: false }
        );

    },

    // =========================================
    // ZOOM LABEL
    // =========================================

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

    // =========================================
    // LOAD IMAGE
    // =========================================

    loadImage(file) {

        if (!file)
            return;

        // Bersihkan object lama
        this.clearPreview();

        const img =
            new Image();

        const url =
            URL.createObjectURL(file);

        img.onload = () => {

            this.image = img;

            URL.revokeObjectURL(url);

            // File baru selalu masuk
            // dengan mode FIT
            this.fit();

        };

        img.onerror = () => {

            URL.revokeObjectURL(url);

            alert(
                "Gagal membuka gambar."
            );

        };

        img.src = url;

    },

    // =========================================
    // SET IMAGE
    // =========================================

    setImage(img) {

        if (!img)
            return;

        this.clearPreview();

        this.image = img;

        this.fit();

    },

    // =========================================
    // SET CANVAS
    // PDF
    // =========================================

    setCanvas(sourceCanvas) {

        if (!sourceCanvas)
            return;

        this.clearPreview();

        const img =
            new Image();

        img.onload = () => {

            this.image = img;

            this.fit();

        };

        img.src =
            sourceCanvas.toDataURL(
                "image/png"
            );

    },

    // =========================================
    // FIT TO PAGE
    // =========================================

    fit() {

        if (!this.image)
            return;

        const cw =
            this.canvas.width;

        const ch =
            this.canvas.height;

        const iw =
            this.image.naturalWidth ||
            this.image.width;

        const ih =
            this.image.naturalHeight ||
            this.image.height;

        // =====================================
        // FIT YANG BENAR
        // =====================================

        const scaleX =
            cw / iw;

        const scaleY =
            ch / ih;

        this.scale =
            Math.min(
                scaleX,
                scaleY
            ) * 0.95;

        // Jangan sampai fit menjadi 0
        if (this.scale <= 0) {
            this.scale = 1;
        }

        this.rotation = 0;

        this.posX = 0;
        this.posY = 0;

        this.render();

        this.updateZoomLabel();

    },

    // =========================================
    // ACTUAL SIZE
    // 100% = ORIGINAL IMAGE SIZE
    // =========================================

    actualSize() {

        if (!this.image)
            return;

        this.scale = 1;

        this.posX = 0;
        this.posY = 0;

        this.rotation = 0;

        this.render();

        this.updateZoomLabel();

    },

    // =========================================
    // CLEAR
    // =========================================

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

    // =========================================
    // RENDER
    // =========================================

    render() {

        if (!this.ctx)
            return;

        this.clear();

        if (!this.image)
            return;

        const iw =
            this.image.naturalWidth ||
            this.image.width;

        const ih =
            this.image.naturalHeight ||
            this.image.height;

        this.ctx.save();

        // =====================================
        // CENTER
        // =====================================

        this.ctx.translate(
            (this.canvas.width / 2)
            + this.posX,

            (this.canvas.height / 2)
            + this.posY
        );

        // =====================================
        // ROTATION
        // =====================================

        this.ctx.rotate(
            this.rotation *
            Math.PI /
            180
        );

        // =====================================
        // ZOOM
        // =====================================

        this.ctx.scale(
            this.scale,
            this.scale
        );

        // =====================================
        // IMAGE
        // =====================================

        this.ctx.drawImage(
            this.image,
            -iw / 2,
            -ih / 2,
            iw,
            ih
        );

        this.ctx.restore();

    },

    // =========================================
    // ZOOM IN
    // =========================================

    zoomIn() {

        this.scale *= 1.10;

        if (this.scale > 10)
            this.scale = 10;

        this.render();

        this.updateZoomLabel();

    },

    // =========================================
    // ZOOM OUT
    // =========================================

    zoomOut() {

        this.scale *= 0.90;

        if (this.scale < 0.10)
            this.scale = 0.10;

        this.render();

        this.updateZoomLabel();

    },

    // =========================================
    // SET ZOOM
    // =========================================

    setZoom(percent) {

        percent =
            Number(percent);

        if (!Number.isFinite(percent))
            return;

        this.scale =
            percent / 100;

        if (this.scale < 0.10)
            this.scale = 0.10;

        if (this.scale > 10)
            this.scale = 10;

        this.render();

        this.updateZoomLabel();

    },

    // =========================================
    // ROTATE LEFT
    // =========================================

    rotateLeft() {

        if (!this.image)
            return;

        this.rotation -= 90;

        if (this.rotation <= -360)
            this.rotation = 0;

        this.render();

    },

    // =========================================
    // ROTATE RIGHT
    // =========================================

    rotateRight() {

        if (!this.image)
            return;

        this.rotation += 90;

        if (this.rotation >= 360)
            this.rotation = 0;

        this.render();

    },

    // =========================================
    // FIT WIDTH
    // =========================================

    fitWidth() {

        if (!this.image)
            return;

        const iw =
            this.image.naturalWidth ||
            this.image.width;

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

    // =========================================
    // FIT HEIGHT
    // =========================================

    fitHeight() {

        if (!this.image)
            return;

        const ih =
            this.image.naturalHeight ||
            this.image.height;

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

    // =========================================
    // RESET VIEW
    // =========================================

    reset() {

        if (!this.image) {

            this.clearPreview();

            return;

        }

        this.fit();

    },

    // =========================================
    // CLEAR EVERYTHING
    // =========================================

    clearPreview() {

        this.image = null;

        this.posX = 0;
        this.posY = 0;

        this.scale = 1;

        this.rotation = 0;

        this.clear();

        this.updateZoomLabel();

    },

    // =========================================
    // GET IMAGE
    // =========================================

    getImage() {

        return this.image;

    },

    // =========================================
    // GET CANVAS
    // =========================================

    getCanvas() {

        return this.canvas;

    },

    // =========================================
    // GET ROTATION
    // =========================================

    getRotation() {

        return this.rotation;

    },

    // =========================================
    // GET ZOOM
    // =========================================

    getZoom() {

        return this.scale * 100;

    },

    // =========================================
    // EXPORT PNG
    // =========================================

    exportPNG() {

        return this.canvas.toDataURL(
            "image/png"
        );

    },

    // =========================================
    // EXPORT JPEG
    // =========================================

    exportJPEG(
        quality = 0.95
    ) {

        return this.canvas.toDataURL(
            "image/jpeg",
            quality
        );

    }

};


// =============================================
// EXPORT
// =============================================

window.Preview = Preview;
