/** 관리자 비밀번호 입력 화면 — 서버 컴포넌트, 폼 전송만 쓰므로 클라이언트 JS 가 없다 */
export default function AdminLogin({
  next = "/admin",
  failed = false,
}: {
  /** 로그인 후 돌아갈 경로 */
  next?: string;
  failed?: boolean;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <p className="text-xs font-medium tracking-widest text-accent">ADMIN</p>
      <h1 className="mt-2 text-xl font-bold break-keep">관리자 확인</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted break-keep">
        응답 모니터링 화면입니다. 비밀번호를 입력해 주세요.
      </p>

      <form action="/api/admin/login" method="post" className="mt-6">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password" className="sr-only">
          관리자 비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="비밀번호"
          className="w-full rounded-lg border border-line bg-white px-3 py-3 text-sm outline-none focus:border-accent"
        />

        {failed && (
          <p role="alert" className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
            비밀번호가 맞지 않습니다.
          </p>
        )}

        <button
          type="submit"
          className="mt-3 w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-bold text-white"
        >
          들어가기
        </button>
      </form>
    </main>
  );
}
