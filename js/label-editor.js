"use strict";
const LabelEditor={
 width:799,height:1199,objects:[],selected:null,counter:0,enabled:false,dragging:false,pid:null,sx:0,sy:0,ox:0,oy:0,
 init(){this.ensure();this.panel();this.bind();this.render();},
 ensure(){if(window.Settings)Settings.set({printerType:"label",printLanguage:"TSPL",paperWidth:100,paperHeight:150,labelWidth:100,labelHeight:150,canvasWidth:799,canvasHeight:1199});},
 canvas(){return document.getElementById("previewCanvas");},
 open(){this.enabled=true;this.ensure();this.bind();if(window.Preview){Preview.scale=.5;Preview.posX=0;Preview.posY=0;Preview.rotation=0;Preview.render();}document.getElementById("labelEditorPanel").hidden=false;this.render();},
 close(){this.enabled=false;document.getElementById("labelEditorPanel").hidden=true;this.render();},
 panel(){
  if(document.getElementById("labelEditorPanel"))return;
  const p=document.createElement("div");p.id="labelEditorPanel";p.className="label-editor-panel";
  p.innerHTML='<div class="label-editor-head"><strong>Label Editor</strong><span>799 × 1199 dots</span><button id="leClose">×</button></div><div class="label-editor-actions"><button id="leText">+ Text</button><button id="leImage">+ Image</button><button id="leBarcode">+ Barcode</button><button id="leQR">+ QR</button><button id="leDelete">Delete</button></div><div class="label-editor-fields"><label>Text / Data / URL<textarea id="leValue" rows="3" placeholder="Masukkan teks, alamat, URL, nomor, ID, atau data lainnya">SmartPrint</textarea></label><label>Barcode<select id="leType"><option>CODE128</option><option>CODE39</option><option>EAN13</option></select></label><label>X<input id="leX" type="number"></label><label>Y<input id="leY" type="number"></label><label>Width<input id="leW" type="number"></label><label>Height<input id="leH" type="number"></label><label>Rotation<input id="leR" type="number"></label><label>Font<input id="leF" type="number" value="48"></label></div><div class="label-editor-help">Klik objek • drag untuk memindahkan • edit X/Y/W/H/rotasi • Delete</div><input id="leFile" type="file" accept="image/*" hidden>';
  document.body.appendChild(p);
  document.getElementById("leClose").onclick=()=>this.close();
  document.getElementById("leText").onclick=()=>this.addText();
  document.getElementById("leImage").onclick=()=>document.getElementById("leFile").click();
  document.getElementById("leBarcode").onclick=()=>this.addBarcode();
  document.getElementById("leQR").onclick=()=>this.addQR();
  document.getElementById("leDelete").onclick=()=>this.remove();
  document.getElementById("leFile").onchange=e=>{if(e.target.files[0])this.addImage(e.target.files[0]);e.target.value="";};
  ["leValue","leType","leX","leY","leW","leH","leR","leF"].forEach(id=>{const e=document.getElementById(id);e.oninput=()=>this.apply();});
 },
 base(type){return{id:"o"+(++this.counter),type,x:50,y:50,width:300,height:100,rotation:0,fontSize:48,text:"",data:"",barcodeType:"CODE128",image:null,src:"",selected:false,visible:true};},
 addText(){const o=this.base("text");o.text=document.getElementById("leValue").value||"SmartPrint";o.width=420;o.height=70;this.objects.push(o);this.select(o);},
 addImage(file){const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{const o=this.base("image"),r=img.naturalWidth/Math.max(1,img.naturalHeight);o.image=img;o.src=u;o.width=Math.min(500,img.naturalWidth);o.height=Math.round(o.width/r);this.objects.push(o);this.select(o);};img.src=u;},
 addBarcode(){const o=this.base("barcode");o.data=document.getElementById("leValue").value||"8991234567890";o.barcodeType=document.getElementById("leType").value;o.width=420;o.height=170;this.objects.push(o);this.select(o);},
 addQR(){const o=this.base("qr");o.data=document.getElementById("leValue").value||"https://smartprint.app";o.width=240;o.height=240;this.objects.push(o);this.select(o);},
 select(o){this.objects.forEach(x=>x.selected=false);this.selected=o;if(o)o.selected=true;this.sync();this.render();},
 remove(){if(!this.selected)return;this.objects=this.objects.filter(x=>x!==this.selected);this.selected=null;this.sync();this.render();},
 apply(){const o=this.selected;if(!o)return;const v=id=>document.getElementById(id).value;if(o.type==="text")o.text=v("leValue");if(o.type==="barcode"){o.data=v("leValue");o.barcodeType=v("leType");}if(o.type==="qr")o.data=v("leValue");o.x=this.clamp(+v("leX")||0,0,798);o.y=this.clamp(+v("leY")||0,0,1198);o.width=this.clamp(+v("leW")||1,1,799);o.height=this.clamp(+v("leH")||1,1,1199);o.rotation=+v("leR")||0;o.fontSize=this.clamp(+v("leF")||48,6,300);this.render();},
 sync(){const o=this.selected,s=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};if(!o)return;s("leX",Math.round(o.x));s("leY",Math.round(o.y));s("leW",Math.round(o.width));s("leH",Math.round(o.height));s("leR",Math.round(o.rotation));s("leValue",o.type==="text"?o.text:(o.data||""));s("leType",o.barcodeType||"CODE128");s("leF",o.fontSize||48);},
 point(e){const c=this.canvas(),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};},
 hit(x,y){for(let i=this.objects.length-1;i>=0;i--){const o=this.objects[i],a=-(o.rotation||0)*Math.PI/180,cx=o.x+o.width/2,cy=o.y+o.height/2,dx=x-cx,dy=y-cy,lx=dx*Math.cos(a)-dy*Math.sin(a)+o.width/2,ly=dx*Math.sin(a)+dy*Math.cos(a)+o.height/2;if(lx>=0&&lx<=o.width&&ly>=0&&ly<=o.height)return o;}return null;},
 bind(){const c=this.canvas();if(!c||c.dataset.leBound)return;c.dataset.leBound="1";c.addEventListener("pointerdown",e=>{if(!this.enabled)return;e.preventDefault();e.stopImmediatePropagation();const p=this.point(e),o=this.hit(p.x,p.y);this.select(o);if(!o)return;this.dragging=true;this.pid=e.pointerId;this.sx=p.x;this.sy=p.y;this.ox=o.x;this.oy=o.y;try{c.setPointerCapture(e.pointerId);}catch(_){}},true);c.addEventListener("pointermove",e=>{if(!this.enabled||!this.dragging||e.pointerId!==this.pid)return;e.preventDefault();e.stopImmediatePropagation();const p=this.point(e),o=this.selected;if(!o)return;o.x=this.clamp(this.ox+p.x-this.sx,0,this.width-o.width);o.y=this.clamp(this.oy+p.y-this.sy,0,this.height-o.height);this.sync();this.render();},true);["pointerup","pointercancel"].forEach(t=>c.addEventListener(t,e=>{if(e.pointerId===this.pid){this.dragging=false;this.pid=null;}},true));},
 render(){if(window.Preview)Preview.render();},
 renderObjects(ctx,opt={}){this.objects.forEach(o=>{if(o.visible)this.draw(ctx,o);});if(!opt.forPrint&&this.enabled&&this.selected)this.box(ctx,this.selected);},
 draw(ctx,o){ctx.save();ctx.translate(o.x+o.width/2,o.y+o.height/2);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.translate(-o.width/2,-o.height/2);if(o.type==="text"){ctx.fillStyle="#000";ctx.font=(o.fontSize||48)+"px Arial";ctx.textBaseline="middle";ctx.fillText(o.text||"",4,o.height/2);}else if(o.type==="image"&&o.image)ctx.drawImage(o.image,0,0,o.width,o.height);else if(o.type==="barcode")this.barcode(ctx,o);else if(o.type==="qr")this.qr(ctx,o);ctx.restore();},
 barcode(ctx,o){if(window.JsBarcode)try{const t=document.createElement("canvas");JsBarcode(t,String(o.data||""),{format:o.barcodeType||"CODE128",width:2,height:Math.max(20,o.height-36),displayValue:true,fontSize:Math.min(32,Math.max(10,o.height*.12)),margin:0});ctx.drawImage(t,0,0,o.width,o.height);return;}catch(e){}if(window.BarcodeEngine){const p=BarcodeEngine.createPattern(String(o.data||"")),w=o.width/Math.max(1,p.length);ctx.fillStyle="#000";p.forEach((b,i)=>b&&ctx.fillRect(i*w,0,Math.max(1,w),o.height));}},
 qr(ctx,o){if(window.QRCode)try{const h=document.createElement("div");h.style.cssText="position:fixed;left:-9999px;top:-9999px";document.body.appendChild(h);new QRCode(h,{text:String(o.data||""),width:Math.round(o.width),height:Math.round(o.height),correctLevel:QRCode.CorrectLevel.M});const q=h.querySelector("canvas")||h.querySelector("img");if(q)ctx.drawImage(q,0,0,o.width,o.height);h.remove();return;}catch(e){}ctx.fillStyle="#fff";ctx.fillRect(0,0,o.width,o.height);ctx.fillStyle="#000";const s=o.width/21;for(let y=0;y<21;y++)for(let x=0;x<21;x++)if((x<7&&y<7)||(x>13&&y<7)||(x<7&&y>13))if(x===0||x===6||y===0||y===6||x===14||x===20||y===14||y===20)ctx.fillRect(x*s,y*s,s,s);},
 box(ctx,o){ctx.save();ctx.translate(o.x+o.width/2,o.y+o.height/2);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.strokeStyle="#2563eb";ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.strokeRect(-o.width/2,-o.height/2,o.width,o.height);ctx.setLineDash([]);ctx.fillStyle="#2563eb";[[-o.width/2,-o.height/2],[o.width/2,-o.height/2],[-o.width/2,o.height/2],[o.width/2,o.height/2]].forEach(p=>ctx.fillRect(p[0]-5,p[1]-5,10,10));ctx.restore();},
 clear(){this.objects=[];this.selected=null;this.render();},
 clamp(n,a,b){return Math.max(a,Math.min(b,n));},
 getObjects(){return this.objects.map(o=>{const c=Object.assign({},o);delete c.image;return c;})}
};

/* =========================================================
   SMARTPRINT CUSTOM BARCODE / QR SETTINGS EXTENSION
   ========================================================= */
(function () {
    const originalPanel = LabelEditor.panel;
    const originalSync = LabelEditor.sync;
    const originalAddBarcode = LabelEditor.addBarcode;
    const originalAddQR = LabelEditor.addQR;
    const originalBarcode = LabelEditor.barcode;
    const originalQR = LabelEditor.qr;

    LabelEditor.panel = function () {
        originalPanel.call(this);

        const panel = document.getElementById("labelEditorPanel");
        if (!panel || panel.dataset.customSettingsBound) return;
        panel.dataset.customSettingsBound = "1";

        const extra = document.createElement("div");
        extra.innerHTML = '<div class="le-section le-paper-custom"><div class="le-section-title">PAPER / PRINT SETTINGS</div><div class="le-grid"><label>Paper Width (mm)<input id="lePaperW" type="number" min="1" step="0.1"></label><label>Paper Height (mm)<input id="lePaperH" type="number" min="1" step="0.1"></label><label>DPI<select id="lePaperDPI"><option value="203">203</option><option value="300">300</option><option value="600">600</option></select></label><label>Gap (mm)<input id="lePaperGap" type="number" min="0" step="0.1"></label><label>Copies<input id="lePaperCopies" type="number" min="1" step="1"></label><label>Density<input id="lePaperDensity" type="number" min="0" max="15" step="1"></label><label>Speed<input id="lePaperSpeed" type="number" min="1" max="12" step="1"></label><label>Margin Left (mm)<input id="leMarginL" type="number" min="0" step="0.1"></label><label>Margin Top (mm)<input id="leMarginT" type="number" min="0" step="0.1"></label><label>Margin Right (mm)<input id="leMarginR" type="number" min="0" step="0.1"></label><label>Margin Bottom (mm)<input id="leMarginB" type="number" min="0" step="0.1"></label></div><div class="le-paper-note" id="lePaperNote"></div></div><div id="leBarcodeCustom" class="le-section" hidden><div class="le-section-title">BARCODE — FULL CUSTOM</div><div class="le-grid"><label>Type<select id="leBCType"><option>CODE128</option><option>CODE39</option><option>EAN13</option><option>EAN8</option><option>UPC</option><option>ITF14</option></select></label><label>Data / Value<input id="leBCData" type="text"></label><label>X (dot)<input id="leBCX" type="number" step="1"></label><label>Y (dot)<input id="leBCY" type="number" step="1"></label><label>Width (dot)<input id="leBCW" type="number" min="1" step="1"></label><label>Height (dot)<input id="leBCH" type="number" min="1" step="1"></label><label>Rotation<select id="leBCR"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label><label>Bar Width<input id="leBCBarW" type="number" min="0.1" max="8" step="0.1"></label><label>Bar Height<input id="leBCBarH" type="number" min="10" step="1"></label><label>Text Font<input id="leBCFont" type="number" min="6" max="72" step="1"></label><label>Text Margin<input id="leBCTextMargin" type="number" min="0" max="50" step="1"></label><label>Quiet Margin<input id="leBCMargin" type="number" min="0" max="100" step="1"></label><label>Narrow Bar<input id="leBCNarrow" type="number" min="1" max="10" step="1"></label><label>Wide Bar<input id="leBCWide" type="number" min="1" max="20" step="1"></label><label>Line Color<input id="leBCLine" type="color"></label><label>Background<input id="leBCBg" type="color"></label></div><label class="le-check"><input id="leBCDisplay" type="checkbox"> Show human-readable value</label><label class="le-check"><input id="leBCFlat" type="checkbox"> Flat rendering</label></div><div id="leQRCustom" class="le-section" hidden><div class="le-section-title">QR CODE — FULL CUSTOM</div><div class="le-grid"><label>Data / Value<input id="leQRData" type="text"></label><label>Error Correction<select id="leQRError"><option value="L">L — 7%</option><option value="M">M — 15%</option><option value="Q">Q — 25%</option><option value="H">H — 30%</option></select></label><label>X (dot)<input id="leQRX" type="number" step="1"></label><label>Y (dot)<input id="leQRY" type="number" step="1"></label><label>Width (dot)<input id="leQRW" type="number" min="1" step="1"></label><label>Height (dot)<input id="leQRH" type="number" min="1" step="1"></label><label>Rotation<select id="leQRR"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label><label>Module / Cell<input id="leQRCell" type="number" min="1" max="30" step="1"></label><label>Quiet Zone (dot)<input id="leQRQuiet" type="number" min="0" max="100" step="1"></label><label>Dark Color<input id="leQRDarkCustom" type="color"></label><label>Light Color<input id="leQRLightCustom" type="color"></label></div></div>';
        panel.appendChild(extra);

        const ids = ["lePaperW","lePaperH","lePaperDPI","lePaperGap","lePaperCopies","lePaperDensity","lePaperSpeed","leMarginL","leMarginT","leMarginR","leMarginB","leBCType","leBCData","leBCX","leBCY","leBCW","leBCH","leBCR","leBCBarW","leBCBarH","leBCFont","leBCTextMargin","leBCMargin","leBCNarrow","leBCWide","leBCLine","leBCBg","leBCDisplay","leBCFlat","leQRData","leQRError","leQRX","leQRY","leQRW","leQRH","leQRR","leQRCell","leQRQuiet","leQRDarkCustom","leQRLightCustom"];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", () => {
                if (id.startsWith("lePaper") || id.startsWith("leMargin")) this.applyCustomPaper();
                else this.applyCustomObject();
            });
            el.addEventListener("change", () => {
                if (id.startsWith("lePaper") || id.startsWith("leMargin")) this.applyCustomPaper();
                else this.applyCustomObject();
            });
        });
    };

    LabelEditor.applyCustomPaper = function () {
        if (!window.Settings) return;
        const n = id => Number(document.getElementById(id)?.value);
        const safe = (v, d) => Number.isFinite(v) ? v : d;
        const w = Math.max(1, safe(n("lePaperW"), 100));
        const h = Math.max(1, safe(n("lePaperH"), 150));
        const dpi = Math.max(1, safe(n("lePaperDPI"), 203));

        Settings.set({
            printerType: "label", printLanguage: "TSPL",
            paperWidth: w, paperHeight: h, labelWidth: w, labelHeight: h, dpi: dpi,
            gap: Math.max(0, safe(n("lePaperGap"), 2)),
            copies: Math.max(1, Math.floor(safe(n("lePaperCopies"), 1))),
            density: Math.max(0, Math.min(15, Math.floor(safe(n("lePaperDensity"), 8)))),
            speed: Math.max(1, Math.min(12, safe(n("lePaperSpeed"), 4))),
            marginLeft: Math.max(0, safe(n("leMarginL"), 0)),
            marginTop: Math.max(0, safe(n("leMarginT"), 0)),
            marginRight: Math.max(0, safe(n("leMarginR"), 0)),
            marginBottom: Math.max(0, safe(n("leMarginB"), 0))
        });

        this.syncSize();
        if (window.Preview) Preview.updateSize();
        this.clampAll(); this.sync(); this.render();
    };

    LabelEditor.applyCustomObject = function () {
        const o = this.selected;
        if (!o) return;
        const n = id => Number(document.getElementById(id)?.value);
        const safe = (v, d) => Number.isFinite(v) ? v : d;

        if (o.type === "barcode") {
            o.data = document.getElementById("leBCData").value;
            o.barcodeType = document.getElementById("leBCType").value;
            o.x = safe(n("leBCX"), o.x); o.y = safe(n("leBCY"), o.y);
            o.width = this.clamp(safe(n("leBCW"), o.width), 1, this.width);
            o.height = this.clamp(safe(n("leBCH"), o.height), 1, this.height);
            o.rotation = safe(n("leBCR"), 0);
            o.barcodeWidth = this.clamp(safe(n("leBCBarW"), 2), 0.1, 8);
            o.barcodeHeight = this.clamp(safe(n("leBCBarH"), 80), 10, 2000);
            o.barcodeFontSize = this.clamp(safe(n("leBCFont"), 18), 6, 72);
            o.barcodeTextMargin = this.clamp(safe(n("leBCTextMargin"), 8), 0, 50);
            o.barcodeMargin = this.clamp(safe(n("leBCMargin"), 4), 0, 100);
            o.barcodeNarrow = this.clamp(safe(n("leBCNarrow"), 2), 1, 10);
            o.barcodeWide = this.clamp(safe(n("leBCWide"), 4), 1, 20);
            o.barcodeLineColor = document.getElementById("leBCLine").value || "#000000";
            o.barcodeBackground = document.getElementById("leBCBg").value || "#ffffff";
            o.barcodeDisplayValue = document.getElementById("leBCDisplay").checked;
            o.barcodeFlat = document.getElementById("leBCFlat").checked;
        }

        if (o.type === "qr") {
            o.data = document.getElementById("leQRData").value;
            o.x = safe(n("leQRX"), o.x); o.y = safe(n("leQRY"), o.y);
            o.width = this.clamp(safe(n("leQRW"), o.width), 1, this.width);
            o.height = this.clamp(safe(n("leQRH"), o.height), 1, this.height);
            o.rotation = safe(n("leQRR"), 0);
            o.qrECC = document.getElementById("leQRError").value;
            o.qrCellSize = this.clamp(safe(n("leQRCell"), 5), 1, 30);
            o.qrMargin = this.clamp(safe(n("leQRQuiet"), 10), 0, 100);
            o.qrDark = document.getElementById("leQRDarkCustom").value || "#000000";
            o.qrLight = document.getElementById("leQRLightCustom").value || "#ffffff";
        }

        this.clampObject(o); this.render(); this.sync();
    };

    LabelEditor.sync = function () {
        originalSync.call(this);
        const s = window.Settings && typeof Settings.getAll === "function" ? Settings.getAll() : {};
        const set = (id, v) => { const e = document.getElementById(id); if (e && v !== undefined) e.value = v; };

        set("lePaperW", s.paperWidth ?? 100); set("lePaperH", s.paperHeight ?? 150); set("lePaperDPI", s.dpi ?? 203);
        set("lePaperGap", s.gap ?? 2); set("lePaperCopies", s.copies ?? 1); set("lePaperDensity", s.density ?? 8); set("lePaperSpeed", s.speed ?? 4);
        set("leMarginL", s.marginLeft ?? 0); set("leMarginT", s.marginTop ?? 0); set("leMarginR", s.marginRight ?? 0); set("leMarginB", s.marginBottom ?? 0);

        const note = document.getElementById("lePaperNote");
        if (note) note.textContent = (s.paperWidth || 100) + " × " + (s.paperHeight || 150) + " mm @ " + (s.dpi || 203) + " DPI = " + this.width + " × " + this.height + " dots";

        const bc = document.getElementById("leBarcodeCustom"), qr = document.getElementById("leQRCustom");
        if (bc) bc.hidden = !(this.selected && this.selected.type === "barcode");
        if (qr) qr.hidden = !(this.selected && this.selected.type === "qr");

        const o = this.selected;
        if (!o) return;

        if (o.type === "barcode") {
            set("leBCType", o.barcodeType || "CODE128"); set("leBCData", o.data || "");
            set("leBCX", Math.round(o.x)); set("leBCY", Math.round(o.y)); set("leBCW", Math.round(o.width)); set("leBCH", Math.round(o.height)); set("leBCR", String(Math.round(o.rotation || 0)));
            set("leBCBarW", o.barcodeWidth ?? 2); set("leBCBarH", o.barcodeHeight ?? 80); set("leBCFont", o.barcodeFontSize ?? 18);
            set("leBCTextMargin", o.barcodeTextMargin ?? 8); set("leBCMargin", o.barcodeMargin ?? 4); set("leBCNarrow", o.barcodeNarrow ?? 2); set("leBCWide", o.barcodeWide ?? 4);
            set("leBCLine", o.barcodeLineColor || "#000000"); set("leBCBg", o.barcodeBackground || "#ffffff");
            const d = document.getElementById("leBCDisplay"), f = document.getElementById("leBCFlat");
            if (d) d.checked = o.barcodeDisplayValue !== false; if (f) f.checked = !!o.barcodeFlat;
        }

        if (o.type === "qr") {
            set("leQRData", o.data || ""); set("leQRX", Math.round(o.x)); set("leQRY", Math.round(o.y));
            set("leQRW", Math.round(o.width)); set("leQRH", Math.round(o.height)); set("leQRR", String(Math.round(o.rotation || 0)));
            set("leQRError", o.qrECC || "M"); set("leQRCell", o.qrCellSize ?? 5); set("leQRQuiet", o.qrMargin ?? 10);
            set("leQRDarkCustom", o.qrDark || "#000000"); set("leQRLightCustom", o.qrLight || "#ffffff");
        }
    };

    LabelEditor.addBarcode = function () {
        originalAddBarcode.call(this);
        if (this.selected) Object.assign(this.selected, { barcodeWidth:2, barcodeHeight:100, barcodeFontSize:18, barcodeTextMargin:8, barcodeMargin:4, barcodeDisplayValue:true, barcodeLineColor:"#000000", barcodeBackground:"#ffffff", barcodeNarrow:2, barcodeWide:4 });
        this.sync(); this.render();
    };

    LabelEditor.addQR = function () {
        originalAddQR.call(this);
        if (this.selected) Object.assign(this.selected, { qrECC:"M", qrCellSize:5, qrMargin:10, qrDark:"#000000", qrLight:"#ffffff" });
        this.sync(); this.render();
    };

    LabelEditor.barcode = function (ctx, o) {
        if (!window.JsBarcode) return originalBarcode.call(this, ctx, o);
        try {
            const t = document.createElement("canvas");
            JsBarcode(t, String(o.data || ""), {
                format:o.barcodeType || "CODE128", width:Number(o.barcodeWidth)||2, height:Math.max(10,Number(o.barcodeHeight)||o.height),
                displayValue:o.barcodeDisplayValue !== false, fontSize:Number(o.barcodeFontSize)||18, textMargin:Number(o.barcodeTextMargin)||0,
                margin:Number(o.barcodeMargin)||0, lineColor:o.barcodeLineColor||"#000000", background:o.barcodeBackground||"#ffffff", flat:!!o.barcodeFlat
            });
            ctx.drawImage(t,0,0,o.width,o.height);
        } catch(e) { originalBarcode.call(this,ctx,o); }
    };

    LabelEditor.qr = function (ctx, o) {
        if (!window.QRCode) return originalQR.call(this,ctx,o);
        try {
            const host=document.createElement("div"); host.style.cssText="position:fixed;left:-9999px;top:-9999px"; document.body.appendChild(host);
            const levels={L:QRCode.CorrectLevel.L,M:QRCode.CorrectLevel.M,Q:QRCode.CorrectLevel.Q,H:QRCode.CorrectLevel.H};
            const margin=Math.max(0,Number(o.qrMargin)||0), size=Math.max(21,Math.min(o.width,o.height)-margin*2);
            new QRCode(host,{text:String(o.data||""),width:size,height:size,colorDark:o.qrDark||"#000000",colorLight:o.qrLight||"#ffffff",correctLevel:levels[o.qrECC]||QRCode.CorrectLevel.M});
            const q=host.querySelector("canvas")||host.querySelector("img");
            if(q){ctx.fillStyle=o.qrLight||"#ffffff";ctx.fillRect(0,0,o.width,o.height);ctx.drawImage(q,margin,margin,size,size);}
            host.remove();
        } catch(e) { originalQR.call(this,ctx,o); }
    };

    const originalEnsure = LabelEditor.ensure;
    LabelEditor.ensure = function () {
        if (!window.Settings) return;
        const s = Settings.getAll();
        const patch = {
            printerType: "label",
            printLanguage: "TSPL"
        };
        if (!Number(s.paperWidth)) patch.paperWidth = 100;
        if (!Number(s.paperHeight)) patch.paperHeight = 150;
        if (!Number(s.labelWidth)) patch.labelWidth = patch.paperWidth || 100;
        if (!Number(s.labelHeight)) patch.labelHeight = patch.paperHeight || 150;
        if (!Number(s.dpi)) patch.dpi = 203;
        if (s.gap === undefined) patch.gap = 2;
        if (s.marginLeft === undefined) patch.marginLeft = 0;
        if (s.marginTop === undefined) patch.marginTop = 0;
        if (s.marginRight === undefined) patch.marginRight = 0;
        if (s.marginBottom === undefined) patch.marginBottom = 0;
        Settings.set(patch);
        this.syncSize();
    };

})();

window.LabelEditor=LabelEditor;
document.addEventListener("DOMContentLoaded",()=>LabelEditor.init());


/* Load professional barcode validation/presets after LabelEditor is ready. */
(function(){
  const load=function(){
    if(document.querySelector("script[data-smartprint-barcode-pro]")) return;
    const s=document.createElement("script");
    s.src="js/barcode-pro.js?v=1.0.0";
    s.dataset.smartprintBarcodePro="1";
    document.body.appendChild(s);
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",load,{once:true}); else load();
})();
