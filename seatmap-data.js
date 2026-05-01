/* global window */
(function () {
  'use strict';

  const performances = [
    { id: 'reset', label: 'ＲＥＳＥＴ公演' },
    { id: 'kokokarada', label: 'ここからだ公演' },
    { id: 'tewotsunaginagara', label: '手をつなぎながら公演' },
    { id: 'sokonimirai', label: 'そこに未来はある公演' }
  ];

  const items = [];

  function addItem(item) {
    items.push({
      h: item.h || 16,
      w: item.w || 14,
      type: 'seat',
      ...item
    });
  }

  function addSeatGroup({ row, nums, x, y, w = 14, h = 17, gap = 2, section = 'main' }) {
    nums.forEach((num, index) => {
      addItem({
        id: `main-r${row}-s${num}`,
        type: 'seat',
        section,
        zone: 'main',
        row,
        number: num,
        label: `${row}列 ${num}番`,
        x: x + index * (w + gap),
        y,
        w,
        h
      });
    });
  }

  // Main seated area. Coordinates follow the uploaded 640 × 760 reference map.
  addSeatGroup({ row: 1, nums: [4,5,6,7,8,9], x: 91, y: 282 });
  addSeatGroup({ row: 1, nums: [13,14,15,16,17,18,19,20], x: 260, y: 282 });
  addSeatGroup({ row: 1, nums: [24,25,26,27,28,29,30], x: 435, y: 282 });

  addSeatGroup({ row: 2, nums: [4,5,6,7,8,9], x: 91, y: 318 });
  addSeatGroup({ row: 2, nums: [11,12,13,14,15,16,17,18,19,20,21], x: 226, y: 318 });
  addSeatGroup({ row: 2, nums: [24,25,26,27,28,29,30], x: 435, y: 318 });

  addSeatGroup({ row: 3, nums: [4,5,6,7,8,9], x: 91, y: 354 });
  addSeatGroup({ row: 3, nums: [11,12,13,14,15,16,17,18,19,20,21,22], x: 226, y: 354 });
  addSeatGroup({ row: 3, nums: [24,25,26,27,28,29,30], x: 435, y: 354 });

  addSeatGroup({ row: 4, nums: [2,3,4,5,6,7,8,9], x: 68, y: 389 });
  addSeatGroup({ row: 4, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 215, y: 389 });
  addSeatGroup({ row: 4, nums: [25,26,27,28,29,30], x: 456, y: 389 });

  addSeatGroup({ row: 5, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 424 });
  addSeatGroup({ row: 5, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 215, y: 424 });
  addSeatGroup({ row: 5, nums: [25,26,27,28,29,30], x: 456, y: 424 });

  addSeatGroup({ row: 6, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 460 });
  addSeatGroup({ row: 6, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 215, y: 460 });
  addSeatGroup({ row: 6, nums: [25,26,27,28,29,30], x: 456, y: 460 });

  addSeatGroup({ row: 7, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 493 });
  addSeatGroup({ row: 7, nums: [25,26,27,28,29,30], x: 456, y: 493 });

  // Black numbered locations around the map. These are selectable as reference points.
  const rearXs = [102,132,162,194,224,254,284,314,344,374,404,433,463,493,522];
  const rearLabels = ['下手7','下手6','下手5','下手4','下手3','下手2','下手1','0','上手1','上手2','上手3','上手4','上手5','上手6','上手7'];
  rearXs.forEach((x, index) => {
    addItem({
      id: `rear-stage-${index + 1}`,
      type: 'seat',
      section: 'rear-stage',
      zone: 'rear-stage',
      label: `後方ステージ側 ${rearLabels[index]}`,
      x,
      y: 58,
      w: 16,
      h: 15
    });
  });

  const backXs = [102,132,162,192,224,254,286,316,346,374,404,433,463,493,522];
  backXs.forEach((x, index) => {
    addItem({
      id: `rear-main-${index + 1}`,
      type: 'seat',
      section: 'rear-main',
      zone: 'rear-main',
      label: `後方 ${rearLabels[index]}`,
      x,
      y: 216,
      w: 16,
      h: 15
    });
  });

  [
    { side: '下手', prefix: 'left', x: 84, ys: [242,263,288,326,376] },
    { side: '上手', prefix: 'right', x: 543, ys: [242,263,288,326,376] }
  ].forEach(side => {
    [8,9,10,11,12].forEach((num, index) => {
      addItem({
        id: `${side.prefix}-side-${num}`,
        type: 'seat',
        section: `${side.prefix}-side`,
        zone: `${side.prefix}-side`,
        label: `${side.side}サイド ${num}番`,
        x: side.x,
        y: side.ys[index],
        w: 17,
        h: 16
      });
    });
  });

  function addStandingArea({ area, x, y, w, h, rows, cols }) {
    const gap = 2;
    const cellW = (w - (cols - 1) * gap) / cols;
    const cellH = (h - (rows - 1) * gap) / rows;
    for (let r = 1; r <= rows; r += 1) {
      for (let c = 1; c <= cols; c += 1) {
        addItem({
          id: `standing-${area.toLowerCase()}-r${r}-c${c}`,
          type: 'standing',
          section: 'standing',
          zone: `立見エリア${area}`,
          area,
          row: r,
          number: c,
          label: `立見エリア${area} ${r}行 ${c}番`,
          x: x + (c - 1) * (cellW + gap),
          y: y + (r - 1) * (cellH + gap),
          w: cellW,
          h: cellH
        });
      }
    }
  }

  addStandingArea({ area: 'A', x: 62, y: 502, w: 126, h: 45, rows: 3, cols: 9 });
  addStandingArea({ area: 'B', x: 217, y: 500, w: 207, h: 48, rows: 3, cols: 14 });
  addStandingArea({ area: 'C', x: 456, y: 501, w: 97, h: 39, rows: 2, cols: 5 });
  addStandingArea({ area: 'D', x: 62, y: 584, w: 104, h: 31, rows: 2, cols: 7 });
  addStandingArea({ area: 'E', x: 451, y: 545, w: 107, h: 27, rows: 1, cols: 6 });

  window.SEATMAP_DATA = {
    version: '1.0.0',
    width: 640,
    height: 760,
    exportFooterHeight: 134,
    performances,
    items
  };
}());
