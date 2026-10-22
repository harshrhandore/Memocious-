export default function Loading() {
  return (
    <div
      className="container section"
      role="status"
      aria-label="Loading collection"
    >
      <div className="product-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="skeleton aspect-square" />
            <div className="skeleton skeleton-lines" />
          </div>
        ))}
      </div>
      <span className="sr-only">Finding little possibilities…</span>
    </div>
  );
}
