/*
=========================================================
RAWbt by AppDIGI
Bluetooth Engine v1.0
=========================================================
*/

"use strict";

const BluetoothManager = {

    device: null,
    server: null,
    service: null,
    characteristic: null,

    SERVICE_UUID: "000018f0-0000-1000-8000-00805f9b34fb",

    async connect() {

        try {

            RAWbt.showToast("Searching Printer...");

            this.device =
                await navigator.bluetooth.requestDevice({

                    acceptAllDevices: true,

                    optionalServices: [
                        this.SERVICE_UUID
                    ]

                });

            this.device.addEventListener(
                "gattserverdisconnected",
                () => {

                    RAWbt.updatePrinterStatus(false);

                    RAWbt.showToast("Printer Disconnected");

                }
            );

            this.server =
                await this.device.gatt.connect();

            this.service =
                await this.server.getPrimaryService(
                    this.SERVICE_UUID
                );

            const chars =
                await this.service.getCharacteristics();

            this.characteristic = chars[0];

            RAWbt.updatePrinterStatus(true);

            RAWbt.showToast(

                this.device.name ||

                "Printer Connected"

            );

        }

        catch(e){

            console.error(e);

            RAWbt.showToast(

                "Connection Failed"

            );

        }

    },

    async disconnect(){

        if(

            this.device &&

            this.device.gatt.connected

        ){

            this.device.gatt.disconnect();

        }

    },

    async write(data){

        if(!this.characteristic){

            RAWbt.showToast(

                "Printer Not Connected"

            );

            return;

        }

        await this.characteristic.writeValue(

            data

        );

    }

};
