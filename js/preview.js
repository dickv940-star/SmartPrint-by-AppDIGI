/*
=========================================================
RAWbt by AppDIGI
Preview Engine v1.0
=========================================================
*/

"use strict";

const Preview = {

    canvas: null,
    ctx: null,

    scale: 1,
    rotation: 0,

    posX: 0,
    posY: 0,

    dragging: false,

    image: null,

    init() {

        this.canvas = document.createElement("canvas");

        this.canvas.id = "previewCanvas";

        this.ctx = this.canvas.getContext("2d");

        document
            .getElementById("preview")
            .appendChild(this.canvas);

        this.bind();

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

    },

    loadImage(file) {

        const img = new Image();

        img.onload = () => {

            this.image = img;

            this.fit();

        };

        img.src = URL.createObjectURL(file);

    },

    fit() {

        if (!this.image) return;

        this.scale = Math.min(

            700 / this.image.width,

            900 / this.image.height

        );

        this.posX = 0;

        this.posY = 0;

        this.rotation = 0;

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

    reset() {

        this.scale = 1;

        this.rotation = 0;

        this.posX = 0;

        this.posY = 0;

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

    render() {

        if (!this.image) return;

        const w = this.image.width;

        const h = this.image.height;

        this.canvas.width = 900;

        this.canvas.height = 900;

        this.ctx.clearRect(

            0,

            0,

            this.canvas.width,

            this.canvas.height

        );

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

            -w / 2,

            -h / 2

        );

        this.ctx.restore();

    }

};
