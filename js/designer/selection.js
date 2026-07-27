/*
=========================================================
SMARTPRINT V5
Selection Engine
=========================================================
*/

"use strict";

export default class SelectionEngine {

    constructor(designer) {

        this.designer = designer;

        this.canvas = designer.canvas;

        this.init();

    }

    //-----------------------------------------------------
    // INIT
    //-----------------------------------------------------

    init() {

        this.canvas.addEventListener(
            "mousedown",
            this.onMouseDown.bind(this)
        );

    }

    //-----------------------------------------------------
    // MOUSE DOWN
    //-----------------------------------------------------

    onMouseDown(e) {

        const point = this.getMousePosition(e);

        const obj = this.hitTest(point.x, point.y);

        this.designer.setActiveObject(obj);

        this.designer.render();

    }

    //-----------------------------------------------------
    // HIT TEST
    //-----------------------------------------------------

    hitTest(x, y) {

        const objects = [...this.designer.objects];

        // Layer paling atas dicek dulu
        objects.sort((a, b) => b.layer - a.layer);

        for (const obj of objects) {

            if (!obj.visible) continue;
            if (obj.locked) continue;

            if (obj.containsPoint(x, y)) {

                return obj;

            }

        }

        return null;

    }

    //-----------------------------------------------------
    // MOUSE POSITION
    //-----------------------------------------------------

    getMousePosition(e) {

        const rect = this.canvas.getBoundingClientRect();

        const d = this.designer;

        return {

            x: (e.clientX - rect.left - d.offsetX) / d.zoom,
            y: (e.clientY - rect.top - d.offsetY) / d.zoom

        };

    }

}
