'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
export default function GlobalError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{Sentry.captureException(error)},[error])
 return <html lang="en"><body><main style={{maxWidth:600,margin:'10vh auto',padding:24,fontFamily:'sans-serif'}}><h1>Something went wrong / 出现错误</h1><p>Please retry. For a payment, retry the same transaction before starting another. / 请重试。支付中断后，请先重试同一笔交易。</p><button onClick={reset}>Try again / 重试</button>{error.digest&&<p>Reference: {error.digest}</p>}</main></body></html>
}
