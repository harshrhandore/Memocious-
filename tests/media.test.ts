import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { sanitizeImage } from "../src/lib/media";
import { productFieldsSchema } from "../src/lib/admin-domain";
test("uploaded EXIF image becomes a bounded, metadata-free WebP", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#8e2c48" },
  })
    .jpeg()
    .withExif({
      IFD0: { Artist: "Private photographer", Copyright: "Private source" },
      IFD2: { UserComment: "Personal source metadata" },
    })
    .toBuffer();
  assert.ok((await sharp(input).metadata()).exif);
  const clean = await sanitizeImage(input, "image/jpeg");
  const output = await sharp(clean.data).metadata();
  assert.equal(output.format, "webp");
  assert.equal(output.width, 2048);
  assert.equal(output.height, 1024);
  assert.equal(output.exif, undefined);
  assert.equal(output.xmp, undefined);
  assert.equal(output.icc, undefined);
  assert.match(clean.digest, /^[a-f0-9]{64}$/);
});
test("active, disguised, corrupt and oversized uploads fail decoding", async () => {
  await assert.rejects(
    sanitizeImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
      "image/png",
    ),
  );
  const jpeg = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(sanitizeImage(jpeg, "image/png"));
  await assert.rejects(
    sanitizeImage(
      Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(40)]),
      "image/jpeg",
    ),
  );
  await assert.rejects(sanitizeImage(Buffer.alloc(2097153), "image/jpeg"));
  const pixels = await sharp({
    create: { width: 4500, height: 4500, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(sanitizeImage(pixels, "image/png"));
});
test("personalization admin fields cannot smuggle publication or roles", () => {
  assert.equal(productFieldsSchema.safeParse({ active: true }).success, false);
  assert.equal(productFieldsSchema.safeParse({ role: "owner" }).success, false);
  assert.equal(
    productFieldsSchema.safeParse({ pricePaise: 200, maxPricePaise: 100 })
      .success,
    false,
  );
  assert.equal(
    productFieldsSchema.safeParse({ messageLimit: 501 }).success,
    false,
  );
  assert.equal(
    productFieldsSchema.safeParse({
      pricePaise: 0,
      maxPricePaise: null,
      messageLimit: 0,
    }).success,
    true,
  );
});

test("ingress ignores client-controlled forwarded chains and rejects unsupported hosts", async () => {
  const { ingressIP } = await import("../src/lib/ingress");
  const forged = new Headers({
    "x-forwarded-for": "1.2.3.4",
    "client-ip": "1.2.3.4",
  });
  assert.equal(ingressIP(forged, "netlify"), null);
  assert.equal(
    ingressIP(
      new Headers({ "x-nf-client-connection-ip": "203.0.113.20" }),
      "netlify",
    ),
    "203.0.113.20",
  );
  assert.equal(
    ingressIP(
      new Headers({ "x-nf-client-connection-ip": "203.0.113.20, 1.2.3.4" }),
      "netlify",
    ),
    null,
  );
  assert.equal(
    ingressIP(
      new Headers({ "x-vercel-forwarded-for": "203.0.113.20" }),
      "unknown",
    ),
    null,
  );
});
