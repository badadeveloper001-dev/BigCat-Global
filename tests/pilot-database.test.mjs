import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('pilot migrations and atomic transaction lifecycle', async () => {
 const db = new PGlite()
 try {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid'; CREATE TABLE auth.users(id uuid PRIMARY KEY);")
  const files = JSON.parse(await fs.readFile('scripts/pilot-migrations.json','utf8'))
  for (const file of files) {
   try { await db.exec(await fs.readFile('scripts/'+file,'utf8')) }
   catch(error) { throw new Error('Migration '+file+': '+error.message, {cause:error}) }
  }
  const buyer='11111111-1111-4111-8111-111111111111', merchant='22222222-2222-4222-8222-222222222222', other='33333333-3333-4333-8333-333333333333', product='44444444-4444-4444-8444-444444444444'
  await db.query("INSERT INTO auth_users(id,email,role) VALUES($1,'buyer@test.invalid','buyer'),($2,'merchant@test.invalid','merchant'),($3,'other@test.invalid','buyer')",[buyer,merchant,other])
  await db.query("INSERT INTO products(id,merchant_id,name,price,stock,is_active) VALUES($1,$2,'Pilot product',100,3,true)",[product,merchant])
  const request={merchantId:merchant,items:[{productId:product,quantity:1,unitPrice:1,weight:0.5}],deliveryType:'pickup',deliveryAddress:'Test address',method:'wallet',payCurrency:'NGN',outcome:'success',deliveryFee:0,promotionId:null,promotionDiscount:0,couponId:null,couponCode:null,couponDiscount:0}
  const checkout=async(key,payload=request,user=buyer)=>(await db.query('SELECT pilot_checkout($1,$2,$3) AS result',[user,key,payload])).rows[0].result
  const balance=async(user=buyer)=>(await db.query("SELECT balance FROM user_wallets WHERE user_id=$1 AND currency='NGN'",[user])).rows[0]?.balance
  const stock=async()=>(await db.query('SELECT stock FROM products WHERE id=$1',[product])).rows[0].stock
  await assert.rejects(checkout('no-balance-request'),/Insufficient/)
  assert.equal(await stock(),3)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n,0)
  await assert.rejects(db.query("SELECT pilot_wallet_change($1,'NGN',1000,NULL)",[buyer]),/Invalid/)
  await db.query("SELECT pilot_wallet_change($1,'NGN',1000,'fund-request-0001')",[buyer])
  await db.query("SELECT pilot_wallet_change($1,'NGN',1000,'fund-request-0001')",[buyer])
  assert.equal(Number(await balance()),1000)
  await assert.rejects(db.query("SELECT pilot_wallet_change($1,'NGN',2000,'fund-request-0001')",[buyer]),/already used/)
  const converted=(await db.query("SELECT pilot_wallet_change($1,'NGN',160,'convert-request-01','USD') AS result",[buyer])).rows[0].result
  const convertedAgain=(await db.query("SELECT pilot_wallet_change($1,'NGN',160,'convert-request-01','USD') AS result",[buyer])).rows[0].result
  assert.equal(converted.toAmount,convertedAgain.toAmount)
  await db.query("SELECT pilot_wallet_change($1,'USD',0.10,'convert-return-001','NGN')",[buyer])
  assert.equal(Number(await balance()),1000)
  const failed=await checkout('failed-request-001',{...request,outcome:'failed'})
  assert.equal(failed.success,false);assert.equal(await stock(),3);assert.equal(Number(await balance()),1000)
  const result=await checkout('success-request-01')
  assert.equal(result.success,true)
  assert.equal(Number(result.data.orders[0].product_total),100,'database ignores forged price')
  assert.equal(await stock(),2)
  const paid=Number(result.data.orders[0].paid_amount)
  assert.equal(Number(await balance()),1000-paid)
  const replay=await checkout('success-request-01')
  assert.equal(replay.replayed,true);assert.equal(replay.data.orderId,result.data.orderId);assert.equal(await stock(),2)
  await assert.rejects(checkout('success-request-01',{...request,deliveryAddress:'Different'}),/different checkout/)
  const transition=(actor,status)=>db.query('SELECT pilot_transition_order($1,$2,$3)',[result.data.orderId,actor,status])
  await assert.rejects(transition(other,'cancelled'),/Access denied/)
  await transition(buyer,'cancelled');await transition(buyer,'cancelled')
  assert.equal(await stock(),3);assert.equal(Number(await balance()),1000)
  await assert.rejects(transition(merchant,'order_received'),/finalized/)
  const delivered=await checkout('delivery-request-1')
  const advance=(actor,status)=>db.query('SELECT pilot_transition_order($1,$2,$3)',[delivered.data.orderId,actor,status])
  await advance(merchant,'order_received');await advance(merchant,'order_packed');await advance(buyer,'delivered')
  const released=await balance(merchant);await advance(buyer,'delivered');assert.equal(await balance(merchant),released)
  const service='55555555-5555-4555-8555-555555555555'
  await db.query("INSERT INTO service_listings(id,merchant_id,title,base_price,is_active) VALUES($1,$2,'Test service',250,true)",[service,merchant])
  const servicePayload={serviceId:service,address:'Test address',outcome:'success'}
  const serviceResult=(await db.query('SELECT pilot_service_checkout($1,$2,$3) AS result',[buyer,'service-request-01',servicePayload])).rows[0].result
  assert.equal(serviceResult.success,true);assert.equal(Number(serviceResult.data.amount),250)
  const serviceReplay=(await db.query('SELECT pilot_service_checkout($1,$2,$3) AS result',[buyer,'service-request-01',servicePayload])).rows[0].result
  assert.equal(serviceReplay.replayed,true)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM service_bookings')).rows[0].n,1)
  await db.exec('SET ROLE authenticated')
  await assert.rejects(db.query("UPDATE auth_users SET role='admin' WHERE id=$1",[buyer]),/permission denied/)
  await assert.rejects(db.query('SELECT pilot_checkout($1,$2,$3)',[buyer,'forbidden-request',request]),/permission denied/)
 } finally { await db.close() }
})
