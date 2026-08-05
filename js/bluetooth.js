console.log("Bluetooth JS Loaded");

// =======================================
// SmartPrint Bluetooth Manager v3
// Windows Native Bluetooth COM
// =======================================


let printerPort = null;
let printerConnected = false;


// =======================================
// INIT
// =======================================

async function initBluetooth(){

    console.log(
        "SmartPrint Bluetooth Native Init"
    );


    await autoConnectPrinter();

}



// =======================================
// AUTO CONNECT
// =======================================

async function autoConnectPrinter(){


    const status =
    document.getElementById("status");


    try{


        status.innerHTML =
        "🔍 Checking Printer...";



        const printers =
        await window.SmartPrint.scanPrinter();



        console.log(
            "Printer List:",
            printers
        );



        let saved =
        localStorage.getItem(
            "SmartPrint_Printer"
        );



        let printer;



        if(saved){

            printer =
            printers.find(
                p =>
                p.path === saved
            );

        }



        if(!printer){


            printer =
            printers.find(
                p =>
                p.manufacturer ||
                p.path
            );


        }



        if(!printer){


            status.innerHTML =
            "⚪ Printer Tidak Ditemukan";


            return;


        }



        printerPort =
        printer.path;



        printerConnected =
        true;



        localStorage.setItem(
            "SmartPrint_Printer",
            printerPort
        );



        status.innerHTML =
        "🟢 Printer Connected : "
        +
        printerPort;



        console.log(
            "CONNECTED",
            printerPort
        );


    }


    catch(e){


        console.error(
            e
        );


        status.innerHTML =
        "❌ Bluetooth Error";


    }


}



// =======================================
// CHECK STATUS
// =======================================

function isPrinterConnected(){

    return printerConnected;

}



// =======================================
// SEND DATA PRINT
// =======================================

async function sendPrinter(data){


    if(!printerConnected){


        alert(
            "Printer belum terhubung"
        );


        return false;

    }



    try{


        await window.SmartPrint.print({

            port:
            printerPort,


            buffer:
            data

        });



        console.log(
            "PRINT SUCCESS"
        );


        return true;



    }

    catch(e){


        console.error(
            e
        );


        alert(
            "Print gagal : "
            +
            e.message
        );


        return false;


    }


}



// =======================================
// DISCONNECT
// =======================================

function disconnectPrinter(){


    printerPort=null;

    printerConnected=false;


    document.getElementById("status")
    .innerHTML=
    "⚪ Disconnect";


}



// =======================================
// COMPATIBILITY
// =======================================

function connectBT(){

    autoConnectPrinter();

}



// =======================================
// START
// =======================================

window.addEventListener(
"DOMContentLoaded",
()=>{

    initBluetooth();

});
