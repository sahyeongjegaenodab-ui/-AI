import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Category, PersonalityMode, EmotionType, Message, AnalysisResult } from "./types";
import { CATEGORIES, SAMPLE_QUESTIONS, PERSONALITY_MODES } from "./data";
import NodapMascot from "./components/NodapMascot";
import NodapAnalysisView from "./components/NodapAnalysisView";
import AuthCard from "./components/AuthCard";
import HumanGlobalChat from "./components/HumanGlobalChat";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  MessageSquare,
  Activity,
  Trash2,
  Trash,
  Send,
  Sparkles,
  HelpCircle,
  FileText,
  AlertTriangle,
  Clock,
  Cpu,
  RefreshCw,
  Globe,
} from "lucide-react";

export default function App() {
  // Navigation & Workspace State
  const [activeTab, setActiveTab] = useState<"analyzer" | "chat" | "globalChat">("analyzer");
  const [currentUser, setCurrentUser] = useState<{ uid: string; nickname: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      problem: string;
      category: Category;
      result: AnalysisResult;
      timestamp: string;
    }>
  >([]);

  // Input states for Analyzer
  const [problemInput, setProblemInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<Category>("lazy");
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>("spicy");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // States for Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      content: "안녕 인간? 무슨 노답 사건을 들고 행차하셨어? 내 앞에서 핑계 댈 생각은 버리는 게 좋을걸. 할 말 있으면 어디 한번 입력해 봐.",
      emotion: "sigh",
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMode, setChatMode] = useState<PersonalityMode>("spicy");
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>("sigh");

  // Error messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // For auto-scroll
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // UTC clock (current local time)
  const [currentTimeStr, setCurrentTimeStr] = useState("2026-05-21 00:00:00 UTC");

  // System status text
  const [systemStatus, setSystemStatus] = useState("생각하기 귀찮음");

  // Load configuration and history on mount
  useEffect(() => {
    // 1. History
    const saved = localStorage.getItem("nodap_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading chat files history", e);
      }
    }

    // 2. Chat history (optional restore)
    const savedChat = localStorage.getItem("nodap_chat_history");
    if (savedChat) {
      try {
        const msgs = JSON.parse(savedChat);
        if (msgs.length > 0) {
          setChatMessages(msgs);
          // Set last assistant message emotion as current expression
          const assistants = msgs.filter((m: any) => m.role === "assistant");
          if (assistants.length > 0) {
            setCurrentEmotion(assistants[assistants.length - 1].emotion || "sigh");
          }
        }
      } catch (e) {
        console.error("Error restoring chat history", e);
      }
    }

    // Tick current time
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
      setCurrentTimeStr(formatted);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Restore custom authenticated user session automatically (Auto Login)
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem("nodap_custom_session");
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed && parsed.uid && parsed.nickname) {
          setCurrentUser({
            uid: parsed.uid,
            nickname: parsed.nickname,
          });
          setSystemStatus("광장 단말접속 자동동기화 성공");
        }
      }
    } catch (e) {
      console.error("Error restoring custom user session", e);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  // Save changes to localStorage on updating history
  const updateAndSaveHistory = (newHistory: typeof history) => {
    setHistory(newHistory);
    localStorage.setItem("nodap_history", JSON.stringify(newHistory));
  };

  // Save chat to localStorage on update
  useEffect(() => {
    if (chatMessages.length > 1) {
      localStorage.setItem("nodap_chat_history", JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  // Scroll to bottom helper
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  // Handle preset sample questions in analyzer
  const handleSelectPreset = (presetText: string) => {
    setProblemInput(presetText);
  };

  // Submit analysis request to server
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemInput.trim()) {
      setErrorMsg("고민 내용을 성의 있게 채워주세요!");
      return;
    }

    setErrorMsg(null);
    setAnalyzing(true);
    setSystemStatus("뇌 가동 부스팅 가동 중");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problemInput,
          category: categoryInput,
        }),
      });

      if (!res.ok) {
        let errMsg = "분석 도중 뇌정지가 왔습니다.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } else {
            const errText = await res.text();
            errMsg = errText ? (errText.substring(0, 200) + (errText.length > 200 ? "..." : "")) : errMsg;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errMsg);
      }

      let result: AnalysisResult;
      try {
        result = await res.json();
      } catch (e) {
        throw new Error("서버 응답을 분석결과 데이터(JSON)로 해석하지 못했습니다.");
      }
      setAnalysisResult(result);

      // Add to history list
      const newHistoryItem = {
        id: `history-${Date.now()}`,
        problem: problemInput,
        category: categoryInput,
        result,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      };

      updateAndSaveHistory([newHistoryItem, ...history]);
      
      // Update mascot emotion dynamically based on high score roasts
      if (result.score >= 85) {
        setCurrentEmotion("shock");
      } else if (result.score >= 60) {
        setCurrentEmotion("angry");
      } else {
        setCurrentEmotion("smug");
      }

      setSystemStatus("분석 보고서 산출 완료");
    } catch (err: any) {
      setErrorMsg(err.message || "서버 통신 오류가 생겼습니다.");
      setCurrentEmotion("clueless");
      setSystemStatus("에러 발생 (알 바 아님)");
    } finally {
      setAnalyzing(false);
    }
  };

  // Send single chat prompt
  const handleSendChat = async (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim()) return;
    if (chatLoading) return;

    setErrorMsg(null);
    if (!textToSend) {
      setChatInput("");
    }

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);
    setSystemStatus("가소로운 인간 말 반박 도출 중");

    try {
      // Fetch response using previous messages to retain simple memory
      // Limit memory history size to fit prompt cleanly
      const maxContext = updatedMessages.slice(-6);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: maxContext.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: chatMode,
        }),
      });

      if (!res.ok) {
        let errMsg = "대화 중 칩셋 오류가 발생했습니다.";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            errMsg = errData.error || errMsg;
          } else {
            const errText = await res.text();
            errMsg = errText ? (errText.substring(0, 200) + (errText.length > 200 ? "..." : "")) : errMsg;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errMsg);
      }

      let rawJson;
      try {
        rawJson = await res.json();
      } catch (e) {
        throw new Error("서버 응답을 대화 데이터(JSON)로 해석하지 못했습니다.");
      }
      
      // Response format: { reply: string, emotion: EmotionType }
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: rawJson.reply,
        emotion: rawJson.emotion as EmotionType,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
      setCurrentEmotion(rawJson.emotion as EmotionType);
      
      // Dynamic funny status based on mode
      if (chatMode === "spicy") {
        setSystemStatus("극딜 후 아주 흡족해 함");
      } else if (chatMode === "absurd") {
        setSystemStatus("정신 승리 중");
      } else if (chatMode === "healing") {
        setSystemStatus("무한 칭찬에 자아 감탄 중");
      } else {
        setSystemStatus("한심 어린 눈총 발송 중");
      }

    } catch (err: any) {
      let rawMsg = err.message || "로봇 통신 장치 오작동!";
      let displayError = rawMsg;
      if (rawMsg.includes("Quota exceeded") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota") || rawMsg.includes("429")) {
        displayError = "⚠️ [할당량 매진] 노답봇의 무료 일일 한도가 완료되어 파업에 돌입했습니다! ㅠㅠ 잠시 후 다시 시도해 주거나, 나중에 다시 말을 걸어주세요.";
      } else {
        displayError = `⚠️ [통신 오류] ${rawMsg}`;
      }

      setErrorMsg(displayError);
      setCurrentEmotion("clueless");
      setSystemStatus("통신 장애 발생!");

      // Append systemic warning into messages list to make it fully visible instantly
      const botMsg: Message = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        content: displayError,
        emotion: "clueless",
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick Action: Take analysis problem and move directly into custom Chat conversation
  const handleChatDirectly = () => {
    if (!analysisResult) return;
    
    // Seed new prompt text into chat input
    const seedMsg = `내가 "${categoryInput}" 카테고리로 "${problemInput}" 고민 올렸더니, 노답 지수 ${analysisResult.score}%에 등급은 [${analysisResult.grade}] 이라는데... 이거 진짜 정답이 없는 거야?`;
    
    setActiveTab("chat");
    setChatMode(personalityMode);
    
    // Auto trigger chat loading with the seeded conversation
    setChatInput("");
    handleSendChat(seedMsg);
  };

  // Share analytical score directly into live human global chat
  const handleShareToGlobalChat = async () => {
    if (!analysisResult) return;

    if (!currentUser) {
      alert("광장에 노답 인증서를 기증하려면 먼저 닉네임 계정을 생성하거나 로그인해야 합니다! 광장 단말기로 연결해 드릴게요.");
      setActiveTab("globalChat");
      return;
    }

    try {
      const shareText = `[노답지수 리포트]\n고민: ${problemInput}\n점수: ${analysisResult.score}%\n등급: ${analysisResult.grade}\n한줄평: ${analysisResult.summary}\n[NODAP-SCORE]`;

      await addDoc(collection(db, "global_chats"), {
        senderUid: currentUser.uid,
        senderNickname: currentUser.nickname,
        content: shareText,
        createdAt: serverTimestamp(),
      });

      setSystemStatus("광장에 노답 인증서 박제 성공!");
      alert("🎉 우주적 광장에 당신의 찬란한 노답 수치를 성공적으로 공표했습니다!");
      setActiveTab("globalChat");
    } catch (error) {
      console.error("Failed to share report to Firestore:", error);
      alert("광장 전송망에 연결 실패했습니다. 통신 채널을 확인하세요.");
    }
  };

  // Reset entire state & files
  const handleClearAll = () => {
    if (confirm("정말로 모든 고민 기록과 대화 내용을 초기화할까요?")) {
      localStorage.removeItem("nodap_history");
      localStorage.removeItem("nodap_chat_history");
      setHistory([]);
      setChatMessages([
        {
          id: "initial-welcome",
          role: "assistant",
          content: "깨끗하게 밀어버렸네. 하지만 인생의 오점은 초기화 기기가 없단다 친구야. 할 말이 있다면 다시 지껄여봐.",
          emotion: "sigh",
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setAnalysisResult(null);
      setProblemInput("");
      setCurrentEmotion("sigh");
      setSystemStatus("메모리 완전 세척 완료");
    }
  };

  // Clear single history item
  const handleClearHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter((h) => h.id !== id);
    updateAndSaveHistory(filtered);
  };

  return (
    <div className="flex h-screen w-full bg-[#0F172A] text-slate-200 font-sans overflow-hidden select-none relative">
      
      {/* SIDEBAR: Log of Hopelessness */}
      <aside className="w-80 bg-[#1E293B] border-r border-slate-800 flex flex-col hidden md:flex shrink-0">
        
        {/* LOGO AREA */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md animate-pulse">
              노
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                노답봇 <span className="text-[10px] bg-indigo-900 text-indigo-300 font-bold px-1.5 py-0.5 rounded">v2.1</span>
              </h1>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider block">NODAP OS v6-BUILD</span>
            </div>
          </div>
        </div>

        {/* TIME INFO RAIL */}
        <div className="py-2.5 px-6 border-b border-slate-800 bg-[#161F30] flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[10px] font-mono tracking-tight text-slate-400 font-semibold truncate">
            {currentTimeStr}
          </span>
        </div>

        {/* HISTORY LIST */}
        <div className="flex-1 py-4 px-3 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-3 flex items-center justify-between">
            <span>최근 노답 감정서 ({history.length})</span>
            {history.length > 0 && (
              <button
                onClick={() => updateAndSaveHistory([])}
                className="text-[10px] text-rose-500 hover:underline hover:text-rose-400 flex items-center gap-1 font-mono uppercase cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-600">
              <span className="text-3xl block mb-2">📥</span>
              <p className="text-xs">감정된 기록이 없습니다.</p>
              <p className="text-[10px] text-slate-700 mt-1">고민을 측정하면 여기에 저장됩니다.</p>
            </div>
          ) : (
            <nav className="space-y-2">
              {history.map((h) => {
                const catOption = CATEGORIES.find((c) => c.value === h.category);
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setProblemInput(h.problem);
                      setCategoryInput(h.category);
                      setAnalysisResult(h.result);
                      setActiveTab("analyzer");
                    }}
                    className={`p-3 rounded-xl border transition-all text-left cursor-pointer group ${
                      analysisResult?.summary === h.result.summary
                        ? "bg-slate-800 border-indigo-500/50 shadow-inner"
                        : "bg-slate-800/20 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <span>{catOption?.emoji}</span>
                        <span>{catOption?.label}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-950/40 text-rose-400 border border-rose-950">
                        Nodap {h.result.score}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate font-semibold">
                      {h.problem}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span className="italic truncate max-w-[150px]">{h.result.grade}</span>
                      <button
                        onClick={(e) => handleClearHistoryItem(h.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-900 hover:text-rose-500 transition-all cursor-pointer"
                        title="기록 지우기"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* BOTTOM CPU METER (INTELLIGENCE) */}
        <div className="p-4 bg-indigo-950/20 border-t border-slate-850">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 tracking-tight flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              노답봇 자치 지능 레벨
            </span>
            <span className="text-xs font-mono font-black text-indigo-400">
              {chatLoading || analyzing ? "0.01%" : "0.00%"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-1000 ${
                chatLoading || analyzing ? "w-[1.2%]" : "w-[0.2%]"
              }`}
            ></div>
          </div>
          <p className="text-[9px] text-slate-600 mt-2 hover:text-slate-500 transition-colors">
            ※ 지능 탑재 시 봇의 유쾌함이 급감하므로 본사 방침 상 영구 지능 제로를 유지합니다.
          </p>
        </div>

      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative h-full">

        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="md:hidden text-xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-500 to-rose-400">
              노답봇 v2
            </span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  analyzing || chatLoading ? "bg-amber-400" : "bg-emerald-400"
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  analyzing || chatLoading ? "bg-amber-500" : "bg-emerald-500"
                }`}></span>
              </span>
              <div className="text-xs font-semibold text-slate-400">
                수행 상태: <span className="text-indigo-300 font-bold">{systemStatus}</span>
              </div>
            </div>
          </div>

          {/* TAB SELECTION BAR */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-full border border-slate-750 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setActiveTab("analyzer")}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === "analyzer"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📋 노답 분석기
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              💬 영혼의 개싸움
            </button>
            <button
              onClick={() => setActiveTab("globalChat")}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "globalChat"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>🌐 인간 대기광장</span>
            </button>
          </div>

          <div className="flex gap-4 text-xs font-bold text-slate-400">
            <button
              onClick={handleClearAll}
              className="hover:text-rose-400 border border-slate-800 px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-900 transition-all cursor-pointer"
            >
              전체 초기화
            </button>
          </div>
        </header>

        {/* SCROLLABLE DESIRED SECTION CONTENT */}
        <section key={activeTab} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative flex flex-col items-center z-10 custom-scrollbar">
          
          {/* Main Error Alert */}
          {errorMsg && (
            <div className="w-full max-w-2xl bg-rose-950/70 border border-rose-800/60 p-4 rounded-2xl flex items-start gap-3 text-rose-200 text-sm animate-shake">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <div className="flex-1">
                <span className="font-bold">노답 오류 발생</span>
                <p className="text-xs text-rose-300 mt-0.5">{errorMsg}</p>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-xs font-mono font-bold hover:underline"
              >
                닫기
              </button>
            </div>
          )}

          {/* TAB 1: NODAP ANALYZER */}
          {activeTab === "analyzer" && (
            <div className="w-full max-w-2xl space-y-8 flex flex-col">
              
              {!analysisResult ? (
                /* Initial Evaluation submission screen */
                <div className="space-y-6 w-full">
                  
                  {/* Greeting segment */}
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-rose-400 tracking-tight">
                      어차피 인생은 노답이다
                    </h3>
                    <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                      말라비틀어진 고민부터 세상을 위협하는 기상천외한 우환거리까지, 감히 해결하지 못할 극약 처방전을 산출해 드립니다.
                    </p>
                  </div>

                  {/* Character Avatar Display */}
                  <NodapMascot emotion={currentEmotion} isThinking={analyzing} />

                  {/* Analysis Parameter Card Form */}
                  <form onSubmit={handleAnalyze} className="bg-[#1E293B] border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl relative">
                    
                    {/* Category Selector */}
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">
                        ■ 고민 테마군 (Category)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            type="button"
                            key={cat.value}
                            onClick={() => {
                              setCategoryInput(cat.value);
                              // Autocomplete with sample if empty or same category as previous
                              const currentSample = SAMPLE_QUESTIONS.find(q => q.category === cat.value);
                              if (currentSample && (!problemInput || SAMPLE_QUESTIONS.some(q => q.text === problemInput))) {
                                setProblemInput(currentSample.text);
                              }
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                              categoryInput === cat.value
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20 scale-102"
                                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                            }`}
                          >
                            <span className="text-2xl mb-1">{cat.emoji}</span>
                            <span className="text-xs font-extrabold">{cat.label.split(" ")[0]}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        ※ {CATEGORIES.find(c => c.value === categoryInput)?.desc}
                      </p>
                    </div>

                    {/* Problem Input textarea text box */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">
                          ■ 나의 노답 고민거리 상세 (Details)
                        </label>
                        <span className="text-[10px] text-slate-500">
                          {problemInput.length}/300자
                        </span>
                      </div>
                      <textarea
                        value={problemInput}
                        onChange={(e) => setProblemInput(e.target.value.slice(0, 300))}
                        placeholder="이곳에 당신의 기가 막히고 극악한 상황을 솔직하게 적어주세요... (예: '중간고사 공부 다 미뤘는데 어쩌죠?')"
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600 min-h-[110px] max-h-[220px] transition-all"
                        required
                      />
                    </div>

                    {/* Pre-fill Quick Chips list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-indigo-400" />
                        머릿속에서 뇌절 와서 적을 말이 없다면? 아래 샘플 채우기:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {SAMPLE_QUESTIONS.map((q, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => {
                              setCategoryInput(q.category);
                              handleSelectPreset(q.text);
                            }}
                            className="bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 px-3 py-1 rounded-xl text-[11px] border border-slate-800 transition-colors cursor-pointer truncate max-w-[180px]"
                          >
                            #{q.short}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Personality select */}
                    <div className="space-y-3 pt-2">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">
                        ■ 인성 비서 모드 선택 (Personality)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {PERSONALITY_MODES.map((mode) => (
                          <button
                            type="button"
                            key={mode.value}
                            onClick={() => setPersonalityMode(mode.value)}
                            className={`p-3 rounded-2xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                              personalityMode === mode.value
                                ? "bg-slate-800/80 border-indigo-600 text-white shadow"
                                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900"
                            }`}
                          >
                            <span className="text-lg bg-slate-900 rounded p-1 shadow-inner leading-none shrink-0">{mode.emoji}</span>
                            <div>
                              <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                                {mode.label}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{mode.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200 rounded-xl flex items-center justify-between">
                        <span className="leading-relaxed">{errorMsg}</span>
                        <button
                          type="button"
                          onClick={() => setErrorMsg(null)}
                          className="text-[10px] font-bold text-rose-400 hover:underline shrink-0 ml-2"
                        >
                          지우기
                        </button>
                      </div>
                    )}

                    {/* Trigger Button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={analyzing || !problemInput.trim()}
                        className="w-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-black text-sm py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {analyzing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            우주 대역 가동 중... 고민 분쇄 중
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-white animate-bounce" />
                            내 인생의 처절한 노답 지수 종합 측정하기
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              ) : (
                /* Report View */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <NodapAnalysisView
                    result={analysisResult}
                    category={categoryInput}
                    problem={problemInput}
                    onReset={() => {
                      setAnalysisResult(null);
                      setProblemInput("");
                    }}
                    onChatDirectly={handleChatDirectly}
                    onShareToGlobalChat={handleShareToGlobalChat}
                  />
                </motion.div>
              )}

            </div>
          )}

          {/* TAB 2: NODAP CHATROOM */}
          {activeTab === "chat" && (
            <div className="w-full max-w-2xl flex-1 flex flex-col justify-between h-full space-y-4">
              
              {/* MASCOT CHAT MONITORING */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-4 shrink-0 flex items-center justify-between shadow-md relative overflow-hidden">
                <div className="flex items-center gap-4">
                  {/* Mascots and dynamic statuses are protected -> add notranslate and translate="no" to the emoticon container */}
                  <div className="w-14 h-14 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-3xl shadow-md notranslate" translate="no">
                    {currentEmotion === "sigh" && "┐( ´д｀)┌"}
                    {currentEmotion === "smug" && "😏"}
                    {currentEmotion === "angry" && "╬▔皿▔)"}
                    {currentEmotion === "clueless" && "⊙_⊙?"}
                    {currentEmotion === "joy" && "ꉂ(ˊᗜˋ*)"}
                    {currentEmotion === "shock" && "(⊙_⊙;)"}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                      노답봇 대화 수신 단말기
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      상태 표현식: <span className="text-amber-400 font-mono font-bold uppercase">{currentEmotion}</span>
                    </p>
                  </div>
                </div>

                {/* Switch chat personality profiles inline */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold hidden sm:inline">인격 전환:</span>
                  <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                    {PERSONALITY_MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => {
                          setChatMode(m.value);
                          const modeText = m.value === "mild" ? "순한맛" : m.value === "spicy" ? "매운맛" : m.value === "healing" ? "힐링맛" : "병맛";
                          setSystemStatus(`인격 모드 ${modeText}(으)로 조장`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          chatMode === m.value
                            ? "bg-indigo-600 text-white"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                        title={m.desc}
                      >
                        {m.label.split(" (")[1]?.replace(")", "") || m.label.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* LIVE CONVERSATION WINDOW */}
              <div className="flex-1 bg-[#151D30]/60 border border-slate-850 rounded-3xl p-6 overflow-y-auto space-y-4 max-h-[480px] custom-scrollbar">
                
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse ml-auto" : "self-start mr-auto"}`}
                      >
                        {/* Avatar tag indicator */}
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold shadow-sm ${
                          isUser ? "bg-slate-700" : "bg-indigo-600 text-white"
                        }`}>
                          {isUser ? "👤" : "🤖"}
                        </div>

                        {/* Speech Bubble */}
                        <div className="space-y-1">
                          <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                            isUser
                              ? "bg-indigo-600 rounded-tr-none text-white font-medium"
                              : "bg-[#1E293B] rounded-tl-none border border-slate-800 text-slate-100"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>

                            {/* Optional technical codes overlay for sarcastic vibe */}
                            {!isUser && msg.emotion && (
                              <div className="flex gap-1.5 mt-2.5 opacity-85">
                                <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] rounded font-mono font-bold text-slate-500">
                                  CORE: {msg.emotion.toUpperCase()}
                                </span>
                                <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] rounded font-mono font-bold text-slate-500">
                                  ROASTED
                                </span>
                              </div>
                            )}
                          </div>
                          <span className={`text-[9px] text-slate-650 block tracking-tight font-mono ${isUser ? "text-right" : "text-left"}`}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* BOT LOADER */}
                  {chatLoading && (
                    <motion.div
                      key="bot-loader"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex gap-3 max-w-[80%] self-start animate-pulse"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 flex items-center justify-center text-sm">
                        🤖
                      </div>
                      <div className="bg-[#1E293B] p-4 rounded-2xl rounded-tl-none border border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                        <p className="text-[10px] text-slate-500 tracking-wider font-mono uppercase">
                          노답 리액터 칩셋 충전율 100% 돌파 중...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={chatBottomRef} />
              </div>

              {/* INPUT AREA */}
              <div className="space-y-2">
                
                {/* Hot Topics tag list */}
                <div className="flex flex-wrap items-center gap-1.5 px-1 py-0.5">
                  <span className="text-[10px] text-indigo-400 font-extrabold flex items-center gap-1 shrink-0 bg-indigo-950/40 border border-indigo-900 px-2 py-0.5 rounded-full">
                    <Cpu className="w-2.5 h-2.5" />
                    간편 질문거리:
                  </span>
                  {[
                    "돈 아끼는 완전 혁명적인 팁 전수좀",
                    "나 사실 귀여운데 왜 애인이 없어?",
                    "다이어트는 왜 맨날 내일부터 해야 개꿀?",
                    "공부하기 싫어 미칠 것 같은 보약 명언 하나 줘",
                  ].map((chipText, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendChat(chipText)}
                      disabled={chatLoading}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-indigo-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                    >
                      {chipText}
                    </button>
                  ))}
                </div>

                {/* Text submission input box */}
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value.slice(0, 150))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    disabled={chatLoading}
                    placeholder="여기에 당신의 뇌절을 입력하세요 (예: 거울 보셨나요? 등)"
                    className="w-full bg-[#1E293B] border border-slate-700 focus:border-indigo-500 rounded-2xl py-4.5 pl-5 pr-20 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all text-xs md:text-sm placeholder:text-slate-600 text-slate-200 shadow-xl"
                  />
                  <button
                    onClick={() => handleSendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    className="absolute right-2 top-2 bottom-2 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-xl text-xs transition-colors shadow-lg active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <span>전송</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-center font-semibold text-[9px] text-slate-600 tracking-wide">
                  ※ 노답봇은 어떠한 현실적인 책임을 전혀 지지 않으며, 애초에 성의껏 답변할 성질머리가 아닙니다.
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: HUMAN GLOBAL CHATROOM */}
          {activeTab === "globalChat" && (
            <div className="w-full max-w-2xl flex-1 flex flex-col justify-center h-full">
              {authChecking ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-500 font-black">우주 전송망 규격 인증 동기화 중...</p>
                </div>
              ) : !currentUser ? (
                <div className="py-2">
                  <AuthCard
                    onAuthSuccess={(user) => {
                      setCurrentUser(user);
                      setSystemStatus("광장 단말접속 성공");
                    }}
                  />
                </div>
              ) : (
                <HumanGlobalChat
                  currentUser={currentUser}
                  onLogout={() => {
                    localStorage.removeItem("nodap_custom_session");
                    setCurrentUser(null);
                    setSystemStatus("광장 단말접속 차단");
                  }}
                />
              )}
            </div>
          )}

        </section>

        {/* BACKGROUND GLOWS FOR THE 'SLEEK INTERFACE' DECORATIVE MOOD */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="absolute top-24 left-24 w-64 h-64 bg-slate-400/5 blur-[80px] rounded-full pointer-events-none z-0"></div>

      </main>

    </div>
  );
}
