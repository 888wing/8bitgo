// 把原型打包成一個 HTML 檔，不用伺服器，雙擊就可以玩。輸出：dist/index.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const read = (file) => readFileSync(new URL(file, dir), 'utf8');
const exportsOf = (src) => [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
const unexport = (src) => src.replace(/^export /gm, '');

const caseSrc = read('case.js');
const engineSrc = read('engine.js');
const mainSrc = read('main.js');

const caseModule = `const C = (() => {\n${unexport(caseSrc)}\nreturn { ${exportsOf(caseSrc).join(', ')} };\n})();`;
const engineBody = unexport(engineSrc).replace(/^import \{([\s\S]*?)\} from '\.\/case\.js';/m, 'const {$1} = C;');
const engineModule = `const E = (() => {\n${engineBody}\nreturn { ${exportsOf(engineSrc).join(', ')} };\n})();`;
const mainModule = mainSrc.replace(/^import .*$/gm, '');

const tag = '<script type="module" src="main.js"></script>';
const page = read('index.html');
if (!page.includes(tag)) throw new Error('index.html 找不到 main.js 的 script 標籤');
const html = page.replace(tag, `<script type="module">\n${caseModule}\n${engineModule}\n${mainModule}\n</script>`);

mkdirSync(new URL('dist/', dir), { recursive: true });
writeFileSync(new URL('dist/index.html', dir), html);
console.log(`dist/index.html（${Math.round(html.length / 1024)} KB）`);
