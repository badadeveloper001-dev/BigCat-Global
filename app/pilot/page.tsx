import Link from 'next/link'
export default function PilotRules() {
  return <main className="max-w-2xl mx-auto px-4 py-8 space-y-5 text-foreground">
    <h1 className="text-2xl font-bold">Pilot rules / 试点规则</h1>
    <p>This is a test-only web pilot. Orders, card/bank selections, wallet balances and refunds simulate a transaction. No real payment provider or funds custody is enabled. Do not transfer real money or dispatch real goods for these tests.</p>
    <p>本试点仅用于测试。订单、支付、钱包余额和退款均为模拟。请勿转入真实资金或实际发货。</p>
    <p>Listing prices retain their original currency. Converted amounts use labelled demo rates, not guaranteed market or payment-provider rates.</p>
    <p>Test seller acceptance, packing, simulated shipping and buyer receipt confirmation. Confirm receipt only when the agreed test delivery step is complete. Report a problem from the order before confirming satisfaction.</p>
    <p>Admin review and test refunds are manually coordinated during the pilot. A refund label is not evidence of a real transfer. Keep the order/reference number; if a request fails, check its status before retrying.</p>
    <p>Use sample product and delivery data. Do not include payment credentials or identity documents in chat or feedback. Contact-sharing attempts may be blocked and recorded by the existing safety controls.</p>
    <p>Location is used to suggest language and currency; you can change preferences. Feedback and diagnostic events help identify failures. See the Privacy Policy for more information.</p>
    <p>You may stop testing at any time. Send bugs, confusion and suggestions through the Contact page; use the order issue flow for disputes.</p>
    <nav className="flex gap-4"><Link href="/contact" className="underline">Feedback / 反馈</Link><Link href="/terms" className="underline">Terms</Link><Link href="/privacy" className="underline">Privacy</Link></nav>
  </main>
}
