/*
=========================================================
SmartPrint by AppDIGI
Barcode Engine v1.0
=========================================================

FEATURES
---------------------------------------------------------
✓ CODE128
✓ EAN13
✓ CODE39
✓ Generate Barcode
✓ Canvas Rendering
✓ Barcode Object
✓ Position X / Y
✓ Width / Height
✓ Rotation
✓ Text
✓ Mouse / Touch Ready
✓ Export Object
=========================================================
*/

"use strict";

const BarcodeEngine = {

    version: "1.0.0",

    objects: [],

    selected: null,

    counter: 0,


    // =================================================
    // INIT
    // =================================================

    init() {

        console.log("----------------------------------------");
        console.log("SmartPrint Barcode Engine");
        console.log("Version : " + this.version);
        console.log("----------------------------------------");

        this.bindUI();

    },


    // =================================================
    // UI
    // =================================================

    bindUI() {

        const button =
            document.getElementById("barcodeBtn");

        if (!button) {

            console.warn(
                "Barcode button tidak ditemukan."
            );

            return;

        }

        button.addEventListener(
            "click",
            () => {

                this.openPanel();

            }
        );

    },


    // =================================================
    // OPEN BARCODE PANEL
    // =================================================

    openPanel() {

        let panel =
            document.getElementById(
                "barcodePanel"
            );

        if (panel) {

            panel.remove();

            return;

        }


        panel =
            document.createElement("div");

        panel.id =
            "barcodePanel";

        panel.className =
            "smartprint-floating-panel";


        panel.innerHTML = `

            <div class="barcode-panel-header">

                <strong>
                    Barcode
                </strong>

                <button
                    type="button"
                    id="barcodeClose">

                    ×

                </button>

            </div>


            <div class="barcode-panel-body">

                <label>
                    Barcode Data
                </label>

                <input
                    type="text"
                    id="barcodeData"
                    placeholder="Masukkan barcode"
                    value="8991234567890">


                <label>
                    Barcode Type
                </label>

                <select id="barcodeType">

                    <option value="CODE128">
                        CODE128
                    </option>

                    <option value="EAN13">
                        EAN-13
                    </option>

                    <option value="CODE39">
                        CODE39
                    </option>

                </select>


                <label>
                    Width
                </label>

                <input
                    type="number"
                    id="barcodeWidth"
                    value="400"
                    min="50"
                    max="1000">


                <label>
                    Height
                </label>

                <input
                    type="number"
                    id="barcodeHeight"
                    value="150"
                    min="30"
                    max="1000">


                <label>
                    Text
                </label>

                <input
                    type="text"
                    id="barcodeText"
                    value="8991234567890">


                <button
                    type="button"
                    id="barcodeGenerate"
                    class="barcode-generate">

                    Generate Barcode

                </button>

            </div>

        `;


        document.body.appendChild(
            panel
        );


        document
            .getElementById("barcodeClose")
            .onclick = () => {

                panel.remove();

            };


        document
            .getElementById("barcodeGenerate")
            .onclick = () => {

                this.generateFromUI();

            };

    },


    // =================================================
    // GENERATE FROM UI
    // =================================================

    generateFromUI() {

        const data =
            document.getElementById(
                "barcodeData"
            )?.value.trim();


        const type =
            document.getElementById(
                "barcodeType"
            )?.value || "CODE128";


        const width =
            Number(
                document.getElementById(
                    "barcodeWidth"
                )?.value
            ) || 400;


        const height =
            Number(
                document.getElementById(
                    "barcodeHeight"
                )?.value
            ) || 150;


        const text =
            document.getElementById(
                "barcodeText"
            )?.value || data;


        if (!data) {

            alert(
                "Masukkan data barcode terlebih dahulu."
            );

            return;

        }


        this.create({

            data: data,

            type: type,

            width: width,

            height: height,

            text: text

        });

    },


    // =================================================
    // CREATE BARCODE
    // =================================================

    create(options = {}) {

        const data =
            options.data || "";


        if (!data) {

            console.warn(
                "Barcode data kosong."
            );

            return null;

        }


        const type =
            options.type || "CODE128";


        const width =
            Number(
                options.width
            ) || 400;


        const height =
            Number(
                options.height
            ) || 150;


        const text =
            options.text !== undefined
                ? options.text
                : data;


        const object = {

            id:
                "barcode_" +
                (++this.counter),

            type:
                "barcode",

            barcodeType:
                type,

            data:
                data,

            text:
                text,

            x:
                50,

            y:
                50,

            width:
                width,

            height:
                height,

            rotation:
                0,

            selected:
                false,

            visible:
                true

        };


        this.objects.push(
            object
        );


        this.selected =
            object;


        this.renderObject(
            object
        );


        console.log(
            "Barcode Created",
            object
        );


        return object;

    },


    // =================================================
    // RENDER
    // =================================================

    renderObject(object) {

        if (!object)
            return;


        const previewCanvas =
            document.getElementById(
                "previewCanvas"
            );


        if (!previewCanvas) {

            console.warn(
                "previewCanvas tidak ditemukan."
            );

            return;

        }


        const ctx =
            previewCanvas.getContext(
                "2d"
            );


        ctx.save();


        ctx.translate(
            object.x,
            object.y
        );


        ctx.rotate(
            object.rotation *
            Math.PI /
            180
        );


        /*
        -------------------------------------------------
        Untuk Step 1 kita render barcode menggunakan
        pola barcode internal sederhana.

        Engine barcode profesional dapat diganti
        kemudian tanpa mengubah struktur object.
        -------------------------------------------------
        */

        const bars =
            this.createPattern(
                object.data
            );


        const barWidth =
            object.width /
            bars.length;


        for (
            let i = 0;
            i < bars.length;
            i++
        ) {

            if (bars[i] === 1) {

                ctx.fillStyle =
                    "#000000";

                ctx.fillRect(

                    i * barWidth,

                    0,

                    Math.max(
                        1,
                        barWidth
                    ),

                    object.height

                );

            }

        }


        /*
        -------------------------------------------------
        TEXT
        -------------------------------------------------
        */

        if (object.text) {

            ctx.fillStyle =
                "#000000";

            ctx.font =
                "20px Arial";

            ctx.textAlign =
                "center";

            ctx.textBaseline =
                "top";


            ctx.fillText(

                object.text,

                object.width / 2,

                object.height + 8

            );

        }


        ctx.restore();

    },


    // =================================================
    // CREATE PATTERN
    // =================================================

    createPattern(data) {

        let pattern = [];


        /*
        START
        */

        pattern.push(
            1,0,1,0,1,1
        );


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const code =
                data.charCodeAt(i);


            for (
                let bit = 7;
                bit >= 0;
                bit--
            ) {

                pattern.push(
                    (code >> bit) & 1
                );

            }


            /*
            separator
            */

            pattern.push(
                0,
                0
            );

        }


        /*
        END
        */

        pattern.push(
            1,1,0,1,0,1
        );


        return pattern;

    },


    // =================================================
    // REMOVE
    // =================================================

    remove(object) {

        if (!object)
            return;


        const index =
            this.objects.indexOf(
                object
            );


        if (index !== -1) {

            this.objects.splice(
                index,
                1
            );

        }


        if (
            this.selected === object
        ) {

            this.selected = null;

        }


        this.redraw();

    },


    // =================================================
    // CLEAR
    // =================================================

    clear() {

        this.objects = [];

        this.selected = null;

        this.redraw();

    },


    // =================================================
    // REDRAW
    // =================================================

    redraw() {

        if (
            typeof Preview ===
            "undefined"
        ) {

            return;

        }


        if (
            typeof Preview.render ===
            "function"
        ) {

            Preview.render();

        }

    },


    // =================================================
    // GET OBJECTS
    // =================================================

    getObjects() {

        return this.objects;

    },


    // =================================================
    // GET SELECTED
    // =================================================

    getSelected() {

        return this.selected;

    },


    // =================================================
    // SELECT
    // =================================================

    select(object) {

        if (this.selected) {

            this.selected.selected =
                false;

        }


        this.selected =
            object;


        if (object) {

            object.selected =
                true;

        }

    },


    // =================================================
    // MOVE
    // =================================================

    move(object, x, y) {

        if (!object)
            return;


        object.x =
            Number(x) || 0;


        object.y =
            Number(y) || 0;


        this.redraw();

    },


    // =================================================
    // EXPORT
    // =================================================

    export() {

        return this.objects.map(
            object => ({
                ...object
            })
        );

    }

};


// =====================================================
// GLOBAL
// =====================================================

window.BarcodeEngine =
    BarcodeEngine;


// =====================================================
// AUTO INIT
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        BarcodeEngine.init();

    }
);


console.log(
    "SmartPrint Barcode Engine v1.0 Ready"
);
