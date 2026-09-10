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

/**
 * 작품 등록부 — id 와 제목의 짝을 정하는 표. **화면 순서는 여기서 정하지 않는다.**
 *
 * id 는 `<장르>-<세트>-<자리>` 꼴로 이 표의 자리에서 만들어진다. 그 id 가
 * 응답 데이터(title_ids · seen_title_ids)에 그대로 들어가고 포스터 파일 이름도
 * 그것이라(public/posters/<id>.webp), **한 번 맺어진 id↔제목 짝은 바꾸지 않는다.**
 *
 * 예전에는 이 표의 순서가 곧 화면 순서였다. 그런데 고정 콘텐츠를 첫 자리로 옮기려고
 * 순서를 건드리면 id 가 다른 작품에게 넘어가 ① 이미 받은 응답의 title_ids 가 다른 작품을
 * 가리키게 되고 ② 포스터도 제목과 어긋난다. 그래서 순서를 아래 ARRANGEMENT 로 떼어 냈다.
 * 이 표의 A/B/C·번호는 이제 "처음 등록된 자리" 라는 흔적일 뿐, 지금 어느 세트의 몇 번째인지와
 * 무관하다 — 세트 구성을 알려면 ARRANGEMENT 를 봐야 한다.
 */
const REGISTRY: Record<Genre, Record<SetId, string[]>> = {
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

/**
 * 장르별 고정 콘텐츠 — 연구자 지정.
 *
 * 세 작품은 세 세트에 하나씩 들어가 **각 화면 첫 번째 레일의 첫 번째 썸네일**을 차지한다.
 * 어느 작품이 어느 화면에 가는지는 상관없다 (세트↔근거유형 짝짓기가 참여자마다 순환하므로
 * 어차피 화면 순서와 무관하게 "그 화면의 첫 자리" 라는 규칙만 지켜진다).
 */
const PINNED: Record<Genre, readonly [string, string, string]> = {
  action: ["대결", "더러운 돈에 손대지 마라", "액트 오브 밸러"],
  romance: ["6번 칸", "봉태리", "초인"],
  comedy: ["여기도 사람 있어요", "본길티", "청춘가도"],
  thriller: ["타겟", "양치기", "6시간 후 너는 죽는다"],
  drama: ["딸에 대하여", "양치기들", "미망"],
  scifi: ["프로젝트 M", "뷰티 인 더 글라스", "프로젝트 에덴"],
};

/**
 * 화면에 놓이는 순서 — 세트별 4편, 첫 번째가 고정 콘텐츠다.
 *
 * 고정 콘텐츠 셋 중 둘이 원래 같은 세트에 있던 장르(액션·로맨스·스릴러·드라마·SF)에서는
 * 한 편을 고정 콘텐츠가 없던 세트로 옮겼다. 세트 크기를 4로 유지해야 하므로 받는 세트의
 * 맨 끝(peek — 화면 끝에서 일부만 보이는 자리) 작품을 반대로 보냈다. 옮기는 편수를
 * 최소로 두고, 옮겨간 편은 가장 덜 보이는 자리에 놓아 기존 구성을 최대한 남긴 것이다.
 * 고정 콘텐츠를 뺀 나머지는 원래의 상대 순서를 그대로 지킨다.
 *
 * 제목으로 적는다 — id 로 적으면 어느 작품인지 읽을 수 없다. 아래 검사에서 제목이
 * 등록부와 맞는지, 장르 12편이 빠짐없이 한 번씩 쓰였는지 확인한다.
 */
const ARRANGEMENT: Record<Genre, Record<SetId, readonly string[]>> = {
  action: {
    A: ["더러운 돈에 손대지 마라", "권법형사: 차이나타운", "성난화가", "돌아와요 부산항애"],
    B: ["대결", "역모: 반란의 시대", "두 남자", "공수도"],
    C: ["액트 오브 밸러", "국제수사", "강력3반", "시수: 복수의 길"],
  },
  romance: {
    A: ["6번 칸", "창피해", "파이어버드", "타임 이즈 업2"],
    B: ["초인", "사랑은 낙엽을 타고", "애프터: 유혹의 끝", "어느 날 그녀가 우주에서"],
    C: ["봉태리", "별 볼일 없는 인생", "미지수", "파이브 피트"],
  },
  comedy: {
    A: ["청춘가도", "웅남이", "아네모네", "괜찮아 괜찮아 괜찮아!"],
    B: ["여기도 사람 있어요", "킬링 로맨스", "아메바 소녀들과 학교괴담", "판소리 복서"],
    C: ["본길티", "미스터 락스타", "스탠드업가이", "파노스와 요르고스 그리고 당나귀"],
  },
  thriller: {
    A: ["타겟", "데드라인", "루프", "그녀의 취미생활"],
    B: ["양치기", "원정빌라", "세입자", "라방"],
    C: ["6시간 후 너는 죽는다", "화녀", "들개들", "앵커"],
  },
  drama: {
    A: ["미망", "보호자", "독친", "너와 나"],
    B: ["딸에 대하여", "새끼손가락", "그녀에게", "델타 보이즈"],
    C: ["양치기들", "생명의 은인", "베르네 부인의 장미정원", "너를 줍다"],
  },
  scifi: {
    A: ["뷰티 인 더 글라스", "프로스펙트", "콜드 스킨", "세틀러스"],
    B: ["프로젝트 에덴", "라이프라이크", "나이트 레이더스", "더 레치드: 악령의 저주"],
    C: ["프로젝트 M", "안나와 종말의 날", "울프킨", "스노우 아마겟돈"],
  },
};

/** 제목 → 등록부에서 맺어진 id (곧 포스터 파일 이름) */
const ID_BY_TITLE: Record<Genre, Map<string, string>> = Object.fromEntries(
  GENRES.map((genre) => [
    genre,
    new Map(
      SET_IDS.flatMap((set) =>
        REGISTRY[genre][set].map((title, i) => [title, `${genre}-${set}-${i + 1}`] as const),
      ),
    ),
  ]),
) as Record<Genre, Map<string, string>>;

/**
 * 배치가 규칙을 지키는지 불러올 때 한 번 확인한다.
 *
 * 조용히 어긋나면 자극물이 잘못 나간 채로 응답이 쌓인다 — 그건 되돌릴 수 없으므로
 * 화면을 띄우지 못하게 막는 편이 낫다. 검수 조건 1~4를 그대로 옮긴 검사다.
 */
function assertArrangement() {
  for (const genre of GENRES) {
    const registered = new Set(ID_BY_TITLE[genre].keys());
    const used: string[] = [];
    const firsts: string[] = [];

    for (const set of SET_IDS) {
      const rail = ARRANGEMENT[genre][set];
      if (rail.length !== SET_SIZE) {
        throw new Error(`자극물 배치: ${genre}-${set} 이 ${rail.length}편이다 (${SET_SIZE}편이어야 한다)`);
      }
      for (const title of rail) {
        if (!registered.has(title)) {
          throw new Error(`자극물 배치: ${genre}-${set} 의 "${title}" 이 등록부에 없다 (제목 오타?)`);
        }
      }
      used.push(...rail);
      firsts.push(rail[0]);
    }

    // 장르 12편이 빠짐없이 한 번씩
    if (new Set(used).size !== used.length) {
      throw new Error(`자극물 배치: ${genre} 에 같은 작품이 두 번 들어갔다`);
    }
    if (used.length !== registered.size) {
      throw new Error(`자극물 배치: ${genre} 가 ${used.length}편인데 등록부는 ${registered.size}편이다`);
    }

    // 고정 콘텐츠 3편이 세 세트의 첫 자리를 하나씩
    const pinned = [...PINNED[genre]].sort();
    if (JSON.stringify([...firsts].sort()) !== JSON.stringify(pinned)) {
      throw new Error(
        `자극물 배치: ${genre} 의 첫 자리가 [${firsts.join(", ")}] 인데 ` +
          `고정 콘텐츠는 [${PINNED[genre].join(", ")}] 다`,
      );
    }
  }
}

assertArrangement();

/** genre → setId → Title[4]. 순서는 ARRANGEMENT, id·포스터는 등록부에서 온다 */
export const CATALOG: Record<Genre, Record<SetId, Title[]>> = Object.fromEntries(
  GENRES.map((genre) => [
    genre,
    Object.fromEntries(
      SET_IDS.map((set) => [
        set,
        ARRANGEMENT[genre][set].map((title) => {
          const id = ID_BY_TITLE[genre].get(title) as string;
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

// 시청 경험 확인 (2-2) --------------------------------------------------------

/**
 * 이 카탈로그는 '참여자가 모르는 작품'이라는 전제로 고른 것이다.
 * 그 전제가 실제로 성립하는지 확인해야, 평가가 추천 근거 때문인지 원래 아는
 * 작품이라 그런지 갈라진다.
 *
 * '봤다/안 봤다' 이분법으로는 모자란다 — 이름은 아는데 안 본 작품은 처음 보는
 * 작품과 다르게 반응할 수 있어서, 중간 단계를 따로 받는다.
 */
export const FAMILIARITY_QUESTION = "이 작품들을 이전에 시청하거나 들어본 적이 있나요?";

export const FAMILIARITY_LEVELS = [
  { value: "unknown", label: "전혀 모른다" },
  { value: "heard", label: "이름만 들어봤다" },
  { value: "watched", label: "시청한 적 있다" },
] as const;

export type FamiliarityLevel = (typeof FAMILIARITY_LEVELS)[number]["value"];

const FAMILIARITY_VALUES = new Set<string>(FAMILIARITY_LEVELS.map((l) => l.value));

export function isFamiliarityLevel(v: unknown): v is FamiliarityLevel {
  return typeof v === "string" && FAMILIARITY_VALUES.has(v);
}

/** 실제로 시청한 작품만 추린다 — 자극물 전제 확인에 쓰는 값 */
export function watchedTitleIds(familiarity: Record<string, FamiliarityLevel>): string[] {
  return Object.keys(familiarity).filter((id) => familiarity[id] === "watched");
}
