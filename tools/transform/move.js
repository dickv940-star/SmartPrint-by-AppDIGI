/*
=========================================================
SMARTPRINT V5
Move Tool
=========================================================
*/

"use strict";

export default class MoveTool {

    constructor(designer){

        this.designer = designer;

        this.dragging = false;

        this.startMouse = null;

        this.startPosition = null;

    }

    pointerDown(mouse){

        const obj = this.designer.scene.activeObject;

        if(!obj) return false;

        if(!obj.containsPoint(mouse.x, mouse.y))
            return false;

        this.dragging = true;

        this.startMouse = {

            x: mouse.x,
            y: mouse.y

        };

        this.startPosition = {

            x: obj.x,
            y: obj.y

        };

        return true;

    }

    pointerMove(mouse){

        if(!this.dragging)
            return;

        const obj = this.designer.scene.activeObject;

        if(!obj)
            return;

        obj.x =
            this.startPosition.x +
            (mouse.x - this.startMouse.x);

        obj.y =
            this.startPosition.y +
            (mouse.y - this.startMouse.y);

        this.designer.invalidate();

    }

    pointerUp(){

        this.dragging = false;

    }

}
