import { phase6Ready, config } from "@/lib/config";
import { publicPageMetadata } from "@/lib/seo";
import { Policy } from "@/components/policy";
export const metadata = phase6Ready
  ? publicPageMetadata({
      title: "Shipping & returns",
      description: "Read the Memocious shipping and returns information.",
      path: "/shipping-returns",
      origin: config.APP_ORIGIN,
    })
  : { title: "Shipping & returns" };
export default function Page() {
  return <Policy kind="shipping" />;
}
