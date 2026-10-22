import Link from "next/link";
export function Policy({ kind }: { kind: "privacy" | "terms" | "shipping" }) {
  return (
    <article className="container prose">
      <span className="eyebrow">THE THOUGHTFUL DETAILS</span>
      <h1>
        {kind === "privacy"
          ? "Your privacy matters."
          : kind === "terms"
            ? "A clear understanding."
            : "Making & delivering your gift."}
      </h1>
      <div className="notice">
        Preview policy text — owner approval recorded on 21 October 2026.
        Ordering, sign-in and personal-data submissions remain unavailable in
        this preview.
      </div>
      {kind === "privacy" ? (
        <>
          <h2>What this preview does</h2>
          <p>
            You can browse illustrative gifts and try an in-memory
            personalisation preview. Your typed note is not submitted or saved
            to browser storage. There are no analytics or marketing trackers.
          </p>
          <h2>Before ordering opens</h2>
          <p>
            The business must identify its contact and data-processing purposes,
            processors, retention periods, rights requests, photo permissions
            and policy version before collecting personal information. Private
            customer photos must stay private unless deliberate publication is
            approved.
          </p>
          <h2>WhatsApp handoff</h2>
          <p>
            When enabled, selected personalisation will be included in a
            WhatsApp click-to-chat URL. Continuing shares that text with
            WhatsApp. Only you press Send. Private photos, account credentials
            and tracking secrets must never appear in the message URL.
          </p>
          <h2>Account and data requests</h2>
          <p>
            Export, withdrawal and deletion workflows require verified identity
            and an approved business retention policy. They are not active yet.
            A genuine monitored contact will be provided before those workflows
            open.
          </p>
        </>
      ) : kind === "terms" ? (
        <>
          <h2>A collection preview</h2>
          <p>
            Illustrations and sample prices demonstrate the proposed experience.
            They are not a confirmed offer or a claim about products in stock,
            customer history or sales.
          </p>
          <h2>Prices and agreements</h2>
          <p>
            When genuine enquiries open, displayed estimates will remain subject
            to confirmation of customisation, contents, tax, shipping, payment
            and delivery arrangements with the business. A saved enquiry or
            WhatsApp click alone does not establish an order or payment.
          </p>
          <h2>Before accepting orders</h2>
          <p>
            The owner must publish business identity and contact details,
            reviewed consumer and payment terms, applicable tax information,
            dispute and cancellation arrangements, and a current privacy notice.
          </p>
        </>
      ) : (
        <>
          <h2>Requested dates, confirmed together</h2>
          <p>
            The provisional delivery area is India. Every pincode, delivery
            cost, production lead time and requested date needs business
            confirmation. There is no guaranteed delivery promise in this
            preview.
          </p>
          <h2>Returns and cancellations</h2>
          <p>
            The owner must publish reviewed cancellation, return, replacement
            and refund terms, including how personalised items and defects are
            handled, before accepting orders.
          </p>
          <h2>Payment and refunds</h2>
          <p>
            No payment or refund is executed by this preview. Once enquiries
            open, offline arrangements are confirmed with the business. A chat
            click cannot prove payment or refund.
          </p>
        </>
      )}
      <p>
        See <Link href="/contact">contact availability</Link> or return to{" "}
        <Link href="/shop">the collection</Link>.
      </p>
    </article>
  );
}
