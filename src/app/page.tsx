import StartButton from "@/components/StartButton";
import { NoticeCard, NoticeList } from "@/components/Notice";
import { dbDriver, dbMisconfigured } from "@/lib/db";

/** 설문 기간 — 원 설문 고지와 동일. 표시용이며 접근을 막지는 않는다. */
export const SURVEY_PERIOD = "2026.09.06 ~ 2026.09.13";

/** 소개 + 연구참여 동의 화면 (기조 문서 1-1) */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
      <h1 className="text-xl leading-snug font-bold break-keep">
        OTT 플랫폼 추천 기능에 대한 사용자 경험 연구
      </h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed break-keep">
        <p>안녕하세요.</p>
        <p className="text-muted">
          본 연구는 홍익대학교 대학원의 석사 연구 주제로 진행되는{" "}
          <strong className="text-fg">
            &ldquo;OTT 플랫폼의 AI 개인화 추천 방식이 사용자 경험에 어떤 영향을 미치는지
            연구하기 위한 석사 학위 논문 실험&rdquo;
          </strong>
          에 관한 설문입니다.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-line bg-card p-4 sm:p-5">
        <h2 className="text-sm font-bold">연구 대상</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted break-keep">
          <li>· 넷플릭스, 티빙, 쿠팡플레이 등 OTT 플랫폼을 사용해 본 경험이 있는 분</li>
          <li>· 남녀노소 무관</li>
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
          설문 기간: <span className="tabular-nums">{SURVEY_PERIOD}</span>
        </p>
      </section>

      <p className="mt-6 text-sm leading-relaxed text-muted break-keep">
        귀하의 진솔하고 소중한 답변은{" "}
        <strong className="text-fg">
          통계법 제31조(통계자료의 이용) 및 제33조(비밀의 보호)
        </strong>{" "}
        규정에 의거하여 비밀 보장될 것과 학문적 연구 이외의 목적으로는 절대 사용되지 않을
        것을 약속 드립니다.
      </p>

      <NoticeCard label="유의사항" className="mt-6">
        <NoticeList
          items={[
            "설문은 약 5~10분 소요됩니다.",
            "정답은 없으며, 귀하의 솔직한 느낌을 측정합니다.",
            "모든 응답은 익명으로 처리되며, 연구 목적 외에는 사용되지 않습니다.",
          ]}
        />
        {/* 되돌릴 수 없는 안내라 같은 목록 안에서도 한 번 더 세운다 */}
        <p className="mt-3 border-t border-warn-line/40 pt-3 font-bold text-warn-strong">
          중간에 창을 닫으면 처음부터 다시 시작해야 합니다.
        </p>
      </NoticeCard>

      <p className="mt-6 text-sm leading-relaxed text-muted break-keep">
        바쁘신 와중에도 귀중한 시간을 내어 연구 설문에 참여해 주셔서 감사합니다.
      </p>

      <div className="mt-8">
        <StartButton />
      </div>

      {dbMisconfigured && (
        <p className="mt-6 rounded-lg border border-accent bg-accent/10 px-4 py-3 text-sm leading-relaxed font-bold text-accent break-keep">
          서버 설정이 끝나지 않아 지금은 응답을 받을 수 없습니다.
          <span className="mt-1 block font-normal">
            (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정)
          </span>
        </p>
      )}

      {!dbMisconfigured && dbDriver === "local" && (
        <p className="mt-6 rounded-lg bg-accent/10 px-3 py-2 text-xs leading-relaxed text-accent break-keep">
          개발 모드: Supabase 환경변수가 없어 응답이 <code>.data/*.jsonl</code> 로만
          저장됩니다. 실제 수집에는 쓰지 마세요.
        </p>
      )}
    </main>
  );
}
