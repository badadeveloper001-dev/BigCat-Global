"use client"
import { useEffect, useState, type FormEvent } from "react"
import { Landmark, Plus, Loader2, Trash2, Pencil, Star, X } from "lucide-react"

type Account = { id:string; country_code:"NG"|"CN"; currency_code:string; institution_name:string; account_holder_name:string; account_number_last4:string; branch_name:string|null; routing_code_type:string|null; routing_code:string|null; is_default:boolean }
type Form = { country_code:"NG"|"CN"; institution_name:string; account_holder_name:string; account_number:string; branch_name:string; routing_code_type:string; routing_code:string }
const empty:Form = {country_code:"NG",institution_name:"",account_holder_name:"",account_number:"",branch_name:"",routing_code_type:"",routing_code:""}
const endpoint = "/api/merchant/payment-accounts"

export function MerchantPaymentAccounts() {
 const [accounts,setAccounts] = useState<Account[]>([])
 const [loading,setLoading] = useState(true)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState("")
 const [message,setMessage] = useState("")
 const [editing,setEditing] = useState<string|null>(null)
 const [showForm,setShowForm] = useState(false)
 const [form,setForm] = useState<Form>(empty)
 async function load() {
  setLoading(true)
  try {
   const res=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"})
   const json=await res.json()
   if (!res.ok || !json.success) throw Error(json.error||"Could not load accounts")
   setAccounts(json.data||[])
   setError("")
  } catch(e) {setError(e instanceof Error?e.message:"Could not load accounts")}
  finally {setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 function change(field:keyof Form,value:string) {setForm(old=>({...old,[field]:value}))}
 function begin(account?:Account) {
  setError("");setMessage("")
  setEditing(account?.id||null)
  setForm(account?{country_code:account.country_code,institution_name:account.institution_name,account_holder_name:account.account_holder_name,account_number:"",branch_name:account.branch_name||"",routing_code_type:account.routing_code_type||"",routing_code:account.routing_code||""}:empty)
  setShowForm(true)
 }
 async function action(method:"POST"|"PATCH"|"DELETE",payload?:Record<string,unknown>,id?:string) {
  setBusy(true);setError("");setMessage("")
  try {
   const url=method==="DELETE"?endpoint+"?id="+encodeURIComponent(id||""):endpoint
   const res=await fetch(url,{method,credentials:"same-origin",headers:{"Content-Type":"application/json"},...(method==="DELETE"?{}:{body:JSON.stringify(payload)})})
   const json=await res.json().catch(()=>({}))
   if(!res.ok||!json.success)throw Error(json.error||"Request failed")
   setShowForm(false);setEditing(null);setForm(empty)
   setMessage(method==="DELETE"?"Account removed":method==="POST"?"Account saved":"Account updated")
   await load()
  }catch(e){setError(e instanceof Error?e.message:"Request failed")}
  finally{setBusy(false)}
 }
 function save(e:FormEvent) {
  e.preventDefault()
  if(editing&&!form.account_number.trim()){setError("Enter the full account number to save changes. Stored numbers cannot be retrieved.");return}
  void action(editing?"PATCH":"POST",editing?{...form,id:editing}:form)
 }
 function remove(a:Account) {
  if(!window.confirm("Remove this settlement account?"))return
  void action("DELETE",undefined,a.id)
 }
 return <section className="mt-5 rounded-3xl border border-border bg-card p-5 space-y-4">
  <div className="flex items-start justify-between gap-3">
   <div><h3 className="font-bold flex items-center gap-2"><Landmark className="h-5 w-5"/>Settlement bank accounts</h3>
    <p className="text-xs text-muted-foreground mt-1">Register accounts for future merchant payouts. Saving an account does not verify ownership or activate Orchid settlement.</p></div>
   <button type="button" onClick={()=>begin()} className="rounded-xl bg-[#6C2BD9] text-white px-3 py-2 text-xs font-semibold flex items-center gap-1"><Plus className="h-4 w-4"/>Add</button>
  </div>
  {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  {message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
  {loading?<p className="text-sm text-muted-foreground flex gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading accounts...</p>:accounts.length===0?<p className="text-sm text-muted-foreground">No settlement accounts added yet.</p>:<div className="space-y-3">{accounts.map(a=><div key={a.id} className="rounded-xl border border-border p-3 space-y-2">
   <div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-sm break-words">{a.institution_name}</p><p className="text-xs text-muted-foreground">{a.account_holder_name} · {a.currency_code} · •••• {a.account_number_last4}</p></div>{a.is_default&&<span className="text-xs text-emerald-700 font-semibold">Default</span>}</div>
   <div className="flex flex-wrap gap-2">
    {!a.is_default&&<button disabled={busy} onClick={()=>void action("PATCH",{id:a.id,set_default:true})} className="text-xs rounded-lg border px-2 py-1 flex gap-1 items-center"><Star className="h-3 w-3"/>Set default</button>}
    <button disabled={busy} onClick={()=>begin(a)} className="text-xs rounded-lg border px-2 py-1 flex gap-1 items-center"><Pencil className="h-3 w-3"/>Edit</button>
    <button disabled={busy} onClick={()=>remove(a)} className="text-xs rounded-lg border px-2 py-1 text-red-600 flex gap-1 items-center"><Trash2 className="h-3 w-3"/>Delete</button>
   </div>
  </div>)}</div>}
  {showForm&&<form onSubmit={save} className="rounded-2xl border border-border p-4 space-y-3">
   <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">{editing?"Edit account":"Add account"}</h4><button type="button" onClick={()=>setShowForm(false)} aria-label="Close"><X className="h-4 w-4"/></button></div>
   <label className="block text-xs font-medium">Country<select value={form.country_code} onChange={e=>change("country_code",e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm"><option value="NG">Nigeria (NGN)</option><option value="CN">China (CNY)</option></select></label>
   {([["institution_name","Bank name"],["account_holder_name","Account holder name"],["account_number",editing?"Full account number (re-enter to edit)":"Account number"]] as const).map(([key,label])=><label key={key} className="block text-xs font-medium">{label}<input required autoComplete="off" value={form[key]} onChange={e=>change(key,e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm" /></label>)}
   {form.country_code==="CN"&&<><label className="block text-xs font-medium">Branch (optional)<input value={form.branch_name} onChange={e=>change("branch_name",e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm"/></label><label className="block text-xs font-medium">Routing code type (if required)<select value={form.routing_code_type} onChange={e=>{change("routing_code_type",e.target.value);change("routing_code","")}} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm"><option value="">None</option><option value="SWIFT">SWIFT/BIC</option><option value="CNAPS">CNAPS</option></select></label>{form.routing_code_type&&<label className="block text-xs font-medium">{form.routing_code_type} code<input required value={form.routing_code} onChange={e=>change("routing_code",e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm"/></label>}</>}
   <p className="text-xs text-muted-foreground">Nigeria: 10-digit NUBAN. China: 8–34 digits (provisional format). Account ownership and payout eligibility are not verified.</p>
   <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#6C2BD9] p-3 text-sm font-semibold text-white disabled:opacity-60">{busy?"Saving...":"Save bank account"}</button>
  </form>}
 </section>
}
