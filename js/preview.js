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

    updateSize() {

        let w = 800;
        let h = 1200;

        if (typeof Settings !== "undefined") {

            w = Settings.get("canvasWidth") || 800;
            h = Settings.get("canvasHeight") || 1200;

        }

        this.canvas.width = w;
        this.canvas.height = h;

        this.render();

    },

    bind() {

        this.canvas.addEventListener("mousedown", e => {

            this.dragging = true;

            this.startX = e.clientX;
            this.startY = e.clientY;

        });

        window.addEventListener("mouseup", () => {

            this.dragging = false;

        });

        window.addEventListener("mousemove", e => {

            if (!this.dragging) return;

            this.posX += e.clientX - this.startX;
            this.posY += e.clientY - this.startY;

            this.startX = e.clientX;
            this.startY = e.clientY;

            this.render();

        });

        this.canvas.addEventListener("wheel", e => {

            e.preventDefault();

            if (e.deltaY < 0)
                this.zoomIn();
            else
                this.zoomOut();

        });

    },

    loadImage(file) {

        const img = new Image();

        img.onload = () => {

            this.image = img;

            this.fit();

        };

        img.onerror = () => {

            alert("Gagal membuka gambar");

        };

        img.src = URL.createObjectURL(file);

    },

    setImage(img) {

        this.image = img;

        this.fit();

    },

    setCanvas(sourceCanvas) {

        const img = new Image();

        img.onload = () => {

            this.image = img;

            this.fit();

        };

        img.src = sourceCanvas.toDataURL("image/png");

    },

    fit() {

        if (!this.image) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        this.scale = Math.min(

            cw / this.image.width,

            ch / this.image.height

        ) * 0.95;

        this.rotation = 0;

        this.posX = 0;
        this.posY = 0;

        this.render();

    },

    zoomIn() {

        this.scale *= 1.1;

        this.render();

    },

    zoomOut() {

        this.scale *= 0.9;

        this.render();

    },

    rotateLeft() {

        this.rotation -= 90;

        this.render();

    },

    rotateRight() {

        this.rotation += 90;

        this.render();

    },

    reset() {

        this.fit();

    },

    clear() {

        this.ctx.clearRect(

            0,
            0,
            this.canvas.width,
            this.canvas.height

        );

    },

    render() {

        if (!this.ctx) return;

        this.clear();

        if (!this.image) return;

        this.ctx.save();

        this.ctx.translate(

            this.canvas.width / 2 + this.posX,

            this.canvas.height / 2 + this.posY

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

    getCanvas() {

        return this.canvas;

    }

};

window.Preview = Preview;
