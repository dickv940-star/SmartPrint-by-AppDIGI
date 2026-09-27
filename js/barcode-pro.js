/* =========================================================
   SmartPrint Barcode Professional Extension v1.0
   Validation + presets + paper sizing safety
   ========================================================= */
"use strict";

(function () {
    const LE = window.LabelEditor;
    if (!LE) return;

    const TYPES = {
        CODE128: { label: "CODE128 — General / Inventory", kind: "free" },
        CODE39:  { label: "CODE39 — Asset / Industrial", kind: "code39" },
        EAN13:   { label: "EAN13 — Retail Product", kind: "ean13" },
        EAN8:    { label: "EAN8 — Retail Short", kind: "ean8" },
        UPC:     { label: "UPC-A — Retail", kind: "upc" },
        ITF14:   { label: "ITF-14 — Carton / Logistics", kind: "itf14" }
    };

    const PRESETS = {
        general: { name:"General / Inventory", type:"CODE128", width:520, height:190, barWidth:2, barHeight:130, font:22, textMargin:8, quiet:10, display:true },
        asset:   { name:"Asset / Industrial", type:"CODE39", width:520, height:190, barWidth:2, barHeight:130, font:22, textMargin:8, quiet:12, display:true },
        retail:  { name:"Retail EAN-13", type:"EAN13", width:500, height:190, barWidth:2, barHeight:125, font:20, textMargin:8, quiet:12, display:true },
        retail8: { name:"Retail EAN-8", type:"EAN8", width:430, height:180, barWidth:2, barHeight:115, font:20, textMargin:8, quiet:12, display:true },
        upca:    { name:"Retail UPC-A", type:"UPC", width:450, height:180, barWidth:2, barHeight:115, font:20, textMargin:8, quiet:12, display:true },
        carton:  { name:"Carton ITF-14", type:"ITF14", width:560, height:190, barWidth:2, barHeight:135, font:20, textMargin:8, quiet:14, display:true }
    };

    function el(id) { return document.getElementById(id); }
    function num(id, fallback) {
        const v = Number(el(id)?.value);
        return Number.isFinite(v) ? v : fallback;
    }

    function normalize(type, data) {
        let s = String(data ?? "").trim();
        if (type === "EAN13") return s.replace(/\D/g, "");
        if (type === "EAN8") return s.replace(/\D/g, "");
        if (type === "UPC") return s.replace(/\D/g, "");
        if (type === "ITF14") return s.replace(/\D/g, "");
        if (type === "CODE39") return s.toUpperCase();
        return s;
    }

    function checksumEAN(digits) {
        const body = digits.slice(0, -1);
        let sum = 0;
        for (let i = 0; i < body.length; i++) {
            const n = Number(body[i]);
            sum += ((body.length - i) % 2 === 0) ? n * 3 : n;
        }
        return (10 - (sum % 10)) % 10;
    }

    function checksumUPC(digits) {
        const body = digits.slice(0, 11);
        let sum = 0;
        for (let i = 0; i < body.length; i++) {
            sum += Number(body[i]) * (i % 2 === 0 ? 3 : 1);
        }
        return (10 - (sum % 10)) % 10;
    }

    function validate(type, raw) {
        const data = normalize(type, raw);
        if (!data) return { ok:false, data:"", message:"Data barcode wajib diisi." };

        if (type === "CODE128") {
            return { ok:true, data, message:"CODE128 siap digunakan." };
        }

        if (type === "CODE39") {
            if (!/^[0-9A-Z .\-$/+%]+$/.test(data))
                return { ok:false, data, message:"CODE39 hanya menerima A-Z, 0-9, spasi dan karakter . - $ / + %." };
            return { ok:true, data, message:"CODE39 valid." };
        }

        if (type === "EAN13") {
            if (!/^\d{12,13}$/.test(data))
                return { ok:false, data, message:"EAN13 harus 12 atau 13 digit. Digit ke-13 dapat dihitung otomatis." };
            const full = data.length === 12 ? data + checksumEAN(data + "0") : data;
            if (data.length === 13 && Number(data[12]) !== checksumEAN(data))
                return { ok:false, data, message:"Check digit EAN13 tidak valid. Periksa 13 digit terakhir." };
            return { ok:true, data:full, message:data.length === 12 ? "EAN13 valid — check digit ditambahkan otomatis." : "EAN13 valid." };
        }

        if (type === "EAN8") {
            if (!/^\d{7,8}$/.test(data))
                return { ok:false, data, message:"EAN8 harus 7 atau 8 digit. Digit ke-8 dapat dihitung otomatis." };
            const full = data.length === 7 ? data + checksumEAN(data + "0") : data;
            if (data.length === 8 && Number(data[7]) !== checksumEAN(data))
                return { ok:false, data, message:"Check digit EAN8 tidak valid." };
            return { ok:true, data:full, message:data.length === 7 ? "EAN8 valid — check digit ditambahkan otomatis." : "EAN8 valid." };
        }

        if (type === "UPC") {
            if (!/^\d{11,12}$/.test(data))
                return { ok:false, data, message:"UPC-A harus 11 atau 12 digit." };
            const full = data.length === 11 ? data + checksumUPC(data + "0") : data;
            if (data.length === 12 && Number(data[11]) !== checksumUPC(data))
                return { ok:false, data, message:"Check digit UPC-A tidak valid." };
            return { ok:true, data:full, message:data.length === 11 ? "UPC-A valid — check digit ditambahkan otomatis." : "UPC-A valid." };
        }

        if (type === "ITF14") {
            if (!/^\d{13,14}$/.test(data))
                return { ok:false, data, message:"ITF-14 harus 13 atau 14 digit. Digit ke-14 dapat dihitung otomatis." };
            return { ok:true, data, message:"ITF-14 data valid." };
        }

        return { ok:true, data, message:"Barcode valid." };
    }

    function ensureUI() {
        const panel = el("labelEditorPanel");
        if (!panel || panel.dataset.proBarcodeBound) return;
        panel.dataset.proBarcodeBound = "1";

        const section = el("leBarcodeCustom");
        if (!section) return;

        const preset = document.createElement("label");
        preset.innerHTML = 'Preset<select id="leBCPreset"><option value="">Custom</option><option value="general">General / Inventory</option><option value="asset">Asset / Industrial</option><option value="retail">Retail EAN-13</option><option value="retail8">Retail EAN-8</option><option value="upca">Retail UPC-A</option><option value="carton">Carton ITF-14</option></select>';
        const typeLabel = section.querySelector("#leBCType")?.parentElement;
        if (typeLabel) typeLabel.parentElement.insertBefore(preset, typeLabel);

        const status = document.createElement("div");
        status.id = "leBCValidation";
        status.className = "le-barcode-validation";
        section.appendChild(status);

        el("leBCPreset").addEventListener("change", applyPreset);
        el("leBCType").addEventListener("change", validateSelected);
        el("leBCData").addEventListener("input", validateSelected);

        validateSelected();
    }

    function applyPreset() {
        const p = PRESETS[el("leBCPreset").value];
        if (!p || !LE.selected) return;

        const o = LE.selected;
        o.barcodeType = p.type;
        o.width = p.width;
        o.height = p.height;
        o.barcodeWidth = p.barWidth;
        o.barcodeHeight = p.barHeight;
        o.barcodeFontSize = p.font;
        o.barcodeTextMargin = p.textMargin;
        o.barcodeMargin = p.quiet;
        o.barcodeDisplayValue = p.display;

        el("leBCType").value = p.type;
        const current = normalize(p.type, o.data);
        const v = validate(p.type, current);
        o.data = v.ok ? v.data : defaultData(p.type);
        el("leBCData").value = o.data;

        LE.sync();
        LE.render();
        validateSelected();
    }

    function defaultData(type) {
        if (type === "EAN13") return "8991234567895";
        if (type === "EAN8") return "96385074";
        if (type === "UPC") return "012345678905";
        if (type === "ITF14") return "10012345678902";
        if (type === "CODE39") return "ASSET-001";
        return "SMARTPRINT-001";
    }

    function validateSelected() {
        const o = LE.selected;
        if (!o || o.type !== "barcode") return;

        const type = el("leBCType")?.value || o.barcodeType || "CODE128";
        const raw = el("leBCData")?.value ?? o.data ?? "";
        const result = validate(type, raw);
        const status = el("leBCValidation");

        if (result.ok) {
            o.barcodeType = type;
            o.data = result.data;
            if (el("leBCData")) el("leBCData").value = result.data;
            if (status) {
                status.textContent = "✓ " + result.message;
                status.dataset.state = "ok";
            }
        } else if (status) {
            status.textContent = "⚠ " + result.message;
            status.dataset.state = "error";
        }

        LE.render();
    }

    // Override the broken/missing size helpers used by the custom paper panel.
    LE.syncSize = function () {
        const s = window.Settings?.getAll ? Settings.getAll() : {};
        const dpi = Number(s.dpi) || 203;
        const mmToDots = mm => Math.round(Number(mm || 0) * dpi / 25.4);
        LE.width = Math.max(1, mmToDots(s.paperWidth || 100));
        LE.height = Math.max(1, mmToDots(s.paperHeight || 150));

        const c = LE.canvas();
        if (c) {
            c.width = LE.width;
            c.height = LE.height;
        }
        return { width:LE.width, height:LE.height, dpi };
    };

    LE.clampObject = function (o) {
        if (!o) return;
        o.width = LE.clamp(Number(o.width) || 1, 1, LE.width);
        o.height = LE.clamp(Number(o.height) || 1, 1, LE.height);
        o.x = LE.clamp(Number(o.x) || 0, 0, Math.max(0, LE.width - o.width));
        o.y = LE.clamp(Number(o.y) || 0, 0, Math.max(0, LE.height - o.height));
    };

    LE.clampAll = function () {
        LE.objects.forEach(o => LE.clampObject(o));
    };

    const originalOpen = LE.open;
    LE.open = function () {
        originalOpen.call(this);
        this.syncSize();
        this.clampAll();
        this.sync();
        this.render();
    };

    // Keep all object data synchronized with the professional fields.
    const originalApplyCustomObject = LE.applyCustomObject;
    LE.applyCustomObject = function () {
        originalApplyCustomObject.call(this);
        if (this.selected?.type === "barcode") validateSelected();
    };

    // Paper size note must show the actual dot size.
    const originalSync = LE.sync;
    LE.sync = function () {
        originalSync.call(this);
        const s = window.Settings?.getAll ? Settings.getAll() : {};
        const note = el("lePaperNote");
        if (note) note.textContent = (s.paperWidth || 100) + " × " + (s.paperHeight || 150) + " mm @ " + (s.dpi || 203) + " DPI = " + LE.width + " × " + LE.height + " dots";
        if (LE.selected?.type === "barcode") validateSelected();
    };

    // Extend the visible Type dropdown in the basic editor too.
    const basic = el("leType");
    if (basic) {
        basic.innerHTML = Object.entries(TYPES).map(([v,x]) => '<option value="' + v + '">' + x.label + '</option>').join("");
    }

    ensureUI();

    document.addEventListener("DOMContentLoaded", () => {
        ensureUI();
        setTimeout(() => {
            if (LE.selected?.type === "barcode") validateSelected();
        }, 0);
    });

    window.SmartPrintBarcodePro = {
        validate,
        normalize,
        presets: PRESETS
    };
})();