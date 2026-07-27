/*
=========================================================
SMARTPRINT V5
Base Object
=========================================================
*/

"use strict";

export default class BaseObject {

    static nextId = 1;

    constructor(type = "object") {

        this.id = BaseObject.nextId++;

        this.type = type;
        this.name = type;

        // Position
        this.x = 50;
        this.y = 50;

        // Size
        this.width = 100;
        this.height = 50;

        // Transform
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;

        // State
        this.visible = true;
        this.locked = false;
        this.selected = false;

        // Layer
        this.layer = 0;

        // Opacity
        this.opacity = 1;

    }

    //-----------------------------------------------------
    // DRAW
    //-----------------------------------------------------

    draw(ctx) {

        // Override

    }

    //-----------------------------------------------------
    // HIT TEST
    //-----------------------------------------------------

    containsPoint(x, y) {

        return (

            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height

        );

    }

    //-----------------------------------------------------
    // MOVE
    //-----------------------------------------------------

    move(dx, dy) {

        this.x += dx;
        this.y += dy;

    }

    //-----------------------------------------------------
    // RESIZE
    //-----------------------------------------------------

    resize(width, height) {

        this.width = width;
        this.height = height;

    }

    //-----------------------------------------------------
    // ROTATE
    //-----------------------------------------------------

    rotate(angle) {

        this.rotation = angle;

    }

    //-----------------------------------------------------
    // SELECT
    //-----------------------------------------------------

    select() {

        this.selected = true;

    }

    deselect() {

        this.selected = false;

    }

    //-----------------------------------------------------
    // SERIALIZE
    //-----------------------------------------------------

    toJSON() {

        return {

            id: this.id,
            type: this.type,
            name: this.name,

            x: this.x,
            y: this.y,

            width: this.width,
            height: this.height,

            rotation: this.rotation,

            scaleX: this.scaleX,
            scaleY: this.scaleY,

            visible: this.visible,
            locked: this.locked,
            selected: this.selected,

            layer: this.layer,

            opacity: this.opacity

        };

    }

    //-----------------------------------------------------
    // RESTORE
    //-----------------------------------------------------

    fromJSON(data) {

        Object.assign(this, data);

    }

}
