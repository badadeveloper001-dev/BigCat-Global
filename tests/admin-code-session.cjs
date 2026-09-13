const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict')
const env={ADMIN_SESSION_SECRET:'s'.repeat(32),ADMIN_BIGCAT_ACCESS_CODE:'b'.repeat(24),ADMIN_ORCHID_ACCESS_CODE:'o'.repeat(24),ADMIN_LOGISTICS_ACCESS_CODE:'l'.repeat(24)}
const exportsObject={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/admin-session.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject,require:name=>name==='server-only'?{}:name==='next/headers'?{}:require(name),process:{env},Buffer,Date})
const {scopeForAccessCode,signAdminSession,verifyAdminSession}=exportsObject
for(const [scope,key] of [['bigcat','ADMIN_BIGCAT_ACCESS_CODE'],['orchid','ADMIN_ORCHID_ACCESS_CODE'],['trade-logistics','ADMIN_LOGISTICS_ACCESS_CODE']]) {
 assert.equal(scopeForAccessCode(env[key]),scope)
 assert.equal(verifyAdminSession(signAdminSession(scope),scope).scope,scope)
}
assert.equal(scopeForAccessCode('wrong'),undefined)
assert.throws(()=>verifyAdminSession(signAdminSession('orchid'),'bigcat'))
assert.throws(()=>verifyAdminSession(signAdminSession('trade-logistics'),'orchid'))
assert.equal(verifyAdminSession(signAdminSession('bigcat'),'orchid').scope,'bigcat')
const token=signAdminSession('orchid')
assert.throws(()=>verifyAdminSession(token+'x'))
const now=Date.now;Date.now=()=>now()+3600001
assert.throws(()=>verifyAdminSession(token));Date.now=now
const old=env.ADMIN_ORCHID_ACCESS_CODE;env.ADMIN_ORCHID_ACCESS_CODE='r'.repeat(24)
assert.throws(()=>verifyAdminSession(token));env.ADMIN_ORCHID_ACCESS_CODE=old
env.ADMIN_ORCHID_ACCESS_CODE=env.ADMIN_BIGCAT_ACCESS_CODE
assert.throws(()=>scopeForAccessCode(env.ADMIN_BIGCAT_ACCESS_CODE))
console.log('PASS: code routing, scoped permissions, tampering, expiry, rotation and duplicate-code rejection')
