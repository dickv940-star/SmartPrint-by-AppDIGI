/*
=========================================================
RAWbt by AppDIGI
Label Designer v1.0
=========================================================
*/

"use strict";

const LabelDesigner = {

    canvas: null,
    ctx: null,

    width: 100,
    height: 150,
    dpi: 203,

    objects: [],

    selected: -1,

    init() {

        this.canvas = document.createElement("canvas");

        this.canvas.width = 800;
        this.canvas.height = 1200;

        this.ctx = this.canvas.getContext("2d");

        this.bind();

        this.render();

    },

    bind() {

        this.canvas.addEventListener(

            "mousedown",

            e => {

                console.log(e.offsetX, e.offsetY);

            }

        );

    },

    add(object) {

        this.objects.push(object);

        this.render();

    },

    remove(index) {

        this.objects.splice(index,1);

        this.render();

    },

    clear() {

        this.objects = [];

        this.render();

    },

    render() {

        this.ctx.clearRect(

            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        this.ctx.fillStyle="#FFFFFF";

        this.ctx.fillRect(

            0,
            0,
            this.canvas.width,
            this.canvas.height
        );

        for(const obj of this.objects){

            switch(obj.type){

                case "text":

                    this.drawText(obj);

                    break;

                case "barcode":

                    this.drawBarcode(obj);

                    break;

                case "qrcode":

                    this.drawQRCode(obj);

                    break;

                case "image":

                    this.drawImage(obj);

                    break;

                case "line":

                    this.drawLine(obj);

                    break;

                case "rect":

                    this.drawRect(obj);

                    break;

            }

        }

    },

    drawText(obj){

        this.ctx.fillStyle="#000";

        this.ctx.font=

        `${obj.data.fontSize}px Arial`;

        this.ctx.fillText(

            obj.data.text,

            obj.x,

            obj.y

        );

    },

    drawBarcode(obj){

        const canvas=

        BarcodeEngine.generate({

            value:obj.data.value,

            type:obj.data.format,

            displayValue:true

        });

        this.ctx.drawImage(

            canvas,

            obj.x,

            obj.y,

            obj.width,

            obj.height

        );

    },

    drawQRCode(obj){

        QRCodeEngine.generate({

            value:obj.data.value

        }).then(canvas=>{

            this.ctx.drawImage(

                canvas,

                obj.x,

                obj.y,

                obj.width,

                obj.height

            );

        });

    },

    drawImage(obj){

        this.ctx.drawImage(

            obj.data.image,

            obj.x,

            obj.y,

            obj.width,

            obj.height

        );

    },

    drawRect(obj){

        this.ctx.strokeRect(

            obj.x,

            obj.y,

            obj.width,

            obj.height

        );

    },

    drawLine(obj){

        this.ctx.beginPath();

        this.ctx.moveTo(

            obj.x,

            obj.y

        );

        this.ctx.lineTo(

            obj.width,

            obj.height

        );

        this.ctx.stroke();

    }

};
