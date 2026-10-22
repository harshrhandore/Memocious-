export const metadata = { title: "FAQs" };
const questions = [
  [
    "How will I order a gift?",
    "Choose a gift and its available personalisation. Once ordering opens, the site will save an enquiry and offer a WhatsApp message. You must open WhatsApp and press Send yourself. The business confirms the final price, payment and delivery.",
  ],
  [
    "Can I browse without signing in?",
    "Yes. Browsing is open by default. A verified account will be required for private saved drafts, photos, wishlists and reviews when those features are enabled.",
  ],
  [
    "Are the designs and prices here available to order?",
    "This preview contains clearly labelled illustrative sample designs and prices. Genuine products and current prices must be supplied by the business before ordering opens.",
  ],
  [
    "Can I request delivery anywhere in India?",
    "The provisional delivery area is India. Serviceability, shipping cost and requested dates must be confirmed with the business; no pincode or delivery date is guaranteed here.",
  ],
  [
    "Can I personalise my gift?",
    "The genuine catalogue will list the exact personalisation supported by each product, including its limits. The sample message preview demonstrates the idea and does not guarantee a final handmade layout.",
  ],
  [
    "Do you accept bulk or corporate enquiries?",
    "The planned enterprise service includes hampers, pens, shirts, mugs and welcome kits. Product-specific minimum quantities, branding options, lead times and quotations will be confirmed by the business.",
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
