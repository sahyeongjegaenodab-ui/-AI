export type Category = "study" | "love" | "money" | "lazy" | "general";

export type PersonalityMode = "mild" | "spicy" | "absurd" | "healing";

export type EmotionType = "clueless" | "smug" | "sigh" | "angry" | "joy" | "shock";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: EmotionType;
  timestamp: string;
}

export interface AnalysisResult {
  score: number;
  grade: string;
  summary: string;
  prescription: string;
  quote: string;
}
