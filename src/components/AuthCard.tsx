import React, { useState } from "react";
import { motion } from "motion/react";
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Eye, EyeOff, User, Lock, AlertCircle, Sparkles, UserPlus, LogIn } from "lucide-react";

interface AuthCardProps {
  onAuthSuccess: (user: { uid: string; nickname: string }) => void;
}

// Deterministic Unicode -> ASCII hex safe key converter (acts as document ID in Firestore)
export function getUserIdFromNickname(nickname: string): string {
  const clean = nickname.trim().toLowerCase();
  const hex = Array.from(clean)
    .map((c) => c.charCodeAt(0).toString(16))
    .join("");
  return `usr_${hex || "empty"}`;
}

export default function AuthCard({ onAuthSuccess }: AuthCardProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fast sandbox login without waiting to enable console providers
  const handleSandboxLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Generate a pleasant random nickname for the guest
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const guestNickname = `광장나그네_${randomNum}`;
      const virtualUid = `guest_${randomNum}_${Date.now()}`;

      // Save User Profile to Firestore /users/{userId}
      await setDoc(doc(db, "users", virtualUid), {
        nickname: guestNickname,
        password: "guest-no-password-needed",
        createdAt: serverTimestamp(),
      });

      // Save to localStorage for Auto Login
      localStorage.setItem(
        "nodap_custom_session",
        JSON.stringify({ uid: virtualUid, nickname: guestNickname })
      );

      onAuthSuccess({ uid: virtualUid, nickname: guestNickname });
    } catch (err: any) {
      console.error("Sandbox authentication failed:", err);
      setErrorMsg("임시 게스트 접속 실패: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      setErrorMsg("닉네임은 2자 이상, 20자 이하여야 합니다. 뇌절하기 적당한 길이여야죠!");
      return;
    }

    if (password.length < 4) {
      setErrorMsg("비밀번호는 최소 4자 이상이어야 합니다. 성의는 갖춰주세요!");
      return;
    }

    setLoading(true);
    const customUserId = getUserIdFromNickname(trimmedNickname);

    try {
      const userRef = doc(db, "users", customUserId);

      if (isSignUp) {
        // --- SECURE CUSTOM SIGN UP ---
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          throw new Error("이미 다른 유저가 사용 중인 닉네임입니다! 다른 기상천외한 이름을 지어보세요.");
        }

        // Save User Profile & Password directly to Firestore /users/{userId}
        await setDoc(userRef, {
          nickname: trimmedNickname,
          password: password, // simple and reliable for this workspace applet
          createdAt: serverTimestamp(),
        });

        // Save session to localStorage for robust Auto Login
        localStorage.setItem(
          "nodap_custom_session",
          JSON.stringify({ uid: customUserId, nickname: trimmedNickname })
        );

        onAuthSuccess({ uid: customUserId, nickname: trimmedNickname });
      } else {
        // --- SECURE CUSTOM LOG IN ---
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          throw new Error("등록되어 있지 않은 닉네임입니다. (혹시 닉네임 오타가 있거나 아직 가입 안 하셨나요?)");
        }

        const storedData = userSnap.data();
        if (storedData.password !== password) {
          throw new Error("비밀번호가 일치하지 않습니다. (혹시 기억력도 노답이신가요...?)");
        }

        // Save session to localStorage for robust Auto Login
        localStorage.setItem(
          "nodap_custom_session",
          JSON.stringify({ uid: customUserId, nickname: storedData.nickname })
        );

        onAuthSuccess({ uid: customUserId, nickname: storedData.nickname });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "인증 처리 도중 예기치 못한 에러가 났습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto bg-[#1E293B] border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-slate-100"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="text-center space-y-2 mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-900 text-[10px] font-black text-indigo-400">
          🔑 우주 연합 통신 단말기 (비밀번호 즉시인증)
        </span>
        <h3 className="text-2xl font-black text-white tracking-tight animate-pulse">
          {isSignUp ? "신규 노답 등록하기" : "노답봇 광장 입장"}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {isSignUp
            ? "이메일 없이 로그인할 시그니처 닉네임과 비번만 입력하면 등록 완료! 번거로운 이메일 인증 절차가 전혀 없습니다."
            : "이미 발급받으신 고유 닉네임과 비밀번호로 보안망에 접속하세요."}
        </p>
      </div>

      {errorMsg && (
        <div className="space-y-4 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs p-3.5 rounded-xl flex items-start gap-2 leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold block">🚨 접속 인증 안내</span>
              <span>{errorMsg}</span>
            </div>
          </motion.div>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4 relative">
        {/* Nickname Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
            ■ 독점 닉네임 (Nickname)
          </label>
          <div className="relative">
            <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 초보코더, 퇴사희망자"
              disabled={loading}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder-slate-600 text-white"
            />
          </div>
          <span className="text-[9px] text-slate-500 italic block">
            * 2~20자 한글, 영문, 숫자 가능 (중복 가입도 완벽히 마스킹됩니다!)
          </span>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
            ■ 암호 (Password)
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 4자 이상"
              disabled={loading}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-12 text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder-slate-600 text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Trigger Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : isSignUp ? (
            <>
              <UserPlus className="w-4 h-4" />
              <span>우주망에 고유 닉네임 계정 생성 (즉시등록)</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>로그인 및 광장 접속하기</span>
            </>
          )}
        </button>

        {/* Change Mode */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            {isSignUp
              ? "이미 고유 계정이 있으신가요? 로그인하기"
              : "앗 처음이신가요? 3초 가입 후 계정 즉시생성"}
          </button>
        </div>
      </form>

      {/* Or Sandbox Bypass Mode Option */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-800/80"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-[#475569]">
          <span className="bg-[#1E293B] px-3">가장 빠른 패스</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSandboxLogin}
        disabled={loading}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
        <span>무조건 로그인! 임시 게스트로 즉시 입장하기 🚀</span>
      </button>

      <span className="text-[9px] text-center text-slate-500 italic block mt-2.5">
        * Firebase 콘솔 승인 오류 걱정 없이 바로 채팅 광장에 참여하고 싶다면 게스트 입장을 사용해 보세요!
      </span>
    </motion.div>
  );
}
