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
    /*
      401 을 그냥 돌려주면 흰 화면에 글자만 남아 되돌아갈 길이 없다.
      /dev 의 로그인 화면으로 보내고, 통과 후 원래 보려던 단계로 되돌아오게 한다.
      key 는 떼고 넘긴다 — next 에 붙어 주소창·기록에 비밀번호가 남는다.
    */
    const back = new URL(url.pathname, url.origin);
    for (const [k, v] of url.searchParams) if (k !== "key") back.searchParams.set(k, v);
    const login = new URL("/dev", url.origin);
    login.searchParams.set("next", back.pathname + back.search);
    return NextResponse.redirect(login, { status: 303 });
  }

  const { step } = await ctx.params;
  const target = stepByNumber(Number(step));
  if (!target) {
    return new Response("그런 단계가 없습니다.", { status: 404 });
  }

  const overrides = parseOverrides(url.searchParams);
  const participant = await ensureDevSession(
    await currentParticipant(),
    overrides,
    req.headers.get("user-agent"),
  );

  const res = NextResponse.redirect(new URL(target.path, url.origin), { status: 303 });
  res.cookies.set(SESSION_COOKIE, participant.id, sessionCookieOptions);
  res.cookies.set(DEV_COOKIE, "1", sessionCookieOptions);
  return res;
}
