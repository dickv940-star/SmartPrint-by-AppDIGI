"use strict";

console.log("SmartPrint TSPL Bluetooth Loaded");


let printerDevice = null;
let printerServer = null;
let printerWrite = null;


// =======================================
// TSPL SERVICE
// =======================================

const TSPL_SERVICES = [

    "000018f0-0000-1000-8000-00805f9b34fb",

    "0000ffe0-0000-1000-8000-00805f9b34fb",

    "49535343-fe7d-4ae5-8fa9-9fafd205e455"

];


const TSPL_CHARACTERISTICS = [

    "00002af1-0000-1000-8000-00805f9b34fb",

    "0000ffe1-0000-1000-8000-00805f9b34fb",

    "49535343-8841-43f4-a8d4-ecbe34729bb3"

];



// =======================================
// CONNECT TSPL PRINTER
// =======================================

async function connectPrinter(){


    const status =
    document.getElementById("status");


    try{


        status.innerHTML =
        "🔍 Scan TSPL Printer...";


        printerDevice =
        await navigator.bluetooth.requestDevice({

            acceptAllDevices:true,

            optionalServices:
            TSPL_SERVICES

        });



        printerDevice.addEventListener(
            "gattserverdisconnected",
            disconnectEvent
        );



        status.innerHTML =
        "🔄 Connecting...";



        printerServer =
        await printerDevice.gatt.connect();



        const services =
        await printerServer.getPrimaryServices();



        for(
            const service of services
        ){


            console.log(
                "SERVICE:",
                service.uuid
            );


            const chars =
            await service.getCharacteristics();



            for(
                const char of chars
            ){


                console.log(
                    "CHAR:",
                    char.uuid,
                    char.properties
                );



                if(
                    char.properties.write ||
                    char.properties.writeWithoutResponse
                ){


                    printerWrite = char;


                    break;


                }


            }



            if(printerWrite)
                break;


        }



        if(!printerWrite){


            throw new Error(
                "TSPL Write Characteristic tidak ditemukan"
            );


        }



        localStorage.setItem(
            "TSPL_Printer",
            printerDevice.name
        );



        status.innerHTML =
        "🟢 TSPL Printer Connected";



        console.log(
            "CONNECTED:",
            printerDevice.name
        );



        return true;



    }


    catch(error){


        console.error(
            error
        );


        status.innerHTML =
        "❌ Bluetooth Error";


        return false;


    }


}



// =======================================
// SEND TSPL DATA
// =======================================

async function sendTSPL(command){



    if(
        !printerWrite
    ){

        throw new Error(
            "Printer belum connect"
        );

    }



    const encoder =
    new TextEncoder();



    const data =
    encoder.encode(command);



    const chunkSize =
    180;



    for(
        let i=0;
        i<data.length;
        i+=chunkSize
    ){


        const chunk =
        data.slice(
            i,
            i+chunkSize
        );



        if(
            printerWrite.properties
            .writeWithoutResponse
        ){


            await printerWrite
            .writeValueWithoutResponse(
                chunk
            );


        }
        else{


            await printerWrite
            .writeValue(
                chunk
            );


        }



        await new Promise(
            r=>setTimeout(r,20)
        );


    }



    console.log(
        "TSPL SENT"
    );


}



// =======================================
// DISCONNECT
// =======================================

function disconnectEvent(){


    console.log(
        "TSPL Printer Disconnect"
    );


    printerWrite=null;
    printerServer=null;


    const status =
    document.getElementById("status");


    if(status)
        status.innerHTML =
        "🔴 Printer Disconnect";


}



// =======================================
// TEST TSPL
// =======================================

async function testTSPL(){


    const tspl = `

SIZE 58 mm,40 mm

GAP 3 mm,0

CLS

TEXT 50,50,"3",0,1,1,"SMARTPRINT"

BARCODE 50,100,"128",80,1,0,2,2,"123456"

PRINT 1

`;


    await sendTSPL(tspl);


}


window.connectPrinter =
connectPrinter;


window.sendTSPL =
sendTSPL;


window.testTSPL =
testTSPL;
