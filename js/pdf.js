'use strict';

const PDFEngine = {

    async load(file) {

        try {

          const pdfLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];

if (!pdfLib) {
    console.error("window.pdfjsLib =", window.pdfjsLib);
    console.error("window =", window);
    throw new Error("PDF.js library belum dimuat");
}

pdfLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const pdf = await pdfLib.getDocument({
    data: arrayBuffer
}).promise;

            console.log('PDF Pages:', pdf.numPages);

            return pdf;

        } catch (error) {
            console.error('PDF Engine Error:', error);
            throw error;
        }
    }
};
