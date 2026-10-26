import {
  BusinessInquiry,
  type EnterpriseChoice,
} from "@/components/business-inquiry";
import { phase2Ready, writesReady } from "@/lib/config";
import { rpc } from "@/lib/server-db";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  GraduationCap,
  Gift,
} from "lucide-react";
export const metadata = { title: "Enterprise & bulk gifting" };
export default async function Enterprise() {
  const products = phase2Ready
    ? await rpc<EnterpriseChoice[]>("memocious_enterprise_choices", {})
    : [];
  const content = phase2Ready
    ? await rpc<{ catalogue: string | null }>("memocious_phase2_public", {})
    : null;
  return (
    <>
      <section className="container enterprise-hero">
        <div>
          <span className="eyebrow">THOUGHTFUL AT EVERY SCALE</span>
          <h1>
            Big gestures.
            <br />
            <em>Personal touches.</em>
          </h1>
          <p>
            For the team that goes the extra mile. The graduates beginning their
            next chapter. The people who make an event unforgettable.
          </p>
          <p className="mt-4">
            Explore the possibilities for custom hampers, pens, shirts, mugs and
            trophies and welcome kits, made to feel like you.
          </p>
          <Link className="button" href="#bulk-details">
            Plan your gifting <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="enterprise-art">
          <Image
            src="/media/gift-9.webp"
            width={640}
            height={640}
            alt="Illustrative sample corporate gift hamper"
            priority
          />
          <p className="gallery-caption">
            Illustrative concept · Actual contents and branding by quotation
          </p>
        </div>
      </section>
      <section className="container section pt-0">
        <div className="enterprise-types">
          {[
            {
              Icon: BriefcaseBusiness,
              title: "For your people",
              body: "Welcome kits, team milestones and meaningful client thank-yous.",
            },
            {
              Icon: GraduationCap,
              title: "For new chapters",
              body: "College events, farewells and keepsakes made for the memories.",
            },
            {
              Icon: Gift,
              title: "For your occasion",
              body: "Return gifts, event hampers and packaging with a personal touch.",
            },
          ].map(({ Icon, title, body }) => (
            <div key={title}>
              <Icon size={30} strokeWidth={1.2} />
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="bulk-details" className="container prose pt-0">
        <span className="eyebrow">LET’S MAKE IT PERSONAL</span>
        <h2>A few details make all the difference.</h2>
        <p>
          Choose published enterprise gifts and quantities below. MOQ and
          preparation time come from each product; requested dates remain
          subject to confirmation.
        </p>
        {content?.catalogue && (
          <a
            className="button secondary"
            href={`/catalogue/${content.catalogue}`}
          >
            Download enterprise catalogue PDF
          </a>
        )}
        <BusinessInquiry
          kind="enterprise"
          products={products}
          available={phase2Ready && writesReady}
          sitekey={process.env.TURNSTILE_SITE_KEY ?? ""}
        />
        <h2>From your idea to their little surprise</h2>
        <ol>
          <li>Choose the gifts and tell us about your occasion.</li>
          <li>
            Agree on branding, quantities, quotation and delivery arrangements.
          </li>
          <li>Confirm the details with the business before production.</li>
        </ol>
        <Link
          className="button secondary"
          href="/shop/category/corporate-bulk-items"
        >
          Explore corporate gift concepts <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
