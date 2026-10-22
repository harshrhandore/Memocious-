"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, UserRound, Menu, X, ArrowRight, Gift } from "lucide-react";
export function Navigation({ brand = "Memocious" }: { brand?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<
    { slug: string; name: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const c = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/search?q=" + encodeURIComponent(q), {
          signal: c.signal,
        });
        if (r.ok) setSuggestions((await r.json()).items);
      } catch {
        /* Explicit search form remains available. */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [q]);
  function close() {
    drawer.current?.close();
    setOpen(false);
    opener.current?.focus();
  }
  function toggle() {
    if (open) close();
    else {
      drawer.current?.showModal();
      setOpen(true);
    }
  }
  const links = [
    ["/shop", "All gifts"],
    ["/shop/category/gift-hampers", "Hampers"],
    ["/shop/category/bouquets", "Bouquets"],
    ["/shop?customizable=true", "Personalised"],
    ["/enterprise", "Corporate & bulk"],
  ];
  return (
    <>
      <div className="announcement">
        <Gift size={13} /> A little thought. A lasting memory.{" "}
        <span>Made personal, with Memocious.</span>
      </div>
      <header className="header">
        <div className="nav-main container">
          <button
            type="button"
            ref={opener}
            className="icon-button menu-button"
            onClick={toggle}
            aria-label="Open navigation"
            aria-expanded={open}
          >
            <Menu size={22} />
          </button>
          <Link
            prefetch={false}
            href="/"
            className="wordmark"
            aria-label={`${brand} home`}
          >
            {brand.toLowerCase()}
            <span>✻</span>
          </Link>
          <search className="search-landmark">
            <form className="nav-search" action="/shop">
              <Search size={18} />
              <input
                name="q"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSuggestions([]);
                }}
                onFocus={() => setSearching(true)}
                onBlur={() => setTimeout(() => setSearching(false), 150)}
                placeholder="A gift for every little feeling…"
                aria-label="Search gifts"
                autoComplete="off"
                maxLength={100}
              />
              <button type="submit" aria-label="Search">
                <ArrowRight size={17} />
              </button>
              {searching && q.length >= 2 && suggestions.length > 0 && (
                <ul className="suggestions" aria-label="Gift suggestions">
                  {suggestions.map((s) => (
                    <li key={s.slug}>
                      <Link
                        prefetch={false}
                        href={`/product/${s.slug}`}
                        onClick={() => {
                          setSearching(false);
                          setQ("");
                        }}
                      >
                        {s.name}
                        <ArrowRight size={15} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </search>
          <div className="nav-actions">
            <Link
              prefetch={false}
              className="icon-button account-link"
              href="/account"
              aria-label="Your account"
            >
              <UserRound size={21} />
              <span>Your corner</span>
            </Link>
          </div>
        </div>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              prefetch={false}
              key={href}
              className={pathname === href ? "active" : ""}
              href={href}
            >
              {label}
            </Link>
          ))}
          <Link prefetch={false} href="/about">
            Our story
          </Link>
        </nav>
      </header>
      <dialog
        ref={drawer}
        aria-label="Navigation"
        className="mobile-nav"
        onCancel={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        <div className="drawer-head">
          <span className="wordmark">
            {brand.toLowerCase()}
            <span>✻</span>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close navigation"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={close}>
              {label}
              <ArrowRight size={18} />
            </Link>
          ))}
          <Link prefetch={false} href="/about" onClick={close}>
            Our story
          </Link>
          <Link prefetch={false} href="/faq" onClick={close}>
            A little help
          </Link>
        </nav>
        <p>Thoughtful gifts, made personal.</p>
      </dialog>
    </>
  );
}
