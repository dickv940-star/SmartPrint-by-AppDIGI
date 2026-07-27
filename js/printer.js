/*
=========================================================
SmartPrint by AppDIGI
Printer Manager v2.0
=========================================================
*/

"use strict";


const Printer = {


language:"ESC",

paperWidth:576,

dpi:203,

copies:1,

connected:false,





// =================================
// CONNECT
// =================================

async connect(){


try{


await Bluetooth.connect();


this.connected=true;


console.log(
"Printer Connected"
);


return true;


}

catch(error){


console.error(
"Printer Connect Error",
error
);


this.connected=false;


throw error;


}


},







// =================================
// DISCONNECT
// =================================

disconnect(){


if(
Bluetooth.disconnect
){


Bluetooth.disconnect();


}


this.connected=false;


},







// =================================
// PRINT
// =================================


async print(canvas){



if(!this.connected){


throw new Error(
"Printer belum terhubung"
);


}





let result;



switch(this.language){



case "ESC":


result =
await ESCpos.print(
canvas,
this
);


break;





case "TSPL":


result =
await TSPL.print(
canvas,
this
);


break;





case "ZPL":


result =
await ZPL.print(
canvas,
this
);


break;





case "CPCL":


result =
await CPCL.print(
canvas,
this
);


break;





default:


throw new Error(
"Printer language tidak didukung"
);



}






return result;


},







// =================================
// SETTING
// =================================


setLanguage(lang){


this.language =
lang;


},





setPaper(width){


this.paperWidth =
width;


},





setDPI(dpi){


this.dpi =
dpi;


},






setCopies(num){


this.copies =
num;


}



};





window.Printer = Printer;
