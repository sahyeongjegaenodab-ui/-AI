import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { Send, LogOut, MessageSquare, Flame, Trophy, Sparkles, Users, RefreshCw, Bell, BellOff, CheckCircle } from "lucide-react";

interface UserType {
  uid: string;
  nickname: string;
}

interface ChatMessage {
  id: string;
  senderUid: string;
  senderNickname: string;
  content: string;
  createdAt: any;
}

interface HumanGlobalChatProps {
  currentUser: UserType;
  onLogout: () => void;
}

// Generate color based on nickname hash for avatar uniqueness
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-600",
    "from-indigo-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-500",
    "from-fuchsia-500 to-rose-600",
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function HumanGlobalChat({ currentUser, onLogout }: HumanGlobalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Web Notification States
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );

  // References to handle initial snapshots and avoid notification floods on load
  const isInitialRef = useRef(true);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Function to ask for Notification consent comfortably
  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        if (result === "granted") {
          new Notification("🔔 실시간 노답 알림 연동 완료!", {
            body: "이제 광장에 새로운 뇌절이나 사이다 타격이 들어오면 실시간으로 알림을 드릴게요!",
          });
        }
      } catch (err) {
        console.error("Failed to request notification permission:", err);
      }
    } else {
      alert("이 브라우저는 웹 브라우저 데스크톱 알림을 지원하지 않습니다.");
    }
  };

  // Helper to trigger system push notification
  const triggerPushNotification = (sender: string, content: string) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        // Strip out metadata formatting details
        let cleanText = content.replace(/\[NODAP-SCORE\]/g, "").trim();
        if (cleanText.includes("[노답지수 리포트]")) {
          cleanText = "📊 찬란한 노답 판정 리포트를 광장에 공표했습니다!";
        }

        // Limit the text length in notification bubble
        const maxLen = 80;
        const truncatedText = cleanText.length > maxLen ? `${cleanText.substring(0, maxLen)}...` : cleanText;

        new Notification(`📢 [노답광장] ${sender}`, {
          body: truncatedText,
          tag: "nodap-chat-notification",
        });
      } catch (error) {
        console.error("Error showing push notification:", error);
      }
    }
  };

  // Subscribe to real-time chat messages
  useEffect(() => {
    setLoading(true);
    isInitialRef.current = true;
    seenMessageIdsRef.current.clear();

    const q = query(
      collection(db, "global_chats"),
      orderBy("createdAt", "desc"),
      limit(60)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        
        // Push read documents
        snapshot.forEach((doc) => {
          const data = doc.data();
          const msgId = doc.id;
          const msg = {
            id: msgId,
            senderUid: data.senderUid || "",
            senderNickname: data.senderNickname || "익명의노답",
            content: data.content || "",
            createdAt: data.createdAt,
          } as ChatMessage;

          list.push(msg);

          // Handle custom real-time notification workflow
          if (isInitialRef.current) {
            seenMessageIdsRef.current.add(msgId);
          } else {
            if (!seenMessageIdsRef.current.has(msgId)) {
              seenMessageIdsRef.current.add(msgId);
              // Trigger notification if it's sent by another person
              if (msg.senderUid !== currentUser.uid) {
                triggerPushNotification(msg.senderNickname, msg.content);
              }
            }
          }
        });

        // Toggle initial load switch down so future snapshots trigger push notifications
        isInitialRef.current = false;

        // Since we query desc to limit, we reverse to show chronologically
        list.reverse();
        setMessages(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, "global_chats");
      }
    );

    return () => unsubscribe();
  }, [currentUser.uid]);

  // Auto Scroll on message arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || sending) return;

    if (cleanText.length > 200) {
      alert("한 번에 200자까지만 입력할 수 있습니다. 뇌절은 나누어서 해주세요!");
      return;
    }

    setSending(true);
    setInputText("");

    try {
      await addDoc(collection(db, "global_chats"), {
        senderUid: currentUser.uid,
        senderNickname: currentUser.nickname,
        content: cleanText,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "global_chats");
    } finally {
      setSending(false);
    }
  };

  const handleLogoutClick = () => {
    if (confirm("정격 차단하고 광장에서 로그아웃 하시겠습니까?")) {
      onLogout();
    }
  };

  // Helper to parse dynamic special content (rendered as scorecard cards)
  const renderMessageContent = (content: string) => {
    // If user shared a score card e.g. "[노답인성 리포트] 등급: S" or contains "[NODAP-SCORE]"
    if (content.includes("[노답지수 리포트]") || content.includes("[NODAP-SCORE]")) {
      const parts = content.split("\n");
      const titleLine = parts.find((p) => p.includes("리포트") || p.includes("노답지수")) || "📊 노답지수 인증 리포트";
      const scoreLine = parts.find((p) => p.includes("점수:") || p.includes("지수:")) || "노답지수: 99%";
      const rankLine = parts.find((p) => p.includes("등급:") || p.includes("랭크:")) || "등급: 측정불가 (레전드)";
      const commentLine = parts.find((p) => p.includes("한줄평:") || p.includes("코멘트:")) || "";

      return (
        <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 my-1.5 space-y-2 shadow-lg max-w-[280px] sm:max-w-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Flame className="w-12 h-12 text-rose-500" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{titleLine.replace("[NODAP-SCORE]", "").trim()}</span>
          </div>
          <div className="flex justify-between items-baseline py-1 border-y border-indigo-900 text-sm">
            <span className="text-[10px] font-bold text-slate-400">인증 점수:</span>
            <span className="text-lg font-black text-white">{scoreLine.replace("점수:", "").replace("지수:", "").trim()}</span>
          </div>
          <div className="flex justify-between items-baseline text-xs text-indigo-300">
            <span className="text-[10px] text-slate-400 font-bold">인성 판정:</span>
            <span className="font-bold">{rankLine.replace("등급:", "").trim()}</span>
          </div>
          {commentLine && (
            <p className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg italic border-l-2 border-rose-500">
              {commentLine.replace("한줄평:", "").trim()}
            </p>
          )}
          <span className="absolute bottom-1 right-2 text-[8px] font-bold tracking-widest text-indigo-400/50 uppercase select-none">
            VERIFIED NO-DAP
          </span>
        </div>
      );
    }

    return <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-all">{content}</p>;
  };

  return (
    <div className="flex flex-col h-[650px] bg-[#0F172A] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Upper Panel */}
      <div className="bg-[#1E293B] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">현실 노답 대기광장</h4>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {notificationPermission === "granted" ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-900/60 text-[8px] font-bold text-emerald-400">
                  <Bell className="w-2 h-2" /> 실시간 알림 켜짐
                </span>
              ) : notificationPermission === "denied" ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-900/60 text-[8px] font-bold text-rose-400">
                  <BellOff className="w-2 h-2" /> 알림 차단됨
                </span>
              ) : (
                <button
                  onClick={requestPermission}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-900/60 text-[8px] font-bold text-amber-400 hover:opacity-80 active:scale-95 cursor-pointer text-left"
                >
                  <Bell className="w-2 h-2 animate-bounce" /> 알림 요청하기
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">접속 중</p>
            <p className="text-xs font-black text-rose-400">{currentUser.nickname} 님</p>
          </div>
          <button
            onClick={handleLogoutClick}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-800 hover:border-rose-500/30 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Disconnect"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">단말기 차단</span>
          </button>
        </div>
      </div>

      {/* Interactive Permission Request Banner inside the Chat area */}
      {notificationPermission === "default" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-950/90 border-b border-indigo-500/30 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-100 z-10"
        >
          <div className="flex items-start gap-2 text-xs">
            <span className="text-sm mt-0.5">🔔</span>
            <div className="text-left leading-relaxed">
              <span className="font-extrabold text-indigo-400 block">실시간 브라우저 알림 설정</span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                다른 탭을 이용 중일 때도 새로운 답글이나 노답 성적표 공표 소식을 즉시 받아보세요!
              </p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-lg transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1 shrink-0"
          >
            <span>실시간 알림 허용 🚀</span>
          </button>
        </motion.div>
      )}

      {/* Messages Scroll Feed */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-500 font-bold">인류 고유 전송 신호 동기화 중...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-700 animate-bounce" />
            <h5 className="text-xs font-black text-slate-400 mt-2">아직 광장에 아무도 침묵을 깨지 않았습니다</h5>
            <p className="text-[10px] text-slate-500 max-w-xs">
              여러분이 먼저 자신의 지독한 고민이나 AI 비서에게 털리고 온 인상깊은 이야기를 보내 광장을 깨우세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMyMsg = msg.senderUid === currentUser.uid;
              const avatarBg = getAvatarColor(msg.senderNickname);

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 items-start ${isMyMsg ? "justify-end" : "justify-start"}`}
                >
                  {/* Sender Avatar */}
                  {!isMyMsg && (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarBg} text-white font-black text-[12px] flex items-center justify-center shadow-md shrink-0 uppercase select-none`}>
                      {msg.senderNickname.charAt(0)}
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] ${isMyMsg ? "items-end" : "items-start"}`}>
                    {/* Nickname */}
                    {!isMyMsg && (
                      <span className="text-[10px] font-black text-slate-400 ml-1 mb-1">
                        {msg.senderNickname}
                      </span>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl relative shadow-md select-text ${
                        isMyMsg
                          ? "bg-indigo-600 rounded-tr-none text-white font-medium"
                          : "bg-[#1E293B] border border-slate-800 rounded-tl-none text-slate-100"
                      }`}
                    >
                      {renderMessageContent(msg.content)}
                    </div>

                    {/* Timestamp */}
                    {msg.createdAt && (
                      <span className="text-[8px] text-slate-600 font-bold tracking-widest uppercase mt-1 px-1">
                        {new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Self Avatar */}
                  {isMyMsg && (
                    <div className="w-8 h-8 rounded-full bg-[#312E81] border border-indigo-500/30 text-indigo-300 font-black text-[12px] flex items-center justify-center shadow-md shrink-0 select-none uppercase">
                      나
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input panel */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-[#1e293b]/60 border-t border-slate-800/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={sending ? "전송 중..." : "노답 광장에 전할 뇌절을 입력하세요 (최대 200자)"}
          maxLength={200}
          disabled={sending || loading}
          className="flex-1 bg-slate-900 border border-slate-800/90 rounded-2xl py-3 px-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder-slate-500 text-white"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending || loading}
          className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-lg active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
