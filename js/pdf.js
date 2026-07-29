"use strict";

const PDFEngine = {

    async load(file) {

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        return pdf;
    }

};

window.PDFEngine = PDFEngine;
