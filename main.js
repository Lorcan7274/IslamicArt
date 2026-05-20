(function () {
  'use strict';

  const PALETTES = [
    ['#000000', '#000000', '#cccccc', '#ffffff'],
    ['#000000', '#222222', '#888888', '#dddddd'],
    ['#000000', '#ffffff', '#555555', '#aaaaaa'],
    ['#000000', '#444444', '#bbbbbb', '#ffffff'],
    ['#000000', '#000000', '#ffffff', '#888888'],
    ['#000000', '#666666', '#eeeeee', '#000000'],
  ];

  const PATTERN_TYPES = ['star', 'rosette', 'kites', 'hexagonal', 'strapwork'];
  let layerCount = 1;

  // --- state ---

  function freshState() {
    return {
      background: '#ffffff',
      medallion: {
        radius: 70, symmetry: 8, pointiness: 55,
        color: '#000000', bg: '#ffffff',
      },
      layers: [
        makeLayer('Ring 1', 'rosette', 10, 95,
          ['#000000', '#000000', '#cccccc', '#ffffff'],
          { style: 'solid', thickness: 8, color: '#000000' }),
        makeLayer('Ring 2', 'strapwork', 12, 70,
          ['#000000', '#000000', '#888888', '#ffffff'],
          { style: 'diamond', thickness: 14, color: '#000000' }),
        makeLayer('Ring 3', 'kites', 16, 100,
          ['#000000', '#ffffff', '#666666', '#bbbbbb'],
          { style: 'solid', thickness: 6, color: '#000000' }),
        makeLayer('Ring 4', 'star', 16, 90,
          ['#000000', '#000000', '#dddddd', '#ffffff'],
          { style: 'zigzag', thickness: 10, color: '#000000' }),
      ],
    };
  }

  function makeLayer(name, pattern, sym, width, pal, border) {
    return {
      id: `layer-${layerCount++}`,
      name, patternType: pattern, symmetry: sym,
      width, palette: pal.slice(),
      border: { ...border },
    };
  }

  let state = freshState();

  // --- canvas ---

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  // --- geometry helpers ---

  function polar(r, a) { return { x: r * Math.cos(a), y: r * Math.sin(a) }; }
  function mid(p, q) { return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; }
  function lerp(p, q, t) { return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; }
  function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }

  function padPalette(p) {
    const out = (p || []).slice(0, 4);
    while (out.length < 4) out.push(out[out.length - 1] || '#d4a04c');
    return out;
  }

  // line thickness that scales with cell size
  function lw(innerR, outerR, n) {
    const cell = Math.min(outerR - innerR, (2 * Math.PI / n) * (innerR + outerR) / 2);
    return Math.max(1.2, cell * 0.018);
  }

  // the wedge skeleton that all patterns share — four corners of
  // a trapezoidal slice, edge midpoints, center, and four indent
  // points pulled toward center by fraction t
  function skeleton(innerR, outerR, half, t) {
    const A = polar(innerR, half);
    const B = polar(outerR, half);
    const C = polar(outerR, -half);
    const D = polar(innerR, -half);

    const mIn = mid(A, D), mOut = mid(B, C);
    const mL = mid(A, B), mR = mid(C, D);
    const ctr = mid(mIn, mOut);

    return {
      A, B, C, D, mIn, mOut, mL, mR, ctr,
      iA: lerp(A, ctr, t), iB: lerp(B, ctr, t),
      iC: lerp(C, ctr, t), iD: lerp(D, ctr, t),
    };
  }

  // --- low-level draw ---

  function fillPoly(poly, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }

  function strokePoly(poly, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  function paintTile(regions, lineColor, lineW) {
    for (const r of regions) fillPoly(r.poly, r.color);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const r of regions) strokePoly(r.poly, lineColor, lineW);
  }

  function clipRing(inner, outer) {
    ctx.beginPath();
    ctx.arc(0, 0, outer, 0, Math.PI * 2);
    ctx.arc(0, 0, inner, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
  }

  // --- drawing: medallion ---

  function drawMedallion(cx, cy) {
    const m = state.medallion;
    ctx.save();
    ctx.translate(cx, cy);

    // background disc
    ctx.fillStyle = m.bg;
    ctx.beginPath();
    ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
    ctx.fill();

    // star
    const outerR = m.radius * 0.92;
    const innerR = outerR * (1 - m.pointiness / 100 * 0.7);
    ctx.fillStyle = m.color;
    ctx.beginPath();
    for (let i = 0; i < m.symmetry * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / m.symmetry - Math.PI / 2;
      i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
              : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();

    // center dot
    ctx.fillStyle = m.bg;
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- drawing: borders ---

  function drawBorder(cx, cy, innerR, thickness, style, color) {
    const outerR = innerR + thickness;
    ctx.save();
    ctx.translate(cx, cy);

    if (style === 'solid') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
      ctx.fill('evenodd');

    } else if (style === 'diamond') {
      const midR = (innerR + outerR) / 2;
      const n = Math.max(8, Math.round(2 * Math.PI * midR / Math.max(thickness * 1.6, 8)));
      const step = (Math.PI * 2) / n;
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const a0 = i * step, a1 = a0 + step / 2, a2 = a0 + step;
        ctx.beginPath();
        ctx.moveTo(innerR * Math.cos(a1), innerR * Math.sin(a1));
        ctx.lineTo(midR * Math.cos(a2), midR * Math.sin(a2));
        ctx.lineTo(outerR * Math.cos(a1), outerR * Math.sin(a1));
        ctx.lineTo(midR * Math.cos(a0), midR * Math.sin(a0));
        ctx.closePath();
        ctx.fill();
      }

    } else if (style === 'zigzag') {
      const midR = (innerR + outerR) / 2;
      const n = Math.max(16, Math.round(2 * Math.PI * midR / Math.max(thickness * 1.2, 8)));
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, thickness / 4);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = i % 2 === 0 ? innerR + thickness * 0.15 : outerR - thickness * 0.15;
        i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
                : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath();
      ctx.stroke();

    } else if (style === 'dotted') {
      const midR = (innerR + outerR) / 2;
      const dotR = Math.max(2, thickness * 0.32);
      const n = Math.max(12, Math.round(2 * Math.PI * midR / Math.max(thickness * 1.4, 6)));
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(midR * Math.cos(a), midR * Math.sin(a), dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // --- drawing: ring ---

  function drawRing(cx, cy, innerR, width, layer) {
    const outerR = innerR + width;
    const n = layer.symmetry;
    const pal = padPalette(layer.palette);

    ctx.save();
    ctx.translate(cx, cy);

    // ring background
    ctx.save();
    clipRing(innerR, outerR);
    ctx.fillStyle = pal[0];
    ctx.fillRect(-outerR - 2, -outerR - 2, (outerR + 2) * 2, (outerR + 2) * 2);
    ctx.restore();

    // repeat wedge motif around the ring
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * Math.PI * 2);
      ctx.save();
      clipRing(innerR, outerR);
      drawWedge(layer, pal, innerR, outerR, n, i);
      ctx.restore();
      ctx.restore();
    }

    // clean edge arcs so polygon chords don't look jagged
    ctx.strokeStyle = pal[0];
    ctx.lineWidth = lw(innerR, outerR, n);
    ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  }

  function drawWedge(layer, pal, innerR, outerR, n, idx) {
    const fn = {
      star: wedgeStar, rosette: wedgeRosette, kites: wedgeKites,
      hexagonal: wedgeHex, strapwork: wedgeStrapwork,
    }[layer.patternType];
    if (fn) fn(pal, innerR, outerR, n, idx);
  }

  // --- patterns ---

  // Star: 4 tips at edge midpoints, 4 corner kites
  function wedgeStar(pal, innerR, outerR, n) {
    const s = skeleton(innerR, outerR, Math.PI / n, 0.48);
    paintTile([
      { poly: [s.mOut, s.iB, s.mL, s.iA, s.mIn, s.iD, s.mR, s.iC], color: pal[1] },
      { poly: [s.mOut, s.B, s.mL, s.iB], color: pal[2] },
      { poly: [s.mL, s.A, s.mIn, s.iA], color: pal[3] },
      { poly: [s.mIn, s.D, s.mR, s.iD], color: pal[2] },
      { poly: [s.mR, s.C, s.mOut, s.iC], color: pal[3] },
    ], pal[0], lw(innerR, outerR, n));
  }

  // Rosette: 16-vertex star with valleys between tips
  function wedgeRosette(pal, innerR, outerR, n) {
    const s = skeleton(innerR, outerR, Math.PI / n, 0.55);
    const vt = 0.42; // valley depth
    const v = [
      lerp(mid(s.mOut, s.iB), s.ctr, vt),
      lerp(mid(s.iB, s.mL), s.ctr, vt),
      lerp(mid(s.mL, s.iA), s.ctr, vt),
      lerp(mid(s.iA, s.mIn), s.ctr, vt),
      lerp(mid(s.mIn, s.iD), s.ctr, vt),
      lerp(mid(s.iD, s.mR), s.ctr, vt),
      lerp(mid(s.mR, s.iC), s.ctr, vt),
      lerp(mid(s.iC, s.mOut), s.ctr, vt),
    ];

    paintTile([
      { poly: [s.mOut, v[0], s.iB, v[1], s.mL, v[2], s.iA, v[3],
               s.mIn, v[4], s.iD, v[5], s.mR, v[6], s.iC, v[7]], color: pal[1] },
      { poly: [s.mOut, s.B, s.mL, v[1], s.iB, v[0]], color: pal[2] },
      { poly: [s.mL, s.A, s.mIn, v[3], s.iA, v[2]], color: pal[3] },
      { poly: [s.mIn, s.D, s.mR, v[5], s.iD, v[4]], color: pal[2] },
      { poly: [s.mR, s.C, s.mOut, v[7], s.iC, v[6]], color: pal[3] },
    ], pal[0], lw(innerR, outerR, n));
  }

  // Kites: central rhombus + corner kites + edge wing triangles
  function wedgeKites(pal, innerR, outerR, n) {
    const s = skeleton(innerR, outerR, Math.PI / n, 0.55);
    paintTile([
      { poly: [s.iB, s.iA, s.iD, s.iC], color: pal[1] },
      { poly: [s.mOut, s.B, s.mL, s.iB], color: pal[2] },
      { poly: [s.mL, s.A, s.mIn, s.iA], color: pal[3] },
      { poly: [s.mIn, s.D, s.mR, s.iD], color: pal[2] },
      { poly: [s.mR, s.C, s.mOut, s.iC], color: pal[3] },
      { poly: [s.mOut, s.iB, s.iC], color: pal[3] },
      { poly: [s.mL, s.iA, s.iB], color: pal[2] },
      { poly: [s.mIn, s.iD, s.iA], color: pal[3] },
      { poly: [s.mR, s.iC, s.iD], color: pal[2] },
    ], pal[0], lw(innerR, outerR, n));
  }

  // Hexagonal: 6 triangles around center + corner kites
  function wedgeHex(pal, innerR, outerR, n) {
    const s = skeleton(innerR, outerR, Math.PI / n, 0.50);
    paintTile([
      { poly: [s.ctr, s.mOut, s.iB], color: pal[1] },
      { poly: [s.ctr, s.iB, s.iA], color: pal[2] },
      { poly: [s.ctr, s.iA, s.mIn], color: pal[1] },
      { poly: [s.ctr, s.mIn, s.iD], color: pal[2] },
      { poly: [s.ctr, s.iD, s.iC], color: pal[1] },
      { poly: [s.ctr, s.iC, s.mOut], color: pal[2] },
      { poly: [s.mOut, s.B, s.mL, s.iB], color: pal[3] },
      { poly: [s.mL, s.A, s.mIn, s.iA], color: pal[3] },
      { poly: [s.mIn, s.D, s.mR, s.iD], color: pal[3] },
      { poly: [s.mR, s.C, s.mOut, s.iC], color: pal[3] },
    ], pal[0], lw(innerR, outerR, n));
  }

  // Strapwork: star tessellation with over/under interlacing
  function wedgeStrapwork(pal, innerR, outerR, n, idx) {
    const half = Math.PI / n;
    const s = skeleton(innerR, outerR, half, 0.46);
    const midR = innerR + (outerR - innerR) / 2;

    // fill the same star+corner shapes as background
    fillPoly([s.mOut, s.iB, s.mL, s.iA, s.mIn, s.iD, s.mR, s.iC], pal[2]);
    fillPoly([s.mOut, s.B, s.mL, s.iB], pal[3]);
    fillPoly([s.mL, s.A, s.mIn, s.iA], pal[3]);
    fillPoly([s.mIn, s.D, s.mR, s.iD], pal[3]);
    fillPoly([s.mR, s.C, s.mOut, s.iC], pal[3]);

    // strap parameters
    const arcLen = (2 * Math.PI / n) * midR;
    const strapW = Math.min(outerR - innerR, arcLen) * 0.12;
    const pad = Math.max(2, strapW * 0.4);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const segs = [
      { from: s.mOut, via: s.iB, to: s.B },
      { from: s.mL, via: s.iB, to: s.B },
      { from: s.mL, via: s.iA, to: s.A },
      { from: s.mIn, via: s.iA, to: s.A },
      { from: s.mIn, via: s.iD, to: s.D },
      { from: s.mR, via: s.iD, to: s.D },
      { from: s.mR, via: s.iC, to: s.C },
      { from: s.mOut, via: s.iC, to: s.C },
    ];

    const parity = idx % 2;

    function strokeWide(path, color, w) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }

    // under pass first, then over
    for (let pass = 0; pass < 2; pass++) {
      segs.forEach((seg, i) => {
        const over = (i % 2) === parity;
        if ((pass === 1) !== over) return;

        if (pass === 0) {
          // stop short of the crossing so the over-strap covers it
          const len = dist(seg.from, seg.via);
          const gap = Math.min(strapW * 1.3, len * 0.35);
          const cut = lerp(seg.from, seg.via, (len - gap) / len);
          strokeWide([seg.from, cut], pal[0], strapW + pad);
          strokeWide([seg.from, cut], pal[1], strapW);
        } else {
          strokeWide([seg.from, seg.via, seg.to], pal[0], strapW + pad);
          strokeWide([seg.from, seg.via, seg.to], pal[1], strapW);
        }
      });
    }
  }

  // --- main draw ---

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    ctx.save();
    ctx.fillStyle = state.background;
    ctx.fillRect(0, 0, W, H);

    drawMedallion(cx, cy);

    let r = state.medallion.radius;
    for (const layer of state.layers) {
      const b = layer.border;
      if (b && b.style !== 'none' && b.thickness > 0) {
        drawBorder(cx, cy, r, b.thickness, b.style, b.color);
        r += b.thickness;
      }
      drawRing(cx, cy, r, layer.width, layer);
      r += layer.width;
    }

    ctx.restore();
  }

  // --- UI wiring ---

  const $ = id => document.getElementById(id);
  const tpl = $('layerTemplate');
  const layerList = $('layerList');

  function bindControls() {
    $('bgColor').value = state.background;
    $('bgColor').oninput = e => { state.background = e.target.value; draw(); };

    const m = state.medallion;
    $('medRadius').value = m.radius;
    $('medRadiusOut').textContent = m.radius;
    $('medRadius').oninput = e => {
      m.radius = +e.target.value;
      $('medRadiusOut').textContent = m.radius;
      draw();
    };

    $('medSymmetry').value = String(m.symmetry);
    $('medSymmetry').onchange = e => { m.symmetry = +e.target.value; draw(); };

    $('medPointiness').value = m.pointiness;
    $('medPointiness').oninput = e => { m.pointiness = +e.target.value; draw(); };

    $('medColor').value = m.color;
    $('medColor').oninput = e => { m.color = e.target.value; draw(); };

    $('medBgColor').value = m.bg;
    $('medBgColor').oninput = e => { m.bg = e.target.value; draw(); };

    $('addLayer').onclick = addLayer;
    $('exportPng').onclick = exportPng;
    $('reset').onclick = () => {
      if (!confirm('Reset to default pattern?')) return;
      state = freshState();
      bindControls();
      renderLayers();
      draw();
    };
  }

  function addLayer() {
    const pal = PALETTES[state.layers.length % PALETTES.length].slice();
    state.layers.push(makeLayer(
      `Ring ${state.layers.length + 1}`,
      PATTERN_TYPES[state.layers.length % PATTERN_TYPES.length],
      12, 80, pal,
      { style: 'solid', thickness: 8, color: pal[2] },
    ));
    renderLayers();
    draw();
  }

  function deleteLayer(id) {
    state.layers = state.layers.filter(l => l.id !== id);
    state.layers.forEach((l, i) => { l.name = `Ring ${i + 1}`; });
    renderLayers();
    draw();
  }

  // --- layer list rendering ---

  function renderLayers() {
    layerList.innerHTML = '';
    state.layers.forEach(layer => layerList.appendChild(buildLayerEl(layer)));
    setupDrag();
  }

  function buildLayerEl(layer) {
    const el = tpl.content.cloneNode(true).firstElementChild;
    el.dataset.id = layer.id;
    el.querySelector('.layer-name').textContent = layer.name;

    el.querySelector('.layer-header').onclick = e => {
      if (e.target.closest('button') || e.target.closest('.drag-handle')) return;
      el.classList.toggle('expanded');
    };
    el.querySelector('.toggle').onclick = e => { e.stopPropagation(); el.classList.toggle('expanded'); };
    el.querySelector('.delete').onclick = e => { e.stopPropagation(); deleteLayer(layer.id); };

    // pattern + symmetry
    const ptSel = el.querySelector('.pattern-type');
    ptSel.value = layer.patternType;
    ptSel.onchange = e => { layer.patternType = e.target.value; draw(); };

    const symSel = el.querySelector('.symmetry');
    symSel.value = String(layer.symmetry);
    symSel.onchange = e => { layer.symmetry = +e.target.value; draw(); };

    // width slider
    const widthIn = el.querySelector('.width');
    const widthOut = el.querySelector('.width-out');
    widthIn.value = layer.width;
    widthOut.textContent = layer.width;
    widthIn.oninput = e => {
      layer.width = +e.target.value;
      widthOut.textContent = layer.width;
      draw();
    };

    // palette swatches
    const pal = padPalette(layer.palette);
    layer.palette = pal;
    el.querySelectorAll('.swatch').forEach((sw, i) => {
      sw.value = pal[i];
      sw.oninput = e => { layer.palette[i] = e.target.value; draw(); };
    });

    // border controls
    const bStyle = el.querySelector('.border-style');
    bStyle.value = layer.border.style;
    bStyle.onchange = e => { layer.border.style = e.target.value; draw(); };

    const bThick = el.querySelector('.border-thickness');
    const bThickOut = el.querySelector('.border-thickness-out');
    bThick.value = layer.border.thickness;
    bThickOut.textContent = layer.border.thickness;
    bThick.oninput = e => {
      layer.border.thickness = +e.target.value;
      bThickOut.textContent = layer.border.thickness;
      draw();
    };

    const bColor = el.querySelector('.border-color');
    bColor.value = layer.border.color;
    bColor.oninput = e => { layer.border.color = e.target.value; draw(); };

    return el;
  }

  // --- drag reorder ---

  let dragId = null;

  function setupDrag() {
    layerList.querySelectorAll('.layer').forEach(item => {
      item.ondragstart = e => {
        dragId = item.dataset.id;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {}
      };

      item.ondragend = () => {
        item.classList.remove('dragging');
        layerList.querySelectorAll('.layer').forEach(n => n.classList.remove('drop-target'));
        dragId = null;
      };

      item.ondragover = e => {
        e.preventDefault();
        if (!dragId || item.dataset.id === dragId) return;
        layerList.querySelectorAll('.layer').forEach(n => n.classList.remove('drop-target'));
        item.classList.add('drop-target');
      };

      item.ondragleave = () => item.classList.remove('drop-target');

      item.ondrop = e => {
        e.preventDefault();
        item.classList.remove('drop-target');
        if (!dragId || item.dataset.id === dragId) return;

        const from = state.layers.findIndex(l => l.id === dragId);
        const to = state.layers.findIndex(l => l.id === item.dataset.id);
        if (from < 0 || to < 0) return;

        const [moved] = state.layers.splice(from, 1);
        state.layers.splice(to, 0, moved);
        state.layers.forEach((l, i) => { l.name = `Ring ${i + 1}`; });
        renderLayers();
        draw();
      };
    });
  }

  // --- export ---

  function exportPng() {
    const a = document.createElement('a');
    a.download = `islamic-pattern-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // --- boot ---

  bindControls();
  renderLayers();
  draw();
})();
