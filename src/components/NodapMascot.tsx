import { motion } from "motion/react";
import { EmotionType } from "../types";
// @ts-ignore
import nodapAvatar from "../assets/images/nodapbot_avatar_1779321544944.png";

const faceMap: Record<EmotionType, { face: string; text: string; color: string; bg: string }> = {
  clueless: {
    face: "(⊙_⊙?)",
    text: "응? 뭐라고? 그게 말이 됨...?",
    color: "text-sky-500 border-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/40",
  },
  smug: {
    face: "😏",
    text: "크크... 그럴 줄 알았다. 내 손바닥 안이지!",
    color: "text-amber-500 border-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  sigh: {
    face: "┐(´д｀)┌",
    text: "휴... 오늘도 인류는 노답이다...",
    color: "text-slate-500 border-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/60",
  },
  angry: {
    face: "╬▔皿▔)╯",
    text: "야! 지금 정신 안 차려?! 당장 침대에서 인나!!",
    color: "text-rose-600 border-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
  joy: {
    face: "ꉂ(ˊᗜˋ*)",
    text: "ㅋㅋㅋㅋ 진짜 레전드 코미디 고민이네!",
    color: "text-emerald-500 border-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  shock: {
    face: "(⊙_⊙;)",
    text: "와... 이건 진짜 실존하는 노답인가...",
    color: "text-purple-500 border-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/40",
  },
};

interface NodapMascotProps {
  emotion?: EmotionType;
  isThinking?: boolean;
}

export default function NodapMascot({ emotion = "sigh", isThinking = false }: NodapMascotProps) {
  const current = faceMap[emotion] || faceMap["sigh"];

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative">
        {/* Ambient Ring Glow */}
        <motion.div
          className={`absolute inset-0 rounded-full blur-xl opacity-20 ${
            isThinking ? "bg-purple-500 animate-pulse" : "bg-teal-500"
          }`}
          layoutId="avatar-glow"
        />

        {/* Mascot Avatar Container */}
        <motion.div
          animate={isThinking ? { y: [0, -6, 0] } : { y: [0, -3, 0] }}
          transition={{
            repeat: Infinity,
            duration: isThinking ? 1.2 : 3,
            ease: "easeInOut",
          }}
          className="relative w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-800 bg-slate-100 overflow-hidden shadow-lg"
        >
          {/* Avatar Image */}
          <img
            src={nodapAvatar}
            alt="Nodapbot Avatar"
            className="w-full h-full object-cover transition-all duration-300"
            referrerPolicy="no-referrer"
          />

          {/* Floating expression overlay */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
            <span className="text-white font-mono text-sm tracking-widest font-bold">노답봇 OS</span>
          </div>
        </motion.div>

        {/* Floating Expression Badge */}
        <motion.div
          key={emotion}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`absolute -bottom-2 -right-3 px-3 py-1.5 rounded-full border shadow-md bg-white dark:bg-slate-900 ${current.color} font-mono font-bold text-sm tracking-wider`}
        >
          {isThinking ? "💬 분석중..." : current.face}
        </motion.div>
      </div>

      {/* Comic Comment bubble below Mascot */}
      <motion.div
        key={isThinking ? "thinking" : emotion}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-4 max-w-sm px-4 py-2 rounded-2xl border text-center font-medium shadow-sm leading-relaxed ${current.bg} ${current.color}`}
      >
        <span className="text-xs tracking-wider opacity-85 uppercase font-bold block mb-0.5">
          {isThinking ? "시스템 상태" : "노답봇의 심경"}
        </span>
        <p className="text-sm">
          {isThinking ? "뇌 정지 방지 부스터 가동 중... 잠시만 기다려라 인간." : current.text}
        </p>
      </motion.div>
    </div>
  );
}
