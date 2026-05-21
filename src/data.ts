import { Category, PersonalityMode } from "./types";

export interface CategoryOption {
  value: Category;
  label: string;
  emoji: string;
  desc: string;
}

export const CATEGORIES: CategoryOption[] = [
  {
    value: "lazy",
    label: "게으름 · 미루기",
    emoji: "🦥",
    desc: "침대와 한 몸이 되어 모든 일을 내일로 미루는 우주의 게으름뱅이들을 위해",
  },
  {
    value: "study",
    label: "공부 · 진로",
    emoji: "📚",
    desc: "학점은 F요, 내 꿈은 우주정복인데 미래가 캄캄할 때",
  },
  {
    value: "love",
    label: "연애 · 솔로",
    emoji: "💔",
    desc: "짝사랑부터 전남친 이불킥, 혹은 모태솔로 탈출을 꿈꾸는 영혼들을 위해",
  },
  {
    value: "money",
    label: "돈 · 텅장",
    emoji: "💸",
    desc: "버는 건 쥐꼬리인데 쓰고 싶은 건 황소 같아서 통장이 텅장이 되었을 때",
  },
  {
    value: "general",
    label: "기타 뇌절 일상",
    emoji: "🤪",
    desc: "답 없고 대책 없는 하루 속 자잘한 고민거리와 뇌절하는 순간들",
  },
];

export interface SampleQuestion {
  category: Category;
  text: string;
  short: string;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    category: "lazy",
    text: "내일 아침 9시 전공 중간고사인데 벌써 새벽 2시네... 근데 유튜브 쇼츠 쇼핑몰 리뷰가 왜 이렇게 재밌지? 어쩌냐?",
    short: "시험 직전 쇼츠 중독",
  },
  {
    category: "love",
    text: "전남친 인스타 염탐하다가 실수로 3년 전 바닷가 사진에 '좋아요' 눌렀어. 이민 가야 하냐? 진짜 노답이다...",
    short: "전애인 인스타 하트 실수",
  },
  {
    category: "money",
    text: "이번 달 카드값 230만원 나왔는데 내 통장 잔고는 23,200원이야. 혹시 신장이 한 개 없어도 생활 가능한지 진심 궁금하다.",
    short: "잔고 부족 신장 매매설",
  },
  {
    category: "study",
    text: "대기업 취직하고 싶은데 스펙은 없고, 침대에 누워서 하루 14시간 동안 넷플릭스만 보고 있어. 내 가치 좀 판단해 주라.",
    short: "누워서 대기업 취직망상",
  },
  {
    category: "general",
    text: "다이어트 3일차인데 오늘 헬스장 등록하고 돌아 오는 길에 치킨 냄새에 이끌려 두 마리 처묵했어. 이거 내일부터 유산소 5시간 하면 리셋 가능?",
    short: "헬스장 등록 후 치킨 뇌절",
  },
];

export interface ModeOption {
  value: PersonalityMode;
  label: string;
  desc: string;
  emoji: string;
  color: string;
}

export const PERSONALITY_MODES: ModeOption[] = [
  {
    value: "mild",
    label: "짜디짠 현실 조언 (순한맛)",
    desc: "현실 도피적인 소리는 무시하고, 차갑지만 약간 츤데레 같은 어리바리 조언을 해줘.",
    emoji: "💧",
    color: "from-sky-500 to-blue-600",
  },
  {
    value: "spicy",
    label: "무자비한 팩폭 (매운맛)",
    desc: "인정사정없는 팩트폭격과 위트 있는 뼈때림으로 당신의 혼을 빼놓아 드립니다.",
    emoji: "🔥",
    color: "from-amber-600 to-rose-600",
  },
  {
    value: "absurd",
    label: "기상천외 해결책 (병맛)",
    desc: "상식 파괴! 듣도 보도 못한 어이없고 엉뚱한 우주급 대안책을 가져다 드립니다.",
    emoji: "🤪",
    color: "from-purple-500 to-pink-600",
  },
  {
    value: "healing",
    label: "우쭈쭈 무한 칭찬 (힐링맛)",
    desc: "어떤 한심한 짓을 했어도 그럴 수 있다며 우쭈쭈 무한의 우호적 위로와 따뜻한 용기를 쏟아냅니다.",
    emoji: "✨",
    color: "from-emerald-500 to-teal-600",
  },
];
