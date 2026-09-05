/**
 * 관리자 인증 (서버 전용)
 *
 * 예전에는 주소에 ?key=<비밀번호> 를 붙여 들어갔다. 비밀번호가 주소창·브라우저 기록·
 * 서버 로그에 그대로 남는 방식이라, 비밀번호를 한 번 입력하면 쿠키로 유지되도록 바꿨다.
 *
 * 쿠키에는 비밀번호가 아니라 비밀번호로 만든 토큰을 담는다. 쿠키를 들여다봐도
 * 비밀번호 자체는 알 수 없다.
 *
 * ?key= 는 API 라우트(CSV 내려받기 등)에서만 계속 받는다 — 스크립트로 뽑을 때 필요하다.
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";

const TOKEN_PAYLOAD = "ott-survey-admin";
const MAX_AGE = 60 * 60 * 12; // 12시간

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

function adminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}

/** 비밀번호가 아예 설정되지 않았는지 — 이 경우 관리자 화면은 안내만 띄운다 */
export function adminPasswordMissing(): boolean {
  return adminPassword() === null;
}

/** 길이가 달라도 안전하게 비교한다 */
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export function verifyPassword(given: string | null | undefined): boolean {
  const pw = adminPassword();
  return pw !== null && typeof given === "string" && safeEqual(given, pw);
}

/** 쿠키에 담을 토큰 — 비밀번호에서 유도하므로 비밀번호가 바뀌면 자동으로 무효가 된다 */
export function sessionToken(): string | null {
  const pw = adminPassword();
  return pw === null ? null : createHmac("sha256", pw).update(TOKEN_PAYLOAD).digest("hex");
}

/** 로그인된 관리자인지 (쿠키 기준) */
export async function isAdmin(): Promise<boolean> {
  const expected = sessionToken();
  if (!expected) return false;
  const given = (await cookies()).get(ADMIN_COOKIE)?.value;
  return typeof given === "string" && safeEqual(given, expected);
}

/**
 * API 라우트용 — 쿠키로 로그인했거나, ?key= 로 비밀번호를 직접 넘겼으면 통과.
 * CSV 를 스크립트로 뽑는 경우가 있어 key 방식도 남겨 둔다.
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  if (await isAdmin()) return true;
  const key = new URL(req.url).searchParams.get("key");
  return verifyPassword(key);
}
