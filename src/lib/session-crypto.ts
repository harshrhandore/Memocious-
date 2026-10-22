import { EncryptJWT, jwtDecrypt, decodeProtectedHeader } from "jose";
export type Keyring = {
  version: string;
  current: string;
  previous?: Record<string, string>;
};
function key(ring: Keyring, version: string) {
  const value =
    version === ring.version
      ? ring.current
      : ring.previous && Object.hasOwn(ring.previous, version)
        ? ring.previous[version]
        : undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw new Error("Session key unavailable");
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length !== 32) throw new Error("Session key unavailable");
  return bytes;
}
export async function sealSession(
  value: Record<string, unknown>,
  ring: Keyring,
) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(ring.version))
    throw new Error("Session key unavailable");
  return new EncryptJWT(value)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: ring.version })
    .setIssuedAt()
    .setExpirationTime("8d")
    .encrypt(key(ring, ring.version));
}
export async function unsealSession<T>(
  value: string,
  ring: Keyring,
): Promise<T> {
  const header = decodeProtectedHeader(value);
  if (
    typeof header.kid !== "string" ||
    !/^[A-Za-z0-9_-]{1,40}$/.test(header.kid)
  )
    throw new Error("Session unavailable");
  const { payload } = await jwtDecrypt(value, key(ring, header.kid), {
    keyManagementAlgorithms: ["dir"],
    contentEncryptionAlgorithms: ["A256GCM"],
  });
  return payload as T;
}
