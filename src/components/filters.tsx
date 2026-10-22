import Link from "next/link";
import type { Filters, Taxon } from "@/lib/domain";
export function FilterForm({
  filters: f,
  categories,
  counts,
}: {
  filters: Filters;
  categories: Taxon[];
  counts: Record<string, number>;
}) {
  return (
    <form className="filter-form" action="/shop">
      {f.q && <input type="hidden" name="q" value={f.q} />}{" "}
      {f.occasion && <input type="hidden" name="occasion" value={f.occasion} />}
      <input type="hidden" name="sort" value={f.sort} />
      <div className="filter-section">
        <fieldset>
          <legend>Gift categories</legend>
          <div className="category-options">
            {categories
              .filter((c) => !c.parentSlug)
              .map((c) => (
                <label key={c.id} className="check-label">
                  <input
                    type="checkbox"
                    name="category"
                    value={c.slug}
                    defaultChecked={f.category.includes(c.slug)}
                  />
                  <span>{c.label}</span>
                  <span className="count">{counts[c.slug] ?? 0}</span>
                </label>
              ))}
          </div>
        </fieldset>
      </div>
      <div className="filter-section">
        <h3>A budget that feels right</h3>
        <div className="price-pair">
          <label>
            <span className="product-eyebrow">Min ₹</span>
            <input
              type="number"
              name="min"
              min="0"
              max="1000000"
              defaultValue={f.min}
              aria-label="Minimum price in rupees"
              placeholder="0"
            />
          </label>
          <span>–</span>
          <label>
            <span className="product-eyebrow">Max ₹</span>
            <input
              type="number"
              name="max"
              min="0"
              max="1000000"
              defaultValue={f.max}
              aria-label="Maximum price in rupees"
              placeholder="Any"
            />
          </label>
        </div>
      </div>
      <div className="filter-section">
        <fieldset>
          <legend>The little details</legend>
          <label className="check-label">
            <input
              type="checkbox"
              name="customizable"
              value="true"
              defaultChecked={!!f.customizable}
            />
            Can be personalised
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="stock"
              value="true"
              defaultChecked={!!f.stock}
            />
            In stock
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="rating"
              value="4"
              defaultChecked={!!f.rating}
            />
            Rated 4/5 and above
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="combos"
              value="true"
              defaultChecked={!!f.combos}
            />
            Combos
          </label>
        </fieldset>
      </div>
      <div className="filter-section">
        <fieldset>
          <legend>Made for your moment</legend>
          {[
            ["", "Any availability"],
            ["ready", "Ready to ship"],
            ["made-to-order", "Made to order"],
          ].map(([value, label]) => (
            <label key={value} className="check-label">
              <input
                type="radio"
                name="lead"
                value={value}
                defaultChecked={(f.lead ?? "") === value}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="filter-section">
        <fieldset>
          <legend>A favourite colour</legend>
          {["rose", "cream", "gold", "green", "lavender"].map((c) => (
            <label className="check-label" key={c}>
              <input
                type="checkbox"
                name="colour"
                value={c}
                defaultChecked={f.colour.includes(
                  c as Filters["colour"][number],
                )}
              />
              <span className="capitalize">{c}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <button className="button" type="submit">
        Find my gifts
      </button>
      <Link className="filter-reset" href="/shop">
        Reset filters
      </Link>
    </form>
  );
}
