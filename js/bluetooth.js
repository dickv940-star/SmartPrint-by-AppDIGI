/*
=========================================================
SmartPrint by AppDIGI
Bluetooth Engine v2.0
=========================================================
*/


"use strict";


const Bluetooth = {


device:null,

server:null,

service:null,

characteristic:null,





SERVICE_UUID:
"000018f0-0000-1000-8000-00805f9b34fb",





// =================================
// CONNECT
// =================================


async connect() {

    try {

        console.log("Searching Printer...");

        this.device = await navigator.bluetooth.requestDevice({

            acceptAllDevices: true,

            optionalServices: [
                this.SERVICE_UUID,
                0xFFE0
            ]

        });

        if (!this.device) {
            return false;
        }

        this.device.addEventListener(
            "gattserverdisconnected",
            () => {
                this.updateStatus(false);
                console.log("Printer Disconnected");
            }
        );

        this.server = await this.device.gatt.connect();

        // coba service utama
        try {

            this.service =
                await this.server.getPrimaryService(
                    this.SERVICE_UUID
                );

        } catch {

            // fallback
            this.service =
                await this.server.getPrimaryService(
                    0xFFE0
                );

        }

        const chars =
            await this.service.getCharacteristics();

        this.characteristic =
            chars.find(c =>
                c.properties.write ||
                c.properties.writeWithoutResponse
            );

        if (!this.characteristic) {

            throw new Error(
                "Write Characteristic tidak ditemukan."
            );

        }

        this.updateStatus(true);

        console.log(
            "Connected:",
            this.device.name
        );

        return true;

    } catch (e) {

        if (e.name === "NotFoundError") {

            console.log(
                "Pemilihan printer dibatalkan."
            );

            return false;

        }

        console.error(
            "Bluetooth Error",
            e
        );

        this.updateStatus(false);

        throw e;

    }

},




// =================================
// SEND DATA
// =================================


async send(data){



if(!this.characteristic){


throw new Error(
"Printer not connected"
);


}




// pecah data untuk printer thermal

const chunk = 180;




for(
let i=0;
i<data.length;
i+=chunk
){


let part =
data.slice(
i,
i+chunk
);



await this.characteristic.writeValue(

part

);



}




},







// =================================
// DISCONNECT
// =================================


disconnect(){



if(

this.device &&

this.device.gatt.connected

){


this.device.gatt.disconnect();


}



},







// =================================
// STATUS
// =================================


updateStatus(connected){



let status =
document.getElementById(
"printerStatus"
);



let dot =
document.querySelector(
".dot"
);





if(status){


status.innerText =

connected ?

"Printer Connected"

:

"No Printer";


}





if(dot){


if(connected)

dot.classList.add(
"connected"
);

else

dot.classList.remove(
"connected"
);


}



}



};





window.Bluetooth = Bluetooth;
