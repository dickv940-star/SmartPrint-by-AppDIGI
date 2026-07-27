/*
=========================================================
SMARTPRINT V5
Select Tool
=========================================================
*/

"use strict";

import BaseTool from "./basetool.js";

export default class SelectTool extends BaseTool {

    constructor(designer) {

        super(designer);

        this.state = "idle";

        this.dragObject = null;

        this.startMouse = null;

        this.startBounds = null;

    }

    //-----------------------------------------------------
    // POINTER DOWN
    //-----------------------------------------------------

    pointerDown(mouse) {

        const obj = this.hitTest(mouse.x, mouse.y);

        if (!obj) {

            this.clearSelection();

            this.designer.invalidate();

            return;

        }

        this.selectObject(obj);

        this.dragObject = obj;

        this.state = "move";

        this.startMouse = {
            x: mouse.x,
            y: mouse.y
        };

        this.startBounds = obj.getBounds();

        this.designer.invalidate();

    }

    //-----------------------------------------------------
    // POINTER MOVE
    //-----------------------------------------------------

    pointerMove(mouse) {

        if (this.state !== "move") {
            return;
        }

        if (!this.dragObject) {
            return;
        }

        const dx = mouse.x - this.startMouse.x;
        const dy = mouse.y - this.startMouse.y;

        this.dragObject.setBounds({

            x: this.startBounds.x + dx,
            y: this.startBounds.y + dy,
            width: this.startBounds.width,
            height: this.startBounds.height

        });

        this.designer.invalidate();

    }

    //-----------------------------------------------------
    // POINTER UP
    //-----------------------------------------------------

    pointerUp() {

        this.state = "idle";

        this.dragObject = null;

    }

    //-----------------------------------------------------
    // HIT TEST
    //-----------------------------------------------------

    hitTest(x, y) {

        const objects = this.designer.scene.objects;

        for (let i = objects.length - 1; i >= 0; i--) {

            const obj = objects[i];

            if (!obj.visible) continue;

            if (obj.locked) continue;

            if (obj.containsPoint(x, y)) {

                return obj;

            }

        }

        return null;

    }

    //-----------------------------------------------------
    // SELECT
    //-----------------------------------------------------

    selectObject(obj) {

        const scene = this.designer.scene;

        scene.selection.length = 0;

        scene.selection.push(obj);

        scene.activeObject = obj;

    }

    //-----------------------------------------------------
    // CLEAR
    //-----------------------------------------------------

    clearSelection() {

        const scene = this.designer.scene;

        scene.selection.length = 0;

        scene.activeObject = null;

    }

}
