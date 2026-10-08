const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Source modules execute only with explicit imports, dummy env, and no process/network API.
module.exports = function load(file, env = {}, imports = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, process: { env }, TextEncoder, Buffer, Date, Error, SyntaxError,
    console: { log() {}, error() {}, warn() {} },
    require: name => { if (Object.hasOwn(imports, name)) return imports[name]; throw new Error(`Unexpected dependency: ${name}`); },
  }, { filename: file });
  return exports;
};
