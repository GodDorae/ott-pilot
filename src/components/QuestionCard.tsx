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
  /** 카드 위 작은 라벨. 문항 번호가 없는 문항(성실성 확인)에서는 비운다 */
  label,
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
      <p id={id} className="q-text text-sm leading-relaxed font-medium break-keep">
        {question}
        {required && (
          <span className="ml-1 text-required" aria-hidden>
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
