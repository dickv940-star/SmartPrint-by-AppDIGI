/*
=========================================================
SmartPrint by AppDIGI
Settings Manager v2.0
=========================================================
*/


"use strict";


const Settings = {


key:"SMARTPRINT_SETTINGS",



data:{


appName:"SmartPrint by AppDIGI",

version:"4.0.0",

language:"id",


theme:"blue",

darkMode:false,

autoSave:true,




// =================
// PRINTER
// =================


printerName:"",

printLanguage:"ESC",


paperWidth:80,

paperHeight:150,


canvasWidth:576,

canvasHeight:1200,


dpi:203,


copies:1,


density:8,


speed:4,


cutPaper:false,


openDrawer:false,


autoConnect:true,




// =================
// LABEL
// =================


labelWidth:100,

labelHeight:150,

gap:2,


marginLeft:0,

marginTop:0,


rotate:0,




// =================
// PREVIEW
// =================


zoom:1,


fitScreen:true,


showGrid:false,


showRuler:true,


snapToGrid:true,




// =================
// BARCODE
// =================


barcodeType:"CODE128",

barcodeWidth:2,

barcodeHeight:80,

barcodeText:true,




// =================
// QR
// =================


qrSize:200,

qrMargin:2,

qrCorrection:"M"


},







load(){



const json =
localStorage.getItem(
this.key
);



if(json){


try{


this.data =
JSON.parse(json);


}


catch(e){


console.error(e);


this.save();


}



}

else{


this.save();


}




},







save(){



localStorage.setItem(

this.key,

JSON.stringify(this.data)

);



},








get(name){


return this.data[name];


},








set(name,value){


this.data[name]=value;


this.save();



this.sync();


},







sync(){



if(
window.Printer
){



Printer.setLanguage(

this.data.printLanguage

);



Printer.setPaper(

this.data.canvasWidth

);



Printer.setDPI(

this.data.dpi

);



Printer.setCopies(

this.data.copies

);



}



},







reset(){



localStorage.removeItem(
this.key
);


location.reload();



},







toggleDarkMode(){



this.data.darkMode =
!this.data.darkMode;


this.save();



},







setTheme(theme){



this.data.theme =
theme;


this.save();


}



};





Settings.load();

Settings.sync();
