/**
 * 자극물 카탈로그 — 6장르 × 3세트 × 주요 포스터 3개 = 54 슬롯
 *
 * 현재 상태: 큐레이션 미완성(인수인계 문서 2장). 확보된 후보만 채워져 있고
 * 나머지는 `status: "pending"` 빈 슬롯이다. 빈 슬롯은 화면에서 회색
 * 플레이스홀더 카드로 렌더링되며, /admin 에서 장르별 충원 현황을 볼 수 있다.
 *
 * 포스터 이미지: 지금은 전부 텍스트 카드 플레이스홀더.
 * 실제 포스터를 넣을 때는 `posterUrl` 만 채우면 자동으로 이미지로 바뀐다.
 * (저작권 처리는 문서 1.3의 미해결 사항 — 논문 도판용 별도 검토 필요)
 */

import { GENRES, SET_IDS, type Genre, type SetId } from "./experiment";

export type TitleStatus =
  /** 후보 확정 + 인지도 지표(관객수 등) 검증 완료 */
  | "verified"
  /** 후보로 올라왔지만 관객수/배우 인지도 등 재검토 필요 */
  | "unverified"
  /** 아직 못 찾은 빈 슬롯 */
  | "pending";

export type Title = {
  /** 슬롯 고유 id — 응답 데이터에 기록되므로 한 번 정하면 바꾸지 말 것 */
  id: string;
  title: string;
  year: number | null;
  /** 화면에 노출할 짧은 시놉시스 (문서 1.1 기준 4번) */
  synopsis: string;
  /** 관객수 등 저인지도 근거 (문서 1.1 기준 1번) */
  evidence: string;
  status: TitleStatus;
  /** 채우면 텍스트 카드 대신 이미지로 렌더링 */
  posterUrl?: string;
  /** 재검토 사유 메모 */
  note?: string;
};

function pending(genre: Genre, set: SetId, i: number): Title {
  return {
    id: `${genre}-${set}-${i}`,
    title: "미정",
    year: null,
    synopsis: "",
    evidence: "",
    status: "pending",
  };
}

/** 실제 채워진 후보들 (문서 2장에서 그대로 옮김) */
const SEEDED: Partial<Record<Genre, Partial<Record<SetId, Title[]>>>> = {
  action: {
    A: [
      {
        id: "action-A-1",
        title: "살수",
        year: 2023,
        synopsis: "은퇴한 살수가 마지막 의뢰를 받고 과거와 마주하는 액션 느와르.",
        evidence: "관객 3,593명 (영어 위키피디아 확인)",
        status: "verified",
      },
      {
        id: "action-A-2",
        title: "카운트",
        year: 2023,
        synopsis: "한 시대를 풍미한 복싱 금메달리스트가 체육 교사로 다시 링에 서는 이야기.",
        evidence: "개봉 사실만 확인 — 관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
      {
        id: "action-A-3",
        title: "비공식작전",
        year: 2023,
        synopsis: "실종된 동료를 찾아 분쟁지역으로 향한 외교관의 구출 작전.",
        evidence: "개봉 사실만 확인 — 관객수 미확인",
        status: "unverified",
        note: "주연 배우(하정우·주지훈) 인지도 높아 탈락 가능성 — 최종 결정 필요",
      },
    ],
  },
  romance: {
    A: [
      {
        id: "romance-A-1",
        title: "10일간의 애인",
        year: 2023,
        synopsis: "딱 열흘만 연인이 되기로 한 두 사람의 비밀 연애.",
        evidence: "소규모 개봉 — 관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
      {
        id: "romance-A-2",
        title: "튤립 모양",
        year: 2023,
        synopsis: "사랑과 예술 사이에서 흔들리는 두 사람의 우화적 로맨스.",
        evidence: "관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
      {
        id: "romance-A-3",
        title: "낭만적 공장",
        year: 2023,
        synopsis: "낡은 공장에서 다시 시작되는 어른들의 뒤늦은 연애.",
        evidence: "소규모 개봉으로 추정 — 관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
    ],
    B: [
      {
        id: "romance-B-1",
        title: "싱글 인 서울",
        year: 2023,
        synopsis: "혼자가 편한 남자와 혼자가 서툰 여자의 현실공감 로맨스.",
        evidence: "관객수 미확인",
        status: "unverified",
        note: "주연 배우(이동욱·임수정) 인지도 있어 재검토 필요",
      },
    ],
  },
  comedy: {
    A: [
      {
        id: "comedy-A-1",
        title: "웅남이",
        year: 2023,
        synopsis: "곰의 후손이라는 형제가 세상에 나와 벌이는 소동극.",
        evidence: "개봉 사실 확인 — 관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
    ],
  },
  thriller: {
    A: [
      {
        id: "thriller-A-1",
        title: "타겟",
        year: 2023,
        synopsis: "중고 거래로 만난 상대에게 일상을 표적당하는 여자의 이야기.",
        evidence: "스릴러로 명시 — 관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
      {
        id: "thriller-A-2",
        title: "악마들",
        year: 2023,
        synopsis: "형사와 살인마의 몸이 바뀌며 시작되는 추격.",
        evidence: "'살인마 스릴러'로 명시 — 관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
    ],
  },
  drama: {
    A: [
      {
        id: "drama-A-1",
        title: "보호자",
        year: 2023,
        synopsis: "10년 만에 출소한 남자가 몰랐던 딸의 존재를 알게 된다.",
        evidence: "개봉 사실 확인 — 관객수 미확인",
        status: "unverified",
        note: "배우(정우성) 인지도 있어 재검토 필요",
      },
      {
        id: "drama-A-2",
        title: "독친",
        year: 2023,
        synopsis: "딸의 죽음 이후, 어머니가 자신의 사랑을 되짚는 이야기.",
        evidence: "관객수 미확인",
        status: "unverified",
        note: "관객수 검증 필요",
      },
    ],
  },
  scifi: {
    A: [
      {
        id: "scifi-A-1",
        title: "더 폴: 오디어스와 환상의 문",
        year: 2006,
        synopsis: "병원에 누운 남자가 어린 소녀에게 들려주는 다섯 영웅의 환상담.",
        evidence: "국내 대중 인지도 낮은 편으로 추정 — 정밀 검증 필요",
        status: "unverified",
        note: "해외 컬트 판타지 (문서 1.2에 따라 SF/판타지는 해외작 허용)",
      },
      {
        id: "scifi-A-2",
        title: "왓/이프",
        year: null,
        synopsis: "선택하지 않은 삶의 가능성을 들여다보는 미스터리 판타지.",
        evidence: "국내 서비스 확인(JustWatch) — 인지도 미검증",
        status: "unverified",
        note: "영화가 아니라 시리즈물 — '영화로 통일' 원칙과 충돌, 재검토 필요",
      },
    ],
  },
};

/** genre → setId → Title[3] 완전 채워진 카탈로그 */
export const CATALOG: Record<Genre, Record<SetId, Title[]>> = Object.fromEntries(
  GENRES.map((genre) => [
    genre,
    Object.fromEntries(
      SET_IDS.map((set) => {
        const seeded = SEEDED[genre]?.[set] ?? [];
        const slots = Array.from(
          { length: 3 },
          (_, i) => seeded[i] ?? pending(genre, set, i + 1),
        );
        return [set, slots];
      }),
    ) as Record<SetId, Title[]>,
  ]),
) as Record<Genre, Record<SetId, Title[]>>;

/**
 * peek 포스터 — 화면 끝에 살짝 잘려 거의 안 보이는 4번째 카드.
 * 큐레이션 대상이 아니며 모든 화면에서 공용 재사용 (문서 0.3).
 */
export const PEEK_TITLE: Title = {
  id: "peek-shared",
  title: "",
  year: null,
  synopsis: "",
  evidence: "큐레이션 대상 아님 — 공용 재사용",
  status: "pending",
};

export function getRail(genre: Genre, set: SetId): Title[] {
  return CATALOG[genre][set];
}
