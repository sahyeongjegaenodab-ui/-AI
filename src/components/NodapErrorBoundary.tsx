import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class NodapErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error caught in NodapErrorBoundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    // Clear localStorage values except essential auth configurations and reload
    try {
      localStorage.removeItem("nodap_history");
      localStorage.removeItem("nodap_chat_history");
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          {/* Neon Grid decoration */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />

          <div className="w-full max-w-xl bg-slate-900/80 border border-rose-900/60 p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-xl z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-500 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-rose-400 uppercase">
                  SYSTEM CORE PANIC
                </span>
                <h1 className="text-xl font-extrabold tracking-tight text-white">
                  노답봇 연산 장치에 정밀 노답 오류 감지됨
                </h1>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-rose-300 leading-relaxed overflow-x-auto space-y-2">
              <p className="font-bold text-white mb-2">■ 에러 내용 (Error Diagnostic Log):</p>
              <div className="font-semibold break-all bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                {this.state.error?.toString() || "Unknown JavaScript Runtime Exception"}
              </div>
              {this.state.errorInfo && (
                <div className="text-slate-500 max-h-32 overflow-y-auto pt-2 border-t border-slate-800/60 scrollbar-thin">
                  <span className="text-[10px] uppercase font-bold tracking-wide">Component Stack Trace:</span>
                  <pre className="text-[10px] mt-1 whitespace-pre-wrap leading-normal font-mono">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              * 원인 분석: 브라우저 보안 샌드박스 제약(API 연동이나 알림 차단 등)이나 이전 캐시 데이터 동기화 손상으로 인한 무면허 충돌일 수 있습니다. 아래의 복원 옵션을 실행해 보세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-650 hover:bg-indigo-600 font-extrabold text-xs text-white shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                단순 새로고침 시도
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 font-bold text-xs text-rose-200 border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                클라이언트 캐시 초기화 후 복구
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
