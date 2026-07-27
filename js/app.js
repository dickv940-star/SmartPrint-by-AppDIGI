/*
=========================================================
RAWbt by AppDIGI
Application Engine v4.0
=========================================================
*/

"use strict";

const RAWbt = {

    currentMenu: "home",

    printerConnected: false,

    currentFile: null,

    init() {

        console.log("RAWbt Started");

        this.cache();

        this.events();

        this.updatePrinterStatus(false);

        this.showToast("Welcome to RAWbt by AppDIGI");

    },

    cache() {

        this.preview =
            document.getElementById("preview");

        this.connectBtn =
            document.getElementById("connectBtn");

        this.printBtn =
            document.getElementById("printBtn");

        this.status =
            document.getElementById("printerStatus");

        this.dot =
            document.querySelector(".dot");

        this.menu =
            document.querySelectorAll(".menu");

    },

    events() {

        /* Menu */

        this.menu.forEach(btn => {

            btn.onclick = () => {

                this.menu.forEach(m =>

                    m.classList.remove("active")

                );

                btn.classList.add("active");

                this.currentMenu =

                    btn.innerText.trim();

                console.log(this.currentMenu);

            }

        });

        /* Connect */

        this.connectBtn.onclick = () => {

            this.connectPrinter();

        };

        /* Print */

        this.printBtn.onclick = () => {

            if (!this.currentFile) {

                this.showToast(

                    "No file selected"

                );

                return;

            }

            this.showToast(

                "Printing..."

            );

        };

        /* Drag Drop */

        this.preview.addEventListener(

            "dragover",

            e => {

                e.preventDefault();

                this.preview.style.borderColor="#FFC107";

            }

        );

        this.preview.addEventListener(

            "dragleave",

            ()=>{

                this.preview.style.borderColor="#ddd";

            }

        );

        this.preview.addEventListener(

            "drop",

            e=>{

                e.preventDefault();

                this.preview.style.borderColor="#ddd";

                this.openFile(

                    e.dataTransfer.files[0]

                );

            }

        );

        /* Click */

        this.preview.onclick=()=>{

            let input=

            document.createElement("input");

            input.type="file";

            input.accept=

            ".pdf,image/*";

            input.onchange=(e)=>{

                this.openFile(

                    e.target.files[0]

                );

            };

            input.click();

        };

    },

    openFile(file){

        if(!file) return;

        this.currentFile=file;

        this.preview.innerHTML=`

            <div style="text-align:center">

                <h2>📄</h2>

                <br>

                <strong>${file.name}</strong>

                <br><br>

                ${(file.size/1024).toFixed(1)} KB

            </div>

        `;

        this.showToast(

            "File Loaded"

        );

    },

    updatePrinterStatus(state){

        this.printerConnected=state;

        if(state){

            this.status.innerHTML=

            "Printer Connected";

            this.dot.classList.add(

                "connected"

            );

        }

        else{

            this.status.innerHTML=

            "No Printer";

            this.dot.classList.remove(

                "connected"

            );

        }

    },

    async connectPrinter(){

        this.showToast(

            "Searching Printer..."

        );

        setTimeout(()=>{

            this.updatePrinterStatus(true);

            this.showToast(

                "Printer Connected"

            );

        },1200);

    },

    showToast(text){

        let old=

        document.querySelector(".toast");

        if(old)

            old.remove();

        let div=

        document.createElement("div");

        div.className="toast";

        div.innerHTML=text;

        document.body.appendChild(div);

        setTimeout(()=>{

            div.classList.add(

                "show"

            );

        },50);

        setTimeout(()=>{

            div.remove();

        },3000);

    }

};

window.onload=()=>{

    RAWbt.init();

};
