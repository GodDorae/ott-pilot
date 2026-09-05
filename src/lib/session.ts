/**
 * 참여자 세션 — httpOnly 쿠키에 참여자 id 만 담고, 배정 정보는 항상 DB에서 읽는다.
 * (배정 결과를 클라이언트가 만지지 못하게 하려는 것)
 *
 * cookies() 는 서버 컴포넌트 렌더링 중에는 읽기만 가능하다. 쓰기는 Route Handler
 * 또는 Server Function 에서만 되므로, 세션을 만드는 쪽은 전부 route.ts 에 있다.
 */

import { cookies } from "next/headers";
import { getParticipant, type ParticipantRow } from "./db";

export const SESSION_COOKIE = "survey_pid";

/**
 * /dev 미리보기 세션 표시용 별도 쿠키.
 * 이 쿠키가 없으면 개발 배너는 DB를 조회조차 하지 않는다 — 실제 참여자에게
 * 불필요한 쿼리가 붙지 않게 하려는 것.
 */
export const DEV_COOKIE = "survey_dev";

const MAX_AGE = 60 * 60 * 6; // 6시간

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export async function currentParticipant(): Promise<ParticipantRow | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return getParticipant(id);
}

/** 지금 세션이 /dev 미리보기인지 — 쿠키만 보고 판단해 조회를 아낀다 */
export async function isDevSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(DEV_COOKIE)?.value === "1";
}
