import Link from "next/link";
import { BrowseGate } from "@/components/browse-gate";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Heart,
  Gift,
  MessageCircle,
  PackageCheck,
  PenLine,
  BriefcaseBusiness,
} from "lucide-react";
import { getProducts, getTaxonomy } from "@/lib/catalogue";
import { filtersSchema } from "@/lib/domain";
import { ProductCard, SectionHeading, TaxonIcon } from "@/components/ui";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  await BrowseGate();
  const [{ products }, taxa] = await Promise.all([
    getProducts(filtersSchema.parse({ limit: 4 })),
    getTaxonomy(),
  ]);
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" /> LITTLE THINGS. BIG FEELINGS.
          </div>
          <h1>
            Some gifts are opened.
            <br />
            Others are <em>felt.</em>
          </h1>
          <p>
            For your people. For their moments.
            <br />
            Thoughtful gifts with a little bit of you in every detail.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/shop">
              Find their little something <ArrowUpRight size={19} />
            </Link>
            <span className="hand-note">
              a little thought goes a long way <Heart size={16} />
            </span>
          </div>
          <div className="hero-details">
            <span>
              <PenLine size={16} /> Your personal touch
            </span>
            <span>
              <Gift size={16} /> Made for the moment
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-orbit" />
          <span className="hero-spark s1">✻</span>
          <span className="hero-spark s2">✧</span>
          <div className="hero-photo photo-back">
            <Image
              src="/media/gift-1.webp"
              width={640}
              height={640}
              alt="Illustrative sample flower bouquet in cream wrapping"
              priority
              fetchPriority="high"
              sizes="(max-width:767px) 55vw,28vw"
            />
          </div>
          <div className="hero-photo photo-front">
            <Image
              src="/media/gift-0.webp"
              width={640}
              height={640}
              alt="Illustrative sample hamper with a rose ribbon and a personal note"
              priority
              fetchPriority="high"
              decoding="sync"
              sizes="(max-width:767px) 70vw,34vw"
            />
            <span className="photo-caption">
              a little box of joy <Heart size={12} />
            </span>
          </div>
          <div className="floating-note">
            <span>not just a gift,</span>
            <strong>a feeling, wrapped.</strong>
            <svg viewBox="0 0 90 45" aria-hidden="true">
              <path
                d="M6 7Q65 1 69 37M58 29 69 39 79 27"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <span className="art-caption">
            CONCEPT COLLECTION · ILLUSTRATED WITH LOVE
          </span>
        </div>
      </section>
      <div className="promise-bar">
        <div className="container">
          <span>
            <Sparkles size={17} /> A personal touch
          </span>
          <i />
          <span>
            <Heart size={17} /> Thoughtfully put together
          </span>
          <i />
          <span>
            <MessageCircle size={17} /> Let’s make it yours
          </span>
        </div>
      </div>
      <section className="section container">
        <SectionHeading
          eyebrow="TWO WAYS TO MAKE SOMEONE’S DAY"
          title="Who are you gifting for?"
        />
        <div className="path-grid">
          <Link
            prefetch={false}
            href="/enterprise"
            className="path-card enterprise-path"
          >
            <div>
              <span className="small-label">
                FOR TEAMS, EVENTS &amp; BIG THANK-YOUS
              </span>
              <h3>
                Big gestures.
                <br />
                <em>Personal touches.</em>
              </h3>
              <p>
                Corporate gifting, welcome kits and thoughtful
                <br className="desktop" /> bulk gifts that feel anything but
                ordinary.
              </p>
              <span className="text-link">
                Explore enterprise gifting <ArrowUpRight size={17} />
              </span>
            </div>
            <BriefcaseBusiness
              className="path-illustration"
              strokeWidth={0.7}
            />
          </Link>
          <Link
            prefetch={false}
            href="/shop"
            className="path-card personal-path"
          >
            <div>
              <span className="small-label">FOR YOUR FAVOURITE HUMANS</span>
              <h3>
                A little something.
                <br />
                <em>A lot of love.</em>
              </h3>
              <p>
                Birthdays, just-becauses and all the
                <br className="desktop" /> little moments in between.
              </p>
              <span className="text-link">
                Find a personal gift <ArrowUpRight size={17} />
              </span>
            </div>
            <Gift className="path-illustration" strokeWidth={0.7} />
          </Link>
        </div>
      </section>
      <section className="occasions-section">
        <div className="container">
          <div className="occasion-intro">
            <span className="eyebrow">THERE’S ALWAYS A REASON</span>
            <h2>A moment for everything.</h2>
          </div>
          <nav className="occasion-strip" aria-label="Shop by occasion">
            {taxa.occasions
              .filter((t) => !t.parentSlug)
              .slice(0, 10)
              .map((t) => (
                <Link
                  prefetch={false}
                  href={`/shop/occasion/${t.slug}`}
                  key={t.id}
                >
                  <span className="occasion-icon">
                    <TaxonIcon name={t.icon} />
                  </span>
                  <span>{t.label}</span>
                </Link>
              ))}
          </nav>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow="SMALL GESTURES, BEAUTIFUL POSSIBILITIES"
          title="Find a little inspiration."
          description="A few personal favourites from our illustrative collection."
          link="/shop"
        />
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="story-banner container">
        <span className="story-flower">✻</span>
        <div>
          <span className="eyebrow">THE MEMOCIOUS WAY</span>
          <h2>
            Because “I thought of you”
            <br />
            is a gift in itself.
          </h2>
          <p>
            A name. A favourite colour. Words only you would say.
            <br />
            It’s the little details that make a gift feel like theirs.
          </p>
          <Link className="text-link" href="/about">
            A little about us <ArrowUpRight size={17} />
          </Link>
        </div>
        <span className="story-flower right">✻</span>
      </section>
      <section className="section container how-section">
        <SectionHeading
          eyebrow="FROM A LITTLE IDEA TO A LOVELY SURPRISE"
          title="Gifting, with a personal touch."
        />
        <div className="steps">
          {[
            {
              icon: Gift,
              title: "Find your gift",
              body: "Explore a little something for every person and occasion.",
            },
            {
              icon: PenLine,
              title: "Make it personal",
              body: "Add their name, your words, and a touch of their favourite colour.",
            },
            {
              icon: MessageCircle,
              title: "Let’s chat",
              body: "Confirm the details, final price and delivery on WhatsApp.",
            },
            {
              icon: PackageCheck,
              title: "Make their day",
              body: "Once everything is agreed, the business brings your gift to life.",
            },
          ].map((s, i) => (
            <div key={s.title}>
              <div className="step-top">
                <span>0{i + 1}</span>
                <s.icon size={29} strokeWidth={1.2} />
                {i < 3 && <ArrowRight size={18} className="step-arrow" />}
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <p className="quiet-note">
          Collection preview: WhatsApp ordering will open once the business is
          ready.
        </p>
      </section>
    </>
  );
}
