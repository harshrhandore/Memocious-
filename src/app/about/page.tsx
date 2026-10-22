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
        This is a preview of the Memocious collection and experience. The sample
        designs are original illustrations. Actual product photography,
        contents, prices and business details will be added by the owner before
        ordering opens.
      </p>
      <h2>Your personal touch, from idea to gift</h2>
      <p>
        The planned ordering experience starts here and continues in a
        conversation with the business. Final customisation, price, payment and
        delivery arrangements are confirmed on WhatsApp.
      </p>
      <Link className="button" href="/shop">
        Explore the collection
      </Link>
    </article>
  );
}
