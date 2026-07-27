/*
=================================================
 SmartPrint by AppDIGI
 Main Application Controller
 Version 1.0
=================================================
*/


"use strict";



class SmartPrint {



constructor(){


console.log(
"SmartPrint Starting..."
);



this.zoom = 100;

this.file = null;


this.settings = {

mode:"escpos",

paper:"100x150",

density:8,

copies:1

};



this.init();


}






// =================================
// INIT
// =================================

init(){


this.loadSettings();


this.bindUI();


this.registerServiceWorker();



console.log(
"SmartPrint Ready"
);



}








// =================================
// UI EVENTS
// =================================

bindUI(){



// CONNECT PRINTER

const connectBtn =
document.getElementById(
"connectBtn"
);


if(connectBtn){


connectBtn.onclick = async()=>{


try{


await Printer.connect();



this.setPrinterStatus(
"Printer Connected",
true
);



}

catch(error){


console.error(error);


this.setPrinterStatus(
"Connection Failed",
false
);



}



};


}







// PRINT

const printBtn =
document.getElementById(
"printBtn"
);



if(printBtn){


printBtn.onclick = ()=>{


this.print();


};


}








// FILE INPUT


const fileInput =
document.getElementById(
"fileInput"
);



if(fileInput){


fileInput.onchange =
(e)=>{


this.loadFile(
e.target.files[0]
);


};


}








// MODE


const mode =
document.getElementById(
"printMode"
);



if(mode){


mode.onchange =
()=>{


this.settings.mode =
mode.value;


this.saveSettings();


};


}







// PAPER


const paper =
document.getElementById(
"paperSize"
);



if(paper){


paper.onchange =
()=>{


this.settings.paper =
paper.value;


this.saveSettings();



};


}






// DENSITY


const density =
document.getElementById(
"density"
);



if(density){


density.oninput =
()=>{


this.settings.density =
density.value;


this.saveSettings();


};


}








// COPIES


const copies =
document.getElementById(
"copies"
);



if(copies){


copies.onchange =
()=>{


this.settings.copies =
copies.value;


this.saveSettings();


};


}








// ZOOM


const zoomIn =
document.getElementById(
"zoomIn"
);


const zoomOut =
document.getElementById(
"zoomOut"
);



if(zoomIn){


zoomIn.onclick =
()=>{


this.zoom +=10;

this.updateZoom();


};


}





if(zoomOut){


zoomOut.onclick =
()=>{


this.zoom -=10;


if(this.zoom<20)
this.zoom=20;


this.updateZoom();



};


}




}










// =================================
// FILE PREVIEW
// =================================

loadFile(file){


if(!file)
return;



this.file=file;



const preview =
document.getElementById(
"preview"
);



if(!preview)
return;




if(file.type.startsWith("image")){


const img =
document.createElement(
"img"
);



img.src =
URL.createObjectURL(file);



img.id="previewImage";


preview.innerHTML="";


preview.appendChild(img);



}



else if(file.type==="application/pdf"){


preview.innerHTML =
`
PDF Loaded:
<br>
${file.name}
`;



}



console.log(
"File Loaded",
file.name
);



}









// =================================
// PRINT
// =================================

async print(){



if(!this.file){


alert(
"Silakan pilih file terlebih dahulu"
);


return;


}




let data = {

file:this.file,

mode:this.settings.mode,

paper:this.settings.paper,

density:this.settings.density,

copies:this.settings.copies


};





try{


await Printer.print(data);



console.log(
"Print Success"
);



}

catch(error){


console.error(
"Print Error",
error
);


alert(
"Print gagal"
);



}



}









// =================================
// PRINTER STATUS
// =================================


setPrinterStatus(
text,
connected
){



const status =
document.getElementById(
"printerStatus"
);



if(status){

status.innerText=text;

}




const dot =
document.querySelector(
".dot"
);



if(dot){


if(connected){

dot.classList.add(
"connected"
);


}

else{


dot.classList.remove(
"connected"
);


}



}



}









// =================================
// ZOOM
// =================================


updateZoom(){



const img =
document.getElementById(
"previewImage"
);



const value =
document.getElementById(
"zoomValue"
);



if(value){

value.innerText =
this.zoom+"%";

}



if(img){


img.style.width =
this.zoom+"%";


}



}










// =================================
// SETTINGS STORAGE
// =================================


saveSettings(){


localStorage.setItem(

"smartprint_settings",

JSON.stringify(
this.settings
)

);


}






loadSettings(){



let saved =
localStorage.getItem(
"smartprint_settings"
);



if(saved){


this.settings =
JSON.parse(saved);


console.log(
"Settings Loaded",
this.settings
);



}



}









// =================================
// SERVICE WORKER
// =================================


registerServiceWorker(){



if(
"serviceWorker" in navigator
){


navigator.serviceWorker.register(
"sw.js"
)


.then(()=>{


console.log(
"Service Worker Registered"
);



})

.catch(
err=>
console.error(
"SW Error",
err
)

);



}



}




}








// START APP


window.SmartPrint =
new SmartPrint();
