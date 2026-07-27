/*
=========================================================
RAWbt by AppDIGI
QR Code Engine v1.0
=========================================================
*/

"use strict";

const QRCodeEngine = {

    canvas: null,

    init() {

        this.canvas = document.createElement("canvas");

    },

    generate({

        value = "",

        width = 200,

        height = 200,

        margin = 2,

        colorDark = "#000000",

        colorLight = "#FFFFFF",

        correctLevel = QRCode.CorrectLevel.M

    }) {

        this.canvas.width = width;
        this.canvas.height = height;

        QRCode.toCanvas(

            this.canvas,

            value,

            {

                width: width,

                margin: margin,

                color: {

                    dark: colorDark,

                    light: colorLight

                },

                errorCorrectionLevel: correctLevel

            },

            function(error){

                if(error){

                    console.error(error);

                }

            }

        );

        return this.canvas;

    },

    toImage(){

        return this.canvas.toDataURL("image/png");

    },

    download(filename="qrcode.png"){

        const a=document.createElement("a");

        a.href=this.toImage();

        a.download=filename;

        a.click();

    }

};
