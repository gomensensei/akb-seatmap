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
  function addItem(item) { items.push(item); }

  function addSeatGroup({ row, nums, x, y, w = 14, h = 17, gap = 2 }) {
    nums.forEach((num, index) => {
      addItem({
        id: `main-r${row}-s${num}`,
        type: 'seat',
        zone: 'main',
        row,
        number: num,
        x: x + index * (w + gap),
        y,
        w,
        h
      });
    });
  }

  function addMark(id, x, y, number, zone) {
    addItem({
      id,
      type: 'mark',
      zone,
      number,
      x,
      y,
      w: 16,
      h: 16
    });
  }

  addSeatGroup({ row: 1, nums: [4,5,6,7,8,9], x: 90, y: 281 });
  addSeatGroup({ row: 1, nums: [13,14,15,16,17,18,19,20], x: 261, y: 281 });
  addSeatGroup({ row: 1, nums: [24,25,26,27,28,29,30], x: 436, y: 281 });

  addSeatGroup({ row: 2, nums: [4,5,6,7,8,9], x: 90, y: 317 });
  addSeatGroup({ row: 2, nums: [11,12,13,14,15,16,17,18,19,20,21], x: 225, y: 317 });
  addSeatGroup({ row: 2, nums: [24,25,26,27,28,29,30], x: 436, y: 317 });

  addSeatGroup({ row: 3, nums: [4,5,6,7,8,9], x: 90, y: 353 });
  addSeatGroup({ row: 3, nums: [11,12,13,14,15,16,17,18,19,20,21,22], x: 225, y: 353 });

  addSeatGroup({ row: 4, nums: [2,3,4,5,6,7,8,9], x: 67, y: 389 });
  addSeatGroup({ row: 4, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 214, y: 389 });
  addSeatGroup({ row: 4, nums: [25,26,27,28,29], x: 457, y: 389 });

  addSeatGroup({ row: 5, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 425 });
  addSeatGroup({ row: 5, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 214, y: 425 });
  addSeatGroup({ row: 5, nums: [25,26,27,28,29], x: 457, y: 425 });

  addSeatGroup({ row: 6, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 461 });
  addSeatGroup({ row: 6, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 214, y: 461 });
  addSeatGroup({ row: 6, nums: [25,26,27,28,29], x: 457, y: 461 });

  addSeatGroup({ row: 7, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 490 });
  addSeatGroup({ row: 7, nums: [25,26,27,28,29], x: 456, y: 490 });

  const rearXs = [105,135,165,195,225,255,285,315,345,375,405,435,465,495,525];
  const rearNums = [7,6,5,4,3,2,1,0,1,2,3,4,5,6,7];
  rearXs.forEach((x, index) => {
    addMark(`rear-stage-${index + 1}`, x, 58, rearNums[index], 'rear-stage');
    addMark(`rear-main-${index + 1}`, x, 211, rearNums[index], 'rear-main');
  });

  const sideY = [243, 268, 293, 329, 380];
  [8,9,10,11,12].forEach((num, index) => {
    addMark(`left-side-${num}`, 49, sideY[index], num, 'left-side');
    addMark(`right-side-${num}`, 575, sideY[index], num, 'right-side');
  });


  function addStandingCustom(area, cells) {
    cells.forEach(cell => {
      addItem({
        id: `standing-${area.toLowerCase()}-r${cell.row}-c${cell.number}`,
        type: 'standing',
        area,
        zone: `standing-${area.toLowerCase()}`,
        row: cell.row,
        number: cell.number,
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h
      });
    });
  }

  function addStandingArea({ area, x, y, w, h, rows, cols }) {
    const gap = 2;
    const cellW = (w - (cols - 1) * gap) / cols;
    const cellH = (h - (rows - 1) * gap) / rows;
    for (let r = 1; r <= rows; r += 1) {
      for (let c = 1; c <= cols; c += 1) {
        addItem({
          id: `standing-${area.toLowerCase()}-r${r}-c${c}`,
          type: 'standing',
          area,
          zone: `standing-${area.toLowerCase()}`,
          row: r,
          number: c,
          x: x + (c - 1) * (cellW + gap),
          y: y + (r - 1) * (cellH + gap),
          w: cellW,
          h: cellH
        });
      }
    }
  }

  addStandingArea({ area: 'A', x: 64, y: 521, w: 124, h: 36, rows: 3, cols: 9 });
  addStandingArea({ area: 'B', x: 219, y: 516, w: 205, h: 42, rows: 3, cols: 14 });
  addStandingArea({ area: 'C', x: 459, y: 520, w: 88, h: 30, rows: 2, cols: 5 });
  addStandingArea({ area: 'E', x: 458, y: 568, w: 98, h: 18, rows: 1, cols: 6 });
  addStandingCustom('D', [
    { row: 1, number: 1, x: 65, y: 592, w: 13, h: 12 },
    { row: 1, number: 2, x: 80, y: 592, w: 13, h: 12 },
    { row: 1, number: 3, x: 96, y: 592, w: 13, h: 12 },
    { row: 1, number: 4, x: 112, y: 593, w: 13, h: 12 },
    { row: 1, number: 5, x: 128, y: 592, w: 13, h: 12 },
    { row: 1, number: 6, x: 144, y: 593, w: 13, h: 12 },
    { row: 1, number: 7, x: 160, y: 592, w: 13, h: 12 },
    { row: 2, number: 1, x: 65, y: 607, w: 13, h: 12 },
    { row: 2, number: 2, x: 80, y: 608, w: 13, h: 12 },
    { row: 2, number: 3, x: 96, y: 607, w: 13, h: 12 },
    { row: 2, number: 4, x: 112, y: 608, w: 13, h: 12 },
    { row: 2, number: 5, x: 128, y: 607, w: 13, h: 12 },
    { row: 2, number: 6, x: 144, y: 608, w: 13, h: 12 },
    { row: 2, number: 7, x: 160, y: 607, w: 13, h: 12 }
  ]);

  window.SEATMAP_DATA = {
    version: '2.4.0',
    width: 640,
    height: 760,
    exportFooterHeight: 134,
    performances,
    items
  };
}());
