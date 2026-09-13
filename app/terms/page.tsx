
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"
import { LocalizedText } from '@/components/localized-text'
import Link from 'next/link'
import { Scale } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service – BigCat Global',
}

const EFFECTIVE_DATE = 'April 29, 2026'
const COMPANY = 'BigCat Global'
const EMAIL = 'legal@bigcat.ng'
const SUPPORT_EMAIL = 'support@bigcat.ng'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6C2BD9] to-[#4A1A9E] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2"><UiText text={"Terms of Service"} /></h1>
          <p className="text-white/80 text-sm"><UiText text={"Effective date:"} />{" "}{EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-8 text-sm text-foreground leading-relaxed">

          <aside className="rounded-xl border border-border bg-secondary/30 p-4"><LocalizedText en="Test-only pilot: no real payment processing or funds custody." zh="仅限测试：不处理真实付款或保管资金。" /> <Link href="/pilot" className="underline"><LocalizedText en="Read the pilot rules" zh="阅读试点规则" /></Link>.</aside>
          <section>
            <p className="text-muted-foreground">
              <UiText text={"Welcome to"} />{" "}{COMPANY}<UiText text={". By accessing or using our platform (website, mobile app, or any related services), you agree to be bound by these Terms of Service. Please read them carefully before using our services."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"1. About BigCat Global"} /></h2>
            <p className="text-muted-foreground">
              {COMPANY} {" "}<UiText text={"is a Nigerian e-commerce marketplace that connects buyers and sellers of goods and services. This pilot tests marketplace and transaction workflows using simulated payments. It does not provide real payment custody or escrow protection."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"2. Eligibility"} /></h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><UiText text={"You must be at least 18 years old to use this platform."} /></li>
              <li><UiText text={"You must provide accurate and truthful information when creating an account."} /></li>
              <li><UiText text={"You are responsible for all activity under your account."} /></li>
              <li><UiText text={"Merchants must hold valid business registration and complete country-specific verification requirements where applicable."} /></li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"3. Buyer Obligations"} /></h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><UiText text={"Buyers must provide an accurate delivery address and contact information."} /></li>
              <li><UiText text={"Buyers must only release escrow funds when they have received their order in satisfactory condition."} /></li>
              <li><UiText text={"Buyers must raise any disputes within 48 hours of delivery."} /></li>
              <li><UiText text={"Buyers must not attempt to defraud merchants through false dispute claims."} /></li>
              <li><UiText text={"Buyers must keep all communication on the platform — sharing contact details to bypass the platform is prohibited."} /></li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"4. Merchant Obligations"} /></h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><UiText text={"Merchants must list only goods and services they are authorised to sell."} /></li>
              <li><UiText text={"Product descriptions, images, and prices must be accurate and not misleading."} /></li>
              <li><UiText text={"Merchants must fulfil orders in a timely manner and ship within the stated timeframe."} /></li>
              <li><UiText text={"Merchants must not list counterfeit, prohibited, or illegal items."} /></li>
              <li><UiText text={"Merchants must respond to buyer messages and disputes promptly."} /></li>
              <li><UiText text={"Merchants are responsible for maintaining sufficient merchant tokens to receive orders."} /></li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"5. Payments, GIT Fee & Escrow"} /></h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><UiText text={"Pilot payments are simulated. No payment provider is connected for real collections."} /></li>
              <li><UiText text={"All users have access to a multi-currency wallet (NGN, USD, and CNY) that supports funding and currency conversion features."} /></li>
              <li><UiText text={"When you convert or pay across currencies, the applicable exchange rate shown at execution time is used for settlement."} /></li>
              <li><UiText text={"Exchange rates are sourced from live third-party market data providers where available, with resilient fallback rates used only when live providers are unavailable."} /></li>
              <li><UiText text={"Wallet and escrow labels represent simulated records only; BigCat is not holding real funds in this pilot."} /></li>
              <li><UiText text={"A Goods in Transit (GIT) fee of 1.5% is applied to goods and services at checkout to cover goods damaged in transit only. The GIT fee is not charged on delivery fees and does not cover return delivery."} /></li>
              <li><UiText text={"Test completion and release are manually coordinated; no automatic real-money release is promised."} /></li>
              <li><UiText text={"Platform fees are deducted from merchant payouts before credit to the merchant wallet."} /></li>
              <li><UiText text={"Test refund outcomes are reviewed by the pilot operator; no real refund processing time is promised."} /></li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"6. Prohibited Conduct"} /></h2>
            <p className="text-muted-foreground mb-2"><UiText text={"The following are strictly prohibited on"} />{" "}{COMPANY}:</p>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li><UiText text={"Sharing phone numbers, emails, or social media handles to conduct transactions outside the platform."} /></li>
              <li><UiText text={"Listing counterfeit, stolen, or prohibited goods."} /></li>
              <li><UiText text={"Creating fake reviews or manipulating ratings."} /></li>
              <li><UiText text={"Filing false disputes or chargebacks."} /></li>
              <li><UiText text={"Impersonating another user, merchant, or BigCat staff."} /></li>
              <li><UiText text={"Using bots, scripts, or automated tools to interact with the platform."} /></li>
              <li><UiText text={"Any form of money laundering or fraudulent activity."} /></li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"7. Strike System & Suspensions"} /></h2>
            <p className="text-muted-foreground">
              <UiText text={"Users who violate platform policies receive strikes. Upon accumulating 3 strikes, an account may be temporarily or permanently suspended. BigCat reserves the right to suspend any account immediately if serious fraud or safety violations are detected, without prior notice."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"8. Dispute Resolution"} /></h2>
            <p className="text-muted-foreground">
              <UiText text={"Disputes between buyers and merchants should first be attempted through direct in-app chat. If unresolved, either party may escalate via the &ldquo;Report Issue&rdquo; function. BigCat&rsquo;s support team will investigate and issue a binding decision within 5–7 business days. BigCat&rsquo;s decisions on disputes are final within the platform."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"9. Intellectual Property"} /></h2>
            <p className="text-muted-foreground">
              <UiText text={"All content on the platform — including the BigCat name, logo, interface design, and software — is the property of"} />{" "}{COMPANY} {" "}<UiText text={"and is protected by Nigerian and international intellectual property laws. Merchants grant BigCat a non-exclusive licence to display their product images and descriptions on the platform for the purpose of facilitating sales."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"10. Limitation of Liability"} /></h2>
            <p className="text-muted-foreground">
              {COMPANY} {" "}<UiText text={"is not liable for the quality, safety, legality, or availability of products or services listed by merchants. Our total liability to any user for any claim arising from use of the platform shall not exceed the value of the specific transaction in dispute. We are not liable for indirect, incidental, or consequential damages."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"11. Governing Law"} /></h2>
            <p className="text-muted-foreground">
              <UiText text={"These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms that cannot be resolved through our internal process shall be submitted to the appropriate courts in Lagos State, Nigeria."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"12. Changes to These Terms"} /></h2>
            <p className="text-muted-foreground">
              <UiText text={"We may update these Terms from time to time. We will notify users of material changes via email or in-app notification. Continued use of the platform after changes take effect constitutes acceptance of the new Terms."} />{" "}</p>
          </section>

          <section>
            <h2 className="font-bold text-base mb-3"><UiText text={"13. Contact"} /></h2>
            <p className="text-muted-foreground">
              <UiText text={"For questions about these Terms, contact us at"} />{' '}
              <a href={`mailto:${EMAIL}`} className="text-primary underline">{EMAIL}</a> {" "}<UiText text={"or visit our"} />{' '}
              <Link href="/contact" className="text-primary underline"><UiText text={"Contact page"} /></Link>.
            </p>
          </section>

        </div>

        <div className="text-center text-xs text-muted-foreground py-8 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors"><UiText text={"← Back to BigCat"} /></Link>
          <span>·</span>
          <Link href="/help" className="hover:text-foreground transition-colors"><UiText text={"Help Center"} /></Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors"><UiText text={"Privacy Policy"} /></Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-foreground transition-colors"><UiText text={"Contact Us"} /></Link>
        </div>
      </div>
    </div>
  )
}
