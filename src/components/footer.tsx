import Link from "next/link";
import { getPublicSettings } from "@/lib/catalogue";
import { Heart, ArrowUpRight, MessageCircle } from "lucide-react";
export async function Footer() {
  const settings = await getPublicSettings();
  return (
    <>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Link href="/" className="wordmark">
              {settings.brand.toLowerCase()}
              <span>✻</span>
            </Link>
            <h2>
              For the moments
              <br />
              that mean something.
            </h2>
            <p>{settings.tagline}</p>
          </div>
          <div>
            <h3>Find your little something</h3>
            <Link href="/shop">All gifts</Link>
            <Link href="/shop/category/gift-hampers">Gift hampers</Link>
            <Link href="/shop/category/bouquets">Bouquets</Link>
            <Link href="/enterprise">
              Corporate &amp; bulk <ArrowUpRight size={13} />
            </Link>
          </div>
          <div>
            <h3>A little help</h3>
            <Link href="/about">Our story</Link>
            <Link href="/faq">FAQs</Link>
            <Link href="/contact">Contact</Link>
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`}>
                {settings.contactEmail}
              </a>
            )}
            <Link href="/shipping-returns">Shipping &amp; returns</Link>
          </div>
          <div>
            <h3>The thoughtful details</h3>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <p>
              Personalisation, final pricing and delivery are confirmed with the
              business.
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Memocious</span>
          <span>
            Made for giving. Made with <Heart size={13} />
          </span>
          <span>India · INR ₹</span>
        </div>
      </footer>
      {settings.whatsappNumber && (
        <a
          className="floating-whatsapp"
          href={`https://wa.me/${settings.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Memocious on WhatsApp"
        >
          <MessageCircle size={24} />
        </a>
      )}
    </>
  );
}
