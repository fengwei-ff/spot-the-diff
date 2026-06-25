// 极简打包：把 src/**/*.js + game.js 合并为浏览器可直接运行的 demo-bundle.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const files = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'levels'));
files.push(path.join(root, 'game.js'));

const modules = files.map((p) => {
  const rel = path.relative(root, p).replace(/\\/g, '/');
  const src = fs.readFileSync(p, 'utf8');
  return { rel, src };
});

const out = `// auto-generated bundle
(function(){
  const __modules = {};
  const __cache = {};
  function __register(name, fn) { __modules[name] = fn; }
  function __resolve(from, req) {
    // 解析相对路径
    const fromDir = from.split('/').slice(0, -1);
    const parts = req.split('/');
    const stack = [...fromDir];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') stack.pop();
      else stack.push(p);
    }
    let key = stack.join('/');
    if (!key.endsWith('.js')) key += '.js';
    return key;
  }
  function __require(from, req) {
    const key = __resolve(from, req);
    if (__cache[key]) return __cache[key].exports;
    const m = { exports: {} };
    __cache[key] = m;
    const fn = __modules[key];
    if (!fn) throw new Error('Module not found: ' + key + ' (from ' + from + ')');
    fn(m, m.exports, (r) => __require(key, r));
    return m.exports;
  }

${modules.map((m) => `  __register(${JSON.stringify(m.rel)}, function(module, exports, require) {
${m.src}
  });`).join('\n')}

  __require('', './game.js');
})();
`;

fs.writeFileSync(path.join(root, 'demo-bundle.js'), out);
console.log('built demo-bundle.js (' + modules.length + ' modules)');
