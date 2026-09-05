import { NextResponse } from "next/server";
import { currentParticipant, DEV_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { ensureDevSession, parseOverrides } from "@/lib/devsession";
import { devAccessAllowed } from "@/lib/devaccess";
import { stepByNumber } from "@/lib/steps";

/**
 * /dev/<n> — 미리보기 세션을 준비해 n번째 단계로 보낸다.
 *
 * 페이지가 아니라 Route Handler 인 이유: 세션 쿠키를 심어야 하는데,
 * cookies() 쓰기는 서버 컴포넌트 렌더링 중에는 불가능하고 Route Handler 에서만 된다.
 */
export async function GET(req: Request, ctx: RouteContext<"/dev/[step]">) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!(await devAccessAllowed(key))) {
    return new Response("권한이 없습니다.", { status: 401 });
  }

  const { step } = await ctx.params;
  const target = stepByNumber(Number(step));
  if (!target) {
    return new Response("그런 단계가 없습니다.", { status: 404 });
  }

  const overrides = parseOverrides(url.searchParams);
  const participant = await ensureDevSession(await currentParticipant(), overrides);

  const res = NextResponse.redirect(new URL(target.path, url.origin), { status: 303 });
  res.cookies.set(SESSION_COOKIE, participant.id, sessionCookieOptions);
  res.cookies.set(DEV_COOKIE, "1", sessionCookieOptions);
  return res;
}
