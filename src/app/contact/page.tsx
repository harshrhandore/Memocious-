import { BusinessInquiry } from "@/components/business-inquiry";
import { phase2Ready, writesReady } from "@/lib/config";
import Link from "next/link";
import { getPublicSettings } from "@/lib/catalogue";
export const metadata = { title: "A little help" };
export default async function Contact() {
  const settings = await getPublicSettings();
  return (
    <article className="container prose">
      <span className="eyebrow">LET’S TALK GIFTING</span>
      <h1>
        A little help,
        <br />
        when you need it.
      </h1>
      {settings.whatsappNumber ? (
        <>
          <p>
            Talk with Memocious about a gift, a customisation or a policy
            question. Opening WhatsApp does not send a message or place an
            order.
          </p>
          <a
            className="button whatsapp"
            href={`https://wa.me/${settings.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue on WhatsApp
          </a>
          <p>International number: +{settings.whatsappNumber}</p>
          {settings.contactEmail && (
            <p>
              Email:{" "}
              <a href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            </p>
          )}
        </>
      ) : (
        <p className="notice">
          Business contact details are being set up. Product enquiries are
          unavailable in this preview.
        </p>
      )}
      <BusinessInquiry
        kind="contact"
        available={phase2Ready && writesReady}
        sitekey={process.env.TURNSTILE_SITE_KEY ?? ""}
      />
      <p>
        For answers about the planned gifting experience, visit our{" "}
        <Link href="/faq">frequently asked questions</Link>.
      </p>
      <Link className="button secondary" href="/shop">
        Explore gift ideas
      </Link>
    </article>
  );
}
