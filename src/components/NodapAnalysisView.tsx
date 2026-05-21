import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AnalysisResult, Category } from "../types";
import { CATEGORIES } from "../data";
import { FileText, ShieldAlert, Heart, Coins, BookOpen, Clock, Sparkles } from "lucide-react";

interface NodapAnalysisViewProps {
  result: AnalysisResult;
  category: Category;
  problem: string;
  onReset: () => void;
  onChatDirectly: () => void;
  onShareToGlobalChat?: () => void;
}

export default function NodapAnalysisView({
  result,
  category,
  problem,
  onReset,
  onChatDirectly,
  onShareToGlobalChat,
}: NodapAnalysisViewProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Find category emoji & label
  const catInfo = CATEGORIES.find((c) => c.value === category) || {
    emoji: "🧭",
    label: "일반 고민",
  };

  // Animate the score gauge from 0 to target score
  useEffect(() => {
    let start = 0;
    const end = result.score;
    if (end === 0) return;

    const timer = setInterval(() => {
      start += 1;
      setAnimatedScore(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, 12);

    return () => clearInterval(timer);
  }, [result.score]);

  // Determine severity tier layout classes
  const getTierDetails = (score: number) => {
    if (score <= 25) {
      return {
        title: "희망 보유 지대 (경한 상태)",
        description: "아직 인류 문명 수준의 해답이 존재합니다. 정신만 채찍질하면 당장 극복 가능한 꿀밤 단계!",
        color: "text-emerald-500 from-emerald-500/20 to-emerald-500/5",
        ringColor: "#10b981",
        label: "안전",
      };
    } else if (score <= 60) {
      return {
        title: "점진적 뇌절 경보 (옐로우 크라이시스)",
        description: "슬슬 머릿속 회로가 엉키기 시작했습니다. 방치 시 정밀 노답 코스로 고속도로 진입!",
        color: "text-amber-500 from-amber-500/20 to-amber-500/5",
        ringColor: "#f59e0b",
        label: "경고",
      };
    } else if (score <= 85) {
      return {
        title: "정밀 노답 스페셜리스트 (오렌지 피버)",
        description: "상태의 극적인 반전이 없다면 사실상 노답봇과 영원히 동거 동락해야 할 마스터 레벨!",
        color: "text-orange-500 from-orange-500/20 to-orange-500/5",
        ringColor: "#f97316",
        label: "심각",
      };
    } else {
      return {
        title: "태초의 영롱한 순도 100% 노답 (우주 우수 등급)",
        description: "과학조차 설명을 포기했습니다. 답이 아예 없으니 차라리 해탈하고 마음의 영성 수련을 시작하십시오.",
        color: "text-rose-600 from-rose-600/20 to-rose-600/5",
        ringColor: "#dc2626",
        label: "재해",
      };
    }
  };

  const tier = getTierDetails(result.score);

  // SVG parameters for radial circular gauge
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Title Shield */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-2 right-2 px-3 py-1 bg-white dark:bg-slate-950 rounded-full border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-400">
          DOC No. {Math.floor(100000 + Math.random() * 900000)}
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-3">
          <FileText className="w-3.5 h-3.5" />
          노합인정 분석 감정서
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          {catInfo.emoji} 고민 감정 확인증 {catInfo.emoji}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 italic max-w-md mx-auto line-clamp-1">
          {`"${problem}"`}
        </p>
      </motion.div>

      {/* Main Analysis Bento-Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Huge Score Badge with Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`flex flex-col items-center justify-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br ${tier.color} p-6 shadow-md`}
        >
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">
            노답 지수 (Nodap Score)
          </span>

          {/* SVG Circular Ring */}
          <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              {/* Back background ring */}
              <circle
                stroke="rgba(0,0,0,0.06)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              {/* Fore color progress ring */}
              <circle
                stroke={tier.ringColor}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + " " + circumference}
                style={{ strokeDashoffset, transition: "stroke-dashoffset 0.1s ease" }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">
                {animatedScore}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {tier.label}
              </span>
            </div>
          </div>

          <p className={`text-base font-black mt-5 tracking-tight ${tier.color.split(" ")[0]}`}>
            {tier.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
            {tier.description}
          </p>
        </motion.div>

        {/* Right Column: Grade & Fast Summary details */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Humorous Grade Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex-1 flex flex-col justify-center"
          >
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">
              종합 노답 등급
            </span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 shrink-0 text-red-500 animate-bounce" />
              {result.grade}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
              본 등급은 백해무익형 우주 공인 AI 노답봇 연구소의 가차 없는 팩트 폭격 가치 기준에 의하여 산정된 무면허 정식 등급입니다.
            </p>
          </motion.div>

          {/* Sarcastic core analysis summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-red-50/50 dark:bg-red-950/25 border border-red-100 dark:border-red-900 p-6 rounded-3xl shadow-sm flex-1 flex flex-col justify-center"
          >
            <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase mb-1">
              촌철살인 핵심 분석 요약
            </span>
            <p className="text-red-700 dark:text-red-300 font-extrabold text-sm md:text-base leading-relaxed">
              “{result.summary}”
            </p>
          </motion.div>
        </div>
      </div>

      {/* Prescription section (styled like medical instructions) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900 text-white dark:bg-slate-950 dark:border dark:border-slate-800 rounded-3xl p-6 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-emerald-400 shadow-inner">
            💊
          </div>
          <div>
            <h4 className="font-extrabold text-lg text-emerald-400 tracking-tight">노답봇 극약처방 (Absurd Cure)</h4>
            <p className="text-[10px] text-slate-400">주의: 이 처방전을 따라 하다가 입은 내외적 피해는 알 바 아님</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl font-mono text-xs md:text-sm leading-relaxed text-slate-200">
          <span className="text-emerald-400 font-bold block mb-1">■ 복용 지침 및 행동 지령 :</span>
          {result.prescription}
        </div>
      </motion.div>

      {/* Roasted Mind-waking Quote Quote Scroll */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-inner text-center italic relative"
      >
        <span className="absolute top-4 left-4 text-4xl text-slate-300 pointer-events-none">“</span>
        <p className="text-slate-800 dark:text-slate-200 font-bold text-[13px] md:text-base px-6 py-2">
          {result.quote}
        </p>
        <span className="absolute bottom-4 right-4 text-4xl text-slate-300 pointer-events-none">”</span>
        <span className="text-[10px] font-bold tracking-tight text-slate-400 mt-2 block not-italic">
          — 노답봇 어록 제104조 팩폭구절 중 발췌
        </span>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 flex-wrap"
      >
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-sm transition-all focus:ring-2 focus:ring-slate-500 cursor-pointer"
        >
          🔄 다른 고민 해보기 (다시 분석)
        </button>

        {onShareToGlobalChat && (
          <button
            onClick={onShareToGlobalChat}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-650 text-white hover:opacity-90 active:scale-[0.98] font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            🌐 우주 전체 리포트 기증 (광장 공유)
          </button>
        )}

        <button
          onClick={onChatDirectly}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 active:scale-[0.98] font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          💬 노답봇과 소통하기 →
        </button>
      </motion.div>
    </div>
  );
}
