import { parsePhoneNumberFromString } from "libphonenumber-js/max";
export function whatsappNumber(value: string) {
  if (!/^[1-9][0-9]{6,14}$/.test(value)) return null;
  const phone = parsePhoneNumberFromString("+" + value);
  return phone?.isValid() && phone.number.slice(1) === value ? value : null;
}
export type Receipt = {
  code: string;
  name: string;
  slug: string;
  quantity: number;
  options: { label: string; deltaPaise: number }[];
  message: string;
  budgetPaise: number | null;
  occasion: string;
  pincode: string;
  estimatePaise: number | null;
  number: string;
};
export function buildWhatsApp(r: Receipt, origin: string) {
  const dest = whatsappNumber(r.number);
  if (!dest) throw new Error("WhatsApp ordering is temporarily unavailable.");
  const productUrl = new URL("/product/" + encodeURIComponent(r.slug), origin)
    .href;
  const full = [
    `Hello Memocious! I’d like to enquire about ${r.name}.`,
    productUrl,
    `Enquiry: ${r.code}`,
    `Quantity: ${r.quantity}`,
    ...r.options.map((o) => o.label),
    r.message && `Personal message: ${r.message}`,
    r.budgetPaise !== null && `Budget: INR ${(r.budgetPaise / 100).toFixed(2)}`,
    r.occasion && `Occasion: ${r.occasion}`,
    r.pincode && `Pincode: ${r.pincode}`,
    "Please confirm the final price, customisation and delivery.",
  ]
    .filter(Boolean)
    .join("\n");
  let message = full;
  if ([...full].length > 1500) {
    message = [
      `Hello Memocious! I’d like to enquire about ${r.name}.`,
      productUrl,
      `Enquiry: ${r.code}`,
      `Quantity: ${r.quantity}`,
      `${r.options.length} personalisation choices and full message are saved with this enquiry.`,
      "The full summary is available to copy from the website. Please confirm the final details.",
    ].join("\n");
  }
  return {
    url: `https://wa.me/${dest}?text=${encodeURIComponent(message)}`,
    message: full,
    number: dest,
    shortened: message !== full,
  };
}
