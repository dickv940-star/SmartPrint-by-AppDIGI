/*
=========================================================
SMARTPRINT V5
Tool Manager
=========================================================
*/

"use strict";

export default class ToolManager {

    constructor(designer){

        this.designer = designer;

        this.tools = new Map();

        this.activeTool = null;

    }

    //-----------------------------------------------------
    // REGISTER
    //-----------------------------------------------------

    register(name, tool){

        this.tools.set(name, tool);

        return tool;

    }

    //-----------------------------------------------------
    // ACTIVATE
    //-----------------------------------------------------

    activate(name){

        if(this.activeTool){

            this.activeTool.deactivate();

        }

        this.activeTool = this.tools.get(name);

        if(this.activeTool){

            this.activeTool.activate();

        }

    }

    //-----------------------------------------------------
    // EVENTS
    //-----------------------------------------------------

    pointerDown(mouse){

        this.activeTool?.pointerDown(mouse);

    }

    pointerMove(mouse){

        this.activeTool?.pointerMove(mouse);

    }

    pointerUp(mouse){

        this.activeTool?.pointerUp(mouse);

    }

    keyDown(e){

        this.activeTool?.keyDown(e);

    }

    keyUp(e){

        this.activeTool?.keyUp(e);

    }

    wheel(e){

        this.activeTool?.wheel(e);

    }

    drawOverlay(ctx){

        this.activeTool?.drawOverlay(ctx);

    }

}
