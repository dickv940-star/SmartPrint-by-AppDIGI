/*
=========================================================
SmartPrint by AppDIGI
Preview Engine v3.0
=========================================================
*/

"use strict";

const Preview = {

    canvas: null,
    ctx: null,

    image: null,

    scale: 1,
    rotation: 0,

    posX: 0,
    posY: 0,

    dragging: false,

    startX: 0,
    startY: 0,

    //-----------------------------------
    // INIT
    //-----------------------------------

    init() {

        const area = document.getElementById("preview");

        if (!area) return;

        area.innerHTML = "";

        this.canvas = document.createElement("canvas");

        this.canvas.id = "previewCanvas";

        this.ctx = this.canvas.getContext("2d");

        area.appendChild(this.canvas);

        this.updateSize();

        this.bind();

    },

    //-----------------------------------
    // UPDATE SIZE
    //-----------------------------------

    updateSize() {

        let width = 800;
        let height = 1200;

        if (typeof Settings !== "undefined") {

            width = Settings.get("canvasWidth") || 800;

            height = Settings.get("canvasHeight") || 1200;

        }

        this.canvas.width = width;

        this.canvas.height = height;

        this.render();

    },

    //-----------------------------------
    // BIND EVENTS
    //-----------------------------------

    bind() {

        this.canvas.addEventListener("mousedown", (e) => {

            this.dragging = true;

            this.startX = e.clientX;

            this.startY = e.clientY;

        });

        window.addEventListener("mouseup", () => {

            this.dragging = false;

        });

        window.addEventListener("mousemove", (e) => {

            if (!this.dragging) return;

            this.posX += e.clientX - this.startX;

            this.posY += e.clientY - this.startY;

            this.startX = e.clientX;

            this.startY = e.clientY;

            this.render();

        });

        this.canvas.addEventListener("wheel", (e) => {

            e.preventDefault();

            if (e.deltaY < 0) {

                this.zoomIn();

            } else {

                this.zoomOut();

            }

        });

    },

    //-----------------------------------
    // UPDATE ZOOM LABEL
    //-----------------------------------

    updateZoomLabel() {

        const zoom = document.getElementById("zoomValue");

        if (!zoom) return;

        zoom.textContent = Math.round(this.scale * 100) + "%";

    },
        //-----------------------------------
    // LOAD IMAGE
    //-----------------------------------

    loadImage(file) {

        if (!file) return;

        const img = new Image();

        img.onload = () => {

            this.image = img;

            this.fit();

        };

        img.onerror = () => {

            alert("Gagal membuka gambar.");

        };

        img.src = URL.createObjectURL(file);

    },

    //-----------------------------------
    // SET IMAGE
    //-----------------------------------

    setImage(img) {

        if (!img) return;

        this.image = img;

        this.fit();

    },

    //-----------------------------------
    // SET CANVAS (UNTUK PDF)
    //-----------------------------------

    setCanvas(sourceCanvas) {

        if (!sourceCanvas) return;

        const img = new Image();

        img.onload = () => {

            this.image = img;

            this.fit();

        };

        img.src = sourceCanvas.toDataURL("image/png");

    },

    //-----------------------------------
    // FIT TO PAGE
    //-----------------------------------

    fit() {

        if (!this.image) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        const scaleX = cw / this.image.width;
        const scaleY = ch / this.image.height;

        this.scale = Math.min(scaleX, scaleY) * 0.95;

        this.rotation = 0;

        this.posX = 0;
        this.posY = 0;

        this.render();

        this.updateZoomLabel();

    },

    //-----------------------------------
    // CLEAR CANVAS
    //-----------------------------------

    clear() {

        this.ctx.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

    },

    //-----------------------------------
    // RENDER
    //-----------------------------------

    render() {

        if (!this.ctx) return;

        this.clear();

        if (!this.image) return;

        this.ctx.save();

        this.ctx.translate(
            (this.canvas.width / 2) + this.posX,
            (this.canvas.height / 2) + this.posY
        );

        this.ctx.rotate(
            this.rotation * Math.PI / 180
        );

        this.ctx.scale(
            this.scale,
            this.scale
        );

        this.ctx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2
        );

        this.ctx.restore();

    },
        //-----------------------------------
    // ZOOM IN
    //-----------------------------------

    zoomIn() {

        this.scale *= 1.10;

        if (this.scale > 10)
            this.scale = 10;

        this.render();

        this.updateZoomLabel();

    },

    //-----------------------------------
    // ZOOM OUT
    //-----------------------------------

    zoomOut() {

        this.scale *= 0.90;

        if (this.scale < 0.10)
            this.scale = 0.10;

        this.render();

        this.updateZoomLabel();

    },

    //-----------------------------------
    // ROTATE LEFT
    //-----------------------------------

    rotateLeft() {

        this.rotation -= 90;

        this.render();

    },

    //-----------------------------------
    // ROTATE RIGHT
    //-----------------------------------

    rotateRight() {

        this.rotation += 90;

        this.render();

    },

    //-----------------------------------
    // FIT WIDTH
    //-----------------------------------

    fitWidth() {

        if (!this.image) return;

        this.scale =
            this.canvas.width / this.image.width;

        this.posX = 0;
        this.posY = 0;

        this.render();

        this.updateZoomLabel();

    },

    //-----------------------------------
    // FIT HEIGHT
    //-----------------------------------

    fitHeight() {

        if (!this.image) return;

        this.scale =
            this.canvas.height / this.image.height;

        this.posX = 0;
        this.posY = 0;

        this.render();

        this.updateZoomLabel();

    },

    //-----------------------------------
    // RESET
    //-----------------------------------

    reset() {

        this.fit();

    },

    //-----------------------------------
    // GET IMAGE
    //-----------------------------------

    getImage() {

        return this.image;

    },

    //-----------------------------------
    // GET CANVAS
    //-----------------------------------

    getCanvas() {

        return this.canvas;

    },

    //-----------------------------------
    // EXPORT PNG
    //-----------------------------------

    exportPNG() {

        return this.canvas.toDataURL("image/png");

    },

    //-----------------------------------
    // EXPORT JPEG
    //-----------------------------------

    exportJPEG(quality = 0.95) {

        return this.canvas.toDataURL(
            "image/jpeg",
            quality
        );

    },

    //-----------------------------------
    // CLEAR PREVIEW
    //-----------------------------------

    clearPreview() {

        this.image = null;

        this.posX = 0;
        this.posY = 0;
        this.scale = 1;
        this.rotation = 0;

        this.clear();

        const zoom = document.getElementById("zoomValue");

        if (zoom)
            zoom.textContent = "100%";

    }

};

// Export
window.Preview = Preview;
