import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const PASSWORD_SCHEME = "s2";

export type PasswordVerificationResult = {
  verified: boolean;
  needsRehash: boolean;
};

const deriveKey = async (password: string, salt: Buffer, length: number) =>
  (await scrypt(password, salt, length)) as Buffer;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, 32);

  return `${PASSWORD_SCHEME}:${salt.toString("hex")}:${derived.toString("hex")}`;
};

const verifyScryptHash = async (
  password: string,
  saltHex: string,
  hashHex: string
): Promise<boolean> => {
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");

  if (!salt.length || !expected.length) {
    return false;
  }

  const actual = await deriveKey(password, salt, expected.length);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};

export const verifyPassword = async (
  password: string,
  stored: string
): Promise<PasswordVerificationResult> => {
  if (stored.startsWith(`${PASSWORD_SCHEME}:`)) {
    const [, saltHex, hashHex] = stored.split(":");

    if (!saltHex || !hashHex) {
      return { verified: false, needsRehash: true };
    }

    const verified = await verifyScryptHash(password, saltHex, hashHex);

    return { verified, needsRehash: false };
  }

  if (stored.startsWith("$2")) {
    return { verified: false, needsRehash: false };
  }

  const matches = stored === password;

  return { verified: matches, needsRehash: matches };
};

