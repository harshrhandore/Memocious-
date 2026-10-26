import { demo } from "@/lib/config";
import Link from "next/link";
export const metadata = { title: "Our story" };
export default function About() {
  return (
    <article className="container prose">
      <span className="eyebrow">A LITTLE ABOUT MEMOCIOUS</span>
      <h1>
        For the moments
        <br />
        that mean something.
      </h1>
      <p>
        A name on a keepsake. Your favourite words in a little note. A hamper in
        their favourite colours. Memocious is being built around a simple idea:
        the most thoughtful gifts carry something personal.
      </p>
      <p>
        Explore customised gifts, bouquets and hampers for people you love, or
        plan a meaningful thank-you for a team or event.
      </p>
      <h2>A thoughtful beginning</h2>
      <p>
        {demo
          ? "This preview uses clearly labelled illustrative designs. Actual products and availability are supplied by the owner."
          : "Browse the published collection for current gifts and personalisation options. Availability, handmade details and delivery are confirmed by Memocious."}
      </p>
      <h2>Your personal touch, from idea to gift</h2>
      <p>
        The gifting experience starts here and continues in a conversation with
        Memocious. Final customisation, price, payment and delivery arrangements
        are confirmed on WhatsApp.
      </p>
      <Link className="button" href="/shop">
        Explore the collection
      </Link>
    </article>
  );
}
