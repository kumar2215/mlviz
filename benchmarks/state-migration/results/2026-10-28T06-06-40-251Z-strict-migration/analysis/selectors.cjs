const fs = require('node:fs');
const path = require('node:path');
const repo = process.cwd();
const ts = require(path.join(repo, 'benchmarks/state-migration/.cache/bddf2967c3bf74ded9a88a2abc2924e914b97583/frontend/node_modules/typescript'));
const hooks = new Set(['useDecisionTree', 'useKNN', 'useKMeans', 'useLinearRegression', 'useSVM', 'useModel']);
const files = [];
function walk(dir) { for (const d of fs.readdirSync(dir, {withFileTypes:true})) { const p=path.join(dir,d.name); if(d.isDirectory()) walk(p); else if(/\.tsx?$/.test(p)) files.push(p); } }
walk(path.join(repo,'frontend/src'));
let changed = 0;
for (const file of files) {
  let code = fs.readFileSync(file,'utf8');
  const source = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const edits=[]; let shallow=false;
  function visit(node) {
    if(ts.isVariableStatement(node) && node.declarationList.declarations.length===1) {
      const d=node.declarationList.declarations[0], call=d.initializer;
      if(call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && hooks.has(call.expression.text) && call.arguments.length===0) {
        if(!ts.isObjectBindingPattern(d.name)) throw new Error('Unreviewed broad store read: '+file+': '+d.getText(source));
        const hook=call.expression.text;
        const lines=d.name.elements.map(e=>{
          if(!ts.isIdentifier(e.name) || e.dotDotDotToken || e.initializer) throw new Error('Unsupported binding');
          const key=e.propertyName?.getText(source)||e.name.text;
          const select=key==='manualTree' ? (shallow=true,`useShallow(state => state.${key})`) : `state => state.${key}`;
          return `const ${e.name.text} = ${hook}(${select});`;
        });
        const indent=' '.repeat(source.getLineAndCharacterOfPosition(node.getStart(source)).character);
        edits.push([node.getStart(source),node.getEnd(),lines.join('\n'+indent)]);
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  for(const [a,b,replacement] of edits.sort((a,b)=>b[0]-a[0])) code=code.slice(0,a)+replacement+code.slice(b);
  if(shallow && !code.includes('from "zustand/react/shallow"')) code='import { useShallow } from "zustand/react/shallow";\n'+code;
  if(edits.length) {fs.writeFileSync(file,code); changed++;}
}
console.log(JSON.stringify({selectorFiles:changed}));
