const fs=require('fs'),path=require('path'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
let language='en', country='NG'
const cache=new Map()
function load(file) {
 file=path.resolve(file)
 if(cache.has(file))return cache.get(file)
 const exports={};cache.set(file,exports)
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
 const req=name=> {
  if(name==='@/lib/role-context')return { useRole:()=>({preferences:{language,currency:country==='CN'?'CNY':'NGN',country},user:null}) }
  if(name==='next/link')return props=>React.createElement('a',props)
  if(name==='lucide-react')return new Proxy({}, {get:(_,key)=>key==='__esModule'?true:props=>React.createElement('svg',props)})
  if(name.startsWith('@/')){const base=path.resolve(name.slice(2));return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts')}
  if(name.endsWith('.json'))return JSON.parse(fs.readFileSync(path.resolve(path.dirname(file),name),'utf8'))
  return require(name)
 }
 vm.runInNewContext(code,{exports,require:req,window:{navigator:{language:'en-NG'}},Intl,fetch:async()=>({ok:true,json:async()=>({data:{country}})}),AbortSignal,console,process,Date,setTimeout,clearTimeout})
 return exports
}
async function main(){
 const {translateUiText:t}=load('lib/ui-translation.ts')
 assert.equal(t('10 in stock','zh'),'10 件有货')
 assert.equal(t('Order ABC is now Delivered.','zh'),'订单 ABC 当前状态：已送达。')
 assert.equal(t('Imported 2 products successfully.','zh'),'成功导入 2 件商品。')
 assert.equal(t('Your Brand Name','zh'),'Your Brand Name')
 assert.equal(t('Terms &amp; Conditions','en'),'Terms & Conditions')
 for(const file of ['app/help/page.tsx','app/privacy/page.tsx','app/terms/page.tsx','app/pilot/page.tsx']) {
  const Page=load(file).default
  language='en';const en=renderToStaticMarkup(React.createElement(Page));assert.ok(!/[\u3400-\u9fff]/.test(en),file+' mixes Chinese into English')
  language='zh';const zh=renderToStaticMarkup(React.createElement(Page));assert.ok(/[\u3400-\u9fff]/.test(zh),file+' has no Chinese');assert.ok(!zh.includes('Privacy Policy')&&!zh.includes('How do I place an order?'),file+' retained English labels')
 }
 const {UiAttributes}=load('components/ui-language.tsx');language='zh'
 const html=renderToStaticMarkup(React.createElement(UiAttributes,null,React.createElement('input',{placeholder:'Enter your email',value:'buyer@example.com',readOnly:true})))
 assert.ok(html.includes('输入邮箱'));assert.ok(html.includes('buyer@example.com'))
 const {sessionProfile}=load('lib/session-profile.ts')
 const profile=sessionProfile({id:'m1',role:'merchant',setup_completed:true,business_name:'Existing store',password_hash:'never-copy'})
 assert.equal(profile.merchantProfile.setup_completed,true);assert.equal(profile.merchantProfile.business_name,'Existing store');assert.ok(!JSON.stringify(profile).includes('never-copy'))
 assert.equal(sessionProfile({id:'m2',role:'merchant',setup_completed:false}).merchantProfile.setup_completed,false)
 const location=load('lib/global-market-config.ts');country='CN';let prefs=await location.detectCountryAndRegionFromBrowser();assert.equal(prefs.language,'zh');assert.equal(prefs.currency,'CNY');assert.equal(prefs.region,'')
 country='NG';prefs=await location.detectCountryAndRegionFromBrowser();assert.equal(prefs.language,'en');assert.equal(prefs.currency,'NGN')
 console.log('PASS: language switching, legal/help/pilot rendering, quantity/status templates, form values, merchant setup retention, secret exclusion, country defaults')
}
main().catch(error=>{console.error(error);process.exitCode=1})
