'use strict';

const PDFEngine = {

    async load(file) {

        try {

            // Pastikan library tersedia
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library belum dimuat');
            }

            // Worker PDF.js
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            const arrayBuffer = await file.arrayBuffer();

            const pdf = await pdfjsLib.getDocument({
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
