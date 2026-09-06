"use client";

/**
 * 설문 화면에서 서버로 응답을 보낼 때 쓰는 공통 요청 함수.
 *
 * 세션이 사라진 경우(쿠키 만료, 서버 쪽에서 행이 지워짐)를 여기서 한 번에 처리한다.
 * 그냥 두면 참여자에게 "세션이 없습니다"라는 개발자용 문구만 뜨고 화면이 멈춘다 —
 * 무엇을 해야 하는지 알 수 없고, 새로고침해도 같은 자리에서 막힌다.
 * 그래서 사람이 읽을 수 있는 안내를 띄우고 잠시 뒤 처음 화면으로 돌려보낸다.
 */

export const SESSION_EXPIRED_MESSAGE =
  "설문 세션이 만료되었습니다. 잠시 후 처음 화면으로 돌아갑니다.";

export type PostResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export async function postJson(url: string, body: unknown): Promise<PostResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "연결이 끊겼습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (res.status === 401) {
    // 완전히 다시 불러온다 — 남아 있는 화면 상태까지 비워야 한다.
    // replace 라서 죽은 세션 페이지가 뒤로가기 기록에 남지 않는다.
    setTimeout(() => window.location.replace(window.location.origin + "/"), 1800);
    return { ok: false, error: SESSION_EXPIRED_MESSAGE };
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // 본문이 비어 있을 수 있다
  }

  if (!res.ok) {
    return { ok: false, error: (data.error as string) ?? "저장에 실패했습니다." };
  }
  return { ok: true, data };
}
