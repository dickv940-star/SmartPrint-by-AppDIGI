/*
=========================================================
RAWbt by AppDIGI
Barcode Engine v1.0
=========================================================
*/

"use strict";

const BarcodeEngine={

    canvas:null,

    defaultType:"CODE128",

    init(){

        this.canvas=document.createElement("canvas");

    },

    generate({

        value,

        type="CODE128",

        width=2,

        height=80,

        displayValue=true,

        fontSize=18,

        margin=10

    }){

        JsBarcode(

            this.canvas,

            value,

            {

                format:type,

                width:width,

                height:height,

                displayValue:displayValue,

                fontSize:fontSize,

                margin:margin,

                background:"#FFFFFF",

                lineColor:"#000000"

            }

        );

        return this.canvas;

    },

    toImage(){

        return this.canvas.toDataURL("image/png");

    },

    download(filename="barcode.png"){

        let a=document.createElement("a");

        a.href=this.toImage();

        a.download=filename;

        a.click();

    }

};
