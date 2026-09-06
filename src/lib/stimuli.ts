/**
 * 자극물 카탈로그 — 6장르 × 3세트 × 4편 = 72편 (+ 예비 2편)
 *
 * 세트 1개 = 온전히 보이는 3편 + 화면 끝에서 일부만 보이는 1편(peek).
 * 참여자는 3화면에서 서로 다른 세 세트를 보므로, 결과적으로 **자기 장르 12편을 전부** 본다.
 *
 * 세트를 나누는 이유: 세 화면에 같은 포스터가 나오면 참여자가 "설명 문구만 바뀌는구나"를
 * 눈치챈다. 어느 세트가 어느 근거유형에 붙을지는 참여자마다 순환시킨다(SET_MAPPINGS).
 *
 * 포스터 이미지: public/posters/<작품 id>.webp 에 있다.
 * 원본 PNG 를 scripts/posters.mjs 로 폭 400px WebP 로 변환한 것 (201MB → 1.9MB).
 * 이미지가 없는 작품은 제목 텍스트 카드로 대신 그려진다.
 * (저작권 처리는 인수인계 문서 1.3의 미해결 사항)
 */

import { GENRES, SET_IDS, type Genre, type SetId } from "./experiment";

export type Title = {
  /** 응답 데이터(title_ids)에 기록되므로 한 번 정하면 바꾸지 말 것 */
  id: string;
  title: string;
  /** 화면에 노출할 짧은 소개문 (아직 미작성) */
  synopsis?: string;
  /** 채우면 텍스트 카드 대신 이미지로 렌더링 */
  posterUrl?: string;
};

/** 세트 1개의 편수 — 앞 3편은 온전히, 마지막 1편은 끝에서 일부만 보인다 */
export const SET_SIZE = 4;
export const VISIBLE_PER_SET = 3;

/** 제목만 담은 원본 — 순서가 곧 화면에 놓이는 순서다 */
const TITLES: Record<Genre, Record<SetId, string[]>> = {
  action: {
    A: ["권법형사: 차이나타운", "성난화가", "돌아와요 부산항애", "공수도"],
    B: ["역모: 반란의 시대", "대결", "더러운 돈에 손대지 마라", "두 남자"],
    C: ["국제수사", "강력3반", "시수: 복수의 길", "액트 오브 밸러"],
  },
  romance: {
    A: ["창피해", "파이어버드", "타임 이즈 업2", "6번 칸"],
    B: ["사랑은 낙엽을 타고", "애프터: 유혹의 끝", "어느 날 그녀가 우주에서", "파이브 피트"],
    C: ["별 볼일 없는 인생", "봉태리", "미지수", "초인"],
  },
  comedy: {
    A: ["웅남이", "아네모네", "괜찮아 괜찮아 괜찮아!", "청춘가도"],
    B: ["킬링 로맨스", "아메바 소녀들과 학교괴담", "판소리 복서", "여기도 사람 있어요"],
    C: ["본길티", "미스터 락스타", "스탠드업가이", "파노스와 요르고스 그리고 당나귀"],
  },
  thriller: {
    A: ["타겟", "데드라인", "양치기", "루프"],
    B: ["원정빌라", "세입자", "라방", "그녀의 취미생활"],
    C: ["화녀", "6시간 후 너는 죽는다", "들개들", "앵커"],
  },
  drama: {
    A: ["보호자", "독친", "너와 나", "너를 줍다"],
    B: ["딸에 대하여", "새끼손가락", "그녀에게", "델타 보이즈"],
    C: ["양치기들", "생명의 은인", "미망", "베르네 부인의 장미정원"],
  },
  scifi: {
    A: ["프로스펙트", "콜드 스킨", "세틀러스", "뷰티 인 더 글라스"],
    B: ["라이프라이크", "나이트 레이더스", "더 레치드: 악령의 저주", "스노우 아마겟돈"],
    C: ["안나와 종말의 날", "울프킨", "프로젝트 M", "프로젝트 에덴"],
  },
};

/**
 * 예비 작품 — 화면에 나오지 않는다.
 * 사전평정에서 특정 작품이 매력도·인지도로 어긋나면 갈아 끼울 후보.
 */
export const BACKUP_TITLES: Partial<Record<Genre, string[]>> = {
  thriller: ["킬힘", "가려진 섬"],
};

/** genre → setId → Title[4] */
export const CATALOG: Record<Genre, Record<SetId, Title[]>> = Object.fromEntries(
  GENRES.map((genre) => [
    genre,
    Object.fromEntries(
      SET_IDS.map((set) => [
        set,
        TITLES[genre][set].map((title, i) => {
          const id = `${genre}-${set}-${i + 1}`;
          return { id, title, posterUrl: `/posters/${id}.webp` };
        }),
      ]),
    ) as Record<SetId, Title[]>,
  ]),
) as Record<Genre, Record<SetId, Title[]>>;

/** 한 세트(4편) — 앞 3편은 온전히, 마지막 1편은 peek */
export function getRail(genre: Genre, set: SetId): Title[] {
  return CATALOG[genre][set];
}

/**
 * 그 장르에서 참여자가 보게 될 전체 작품(12편).
 * 3화면에서 세 세트를 모두 보므로 장르 전체가 그대로 노출 대상이다.
 * 시청 경험 확인 문항이 이 목록을 쓴다.
 */
export function genreTitles(genre: Genre): Title[] {
  return SET_IDS.flatMap((set) => CATALOG[genre][set]);
}

/** 전체 사용 편수 (예비 제외) */
export const TOTAL_TITLES = GENRES.length * SET_IDS.length * SET_SIZE;
