/*
=========================================================
SmartPrint by AppDIGI
PDF Engine v2.0
=========================================================
*/

"use strict";

const PDFEngine = {

    pdf: null,

    page: 1,

    totalPages: 0,

    zoom: 1,

    rotation: 0,

    async load(file){

        try{

            const buffer = await file.arrayBuffer();

            this.pdf = await pdfjsLib
                .getDocument({
                    data: buffer
                }).promise;

            this.totalPages = this.pdf.numPages;

            this.page = 1;

            await this.render();

        }

        catch(e){

            console.error(e);

            alert("Gagal membuka PDF");

        }

    },

    async render(){

        if(!this.pdf) return;

        const page = await this.pdf.getPage(this.page);

        const viewport = page.getViewport({

            scale:this.zoom,

            rotation:this.rotation

        });

        const canvas = document.createElement("canvas");

        canvas.width = viewport.width;

        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");

        await page.render({

            canvasContext:ctx,

            viewport:viewport

        }).promise;

        Preview.setCanvas(canvas);

    },

    async next(){

        if(this.page>=this.totalPages) return;

        this.page++;

        await this.render();

    },

    async prev(){

        if(this.page<=1) return;

        this.page--;

        await this.render();

    },

    async zoomIn(){

        this.zoom += 0.2;

        await this.render();

    },

    async zoomOut(){

        if(this.zoom<=0.4) return;

        this.zoom -= 0.2;

        await this.render();

    },

    async rotateLeft(){

        this.rotation -= 90;

        await this.render();

    },

    async rotateRight(){

        this.rotation += 90;

        await this.render();

    }

};

window.PDFEngine = PDFEngine;
