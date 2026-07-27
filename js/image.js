/*
=========================================================
RAWbt by AppDIGI
Image Engine v1.0
=========================================================
*/

"use strict";

const ImageEngine = {

    image: null,

    canvas: null,

    ctx: null,

    width: 0,

    height: 0,

    brightness: 0,

    contrast: 0,

    threshold: 128,

    grayscale: false,

    invert: false,

    async init(){

        this.canvas=document.getElementById("previewCanvas");

        this.ctx=this.canvas.getContext("2d");

    },

    async open(file){

        return new Promise((resolve)=>{

            const img=new Image();

            img.onload=()=>{

                this.image=img;

                this.width=img.width;

                this.height=img.height;

                this.render();

                resolve();

            };

            img.src=URL.createObjectURL(file);

        });

    },

    render(){

        if(!this.image) return;

        this.canvas.width=this.width;

        this.canvas.height=this.height;

        this.ctx.clearRect(0,0,this.width,this.height);

        this.ctx.drawImage(

            this.image,

            0,

            0,

            this.width,

            this.height

        );

        this.process();

    },

    process(){

        let img=this.ctx.getImageData(

            0,

            0,

            this.canvas.width,

            this.canvas.height

        );

        let d=img.data;

        let factor=(259*(this.contrast+255))/

                   (255*(259-this.contrast));

        for(let i=0;i<d.length;i+=4){

            let r=d[i];
            let g=d[i+1];
            let b=d[i+2];

            r+=this.brightness;
            g+=this.brightness;
            b+=this.brightness;

            r=factor*(r-128)+128;
            g=factor*(g-128)+128;
            b=factor*(b-128)+128;

            if(this.grayscale){

                let gray=

                0.299*r+

                0.587*g+

                0.114*b;

                r=g=b=gray;

            }

            if(this.invert){

                r=255-r;
                g=255-g;
                b=255-b;

            }

            let avg=(r+g+b)/3;

            avg=avg>this.threshold?

                255:0;

            d[i]=avg;
            d[i+1]=avg;
            d[i+2]=avg;

        }

        this.ctx.putImageData(img,0,0);

    },

    setBrightness(v){

        this.brightness=v;

        this.render();

    },

    setContrast(v){

        this.contrast=v;

        this.render();

    },

    setThreshold(v){

        this.threshold=v;

        this.render();

    },

    toggleGray(){

        this.grayscale=

        !this.grayscale;

        this.render();

    },

    toggleInvert(){

        this.invert=

        !this.invert;

        this.render();

    },

    export(){

        return this.canvas.toDataURL("image/png");

    }

};
