/*
=========================================================
RAWbt by AppDIGI
PDF Engine v1.0
=========================================================
*/

"use strict";

const PDFViewer = {

    pdf: null,

    page: 1,

    totalPages: 0,

    zoom: 1,

    rotation: 0,

    canvas: null,

    ctx: null,

    async init(){

        this.canvas=document.getElementById("previewCanvas");

        this.ctx=this.canvas.getContext("2d");

    },

    async open(file){

        const data=await file.arrayBuffer();

        this.pdf=await pdfjsLib.getDocument({

            data:data

        }).promise;

        this.totalPages=this.pdf.numPages;

        this.page=1;

        this.render();

    },

    async render(){

        if(!this.pdf) return;

        const page=

        await this.pdf.getPage(this.page);

        const viewport=

        page.getViewport({

            scale:this.zoom,

            rotation:this.rotation

        });

        this.canvas.width=

        viewport.width;

        this.canvas.height=

        viewport.height;

        await page.render({

            canvasContext:this.ctx,

            viewport:viewport

        }).promise;

    },

    next(){

        if(this.page>=this.totalPages)

            return;

        this.page++;

        this.render();

    },

    prev(){

        if(this.page<=1)

            return;

        this.page--;

        this.render();

    },

    zoomIn(){

        this.zoom+=0.2;

        this.render();

    },

    zoomOut(){

        if(this.zoom<=0.4)

            return;

        this.zoom-=0.2;

        this.render();

    },

    rotateLeft(){

        this.rotation-=90;

        this.render();

    },

    rotateRight(){

        this.rotation+=90;

        this.render();

    },

    fitWidth(){

        this.zoom=1;

        this.render();

    },

    fitHeight(){

        this.zoom=0.8;

        this.render();

    }

};
