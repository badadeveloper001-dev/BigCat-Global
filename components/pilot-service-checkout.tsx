'use client'
import { useRef, useState } from 'react'
export function PilotServiceCheckout({context,onBack,onSuccess,zh}: {context:any;onBack:()=>void;onSuccess:(id:string)=>void;zh:boolean}) {
 const [address,setAddress]=useState(context.serviceAddress||'')
 const [outcome,setOutcome]=useState('success')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const key=useRef(''), submitting=useRef(false)
 const t=(en:string,cn:string)=>zh?cn:en
 async function submit(){
  if(submitting.current)return
  submitting.current=true;setBusy(true);setError('');key.current ||= crypto.randomUUID()
  try {
   const response=await fetch('/api/checkout/service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idempotencyKey:key.current,billId:context.billId,serviceId:context.serviceId,address,outcome,scheduledAt:context.scheduledAt,note:context.buyerNote})})
   const result=await response.json()
   if(!result.success){setError(result.error);return}
   sessionStorage.removeItem('serviceBookingDetails');sessionStorage.removeItem('serviceBillCheckout');onSuccess(result.data.orderId)
  }catch{setError(t('Connection interrupted. Retry the same transaction.','连接中断。请重试同一笔交易。'))}
  finally{submitting.current=false;setBusy(false)}
 }
 return <main className="max-w-xl mx-auto p-5 space-y-5"><button onClick={onBack}>{t('Back','返回')}</button><h1 className="text-2xl font-bold">{t('Test service checkout','服务测试结账')}</h1><p>{context.scopeSummary||context.serviceTitle}</p><p>{t('Simulated payment only. No real money or wallet debit. The server calculates the service price.','仅模拟支付。不涉及真实资金或钱包扣款。服务价格由服务器计算。')}</p><label className="block">{t('Service address','服务地址')}<textarea className="block w-full border p-3 bg-background" value={address} maxLength={1000} onChange={e=>{setAddress(e.target.value);key.current=''}} /></label><label className="block">{t('Test scenario','测试场景')}<select value={outcome} onChange={e=>{setOutcome(e.target.value);key.current=''}} className="block w-full p-3 bg-background border"><option value="success">{t('Success','成功')}</option><option value="failed">{t('Declined','失败')}</option><option value="cancelled">{t('Cancelled','取消')}</option></select></label>{error&&<p role="alert">{error}</p>}<button disabled={busy||!address.trim()} onClick={submit} className="rounded bg-primary text-primary-foreground p-3">{busy?t('Processing…','正在处理…'):t('Submit test transaction','提交测试交易')}</button></main>
}
