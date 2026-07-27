/*
=========================================================
SMARTPRINT V5
Designer Engine
=========================================================
*/

"use strict";

export default class Designer {

    constructor(canvas) {

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Semua object
        this.objects = [];

        // Object aktif
        this.activeObject = null;

        // Multi Selection
        this.selection = [];

        // Tool aktif
        this.currentTool = "select";

        // Zoom
        this.zoom = 1;

        // Pan
        this.offsetX = 0;
        this.offsetY = 0;

        // Grid
        this.showGrid = true;
        this.gridSize = 10;

        // Snap
        this.snap = true;

        // Engine (diisi nanti)
        this.renderer = null;
        this.selectionEngine = null;
        this.transformEngine = null;
        this.history = null;
        this.layer = null;

    }

    //-----------------------------------------------------
    // OBJECT
    //-----------------------------------------------------

    add(obj) {

        this.objects.push(obj);

        this.sortLayer();

        return obj;

    }

    remove(obj) {

        this.objects = this.objects.filter(o => o !== obj);

        if (this.activeObject === obj) {

            this.activeObject = null;

        }

    }

    clear() {

        this.objects = [];
        this.activeObject = null;
        this.selection = [];

    }

    //-----------------------------------------------------
    // ACTIVE
    //-----------------------------------------------------

    setActiveObject(obj) {

        this.clearSelection();

        this.activeObject = obj;

        if (obj) {

            obj.select();

            this.selection.push(obj);

        }

    }

    clearSelection() {

        this.selection.forEach(o => o.deselect());

        this.selection = [];

        this.activeObject = null;

    }

    //-----------------------------------------------------
    // LAYER
    //-----------------------------------------------------

    sortLayer() {

        this.objects.sort((a, b) => a.layer - b.layer);

    }

    //-----------------------------------------------------
    // FIND
    //-----------------------------------------------------

    findById(id) {

        return this.objects.find(o => o.id === id);

    }

    //-----------------------------------------------------
    // RENDER
    //-----------------------------------------------------

    render() {

        if (this.renderer) {

            this.renderer.render();

        }

    }

}
