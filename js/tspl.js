/*
=========================================================
TSPL Engine
=========================================================
*/

"use strict";

const TSPLPrinter={

    async print(canvas){

        const encoder=

        new TextEncoder();

        let cmd=

`SIZE 100 mm,150 mm
GAP 2 mm,0
CLS
BITMAP 0,0,72,120,1,...data...
PRINT 1
`;

        await BluetoothManager.write(

            encoder.encode(cmd)

        );

    }

};
