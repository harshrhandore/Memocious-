import { whatsappNumber } from "./whatsapp";
export type CustomReceipt = {
  id: string;
  code: string;
  name: string;
  slug: string;
  quantity: number;
  options: { label: string }[];
  personalMessage: string;
  occasion: string;
  pincode: string;
  budgetMinPaise: number;
  budgetMaxPaise: number;
  estimateMinPaise: number | null;
  estimateMaxPaise: number | null;
  requestedDate: string;
  fileCount: number;
  status: string;
  version: number;
  quotePaise: number | null;
  quoteTerms: string | null;
  quoteValidUntil: string | null;
  files?: { id: string; status: string }[];
};
export function customHandoff(
  r: CustomReceipt,
  number: string | null,
  origin: string,
) {
  const full = [
    `Hello Memocious! Please discuss my custom gift request ${r.code}.`,
    new URL("/product/" + encodeURIComponent(r.slug), origin).href,
    `${r.name}; quantity ${r.quantity}`,
    ...r.options.map((o) => o.label),
    r.personalMessage && `Personal message: ${r.personalMessage}`,
    `Budget: INR ${(r.budgetMinPaise / 100).toFixed(2)} to ${(r.budgetMaxPaise / 100).toFixed(2)}`,
    r.occasion && `Occasion: ${r.occasion}`,
    `Requested: ${r.requestedDate}; pincode ${r.pincode}`,
    `${r.fileCount} private reference image(s) saved for the owner; not attached to WhatsApp.`,
    "Please confirm customisation, shipping and final quotation. No payment has been made here.",
  ]
    .filter(Boolean)
    .join("\n");
  const message =
    [...full].length > 1500
      ? `Hello Memocious! Please discuss custom gift request ${r.code}. The complete plan and ${r.fileCount} private reference image(s) are saved on the website, not attached here. Please confirm the final quotation.`
      : full;
  const dest = number && whatsappNumber(number);
  return {
    ...r,
    message: full,
    number: dest || null,
    url: dest
      ? `https://wa.me/${dest}?text=${encodeURIComponent(message)}`
      : null,
    shortened: message !== full,
  };
}
export type CustomContinuation = ReturnType<typeof customHandoff>;
