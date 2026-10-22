import { EmptyState } from "@/components/ui";
export default function NotFound() {
  return (
    <div className="container section">
      <EmptyState title="This little something isn’t here.">
        This page or gift is unavailable. Explore the current collection to find
        another thoughtful idea.
      </EmptyState>
    </div>
  );
}
