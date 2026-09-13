import { LocalizedText } from '@/components/localized-text'
import Link from 'next/link'
export default function PilotRules() {
  return <main className="max-w-2xl mx-auto px-4 py-8 space-y-5 text-foreground">
    <h1 className="text-2xl font-bold"><LocalizedText en="Pilot rules" zh="试点规则" /></h1>
    <p><LocalizedText en="This is a test-only web pilot. Orders, card/bank selections, wallet balances and refunds simulate a transaction. No real payment provider or funds custody is enabled. Do not transfer real money or dispatch real goods for these tests." zh="本试点仅用于网络应用测试。订单、银行卡或银行选项、钱包余额及退款均为模拟交易。尚未启用真实支付服务或资金保管。请勿转入真实资金或实际发货。" /></p>
    <p><LocalizedText en="Listing prices retain their original currency. Converted amounts use labelled demo rates, not guaranteed market or payment-provider rates." zh="商品保留商家标注的原始货币价格。换算金额使用已标明的演示汇率，不保证与市场或支付服务商的汇率一致。" /></p>
    <p><LocalizedText en="Test seller acceptance, packing, simulated shipping and buyer receipt confirmation. Confirm receipt only when the agreed test delivery step is complete. Report a problem from the order before confirming satisfaction." zh="请测试卖家接单、打包、模拟发货及买家确认收货。仅在约定的测试交付步骤完成后确认收货。如有问题，请在确认满意之前通过订单报告。" /></p>
    <p><LocalizedText en="Admin review and test refunds are manually coordinated during the pilot. A refund label is not evidence of a real transfer. Keep the order/reference number; if a request fails, check its status before retrying." zh="试点期间，管理员审核和测试退款由人工协调。退款标签不代表真实转账。请保留订单号或参考编号；请求失败时，请先检查状态再重试。" /></p>
    <p><LocalizedText en="Use sample product and delivery data. Do not include payment credentials or identity documents in chat or feedback. Contact-sharing attempts may be blocked and recorded by the existing safety controls." zh="请使用示例商品及配送信息。不要在聊天或反馈中提供支付凭证或身份证件。现有安全机制可能拦截并记录分享联系方式的尝试。" /></p>
    <p><LocalizedText en="Location is used to suggest language and currency; you can change preferences. Feedback and diagnostic events help identify failures. See the Privacy Policy for more information." zh="位置信息用于建议语言及货币，您可以更改偏好设置。反馈和诊断事件用于查找故障。详情请查看隐私政策。" /></p>
    <p><LocalizedText en="You may stop testing at any time. Send bugs, confusion and suggestions through the Contact page; use the order issue flow for disputes." zh="您可以随时停止测试。请通过联系页面报告错误、使用困惑和建议；交易纠纷请通过订单问题流程提交。" /></p>
    <nav className="flex gap-4"><Link href="/contact" className="underline"><LocalizedText en="Feedback" zh="反馈" /></Link><Link href="/terms" className="underline"><LocalizedText en="Terms" zh="服务条款" /></Link><Link href="/privacy" className="underline"><LocalizedText en="Privacy" zh="隐私政策" /></Link></nav>
  </main>
}
