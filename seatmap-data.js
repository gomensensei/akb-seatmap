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
    items.push(item);
  }

  function addSeatGroup({ row, nums, x, y, w = 14, h = 17, gap = 2, kind = 'main' }) {
    nums.forEach((num, index) => {
      addItem({
        id: `main-r${row}-s${num}`,
        type: 'seat',
        kind,
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

  function addDarkSeat(id, label, x, y, number, zone) {
    addItem({
      id,
      type: 'seat',
      kind: 'dark',
      label,
      number,
      zone,
      x,
      y,
      w: 16,
      h: 16
    });
  }

  // Main seated area.
  addSeatGroup({ row: 1, nums: [4,5,6,7,8,9], x: 90, y: 281 });
  addSeatGroup({ row: 1, nums: [13,14,15,16,17,18,19,20], x: 261, y: 281 });
  addSeatGroup({ row: 1, nums: [24,25,26,27,28,29,30], x: 436, y: 281 });

  addSeatGroup({ row: 2, nums: [4,5,6,7,8,9], x: 90, y: 317 });
  addSeatGroup({ row: 2, nums: [11,12,13,14,15,16,17,18,19,20,21], x: 225, y: 317 });
  addSeatGroup({ row: 2, nums: [24,25,26,27,28,29,30], x: 436, y: 317 });

  addSeatGroup({ row: 3, nums: [4,5,6,7,8,9], x: 90, y: 353 });
  addSeatGroup({ row: 3, nums: [11,12,13,14,15,16,17,18,19,20,21,22], x: 225, y: 353 });
  addSeatGroup({ row: 3, nums: [24,25,26,27,28,29,30], x: 436, y: 353 });

  addSeatGroup({ row: 4, nums: [2,3,4,5,6,7,8,9], x: 67, y: 389 });
  addSeatGroup({ row: 4, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 214, y: 389 });
  addSeatGroup({ row: 4, nums: [25,26,27,28,29,30], x: 457, y: 389 });

  addSeatGroup({ row: 5, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 425 });
  addSeatGroup({ row: 5, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 214, y: 425 });
  addSeatGroup({ row: 5, nums: [25,26,27,28,29,30], x: 457, y: 425 });

  addSeatGroup({ row: 6, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 461 });
  addSeatGroup({ row: 6, nums: [10,11,12,13,14,15,16,17,18,19,20,21,22,23], x: 214, y: 461 });
  addSeatGroup({ row: 6, nums: [25,26,27,28,29,30], x: 457, y: 461 });

  addSeatGroup({ row: 7, nums: [1,2,3,4,5,6,7,8,9], x: 53, y: 497 });
  addSeatGroup({ row: 7, nums: [25,26,27,28,29,30], x: 457, y: 497 });

  // Rear stage-side row and rear main row.
  const rearXs = [103,133,163,193,223,253,283,313,343,373,403,433,463,493,523];
  const rearNums = [7,6,5,4,3,2,1,0,1,2,3,4,5,6,7];
  rearXs.forEach((x, index) => {
    addDarkSeat(`rear-stage-${index + 1}`, `rear stage ${rearNums[index]}`, x, 55, rearNums[index], 'rear-stage');
    addDarkSeat(`rear-main-${index + 1}`, `rear main ${rearNums[index]}`, x, 214, rearNums[index], 'rear-main');
  });

  // Side seats 8–12.
  const sideY = [243, 268, 293, 329, 380];
  [8,9,10,11,12].forEach((num, index) => {
    addDarkSeat(`left-side-${num}`, `left side ${num}`, 49, sideY[index], num, 'left-side');
    addDarkSeat(`right-side-${num}`, `right side ${num}`, 575, sideY[index], num, 'right-side');
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
          kind: 'standing',
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

  addStandingArea({ area: 'A', x: 64, y: 501, w: 124, h: 42, rows: 3, cols: 9 });
  addStandingArea({ area: 'B', x: 218, y: 497, w: 204, h: 46, rows: 3, cols: 14 });
  addStandingArea({ area: 'C', x: 457, y: 501, w: 92, h: 39, rows: 2, cols: 5 });
  addStandingArea({ area: 'D', x: 65, y: 586, w: 103, h: 30, rows: 2, cols: 7 });
  addStandingArea({ area: 'E', x: 452, y: 548, w: 104, h: 20, rows: 1, cols: 6 });

  window.SEATMAP_DATA = {
    version: '2.0.0',
    width: 640,
    height: 760,
    exportFooterHeight: 134,
    performances,
    items
  };
}());
