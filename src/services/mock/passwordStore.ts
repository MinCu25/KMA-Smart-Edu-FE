// Browser-only credential simulation. Replace with server endpoints before production.
const key = "kma-password-verifiers-v1";
type Verifier = {
  salt: number[];
  hash: string;
  previous?: { salt: number[]; hash: string };
};
async function derive(password: string, salt: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw Error(
      "Đổi mật khẩu cần HTTPS hoặc localhost. Vui lòng mở bản web HTTPS.",
    );
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    material,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function read(): Record<string, Verifier> {
  return JSON.parse(localStorage.getItem(key) || "{}");
}
export async function verifyPassword(username: string, password: string) {
  const entry = read()[username];
  return entry
    ? (await derive(password, new Uint8Array(entry.salt))) === entry.hash
    : password === "demo123";
}
export async function verifyPreviousPassword(
  username: string,
  password: string,
) {
  const previous = read()[username]?.previous;
  return (
    !!previous &&
    (await derive(password, new Uint8Array(previous.salt))) === previous.hash
  );
}
export async function storePassword(
  username: string,
  password: string,
  rememberCurrent = false,
) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  const entries = read();
  const current = entries[username];
  const previous =
    rememberCurrent && current
      ? { salt: current.salt, hash: current.hash }
      : current?.previous;
  localStorage.setItem(
    key,
    JSON.stringify({
      ...entries,
      [username]: { salt: Array.from(salt), hash, previous },
    }),
  );
}
