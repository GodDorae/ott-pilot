import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  sessionToken,
  verifyPassword,
} from "@/lib/adminauth";

/** 관리자 로그인 — 비밀번호를 확인하고 세션 쿠키를 심는다 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const password = form?.get("password");
  const next = (form?.get("next") as string | null) ?? "/admin";
  // 열린 리디렉트가 되지 않도록 내부 경로만 허용한다
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  if (!verifyPassword(typeof password === "string" ? password : null)) {
    const back = new URL(target, req.url);
    back.searchParams.set("e", "1");
    return NextResponse.redirect(back, { status: 303 });
  }

  const token = sessionToken();
  const res = NextResponse.redirect(new URL(target, req.url), { status: 303 });
  if (token) res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions);
  return res;
}
