const fs = require('fs'), ts = require('typescript')
const catalogue = Object.assign({}, ...fs.readdirSync('lib/locales').filter(f => /^zh(?:-\d+)?\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync('lib/locales/' + f, 'utf8'))))
const skip = new Set(['components/ui-language.tsx', 'components/localized-text.tsx'])
let changed = 0, texts = 0, values = 0, attributes = 0
for (const dir of ['components', 'app']) for (const p of fs.readdirSync(dir, { recursive: true }).filter(p => p.endsWith('.tsx')).map(p => (dir + '/' + p).replaceAll('\\', '/'))) {
 if (skip.has(p)) continue
 let source = fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n')
 if (source.includes("@/components/ui-language")) continue
 const sf = ts.createSourceFile(p, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
 let touched = false
 const forbidden = node => { for (let n=node.parent;n;n=n.parent) if (ts.isJsxElement(n) && ['script','style','pre','code','UiText','UiValue','UiAttributes','LocalizedText'].includes(n.openingElement.tagName.getText(sf))) return true; return false }
 function render(node) {
  const start=node.getStart(sf), end=node.end
  if (forbidden(node)) return source.slice(start,end)
  if (ts.isJsxText(node)) {
   const raw=node.getFullText(sf), text=raw.replace(/\s+/g,' ').trim()
   if (/[A-Za-z]{2}/.test(text) && catalogue[text]) {
    touched=true; texts++
    const left=/^[ \t]+[^\r\n]/.test(raw) ? '{" "}' : ''
    const right=/[^\r\n][ \t]+$/.test(raw) ? '{" "}' : ''
    return left + '<UiText text={' + JSON.stringify(text) + '} />' + right
   }
   return source.slice(start,end)
  }
  if (ts.isJsxExpression(node) && node.expression) {
   const exp=node.expression, raw=exp.getText(sf)
   let jsx=false, known=false
   const find=n=>{if(ts.isJsxElement(n)||ts.isJsxSelfClosingElement(n)||ts.isJsxFragment(n))jsx=true;if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&catalogue[n.text]&&catalogue[n.text]!==n.text)known=true;ts.forEachChild(n,find)};find(exp)
   const property = /(?:^|\.)(?:label|title|description|subtitle|question|answer|status|category|text)$/.test(raw)
   const status = /^(?:error|success|.*Error|.*Success|.*Notice|.*Feedback|reorderMessage|policyNotice|verificationLabel|verificationStatus|distanceLabel|displayStatus|category|tab|day|notificationMessage)$/.test(raw)
   const userContent=/(?:product|merchant|vendor|user|message|notification|review|orderItem|service)\??\./i.test(raw)
   if(!jsx && !ts.isJsxAttribute(node.parent) && (known || (!userContent && (property||status)))) {
    touched=true;values++; return '<UiValue value={' + raw + '} />'
   }
  }
  let result='',cursor=start
  ts.forEachChild(node, child=>{const childStart=child.getStart(sf); if(childStart<cursor)return;result+=source.slice(cursor,childStart)+render(child);cursor=child.end})
  result+=source.slice(cursor,end)
  const opening=ts.isJsxElement(node)?node.openingElement:ts.isJsxSelfClosingElement(node)?node:null
  if(opening && opening.attributes.properties.some(a=>ts.isJsxAttribute(a)&&['placeholder','title','alt','aria-label'].includes(a.name.getText(sf)))) {
   touched=true;attributes++;result='<UiAttributes>'+result+'</UiAttributes>'
  }
  if(opening && opening.tagName.getText(sf)==='option' && !opening.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(sf)==='value') && ts.isJsxElement(node) && node.children.every(ts.isJsxText)) {
   const value=node.children.map(n=>n.text).join('').replace(/\s+/g,' ').trim(); result=result.replace('<option','<option value={'+JSON.stringify(value)+'}')
  }
  return result
 }
 const result=render(sf)
 if(touched){let offset=0;const directive=sf.statements[0];if(directive&&ts.isExpressionStatement(directive)&&ts.isStringLiteral(directive.expression)&&directive.expression.text==='use client')offset=directive.end;
 const imp='\nimport { UiText, UiValue, UiAttributes } from "@/components/ui-language"\n'
 fs.writeFileSync(p,result.slice(0,offset)+imp+result.slice(offset));changed++}
}
console.log({changed,texts,values,attributes})
