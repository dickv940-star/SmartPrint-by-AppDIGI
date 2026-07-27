/*
=========================================================
SMARTPRINT V5
Scene
=========================================================
*/

"use strict";

export default class Scene {

    constructor() {

        this.objects = [];

        this.selection = [];

        this.activeObject = null;

    }

    //-----------------------------------------------------

    add(obj){

        this.objects.push(obj);

        return obj;

    }

    //-----------------------------------------------------

    remove(obj){

        this.objects = this.objects.filter(o=>o!==obj);

        if(this.activeObject===obj){

            this.activeObject = null;

        }

        this.selection =
            this.selection.filter(o=>o!==obj);

    }

    //-----------------------------------------------------

    clear(){

        this.objects.length = 0;

        this.selection.length = 0;

        this.activeObject = null;

    }

}
