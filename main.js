(function () {
  'use strict';

  // ============================================================
  // Constants
  // ============================================================
  const SYMMETRY_OPTIONS = [6, 8, 10, 12, 16];
  const PATTERN_TYPES = ['star', 'rosette', 'kites', 'hexagonal', 'strapwork'];
  const BORDER_STYLES = ['none', 'solid', 'diamond', 'zigzag', 'dotted'];

  const PALETTES = [
    ['#000000', '#000000', '#cccccc', '#ffffff'],
    ['#000000', '#222222', '#888888', '#dddddd'],
    ['#000000', '#ffffff', '#555555', '#aaaaaa'],
    ['#000000', '#444444', '#bbbbbb', '#ffffff'],
    ['#000000', '#000000', '#ffffff', '#888888'],
    ['#000000', '#666666', '#eeeeee', '#000000']
  ];

  let _idSeq = 1;
  const nextId = () => `layer-${_idSeq++}`;

  // ============================================================
  // Default state
  // ============================================================
  function createDefaultState() {
    return {
      background: '#ffffff',
      centerMedallion: {
        radius: 70,
        symmetry: 8,
        pointiness: 55,
        color: '#000000',
        bgColor: '#ffffff'
      },
      layers: [
        {
          id: nextId(),
          name: 'Ring 1',
          patternType: 'rosette',
          symmetry: 10,
          width: 95,
          palette: ['#000000', '#000000', '#cccccc', '#ffffff'],
          border: { style: 'solid', thickness: 8, color: '#000000' }
        },
        {
          id: nextId(),
          name: 'Ring 2',
          patternType: 'strapwork',
          symmetry: 12,
          width: 70,
          palette: ['#000000', '#000000', '#888888', '#ffffff'],
          border: { style: 'diamond', thickness: 14, color: '#000000' }
        },
        {
          id: nextId(),
          name: 'Ring 3',
          patternType: 'kites',
          symmetry: 16,
          width: 100,
          palette: ['#000000', '#ffffff', '#666666', '#bbbbbb'],
          border: { style: 'solid', thickness: 6, color: '#000000' }
        },
        {
          id: nextId(),
          name: 'Ring 4',
          patternType: 'star',
          symmetry: 16,
          width: 90,
          palette: ['#000000', '#000000', '#dddddd', '#ffffff'],
          border: { style: 'zigzag', thickness: 10, color: '#000000' }
        }
      ]
    };
  }

  let state = createDefaultState();

  // ============================================================
  // Canvas / DOM setup
  // ============================================================
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;

  // ============================================================
  // Drawing — orchestration
  // ============================================================
  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    ctx.save();
    ctx.fillStyle = state.background;
    ctx.fillRect(0, 0, W, H);

    // Center medallion
    drawCenterMedallion(ctx, cx, cy, state.centerMedallion);

    let r = state.centerMedallion.radius;
    for (const layer of state.layers) {
      // Border before this ring
      if (layer.border && layer.border.style !== 'none' && layer.border.thickness > 0) {
        drawBorderBand(ctx, cx, cy, r, layer.border.thickness, layer.border.style, layer.border.color);
        r += layer.border.thickness;
      }
      drawRing(ctx, cx, cy, r, layer.width, layer);
      r += layer.width;
    }

    ctx.restore();
  }

  // Drawing — center medallion
  function drawCenterMedallion(ctx, cx, cy, m) {
    ctx.save();
    ctx.translate(cx, cy);

    // Field disc
    ctx.fillStyle = m.bgColor;
    ctx.beginPath();
    ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
    ctx.fill();

    // Star
    const points = m.symmetry;
    const outerR = m.radius * 0.92;
    const innerR = outerR * (1 - m.pointiness / 100 * 0.7);
    ctx.fillStyle = m.color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Inner small disc accent
    ctx.fillStyle = m.bgColor;
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Drawing — border bands
  function drawBorderBand(ctx, cx, cy, innerR, thickness, style, color) {
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
      const circumference = 2 * Math.PI * midR;
      const count = Math.max(8, Math.round(circumference / Math.max(thickness * 1.6, 8)));
      const step = (Math.PI * 2) / count;

      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const a0 = i * step;
        const a1 = a0 + step / 2;
        const a2 = a0 + step;
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
      const circumference = 2 * Math.PI * midR;
      const count = Math.max(16, Math.round(circumference / Math.max(thickness * 1.2, 8)));
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, thickness / 4);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = i % 2 === 0 ? innerR + thickness * 0.15 : outerR - thickness * 0.15;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (style === 'dotted') {
      const midR = (innerR + outerR) / 2;
      const dotR = Math.max(2, thickness * 0.32);
      const circumference = 2 * Math.PI * midR;
      const count = Math.max(12, Math.round(circumference / Math.max(thickness * 1.4, 6)));
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(midR * Math.cos(a), midR * Math.sin(a), dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ============================================================
  // Drawing — ring (rotational wedge replication)
  // ============================================================
  function clipAnnulus(ctx, innerR, outerR) {
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
  }

  function drawRing(ctx, cx, cy, innerR, width, layer) {
    const outerR = innerR + width;
    const midR = innerR + width / 2;
    const N = layer.symmetry;
    const palette = normalizePalette(layer.palette);

    ctx.save();
    ctx.translate(cx, cy);

    // Field background for the ring
    ctx.save();
    clipAnnulus(ctx, innerR, outerR);
    ctx.fillStyle = palette[0];
    ctx.fillRect(-outerR - 2, -outerR - 2, (outerR + 2) * 2, (outerR + 2) * 2);
    ctx.restore();

    // Repeat the wedge motif N times
    for (let i = 0; i < N; i++) {
      ctx.save();
      ctx.rotate((i / N) * Math.PI * 2);
      ctx.save();
      clipAnnulus(ctx, innerR, outerR);
      drawWedge(ctx, layer, palette, innerR, outerR, midR, N, i);
      ctx.restore();
      ctx.restore();
    }

    // Curved boundary arcs in the line color — these close off the
    // ring's annular edges so the polygon chords don't read as a jagged
    // silhouette where they meet the (curved) ring boundary.
    ctx.strokeStyle = palette[0];
    ctx.lineWidth = lineWeight(innerR, outerR, N);
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function normalizePalette(p) {
    const out = (p || []).slice(0, 4);
    while (out.length < 4) out.push(out[out.length - 1] || '#d4a04c');
    return out;
  }

  function drawWedge(ctx, layer, palette, innerR, outerR, midR, N, wedgeIndex) {
    switch (layer.patternType) {
      case 'star':       return drawWedgeStar(ctx, palette, innerR, outerR, midR, N);
      case 'rosette':    return drawWedgeRosette(ctx, palette, innerR, outerR, midR, N);
      case 'kites':      return drawWedgeKites(ctx, palette, innerR, outerR, midR, N);
      case 'hexagonal':  return drawWedgeHex(ctx, palette, innerR, outerR, midR, N);
      case 'strapwork':  return drawWedgeStrapwork(ctx, palette, innerR, outerR, midR, N, wedgeIndex);
    }
  }

  // ============================================================
  // Tessellation primitives
  // ============================================================
  //
  // Each wedge is a trapezoid bounded by:
  //   inner chord (A→D), outer chord (B→C), left radial edge (A→B),
  //   right radial edge (C→D).
  //
  //         B ─────── m_left ─────── A
  //         │                         │
  //       m_out      starCenter     m_in
  //         │                         │
  //         C ─────── m_right ────── D
  //
  // For each pattern we compute a set of polygons whose union is the
  // entire wedge — no gaps, no overlap, no "background showing through."
  // Inputs are the four wedge corners, the four edge midpoints, and four
  // interior "indent" points (one toward each corner along the line from
  // that corner toward the star center). The contact-angle parameter `t`
  // controls how deeply the indents sit inside the wedge — this is the
  // direct analogue of Hankin's PIC contact angle.
  //
  // The line network (polygon outlines) is stroked on top of all fills,
  // producing the continuous web of lines characteristic of Islamic
  // tessellations.

  function polar(r, a) { return { x: r * Math.cos(a), y: r * Math.sin(a) }; }
  function pt(x, y) { return { x, y }; }
  function mid(p, q) { return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; }
  function lerp(p, q, t) { return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }; }
  function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }

  // Compute the canonical wedge skeleton: corners, edge midpoints, star
  // center, and four "indent" points placed along corner→center rays.
  // `t` is the fractional distance from corner to center where the indent
  // sits (0 → at the corner, 1 → at the center). t≈0.5 yields balanced stars.
  function wedgeSkeleton(innerR, outerR, halfWedge, t) {
    const A = polar(innerR,  halfWedge);
    const B = polar(outerR,  halfWedge);
    const C = polar(outerR, -halfWedge);
    const D = polar(innerR, -halfWedge);

    const mIn    = mid(A, D);
    const mOut   = mid(B, C);
    const mLeft  = mid(A, B);
    const mRight = mid(C, D);

    const center = mid(mIn, mOut);

    const iA = lerp(A, center, t);
    const iB = lerp(B, center, t);
    const iC = lerp(C, center, t);
    const iD = lerp(D, center, t);

    return { A, B, C, D, mIn, mOut, mLeft, mRight, center, iA, iB, iC, iD };
  }

  function fillPoly(ctx, poly, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }

  function strokePoly(ctx, poly, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  // Render a tile: fill each polygon, then stroke the full line network
  // on top so the construction reads as a web of lines bounding closed regions.
  function paintTile(ctx, regions, lineColor, lineWidth) {
    for (const r of regions) fillPoly(ctx, r.poly, r.color);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const r of regions) strokePoly(ctx, r.poly, lineColor, lineWidth);
  }

  // Heuristic line weight scaled to ring size.
  function lineWeight(innerR, outerR, N) {
    const cell = Math.min(outerR - innerR, (2 * Math.PI / N) * (innerR + outerR) / 2);
    return Math.max(1.2, cell * 0.018);
  }

  // ============================================================
  // Pattern: Star (4 tips reaching edge midpoints + 4 corner kites)
  // ============================================================
  function drawWedgeStar(ctx, palette, innerR, outerR, midR, N) {
    const halfWedge = Math.PI / N;
    const s = wedgeSkeleton(innerR, outerR, halfWedge, 0.48);

    const star = [s.mOut, s.iB, s.mLeft, s.iA, s.mIn, s.iD, s.mRight, s.iC];
    const cornerB = [s.mOut, s.B, s.mLeft, s.iB];
    const cornerA = [s.mLeft, s.A, s.mIn, s.iA];
    const cornerD = [s.mIn, s.D, s.mRight, s.iD];
    const cornerC = [s.mRight, s.C, s.mOut, s.iC];

    const regions = [
      { poly: star,    color: palette[1] },
      { poly: cornerB, color: palette[2] },
      { poly: cornerA, color: palette[3] },
      { poly: cornerD, color: palette[2] },
      { poly: cornerC, color: palette[3] }
    ];

    paintTile(ctx, regions, palette[0], lineWeight(innerR, outerR, N));
  }

  // ============================================================
  // Pattern: Rosette (8 tips: 4 at edge midpoints, 4 at corner-indents,
  // forming a star with petal extensions in every direction)
  // ============================================================
  //
  // The rosette uses two layers of indents: an "inner ring" (8 indent
  // points near the star center) and an "outer ring" of 4 petal tips
  // pointing into each corner. Petals are wedge-cornered, so the
  // pattern reads as a star with kite-shaped petals.
  function drawWedgeRosette(ctx, palette, innerR, outerR, midR, N) {
    const halfWedge = Math.PI / N;
    const s = wedgeSkeleton(innerR, outerR, halfWedge, 0.55);

    // Inner ring of valleys (8 of them, between each pair of adjacent tips
    // in the cyclic order mOut, iB, mLeft, iA, mIn, iD, mRight, iC).
    // Pull each midpoint toward star center to create deeper indents.
    const valleyT = 0.42;
    const v0 = lerp(mid(s.mOut,  s.iB),    s.center, valleyT); // between mOut & iB
    const v1 = lerp(mid(s.iB,    s.mLeft), s.center, valleyT);
    const v2 = lerp(mid(s.mLeft, s.iA),    s.center, valleyT);
    const v3 = lerp(mid(s.iA,    s.mIn),   s.center, valleyT);
    const v4 = lerp(mid(s.mIn,   s.iD),    s.center, valleyT);
    const v5 = lerp(mid(s.iD,    s.mRight),s.center, valleyT);
    const v6 = lerp(mid(s.mRight,s.iC),    s.center, valleyT);
    const v7 = lerp(mid(s.iC,    s.mOut),  s.center, valleyT);

    // 16-vertex star (CCW from mOut). Tips alternate edge-midpoints
    // and corner-indents; valleys sit between each pair of tips.
    const star = [
      s.mOut, v0, s.iB, v1, s.mLeft, v2, s.iA, v3,
      s.mIn,  v4, s.iD, v5, s.mRight,v6, s.iC, v7
    ];

    // Corner hexagons — each follows the wedge boundary across one corner,
    // then traces the star outline back through the two flanking valleys
    // and the corner-indent tip. Non-convex (the iB-style tip pokes into
    // the region), but the canvas fill rule handles that correctly.
    const cornerB = [s.mOut, s.B, s.mLeft, v1, s.iB, v0];
    const cornerA = [s.mLeft, s.A, s.mIn, v3, s.iA, v2];
    const cornerD = [s.mIn, s.D, s.mRight, v5, s.iD, v4];
    const cornerC = [s.mRight, s.C, s.mOut, v7, s.iC, v6];

    const regions = [
      { poly: star,    color: palette[1] },
      { poly: cornerB, color: palette[2] },
      { poly: cornerA, color: palette[3] },
      { poly: cornerD, color: palette[2] },
      { poly: cornerC, color: palette[3] }
    ];

    paintTile(ctx, regions, palette[0], lineWeight(innerR, outerR, N));
  }

  // ============================================================
  // Pattern: Interlocking kites / rhombi (pure rhombic tiling)
  // ============================================================
  //
  // Decomposes the wedge into:
  //   1 central rhombus (the four corner-indents)
  //   4 corner kites (each enclosing a wedge corner)
  //   4 edge "wing" triangles (along each wedge edge)
  // The result reads as overlapping rhombic chains that interlock at
  // the wedge boundaries with their neighbors.
  function drawWedgeKites(ctx, palette, innerR, outerR, midR, N) {
    const halfWedge = Math.PI / N;
    const s = wedgeSkeleton(innerR, outerR, halfWedge, 0.55);

    const central = [s.iB, s.iA, s.iD, s.iC];          // central rhombus
    const cornerB = [s.mOut, s.B, s.mLeft, s.iB];
    const cornerA = [s.mLeft, s.A, s.mIn, s.iA];
    const cornerD = [s.mIn, s.D, s.mRight, s.iD];
    const cornerC = [s.mRight, s.C, s.mOut, s.iC];
    // Edge wings — triangles between two adjacent corner kites and the central rhombus
    const wingOut   = [s.mOut, s.iB, s.iC];
    const wingLeft  = [s.mLeft, s.iA, s.iB];
    const wingIn    = [s.mIn, s.iD, s.iA];
    const wingRight = [s.mRight, s.iC, s.iD];

    const regions = [
      { poly: central,   color: palette[1] },
      { poly: cornerB,   color: palette[2] },
      { poly: cornerA,   color: palette[3] },
      { poly: cornerD,   color: palette[2] },
      { poly: cornerC,   color: palette[3] },
      { poly: wingOut,   color: palette[3] },
      { poly: wingLeft,  color: palette[2] },
      { poly: wingIn,    color: palette[3] },
      { poly: wingRight, color: palette[2] }
    ];

    paintTile(ctx, regions, palette[0], lineWeight(innerR, outerR, N));
  }

  // ============================================================
  // Pattern: Hexagonal — central hexagon decomposed into six triangles
  // meeting at the star center, surrounded by four corner kites.
  // ============================================================
  function drawWedgeHex(ctx, palette, innerR, outerR, midR, N) {
    const halfWedge = Math.PI / N;
    const s = wedgeSkeleton(innerR, outerR, halfWedge, 0.50);

    // Hexagon vertices (CCW): mOut, iB, iA, mIn, iD, iC
    // Split into 6 triangles around the center for visual rhythm.
    const triE  = [s.center, s.mOut,  s.iB];
    const triNE = [s.center, s.iB,    s.iA];
    const triNW = [s.center, s.iA,    s.mIn];
    const triW  = [s.center, s.mIn,   s.iD];
    const triSW = [s.center, s.iD,    s.iC];
    const triSE = [s.center, s.iC,    s.mOut];

    const cornerB = [s.mOut, s.B, s.mLeft, s.iB];
    const cornerA = [s.mLeft, s.A, s.mIn, s.iA];
    const cornerD = [s.mIn, s.D, s.mRight, s.iD];
    const cornerC = [s.mRight, s.C, s.mOut, s.iC];

    const regions = [
      { poly: triE,    color: palette[1] },
      { poly: triNE,   color: palette[2] },
      { poly: triNW,   color: palette[1] },
      { poly: triW,    color: palette[2] },
      { poly: triSW,   color: palette[1] },
      { poly: triSE,   color: palette[2] },
      { poly: cornerB, color: palette[3] },
      { poly: cornerA, color: palette[3] },
      { poly: cornerD, color: palette[3] },
      { poly: cornerC, color: palette[3] }
    ];

    paintTile(ctx, regions, palette[0], lineWeight(innerR, outerR, N));
  }

  // ============================================================
  // Pattern: Strapwork — same tessellation skeleton rendered as
  // interlacing straps. Fills are applied first so no background
  // shows; then the strap line network is drawn over the seams with
  // over/under interlace by alternating wedge index.
  // ============================================================
  function drawWedgeStrapwork(ctx, palette, innerR, outerR, midR, N, wedgeIndex) {
    const halfWedge = Math.PI / N;
    const s = wedgeSkeleton(innerR, outerR, halfWedge, 0.46);

    // Use the same star/corner tessellation as 'star' pattern for fills.
    const star    = [s.mOut, s.iB, s.mLeft, s.iA, s.mIn, s.iD, s.mRight, s.iC];
    const cornerB = [s.mOut, s.B, s.mLeft, s.iB];
    const cornerA = [s.mLeft, s.A, s.mIn, s.iA];
    const cornerD = [s.mIn, s.D, s.mRight, s.iD];
    const cornerC = [s.mRight, s.C, s.mOut, s.iC];

    fillPoly(ctx, star,    palette[2]);
    fillPoly(ctx, cornerB, palette[3]);
    fillPoly(ctx, cornerA, palette[3]);
    fillPoly(ctx, cornerD, palette[3]);
    fillPoly(ctx, cornerC, palette[3]);

    // Strap line network: the 4 "radial" segments (corner→indent) and
    // the 4 "tangential" segments (edge-midpoint→indent) cross at each
    // indent point. We alternate which strap goes over by wedge index.
    const arcLen = (2 * Math.PI / N) * midR;
    const strapW = Math.min(outerR - innerR, arcLen) * 0.12;
    const edgePad = Math.max(2, strapW * 0.4);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const segs = [
      // Each strap = edge midpoint → indent → corner. Two crossing segments
      // per indent. Encoded as [from, via, to, isUnderAtVia].
      { from: s.mOut,   via: s.iB, to: s.B },
      { from: s.mLeft,  via: s.iB, to: s.B },
      { from: s.mLeft,  via: s.iA, to: s.A },
      { from: s.mIn,    via: s.iA, to: s.A },
      { from: s.mIn,    via: s.iD, to: s.D },
      { from: s.mRight, via: s.iD, to: s.D },
      { from: s.mRight, via: s.iC, to: s.C },
      { from: s.mOut,   via: s.iC, to: s.C }
    ];

    // Two-pass interlace: first pass strokes "under" straps with a gap
    // at each indent crossing; second pass strokes "over" straps fully.
    const overParity = wedgeIndex % 2;
    drawStraps(0); // under
    drawStraps(1); // over

    function drawStraps(layer) {
      segs.forEach((seg, i) => {
        const isOver = (i % 2) === overParity;
        if ((layer === 1) !== isOver) return;
        if (layer === 0) drawStrapWithGap(seg.from, seg.via);
        else drawStrapFull(seg.from, seg.via, seg.to);
      });
    }

    function drawStrapFull(a, b, c) {
      strokeWide([a, b, c], palette[0], strapW + edgePad);
      strokeWide([a, b, c], palette[1], strapW);
    }

    function drawStrapWithGap(a, b) {
      // Stop short of the crossing point so the over-strap reads on top.
      const len = dist(a, b);
      const gap = Math.min(strapW * 1.3, len * 0.35);
      const t1 = (len - gap) / len;
      const bShort = lerp(a, b, t1);
      strokeWide([a, bShort], palette[0], strapW + edgePad);
      strokeWide([a, bShort], palette[1], strapW);
    }

    function strokeWide(path, color, w) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
  }

  // ============================================================
  // UI — sidebar bindings
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const tpl = document.getElementById('layerTemplate');
  const layerList = $('layerList');

  function bindGlobalControls() {
    $('bgColor').value = state.background;
    $('bgColor').addEventListener('input', e => {
      state.background = e.target.value;
      draw();
    });

    const med = state.centerMedallion;
    $('medRadius').value = med.radius;
    $('medRadiusOut').textContent = med.radius;
    $('medRadius').addEventListener('input', e => {
      med.radius = parseInt(e.target.value, 10);
      $('medRadiusOut').textContent = med.radius;
      draw();
    });

    $('medSymmetry').value = String(med.symmetry);
    $('medSymmetry').addEventListener('change', e => {
      med.symmetry = parseInt(e.target.value, 10);
      draw();
    });

    $('medPointiness').value = med.pointiness;
    $('medPointiness').addEventListener('input', e => {
      med.pointiness = parseInt(e.target.value, 10);
      draw();
    });

    $('medColor').value = med.color;
    $('medColor').addEventListener('input', e => {
      med.color = e.target.value;
      draw();
    });

    $('medBgColor').value = med.bgColor;
    $('medBgColor').addEventListener('input', e => {
      med.bgColor = e.target.value;
      draw();
    });

    $('addLayer').addEventListener('click', addLayer);
    $('exportPng').addEventListener('click', exportPng);
    $('reset').addEventListener('click', () => {
      if (confirm('Reset to default pattern?')) {
        state = createDefaultState();
        bindGlobalControls();
        renderLayers();
        draw();
      }
    });
  }

  function addLayer() {
    const palette = PALETTES[state.layers.length % PALETTES.length].slice();
    const layer = {
      id: nextId(),
      name: `Ring ${state.layers.length + 1}`,
      patternType: PATTERN_TYPES[state.layers.length % PATTERN_TYPES.length],
      symmetry: 12,
      width: 80,
      palette,
      border: { style: 'solid', thickness: 8, color: palette[2] }
    };
    state.layers.push(layer);
    renderLayers();
    draw();
  }

  function deleteLayer(id) {
    state.layers = state.layers.filter(l => l.id !== id);
    state.layers.forEach((l, i) => { l.name = `Ring ${i + 1}`; });
    renderLayers();
    draw();
  }

  // ============================================================
  // UI — layer DOM
  // ============================================================
  function renderLayers() {
    layerList.innerHTML = '';
    for (const layer of state.layers) {
      layerList.appendChild(buildLayerNode(layer));
    }
    enableDragReorder();
  }

  function buildLayerNode(layer) {
    const node = tpl.content.cloneNode(true).firstElementChild;
    node.dataset.id = layer.id;

    node.querySelector('.layer-name').textContent = layer.name;

    // Header click — toggle expand (but ignore clicks on buttons / handle)
    node.querySelector('.layer-header').addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.drag-handle')) return;
      node.classList.toggle('expanded');
    });

    node.querySelector('.toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      node.classList.toggle('expanded');
    });

    node.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLayer(layer.id);
    });

    // Pattern type
    const ptSelect = node.querySelector('.pattern-type');
    ptSelect.value = layer.patternType;
    ptSelect.addEventListener('change', e => {
      layer.patternType = e.target.value;
      draw();
    });

    // Symmetry
    const symSelect = node.querySelector('.symmetry');
    symSelect.value = String(layer.symmetry);
    symSelect.addEventListener('change', e => {
      layer.symmetry = parseInt(e.target.value, 10);
      draw();
    });

    // Width
    const widthInput = node.querySelector('.width');
    const widthOut = node.querySelector('.width-out');
    widthInput.value = layer.width;
    widthOut.textContent = layer.width;
    widthInput.addEventListener('input', e => {
      layer.width = parseInt(e.target.value, 10);
      widthOut.textContent = layer.width;
      draw();
    });

    // Palette swatches
    const palette = normalizePalette(layer.palette);
    layer.palette = palette;
    node.querySelectorAll('.swatch').forEach((sw, i) => {
      sw.value = palette[i];
      sw.addEventListener('input', e => {
        layer.palette[i] = e.target.value;
        draw();
      });
    });

    // Border
    const bStyle = node.querySelector('.border-style');
    bStyle.value = layer.border.style;
    bStyle.addEventListener('change', e => {
      layer.border.style = e.target.value;
      draw();
    });

    const bThick = node.querySelector('.border-thickness');
    const bThickOut = node.querySelector('.border-thickness-out');
    bThick.value = layer.border.thickness;
    bThickOut.textContent = layer.border.thickness;
    bThick.addEventListener('input', e => {
      layer.border.thickness = parseInt(e.target.value, 10);
      bThickOut.textContent = layer.border.thickness;
      draw();
    });

    const bColor = node.querySelector('.border-color');
    bColor.value = layer.border.color;
    bColor.addEventListener('input', e => {
      layer.border.color = e.target.value;
      draw();
    });

    return node;
  }

  // ============================================================
  // UI — drag reorder
  // ============================================================
  let dragId = null;

  function enableDragReorder() {
    const items = layerList.querySelectorAll('.layer');
    items.forEach(item => {
      item.addEventListener('dragstart', e => {
        dragId = item.dataset.id;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox
        try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {}
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        layerList.querySelectorAll('.layer').forEach(n => n.classList.remove('drop-target'));
        dragId = null;
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        if (!dragId || item.dataset.id === dragId) return;
        layerList.querySelectorAll('.layer').forEach(n => n.classList.remove('drop-target'));
        item.classList.add('drop-target');
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drop-target');
      });

      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drop-target');
        if (!dragId || item.dataset.id === dragId) return;

        const fromIdx = state.layers.findIndex(l => l.id === dragId);
        const toIdx = state.layers.findIndex(l => l.id === item.dataset.id);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = state.layers.splice(fromIdx, 1);
        state.layers.splice(toIdx, 0, moved);
        state.layers.forEach((l, i) => { l.name = `Ring ${i + 1}`; });

        renderLayers();
        draw();
      });
    });
  }

  // ============================================================
  // Export
  // ============================================================
  function exportPng() {
    const link = document.createElement('a');
    link.download = `islamic-pattern-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ============================================================
  // Boot
  // ============================================================
  bindGlobalControls();
  renderLayers();
  draw();
})();
