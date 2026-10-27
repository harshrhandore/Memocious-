import { phase6Ready, config } from "@/lib/config";
import { publicPageMetadata } from "@/lib/seo";
import { demo } from "@/lib/config";
export const metadata = phase6Ready
  ? publicPageMetadata({
      title: "FAQs",
      description:
        "Find answers to common questions about gift enquiries and customisation.",
      path: "/faq",
      origin: config.APP_ORIGIN,
    })
  : { title: "FAQs" };
const questions = [
  [
    "How will I order a gift?",
    "Choose a gift and its available personalisation. When enquiries are enabled, save an enquiry and open the prepared WhatsApp message. You must press Send yourself. Memocious confirms final price, payment and delivery.",
  ],
  [
    "Can I browse without signing in?",
    "Yes. Browsing is open by default. A verified account will be required for private saved drafts, photos, wishlists and reviews when those features are enabled.",
  ],
  [
    "Are the designs and prices here available to order?",
    demo
      ? "This preview contains clearly labelled illustrative sample designs and prices."
      : "Published gifts show current owner-supplied details. Prices are estimates unless agreed in a quotation; availability and shipping need confirmation.",
  ],
  [
    "Can I request delivery anywhere in India?",
    "The provisional delivery area is India. Serviceability, shipping cost and requested dates must be confirmed with the business; no pincode or delivery date is guaranteed here.",
  ],
  [
    "Can I personalise my gift?",
    "Each product lists its available personalisation and limits. Message previews are illustrative and do not guarantee a final handmade layout.",
  ],
  [
    "Do you accept bulk or corporate enquiries?",
    "Enterprise gifting includes hampers, pens, shirts, mugs, trophies and welcome kits. The enabled enterprise form lists published products with their MOQ and lead time. Branding, quotation and delivery need owner confirmation.",
  ],
  [
    "Will photos be attached automatically to WhatsApp?",
    "No. Click-to-chat cannot attach private uploaded photos automatically. Private uploads will require sign-in and an enabled upload service; they will not be placed in a public WhatsApp link.",
  ],
  [
    "Does clicking WhatsApp confirm my order or payment?",
    "No. The site cannot know whether you sent the message, paid, or received a gift from a WhatsApp link click. Those outcomes require business confirmation.",
  ],
];
export default function FAQ() {
  return (
    <article className="container prose">
      <span className="eyebrow">THE LITTLE THINGS, EXPLAINED</span>
      <h1>
        A little clarity.
        <br />A lot less guessing.
      </h1>
      <div className="faq-list">
        {questions.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </article>
  );
}
