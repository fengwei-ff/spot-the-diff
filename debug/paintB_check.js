const { paintB } = require('../src/render/DiffPainter.js');
const fs = require('fs');
const path = require('path');

// Mock canvas environment
function createMockContext(width, height) {
  const stateStack = [];
  let currentState = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
  };
  const calls = [];

  function log(name, args) {
    calls.push({ name, args: args.map((a) => (typeof a === 'object' ? '[object]' : a)) });
  }

  return {
    width,
    height,
    calls,
    save: () => { stateStack.push({ ...currentState }); log('save', []); },
    restore: () => { currentState = stateStack.pop() || currentState; log('restore', []); },
    beginPath: () => log('beginPath', []),
    arc: (...args) => log('arc', args),
    ellipse: (...args) => log('ellipse', args),
    fill: () => log('fill', []),
    fillRect: (...args) => log('fillRect', args),
    stroke: () => log('stroke', []),
    strokeRect: (...args) => log('strokeRect', args),
    clip: () => log('clip', []),
    drawImage: (...args) => log('drawImage', args),
    createRadialGradient: (...args) => {
      log('createRadialGradient', args);
      return {
        addColorStop: (...stopArgs) => log('addColorStop', stopArgs),
      };
    },
    set fillStyle(v) { currentState.fillStyle = v; log('set fillStyle', [v]); },
    set strokeStyle(v) { currentState.strokeStyle = v; log('set strokeStyle', [v]); },
    set lineWidth(v) { currentState.lineWidth = v; log('set lineWidth', [v]); },
    set globalCompositeOperation(v) { currentState.globalCompositeOperation = v; log('set globalCompositeOperation', [v]); },
    get fillStyle() { return currentState.fillStyle; },
    get strokeStyle() { return currentState.strokeStyle; },
    get lineWidth() { return currentState.lineWidth; },
    get globalCompositeOperation() { return currentState.globalCompositeOperation; },
  };
}

function createMockCanvas(width, height) {
  const ctx = createMockContext(width, height);
  return {
    width,
    height,
    getContext: () => ctx,
    ctx,
  };
}

const env = {
  createOffscreenCanvas: (w, h) => createMockCanvas(w, h),
};

const south = require('../levels/south_archive.js');
const level = south.levels.find((l) => l.levelId === 'archive_01');

const mockSource = {
  width: level.imageSize.w,
  height: level.imageSize.h,
};

try {
  const result = paintB(env, mockSource, level.imageSize, level.diffs);
  console.log('paintB returned:', typeof result);
  console.log('canvas size:', result.width, 'x', result.height);
  console.log('total ctx calls:', result.ctx.calls.length);
  console.log('first 10 calls:', result.ctx.calls.slice(0, 10).map((c) => c.name));
  console.log('last 10 calls:', result.ctx.calls.slice(-10).map((c) => c.name));
  console.log('drawImage calls:', result.ctx.calls.filter((c) => c.name === 'drawImage').length);
  console.log('createRadialGradient calls:', result.ctx.calls.filter((c) => c.name === 'createRadialGradient').length);
} catch (err) {
  console.error('paintB threw:', err.message);
  console.error(err.stack);
}
