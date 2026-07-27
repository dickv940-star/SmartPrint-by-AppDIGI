/*
=========================================================
SMARTPRINT V5
Input Manager
=========================================================
*/

"use strict";

export default class InputManager {

    constructor(designer) {

        this.designer = designer;

        this.canvas = designer.canvas;

        this.mouse = {

            x: 0,
            y: 0,

            down: false,

            button: 0

        };

        this.init();

    }

    //-----------------------------------------------------
    // INIT
    //-----------------------------------------------------

    init() {

        this.canvas.addEventListener(

            "mousedown",

            this.pointerDown.bind(this)

        );

        window.addEventListener(

            "mousemove",

            this.pointerMove.bind(this)

        );

        window.addEventListener(

            "mouseup",

            this.pointerUp.bind(this)

        );

        this.canvas.addEventListener(

            "wheel",

            this.wheel.bind(this),

            { passive:false }

        );

    }

    //-----------------------------------------------------
    // POINTER DOWN
    //-----------------------------------------------------

    pointerDown(e){

        this.updateMouse(e);

        this.mouse.down = true;

        if(this.designer.selectionTool){

            this.designer.selectionTool.pointerDown(this.mouse);

        }

        if(this.designer.transformTool){

            this.designer.transformTool.pointerDown(this.mouse);

        }

    }

    //-----------------------------------------------------
    // POINTER MOVE
    //-----------------------------------------------------

    pointerMove(e){

        this.updateMouse(e);

        if(this.designer.transformTool){

            this.designer.transformTool.pointerMove(this.mouse);

        }

    }

    //-----------------------------------------------------
    // POINTER UP
    //-----------------------------------------------------

    pointerUp(e){

        this.updateMouse(e);

        this.mouse.down = false;

        if(this.designer.transformTool){

            this.designer.transformTool.pointerUp(this.mouse);

        }

    }

    //-----------------------------------------------------
    // WHEEL
    //-----------------------------------------------------

    wheel(e){

        // nanti zoom

    }

    //-----------------------------------------------------
    // UPDATE
    //-----------------------------------------------------

    updateMouse(e){

        const rect = this.canvas.getBoundingClientRect();

        this.mouse.x =

            (e.clientX - rect.left - this.designer.offsetX)

            / this.designer.zoom;

        this.mouse.y =

            (e.clientY - rect.top - this.designer.offsetY)

            / this.designer.zoom;

        this.mouse.button = e.button;

    }

}
