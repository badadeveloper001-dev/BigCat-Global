import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import ts from 'typescript'
const require=createRequire(import.meta.url)
const source=ts.transpileModule(fs.readFileSync('lib/auth-otp.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const exports={}
vm.runInNewContext(source,{exports,Buffer,Date,process:{env:{AUTH_OTP_SECRET:'unit-test-secret-only'}},require:(id)=>id==='crypto'?require('node:crypto'):{},console})
test('OTP signatures bind the email, role, hash and expiry',()=>{
 const payload={email:'pilot@test.invalid',role:'buyer',otpHash:exports.hashOtp('pilot@test.invalid','buyer','123456'),expiresAt:Date.now()+60000}
 const cookie=exports.encodePendingSignupOtp(payload)
 assert.ok(exports.isOtpValid(exports.decodePendingSignupOtp(cookie),payload.email,'buyer','123456'))
 assert.equal(exports.isOtpValid(exports.decodePendingSignupOtp(cookie),payload.email,'merchant','123456'),false)
 assert.equal(exports.isOtpValid(exports.decodePendingSignupOtp(cookie),'other@test.invalid','buyer','123456'),false)
 assert.equal(exports.isOtpValid(exports.decodePendingSignupOtp(cookie),payload.email,'buyer','999999'),false)
 const [encoded,signature]=cookie.split('.')
 const tampered=Buffer.from(JSON.stringify({...payload,expiresAt:Date.now()+99999999})).toString('base64url')+'.'+signature
 assert.equal(exports.decodePendingSignupOtp(tampered),null)
 const expired=exports.encodePendingSignupOtp({...payload,expiresAt:Date.now()-1})
 assert.equal(exports.isOtpValid(exports.decodePendingSignupOtp(expired),payload.email,'buyer','123456'),false)
 assert.equal(exports.decodePendingSignupOtp(encoded),null)
})
