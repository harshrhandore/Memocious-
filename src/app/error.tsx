"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section">
      <div className="empty-state">
        <h1>A little pause.</h1>
        <p>
          The collection is temporarily unavailable. Please try again shortly.
        </p>
        <button type="button" className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
