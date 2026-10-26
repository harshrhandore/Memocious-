import { BuilderDraftEditor } from "@/components/builder-draft";
import { getTaxonomy } from "@/lib/catalogue";
import { phase3Ready } from "@/lib/config";
import { BrowseGate } from "@/components/browse-gate";
export const metadata = {
  title: "Plan a custom gift",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await BrowseGate();
  const { categories, occasions } = await getTaxonomy();
  return (
    <article className="container prose">
      <span className="eyebrow">A LITTLE IDEA, MADE PERSONAL</span>
      <h1>Plan a custom gift</h1>
      <BuilderDraftEditor
        categories={categories}
        occasions={occasions}
        available={phase3Ready}
      />
    </article>
  );
}
