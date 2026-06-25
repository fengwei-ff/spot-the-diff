// 命中测试：把屏幕坐标换算到图片本地坐标，并判断是否落在差异圆内
class DiffHitTester {
  constructor(layout) {
    // layout: { aRect:{x,y,w,h}, bRect:{x,y,w,h}, imageSize:{w,h} }
    this.layout = layout;
  }

  // 返回 { onImage: 'A'|'B'|null, localX, localY }
  toLocal(screenX, screenY) {
    const { aRect, bRect, imageSize } = this.layout;
    const inRect = (r) => screenX >= r.x && screenX <= r.x + r.w
      && screenY >= r.y && screenY <= r.y + r.h;
    let onImage = null;
    let rect = null;
    if (inRect(aRect)) { onImage = 'A'; rect = aRect; }
    else if (inRect(bRect)) { onImage = 'B'; rect = bRect; }
    if (!onImage) return { onImage: null, localX: 0, localY: 0 };
    const sx = imageSize.w / rect.w;
    const sy = imageSize.h / rect.h;
    return {
      onImage,
      localX: (screenX - rect.x) * sx,
      localY: (screenY - rect.y) * sy,
    };
  }

  hitDiff(localX, localY, diffs, foundIds) {
    for (const d of diffs) {
      if (foundIds.has(d.id)) continue;
      const hitR = d.hitR ?? d.r;
      const dx = localX - d.x;
      const dy = localY - d.y;
      if (dx * dx + dy * dy <= hitR * hitR) return d;
    }
    return null;
  }
}

module.exports = DiffHitTester;
