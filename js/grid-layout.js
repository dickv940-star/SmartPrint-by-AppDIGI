"use strict";

/*
=========================================================
 SmartPrint Grid & Repeat Manager
 Rows / Columns / Gaps / Margins in mm
 Applied to real LabelEditor objects before TSPL raster
=========================================================
*/
(function () {
    const LE = window.LabelEditor;
    if (!LE) {
        console.warn("Grid Manager: LabelEditor belum tersedia");
        return;
    }

    const defaults = {
        mode: "grid",
        rows: 1,
        columns: 1,
        copies: 1,
        gapXmm: 5,
        gapYmm: 5,
        startXmm: 5,
        startYmm: 5,
        align: "left"
    };

    const dpi = () => {
        const s = window.Settings && typeof Settings.getAll === "function"
            ? Settings.getAll() : {};
        return Number(s.dpi) > 0 ? Number(s.dpi) : 203;
    };

    const mmToDot = mm => Math.round(Number(mm || 0) * dpi() / 25.4);
    const dotToMm = dot => (Number(dot || 0) * 25.4 / dpi());

    function ensureGridData(o) {
        if (!o) return null;
        o.grid = Object.assign({}, defaults, o.grid || {});
        return o.grid;
    }

    function selectedIsLayoutObject() {
        return LE.selected && (LE.selected.type === "barcode" || LE.selected.type === "qr");
    }

    function getSettings() {
        return window.Settings && typeof Settings.getAll === "function"
            ? Settings.getAll() : {};
    }

    function labelDots() {
        const s = getSettings();
        const w = Number(s.canvasWidth) || Number(s.paperWidth) * dpi() / 25.4 || 799;
        const h = Number(s.canvasHeight) || Number(s.paperHeight) * dpi() / 25.4 || 1199;
        return { w: Math.round(w), h: Math.round(h) };
    }

    function inject() {
        const panel = document.getElementById("labelEditorPanel");
        if (!panel || panel.dataset.gridManagerBound) return;
        panel.dataset.gridManagerBound = "1";

        const section = document.createElement("div");
        section.className = "le-section le-grid-manager";
        section.innerHTML =
            '<div class="le-section-title">GRID / REPEAT LAYOUT</div>' +
            '<div class="le-grid">' +
                '<label>Mode<select id="leGridMode">' +
                    '<option value="single">Single</option>' +
                    '<option value="grid" selected>Grid</option>' +
                    '<option value="repeat">Repeat</option>' +
                '</select></label>' +
                '<label>Rows<input id="leGridRows" type="number" min="1" max="100" step="1" value="1"></label>' +
                '<label>Columns<input id="leGridCols" type="number" min="1" max="100" step="1" value="1"></label>' +
                '<label>Copies<input id="leGridCopies" type="number" min="1" max="10000" step="1" value="1"></label>' +
                '<label>Column Gap (mm)<input id="leGridGapX" type="number" min="0" step="0.1" value="5"></label>' +
                '<label>Row Gap (mm)<input id="leGridGapY" type="number" min="0" step="0.1" value="5"></label>' +
                '<label>Start X (mm)<input id="leGridStartX" type="number" min="0" step="0.1" value="5"></label>' +
                '<label>Start Y (mm)<input id="leGridStartY" type="number" min="0" step="0.1" value="5"></label>' +
                '<label>Alignment<select id="leGridAlign">' +
                    '<option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>' +
                '</select></label>' +
            '</div>' +
            '<div class="le-grid-actions">' +
                '<button type="button" id="leGridAutoFit">Auto Fit Grid</button>' +
                '<button type="button" id="leGridApply">Apply Grid</button>' +
                '<button type="button" id="leGridClear">Clear Generated</button>' +
            '</div>' +
            '<div class="le-section-title">PER-CELL CUSTOM</div>' +
            '<div class="le-grid">' +
                '<label>Cell #<input id="leCellIndex" type="number" min="1" step="1" value="1"></label>' +
                '<label>Cell X (mm)<input id="leCellX" type="number" step="0.1"></label>' +
                '<label>Cell Y (mm)<input id="leCellY" type="number" step="0.1"></label>' +
                '<label>Cell Width (mm)<input id="leCellW" type="number" min="0.1" step="0.1"></label>' +
                '<label>Cell Height (mm)<input id="leCellH" type="number" min="0.1" step="0.1"></label>' +
                '<label>Cell Rotation<select id="leCellR"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>' +
            '</div>' +
            '<div class="le-grid-actions"><button type="button" id="leCellLoad">Load Cell</button><button type="button" id="leCellApply">Apply Cell</button></div>' +
            '<div class="le-paper-note" id="leGridInfo">Pilih Barcode/QR, tentukan baris, kolom, dan jarak.</div>';

        panel.appendChild(section);

        const ids = [
            "leGridMode","leGridRows","leGridCols","leGridCopies",
            "leGridGapX","leGridGapY","leGridStartX","leGridStartY","leGridAlign"
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", () => updateInfo());
            el.addEventListener("change", () => updateInfo());
        });

        document.getElementById("leGridAutoFit").onclick = autoFitGrid;
        document.getElementById("leGridApply").onclick = applyGrid;
        document.getElementById("leGridClear").onclick = clearGenerated;
        document.getElementById("leCellLoad").onclick = loadCell;
        document.getElementById("leCellApply").onclick = applyCell;
        updateInfo();
    }

    function readUI() {
        const n = id => Number(document.getElementById(id)?.value);
        const mode = document.getElementById("leGridMode")?.value || "grid";
        return {
            mode,
            rows: Math.max(1, Math.min(100, Math.floor(n("leGridRows") || 1))),
            columns: Math.max(1, Math.min(100, Math.floor(n("leGridCols") || 1))),
            copies: Math.max(1, Math.min(10000, Math.floor(n("leGridCopies") || 1))),
            gapXmm: Math.max(0, n("leGridGapX") || 0),
            gapYmm: Math.max(0, n("leGridGapY") || 0),
            startXmm: Math.max(0, n("leGridStartX") || 0),
            startYmm: Math.max(0, n("leGridStartY") || 0),
            align: document.getElementById("leGridAlign")?.value || "left"
        };
    }

    function autoFitGrid() {
        const source = LE.selected;
        if (!source || !selectedIsLayoutObject()) {
            alert("Pilih Barcode atau QR Code terlebih dahulu.");
            return;
        }
        const g = readUI();
        const { w, h } = labelDots();
        const gapX = mmToDot(g.gapXmm), gapY = mmToDot(g.gapYmm);
        const startX = mmToDot(g.startXmm), startY = mmToDot(g.startYmm);
        const availableW = Math.max(1, w - startX);
        const availableH = Math.max(1, h - startY);
        const cols = Math.max(1, Math.floor((availableW + gapX) / Math.max(1, source.width + gapX)));
        const rows = Math.max(1, Math.floor((availableH + gapY) / Math.max(1, source.height + gapY)));
        const colsEl = document.getElementById("leGridCols");
        const rowsEl = document.getElementById("leGridRows");
        const modeEl = document.getElementById("leGridMode");
        if (colsEl) colsEl.value = cols;
        if (rowsEl) rowsEl.value = rows;
        if (modeEl) modeEl.value = "grid";
        updateInfo();
        const info = document.getElementById("leGridInfo");
        if (info) info.textContent = "Auto Fit: " + cols + " kolom × " + rows + " baris = " + (cols * rows) + " objek.";
    }

    function generatedCells() {
        return LE.objects.filter(o => o.type && (o.type === "barcode" || o.type === "qr") &&
            (o === LE.selected || o.generatedByGrid));
    }

    function loadCell() {
        const i = Math.max(1, Math.floor(Number(document.getElementById("leCellIndex")?.value) || 1));
        const cells = generatedCells();
        const o = cells[i - 1];
        if (!o) {
            alert("Cell #" + i + " belum tersedia. Terapkan Grid terlebih dahulu.");
            return;
        }
        const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
        set("leCellX", dotToMm(o.x)); set("leCellY", dotToMm(o.y));
        set("leCellW", dotToMm(o.width)); set("leCellH", dotToMm(o.height));
        set("leCellR", String(Math.round(o.rotation || 0)));
        LE.select(o);
    }

    function applyCell() {
        const i = Math.max(1, Math.floor(Number(document.getElementById("leCellIndex")?.value) || 1));
        const cells = generatedCells();
        const o = cells[i - 1];
        if (!o) {
            alert("Cell #" + i + " belum tersedia.");
            return;
        }
        const n = id => Number(document.getElementById(id)?.value);
        const x = n("leCellX"), y = n("leCellY"), w = n("leCellW"), h = n("leCellH");
        if ([x,y,w,h].some(v => !Number.isFinite(v) || v < 0)) {
            alert("X, Y, Width, Height harus diisi dengan angka valid.");
            return;
        }
        const { w: lw, h: lh } = labelDots();
        o.x = LE.clamp(mmToDot(x), 0, Math.max(0, lw - 1));
        o.y = LE.clamp(mmToDot(y), 0, Math.max(0, lh - 1));
        o.width = LE.clamp(mmToDot(w), 1, lw);
        o.height = LE.clamp(mmToDot(h), 1, lh);
        o.rotation = Number(document.getElementById("leCellR")?.value) || 0;
        o.generatedByGrid = false;
        o.gridCellCustom = true;
        LE.select(o);
        updateInfo();
    }

    function updateInfo() {
        const info = document.getElementById("leGridInfo");
        if (!info) return;
        const g = readUI();
        const count = g.mode === "single"
            ? 1
            : g.mode === "repeat"
                ? g.copies
                : g.rows * g.columns;
        info.textContent =
            count + " objek | gap X " + g.gapXmm.toFixed(1) +
            " mm | gap Y " + g.gapYmm.toFixed(1) +
            " mm | " + dpi() + " DPI";
    }

    function clearGenerated() {
        LE.objects = LE.objects.filter(o => !o.generatedByGrid);
        if (LE.selected && LE.selected.generatedByGrid) LE.selected = null;
        LE.sync();
        LE.render();
        updateInfo();
    }

    function cloneObject(source, index) {
        const copy = Object.assign({}, source);
        copy.id = "grid" + (++LE.counter);
        copy.selected = false;
        copy.generatedByGrid = true;
        copy.gridIndex = index;
        if (source.type === "image") copy.image = source.image;
        return copy;
    }

    function applyGrid() {
        const source = LE.selected;
        if (!source) {
            alert("Pilih Barcode atau QR Code terlebih dahulu.");
            return;
        }
        if (!selectedIsLayoutObject()) {
            alert("Grid / Repeat saat ini digunakan untuk Barcode dan QR Code. Pilih salah satu objek tersebut.");
            return;
        }

        clearGenerated();

        const g = readUI();
        ensureGridData(source);
        source.grid = Object.assign({}, g);

        const { w: labelW, h: labelH } = labelDots();
        const gapX = mmToDot(g.gapXmm);
        const gapY = mmToDot(g.gapYmm);
        const startX = mmToDot(g.startXmm);
        const startY = mmToDot(g.startYmm);

        const count = g.mode === "single"
            ? 1
            : g.mode === "repeat"
                ? g.copies
                : g.rows * g.columns;

        const cols = g.mode === "repeat" ? g.columns : g.columns;
        const rows = g.mode === "repeat"
            ? Math.max(1, Math.ceil(count / cols))
            : g.rows;

        const totalW = cols * source.width + Math.max(0, cols - 1) * gapX;
        let originX = startX;
        if (g.align === "center") originX = Math.max(0, Math.round((labelW - totalW) / 2));
        if (g.align === "right") originX = Math.max(0, labelW - totalW - startX);

        const availableH = labelH - startY;
        const neededH = rows * source.height + Math.max(0, rows - 1) * gapY;
        const overflow = totalW > labelW || neededH > availableH;

        for (let i = 0; i < count; i++) {
            if (i === 0) {
                source.x = LE.clamp(originX, 0, Math.max(0, labelW - source.width));
                source.y = LE.clamp(startY, 0, Math.max(0, labelH - source.height));
                continue;
            }

            const col = i % cols;
            const row = Math.floor(i / cols);
            const copy = cloneObject(source, i);
            copy.x = LE.clamp(originX + col * (source.width + gapX), 0, Math.max(0, labelW - source.width));
            copy.y = LE.clamp(startY + row * (source.height + gapY), 0, Math.max(0, labelH - source.height));
            LE.objects.push(copy);
        }

        LE.select(source);
        const info = document.getElementById("leGridInfo");
        if (info) {
            info.textContent = count + " objek dibuat. " +
                (overflow ? "Peringatan: grid melebihi area label dan akan dipotong/clamp." : "Grid sesuai area label.") +
                " Ukuran: " + labelW + " × " + labelH + " dots.";
        }
        LE.render();
    }

    // Expose for other SmartPrint modules.
    LE.mmToDot = mmToDot;
    LE.dotToMm = dotToMm;
    LE.applyGrid = applyGrid;
    LE.clearGeneratedGrid = clearGenerated;

    const originalOpen = LE.open;
    LE.open = function () {
        originalOpen.call(this);
        inject();
        updateInfo();
    };

    // The panel may already exist because LabelEditor initializes immediately.
    inject();

    // Keep the layout panel in sync when selecting objects.
    const originalSelect = LE.select;
    LE.select = function (o) {
        originalSelect.call(this, o);
        inject();
        updateInfo();
    };

    // Keyboard-friendly cleanup.
    document.addEventListener("keydown", e => {
        if (!LE.enabled || !LE.selected) return;
        if ((e.key === "Delete" || e.key === "Backspace") &&
            !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            LE.remove();
        }
    });

    console.log("SmartPrint Grid & Repeat Manager v1.0 Ready");
})();
