/*
=========================================================
SmartPrint by AppDIGI
ESC/POS Engine v2.0
=========================================================
*/


"use strict";


const ESCpos = {



async print(canvas, printer){


console.log(
"ESC/POS Printing..."
);



// Convert canvas menjadi bitmap

let imageData =
canvas
.getContext("2d")
.getImageData(
0,
0,
canvas.width,
canvas.height
);



let command =
this.imageToRaster(
imageData
);





// kirim ke bluetooth

await Bluetooth.send(
command
);



console.log(
"ESC/POS Print Done"
);



},







// =================================
// IMAGE TO ESC/POS RASTER
// =================================


imageToRaster(image){



const width =
image.width;


const height =
image.height;



const bytesPerLine =
Math.ceil(
width / 8
);



let data=[];




// GS v 0

data.push(
0x1D,
0x76,
0x30,
0x00
);



// width

data.push(
bytesPerLine & 0xff,
(bytesPerLine >> 8) & 0xff
);



// height

data.push(
height & 0xff,
(height >> 8) & 0xff
);






for(
let y=0;
y<height;
y++
){



for(
let x=0;
x<width;
x+=8
){


let byte=0;



for(
let bit=0;
bit<8;
bit++
){


let px =
x+bit;



if(px < width){


let index =
(
y * width + px
)
*4;



let r =
image.data[index];


let g =
image.data[index+1];


let b =
image.data[index+2];



// grayscale threshold

let gray =
(
r*0.3+
g*0.59+
b*0.11
);



if(gray < 128){


byte |=
(128 >> bit);


}



}



}



data.push(byte);



}


}





// line feed

data.push(
0x0A
);



return new Uint8Array(
data
);



}





};





window.ESCpos = ESCpos;
