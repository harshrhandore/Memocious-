import { phase6Ready, config } from "@/lib/config";
import { publicPageMetadata } from "@/lib/seo";
import { Policy } from "@/components/policy";
export const metadata = phase6Ready
  ? publicPageMetadata({
      title: "Privacy notice",
      description: "Read the Memocious privacy notice.",
      path: "/privacy",
      origin: config.APP_ORIGIN,
    })
  : { title: "Privacy notice" };
export default function Page() {
  return <Policy kind="privacy" />;
}
