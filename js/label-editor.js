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
  p.innerHTML='<div class="label-editor-head"><strong>Label Editor</strong><span>799 × 1199 dots</span><button id="leClose">×</button></div><div class="label-editor-actions"><button id="leText">+ Text</button><button id="leImage">+ Image</button><button id="leBarcode">+ Barcode</button><button id="leQR">+ QR</button><button id="leDelete">Delete</button></div><div class="label-editor-fields"><label>Text / Data<input id="leValue" value="SmartPrint"></label><label>Barcode<select id="leType"><option>CODE128</option><option>CODE39</option><option>EAN13</option></select></label><label>X<input id="leX" type="number"></label><label>Y<input id="leY" type="number"></label><label>Width<input id="leW" type="number"></label><label>Height<input id="leH" type="number"></label><label>Rotation<input id="leR" type="number"></label><label>Font<input id="leF" type="number" value="48"></label></div><div class="label-editor-help">Klik objek • drag untuk memindahkan • edit X/Y/W/H/rotasi • Delete</div><input id="leFile" type="file" accept="image/*" hidden>';
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
window.LabelEditor=LabelEditor;
document.addEventListener("DOMContentLoaded",()=>LabelEditor.init());
