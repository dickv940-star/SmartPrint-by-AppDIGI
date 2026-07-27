/*
=========================================================
SmartPrint by AppDIGI
Preview Engine v2.0
=========================================================
*/


"use strict";


const Preview = {


canvas:null,

ctx:null,


image:null,


scale:1,

rotation:0,


posX:0,

posY:0,


dragging:false,





init(){


this.canvas =
document.createElement("canvas");


this.canvas.id =
"previewCanvas";


this.ctx =
this.canvas.getContext("2d");



const area =
document.getElementById(
"preview"
);


if(area){

area.innerHTML="";

area.appendChild(
this.canvas
);

}



this.updateSize();


this.bind();



},







// ==========================
// SIZE FROM SETTINGS
// ==========================


updateSize(){


if(
typeof Settings !== "undefined"
){


this.canvas.width =
Settings.get(
"canvasWidth"
);


this.canvas.height =
Settings.get(
"canvasHeight"
);



}

else{


this.canvas.width=576;

this.canvas.height=800;


}



},







bind(){



this.canvas.addEventListener(
"mousedown",
e=>{


this.dragging=true;


this.startX=e.clientX;

this.startY=e.clientY;


});






window.addEventListener(
"mouseup",
()=>{


this.dragging=false;


});







window.addEventListener(
"mousemove",
e=>{


if(!this.dragging)
return;



this.posX +=
e.clientX-this.startX;


this.posY +=
e.clientY-this.startY;



this.startX=e.clientX;

this.startY=e.clientY;



this.render();



});



},







// ==========================
// LOAD IMAGE
// ==========================


loadImage(file){



const img =
new Image();



img.onload=()=>{


this.image=img;


this.fit();


};



img.src =
URL.createObjectURL(file);



},







fit(){


if(!this.image)
return;



let cw =
this.canvas.width;


let ch =
this.canvas.height;



this.scale =
Math.min(

cw / this.image.width,

ch / this.image.height

);



this.posX=0;

this.posY=0;

this.rotation=0;



this.render();



},







zoomIn(){


this.scale*=1.1;

this.render();


},






zoomOut(){


this.scale*=0.9;

this.render();


},







rotateLeft(){


this.rotation-=90;

this.render();


},






rotateRight(){


this.rotation+=90;

this.render();


},







reset(){


this.fit();


},







render(){



if(!this.image)
return;




this.ctx.clearRect(

0,

0,

this.canvas.width,

this.canvas.height

);





this.ctx.save();



this.ctx.translate(

this.canvas.width/2 + this.posX,

this.canvas.height/2 + this.posY

);





this.ctx.rotate(

this.rotation *
Math.PI / 180

);





this.ctx.scale(

this.scale,

this.scale

);





this.ctx.drawImage(

this.image,

-this.image.width/2,

-this.image.height/2

);





this.ctx.restore();



},







// ==========================
// SEND TO PRINTER
// ==========================


getCanvas(){


return this.canvas;


}



};





window.Preview = Preview;
