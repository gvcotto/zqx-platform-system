// One-time mechanical JSX localization. Only static UI text / known label slots.
// Never changes record values, enum values, route keys, identities or CSS tokens.
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const files=['components/product/ModernWorkspace.tsx','components/product/shell.tsx','components/product/ui.tsx'];
for(const path of files){
 const source=readFileSync(path,'utf8');
 if(source.includes('// product-localization-applied'))continue;
 const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const edits=[];const owners=new Set();let textUsed=false;
 const slots=path.endsWith('ui.tsx')?['title','subtitle','label','detail','status','c','m']:path.endsWith('shell.tsx')?['page','item']:['label','o','s','error','notice'];
 function owner(node){while(node){if(ts.isFunctionDeclaration(node)&&/^[A-Z]/.test(node.name?.text??''))return node;node=node.parent;}throw new Error('UI translation outside component');}
 function replace(n,value){edits.push({start:n.getStart(tree),end:n.end,value});}
 function translated(n,value){replace(n,value);owners.add(owner(n));}
 function walk(n){
  if(ts.isJsxText(n)&&n.text.trim()){
   const value=n.text.replace(/\s+/g,' ').trim();
   if(/[A-Za-z]/.test(value)){replace(n,`<ProductText text={${JSON.stringify(value)}} />`);textUsed=true;}
  }
  if(ts.isJsxAttribute(n)&&n.initializer&&ts.isStringLiteral(n.initializer)&&['aria-label','placeholder'].includes(n.name.getText(tree))){translated(n.initializer,`{t(${JSON.stringify(n.initializer.text)})}`);}
  if(ts.isJsxExpression(n)&&n.expression&&ts.isIdentifier(n.expression)&&slots.includes(n.expression.text)){
   // Label rendering only; never value/onChange/keys or SVG/route identifiers.
   if(ts.isJsxAttribute(n.parent)&&!['aria-label','placeholder'].includes(n.parent.name.getText(tree)))return;
   translated(n.expression,`t(${n.expression.text})`);
  }
  ts.forEachChild(n,walk);
 }
 walk(tree);
 for(const node of owners)edits.push({start:node.body.getStart(tree)+1,end:node.body.getStart(tree)+1,value:'\n  const {t}=useProductLocale();\n'});
 edits.push({start:source.indexOf('\n')+1,end:source.indexOf('\n')+1,value:`// product-localization-applied\nimport {${[textUsed?'ProductText':null,owners.size?'useProductLocale':null].filter(Boolean).join(',')}} from './locale';\n`});
 let result=source;
 for(const edit of edits.sort((a,b)=>b.start-a.start)){result=result.slice(0,edit.start)+edit.value+result.slice(edit.end);}
 writeFileSync(path,result);
}
// Deduplicate literal catalogue keys mechanically; last entry wins.
const path='components/product/locale.tsx';const source=readFileSync(path,'utf8');
const tree=ts.createSourceFile(path,source,99,true,4);const edits=[];const names=new Set();
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='spanish'){
 for(const property of [...n.initializer.properties].reverse()){const name=property.name?.text;if(names.has(name))edits.push({start:property.getStart(tree),end:source[property.end]===','?property.end+1:property.end});else names.add(name);}
}ts.forEachChild(n,visit)}visit(tree);let result=source;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+result.slice(edit.end);writeFileSync(path,result);
