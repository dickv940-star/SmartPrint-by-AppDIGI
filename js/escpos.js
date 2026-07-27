/*
=========================================================
ESC/POS Engine
=========================================================
*/

"use strict";

const ESCPrinter={

    async print(canvas){

        console.log("ESC Print");

        let img=

        canvas.getContext("2d")

        .getImageData(

            0,

            0,

            canvas.width,

            canvas.height

        );

        let bytes=

        this.imageToRaster(img);

        await BluetoothManager.write(bytes);

    },

    imageToRaster(image){

        return new Uint8Array([]);

    }

};
