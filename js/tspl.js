/*
=========================================================
SmartPrint by AppDIGI
TSPL Engine v2.0
=========================================================
*/


"use strict";


const TSPL = {



async print(canvas, printer){


console.log(
"TSPL Printing..."
);



let bitmap =
this.canvasToBitmap(canvas);





let command =

`SIZE 100 mm,150 mm
GAP 2 mm,0
CLS
${bitmap}
PRINT ${printer.copies}
`;





let data =
new TextEncoder()
.encode(command);





await Bluetooth.send(
data
);



console.log(
"TSPL Print Done"
);



},







// =================================
// CANVAS TO TSPL BITMAP
// =================================


canvasToBitmap(canvas){



let ctx =
canvas.getContext(
"2d"
);



let img =
ctx.getImageData(

0,

0,

canvas.width,

canvas.height

);



let width =
canvas.width;



let height =
canvas.height;



let bytesPerLine =
Math.ceil(
width / 8
);



let bitmap=[];






for(
let y=0;

y<height;

y++

){



let row=[];




for(
let x=0;

x<width;

x+=8

){



let value=0;



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



let gray =
(
img.data[index] * 0.3
+
img.data[index+1] * 0.59
+
img.data[index+2] * 0.11
);




if(gray < 128){


value |=

(1 << (7-bit));


}



}



}



row.push(value);



}



bitmap.push(
...row
);



}





let hex =
bitmap.map(

b =>

b.toString(16)
.padStart(2,"0")

)
.join("");





return (

`BITMAP 0,0,${bytesPerLine},${height},1,${hex}`

);



}





};





window.TSPL = TSPL;
