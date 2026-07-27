/*
=========================================================
SMARTPRINT V5
Renderer Engine
=========================================================
*/

"use strict";

export default class Renderer {

    constructor(designer) {

        this.designer = designer;

    }

    //-----------------------------------------------------
    // MAIN RENDER
    //-----------------------------------------------------

    render() {

        const designer = this.designer;
        const ctx = designer.ctx;
        const canvas = designer.canvas;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // Zoom & Pan
        ctx.translate(designer.offsetX, designer.offsetY);
        ctx.scale(designer.zoom, designer.zoom);

        // Background
        this.drawBackground(ctx);

        // Grid
        if (designer.showGrid) {

            this.drawGrid(ctx);

        }

        // Draw Objects
        for (const obj of designer.objects) {

            if (!obj.visible) continue;

            this.drawObject(ctx, obj);

        }

        ctx.restore();

        // Selection Overlay
        this.drawSelection(ctx);

    }

    //-----------------------------------------------------
    // DRAW OBJECT
    //-----------------------------------------------------

    drawObject(ctx, obj) {

        ctx.save();

        // Position
        ctx.translate(obj.x, obj.y);

        // Rotation
        ctx.rotate(obj.rotation * Math.PI / 180);

        // Scale
        ctx.scale(obj.scaleX, obj.scaleY);

        // Opacity
        ctx.globalAlpha = obj.opacity;

        // Draw
        obj.draw(ctx);

        ctx.restore();

    }

    //-----------------------------------------------------
    // BACKGROUND
    //-----------------------------------------------------

    drawBackground(ctx) {

        // nanti bisa checkerboard
        // atau warna kertas

    }

    //-----------------------------------------------------
    // GRID
    //-----------------------------------------------------

    drawGrid(ctx) {

        const d = this.designer;
        const ctx2 = d.ctx;

        const step = d.gridSize;

        ctx2.beginPath();

        for (let x = 0; x <= d.canvas.width; x += step) {

            ctx2.moveTo(x, 0);
            ctx2.lineTo(x, d.canvas.height);

        }

        for (let y = 0; y <= d.canvas.height; y += step) {

            ctx2.moveTo(0, y);
            ctx2.lineTo(d.canvas.width, y);

        }

        ctx2.strokeStyle = "#eeeeee";
        ctx2.lineWidth = 1;
        ctx2.stroke();

    }

    //-----------------------------------------------------
    // SELECTION
    //-----------------------------------------------------

    drawSelection(ctx) {

        const designer = this.designer;

        for (const obj of designer.selection) {

            ctx.save();

            ctx.strokeStyle = "#2b7cff";
            ctx.lineWidth = 1;

            ctx.strokeRect(

                obj.x,
                obj.y,
                obj.width,
                obj.height

            );

            ctx.restore();

        }

    }

}
