// 把原型打包成單一 HTML 檔，不用伺服器，雙擊就可以玩。
// 輸出：dist/index.html（文字版）、dist/desk.html（桌面手感切片，需要連網載入 Phaser 和字型）。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const IMPORT = /^import\s+(?:\*\s+as\s+(\w+)|\{([\s\S]*?)\})\s+from\s+'(\.{1,2}\/[^']+)';[ \t]*$/gm;
const EXPORT = /^export (?:async function|function|const|class) (\w+)/gm;

// 從入口沿著 import 找出所有模組，被依賴的排前面；每個模組包成一個立即執行的函數，只交出它 export 的名字。
function bundle(entry) {
  const ids = new Map();
  const order = [];
  const visit = (file) => {
    if (ids.has(file)) return;
    ids.set(file, null);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT)) visit(resolve(dirname(file), m[3]));
    ids.set(file, `__m${order.length}`);
    order.push({ file, src });
  };
  visit(resolve(root, entry));
  return order.map(({ file, src }) => {
    const body = src
      .replace(IMPORT, (_, ns, names, path) => {
        const dep = ids.get(resolve(dirname(file), path));
        return ns ? `const ${ns} = ${dep};` : `const {${names}} = ${dep};`;
      })
      .replace(/^export /gm, '');
    const names = [...src.matchAll(EXPORT)].map((m) => m[1]);
    return `// ${relative(root, file)}\nconst ${ids.get(file)} = (() => {\n${body}\nreturn { ${names.join(', ')} };\n})();`;
  }).join('\n');
}

function build(page, entry, out) {
  const tag = '<script type="module" src="main.js"></script>';
  const html = readFileSync(join(root, page), 'utf8');
  if (!html.includes(tag)) throw new Error(`${page} 找不到 main.js 的 script 標籤`);
  const result = html.replace(tag, () => `<script type="module">\n${bundle(entry)}\n</script>`);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, out), result);
  console.log(`${out}（${Math.round(result.length / 1024)} KB）`);
}

build('index.html', 'main.js', 'dist/index.html');
build('desk/index.html', 'desk/main.js', 'dist/desk.html');
