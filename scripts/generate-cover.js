/**
 * 生成微信小游戏「通用素材封面」650×250 JPG（≤80KB）
 * 运行: node scripts/generate-cover.js
 */
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'promo', 'cover-650x250.jpg');
const PY = path.join(__dirname, 'generate-cover.py');

try {
  execFileSync('python3', [PY, OUT], { stdio: 'inherit', cwd: ROOT });
  console.log('封面已生成:', OUT);
} catch (e) {
  process.exit(1);
}
