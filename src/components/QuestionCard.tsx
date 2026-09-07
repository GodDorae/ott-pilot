import type { ReactNode } from "react";

/**
 * 문항 하나를 담는 흰 카드.
 *
 * 선행 조사(세현이논문/ott-survey-react)의 QShell 과 같은 구조다 — 문항마다 카드를
 * 하나씩 두고, 카드 맨 위에 작은 라벨(문항 번호), 그 아래에 문항, 그 아래에 보기를 놓는다.
 *
 * 한 카드에 여러 문항을 몰아넣지 않는 이유: 카드가 문항의 경계를 대신한다.
 * 경계가 없으면 보기 줄이 어느 문항의 것인지 눈으로 되짚어야 하고, 특히 좁은 화면에서
 * 위 문항의 보기를 아래 문항의 것으로 잘못 누르는 일이 생긴다.
 *
 * 반대로 카드마다 생김새는 똑같이 둔다. 카드 모양이 문항 종류에 따라 달라지면
 * 참여자가 "여기부터 다른 걸 묻는다"를 알아차려 묶음마다 다른 기준으로 답하게 되고,
 * 성실성 확인 문항도 눈에 띄어 변별력을 잃는다.
 */
export default function QuestionCard({
  /** 카드 위 작은 라벨 */
  label,
  /**
   * 화면에 보이는 문항 번호. 있으면 문항 글 앞에 붙고 둘째 줄부터 들여쓰기가 걸린다.
   *
   * 번호를 카드가 직접 그린다. 호출하는 쪽에서 flex 로 감싸 붙였더니 문항 전체가
   * 블록이 되어 필수 표시(*)가 문장 끝이 아니라 다음 줄로 떨어졌다.
   */
  no,
  /** 문항 본문 */
  question,
  /** 문항 아래 보조 설명 */
  help,
  /** 필수 표시(*) 를 붙일지 */
  required = false,
  /** aria 용 — 보기 묶음이 이 문항을 가리키게 한다 */
  id,
  children,
  className = "",
}: {
  label?: ReactNode;
  no?: number;
  question: ReactNode;
  help?: ReactNode;
  required?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "card-shadow rounded-xl border border-line bg-card px-4 py-4 sm:px-5 " + className
      }
    >
      {label != null && (
        <p className="mb-1 text-[11px] font-semibold text-faint tabular-nums wide:text-xs">{label}</p>
      )}
      {/*
        번호·문항·별표를 한 줄의 인라인 흐름에 둔다. 별표가 문장 끝에 붙어 있어야
        무엇이 필수인지 읽히고, 줄바꿈으로 떨어지면 그냥 떠 있는 기호가 된다.

        번호가 있을 때만 매달린 들여쓰기(hanging indent)를 건다 — 문항이 두 줄로
        넘어가도 둘째 줄이 번호 아래가 아니라 글 아래에 맞는다.
      */}
      <p
        id={id}
        className={
          "q-text text-sm leading-relaxed font-medium break-keep" +
          (no ? " ps-[1.45em] -indent-[1.45em]" : "")
        }
      >
        {no ? (
          <>
            <span className="font-bold text-accent tabular-nums">{no}.</span>{" "}
          </>
        ) : null}
        {question}
        {required && (
          <span className="ml-0.5 text-required" aria-hidden>
            *
          </span>
        )}
      </p>
      {help && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted break-keep wide:text-[13px]">{help}</p>
      )}
      <div className="mt-3.5">{children}</div>
    </div>
  );
}
