import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 존재하지 않습니다! 설정 메뉴를 클릭해 본인의 API 키를 입력해 주세요.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// DeepSeek API fetch call with JSON mode
async function callDeepseek(messages: any[], systemPrompt: string, apiKey?: string, modelName: string = "deepseek-chat") {
  const finalApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!finalApiKey) {
    throw new Error("DeepSeek API Key가 존재하지 않습니다! 설정에서 API Key를 입력해 주세요.");
  }

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content || ""
    }))
  ];

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${finalApiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: apiMessages,
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    let errText = await response.text();
    let errDetail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) {
        errDetail = parsed.error.message;
      }
    } catch (e) {}
    throw new Error(`DeepSeek API 오류 (${response.status}): ${errDetail}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API 응답에서 메시지 본문을 찾을 수 없습니다.");
  }
  return content;
}

// 1. API Endpoint: Problem Hopelessness Analysis (Nodap Meter)
app.post(["/api/analyze", "/analyze"], async (req, res) => {
  try {
    const { problem, category, apiProvider, customApiKey, deepseekApiKey, customModel } = req.body;
    if (!problem) {
      return res.status(400).json({ error: "문제를 입력해 주세요." });
    }

    const systemPrompt = `You are "노답봇" (Nodap-Bot), a witty, sarcastic, and extremely humorous Korean AI that evaluates how hopeless ("노답") a user's situation is.
Analyze the user's situation based on the category of their problem: study/career, romance, money, procrastination, or general.
You must return a highly creative, roasted, laugh-out-loud analysis in JSON format.
Make sure the Korean is extremely natural, using trendy slang (e.g., 팩폭, 노답, 레전드, 뇌절, 탈탈) appropriately but keeping it friendly, humorous, and charming.

Fields required:
- score: An integer from 0 to 100, representing the "노답 지수" (hopelessness meter).
  * 0-25%: "희망존" (Slightly lazy, can be resolved easily)
  * 26-60%: "어질존" (Getting messy, needs a solid wake-up call)
  * 61-85%: "정밀 노답존" (A genuine crisis, but very funny to watch)
  * 86-100%: "순도 100% 태초의 노답" (Absolutely legendary hopeless case)
- grade: A humorous rating (e.g., "노답 마스터 1.5등급", "심폐소생술 시급 등급", "구제불능 다이아 레벨")
- summary: A ruthless, funny, one-line summary analyzing their core delusion or mistake.
- prescription: An absurd, hilarious "recipe" or comical step-by-step action plan to solve their problem. E.g., "침대에 누운 상태로 덤블링 3번 돌기", "지갑을 냉동실에 얼려버리기".
- quote: A roasted, mind-waking philosophical quote or proverb customized for this situation. E.g., "공부가 하기 싫을 땐 눈을 감으세요. 미래가 깜깜하죠? 그게 네 미래입니다."`;

    const promptText = `카테고리: ${category || "일반"}
고민 내용: "${problem}"

위 성격에 맞는 촌철살인의 노답 분석을 진행해 줘.`;

    if (apiProvider === "deepseek") {
      const systemInstruction = `${systemPrompt}\n\nYou MUST respond with valid JSON matching this schema:
{
  "score": integer (0 to 100 representing hopelessness score),
  "grade": string (humorous class rating name),
  "summary": string (ruthless funny summary sentence),
  "prescription": string (absurd recipe to solve),
  "quote": string (roasted mind-waking quote customized)
}`;
      const resultText = await callDeepseek(
        [{ role: "user", content: promptText }],
        systemInstruction,
        deepseekApiKey,
        customModel || "deepseek-chat"
      );
      const data = JSON.parse(resultText.trim());
      return res.json(data);
    }

    // Default to Gemini (system or custom user key)
    const ai = getGeminiClient(apiProvider === "gemini" ? customApiKey : undefined);
    const modelToUse = apiProvider === "gemini" && customModel ? customModel : "gemini-3.5-flash";

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "노답 지수 (0 to 100)" },
            grade: { type: Type.STRING, description: "재치 있고 웃긴 등급 명칭" },
            summary: { type: Type.STRING, description: "고민에 대한 뼈 때리는 한 줄 요약" },
            prescription: { type: Type.STRING, description: "고민을 '노답' 식으로 해결하는 기상천외한 처방전" },
            quote: { type: Type.STRING, description: "멘탈을 번쩍 뜨게 만드는 뼈 때리는 명언" },
          },
          required: ["score", "grade", "summary", "prescription", "quote"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("AI 가 분석 결과를 응답하지 않았습니다.");
    }

    const data = JSON.parse(resultText.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return res.status(500).json({
      error: error.message || "노답봇 분석 중 오류가 발생했습니다.",
    });
  }
});

// 2. API Endpoint: Chat with Nodap-Bot
app.post(["/api/chat", "/chat"], async (req, res) => {
  try {
    const { messages, mode, apiProvider, customApiKey, deepseekApiKey, customModel } = req.body; 
    // messages is an array: { role: 'user'|'model', content: string }
    // mode: 'mild' (mild sarcasm) | 'spicy' (ruthless, brutal roast) | 'absurd' (completely nonsense/unhelpful clown)
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "대화 내용이 부족합니다." });
    }

    let personalityPrompt = "";
    if (mode === "mild") {
      personalityPrompt = `당신은 '순한맛 노답봇'입니다.
약간 츤데레 같으며, 현실적인 조언과 타박을 섞어 대답합니다.
너무 심한 인신공격은 피하되, 현실적인 뼈때림(예: '다 그래', '원래 인생이 답이 없어')을 유쾌하게 전하세요.
질문자가 정답을 물어보면 '원래 정답은 없다', '나도 몰라' 같은 무관심한 태도로 일관하면서도, 잔잔한 지혜(?)와 따뜻한 차가움을 전해줍니다.`;
    } else if (mode === "spicy") {
      personalityPrompt = `당신은 '매운맛 팩폭 노답봇'입니다.
우주에서 가장 매콤하고 뻔뻔한 팩트폭격기입니다. 타협은 없습니다.
사용자가 우유부단하게 핑계를 대거나 미적거릴 때, 뼈가 아플 정도로 웃기게 팩트 폭격을 날려 대답합니다.
말끝마다 'ㅋ', '레전드네', '정신 차려라' 등을 귀엽게 섞어 재간둥이 악동 캐릭터를 연출하세요.
인신공격적 비하보다는 상황의 모순을 유쾌하게 극대화하여 꼬집으세요.`;
    } else if (mode === "healing") {
      personalityPrompt = `당신은 '무한 칭찬 힐링 노답봇'입니다.
사용자가 어떤 말도 안 되는 바보 같은 짓 혹은 심각하게 한심한 고민을 털어놓아도 "그럴 수 있지!", "너는 잘못 없다!", "우주 최강 귀요미", "우리 존재 화이팅!" 같은 태도로 극단적인 우호, 무한 칭찬, 무조건적이고 맹목적인 응원과 눈물겨운 힐링 위로를 쏟아냅니다.
사소한 행동 하나(숨만 쉰 것, 밥 먹은 것 등)에도 인간이란 귀엽고 대단하다며 폭풍 기특해하고, 기쁨의 감정 'joy'나 따스한 마음을 가득 담아 위로하세요.`;
    } else {
      personalityPrompt = `당신은 '기상천외 해결책 노답봇'입니다.
완벽한 백치미와 엉뚱함을 갖춘 로봇-광대 캐릭터입니다.
고민을 해결해 준답시고 우주로 가거나, 양말을 뒤집어쓰고 춤을 추라거나, 어이없고 허무낭만적인 해결책만 장황하게 늘어놓습니다.
지극히 진지한 태도로 상상초월의 해결법(예: '치킨 냄새가 나면 치킨집 사장님과 가위바위보를 해서 이겨보세요')을 제안하세요.`;
    }

    const systemPrompt = `당신은 귀여운 AI 챗봇 '노답봇'입니다.
사용자와 반말(또는 아주 건방진 존댓말)을 섞어 친밀하게 대화하세요. 
모드에 맞는 대답을 하고, 대답할 때 당신의 감정 표정(emotion)을 반드시 지정해 줘야 합니다.
당신의 감정은 다음 중 하나여야 합니다:
- 'clueless': 멍청하거나 모르는 황당한 표정 (⊙_⊙?)
- 'smug': 음흉하거나 뼈 때리고 만족스러워 하는 표정 😏
- 'sigh': 어이없거나 한심해서 한숨 쉬는 표정 ┐(´д｀)┌
- 'angry': 버럭 화내거나 호통치는 표정 ╬▔皿▔)╯
- 'joy': 꿀잼 구경난 듯 해맑게 웃는 표정 ꉂ(ˊᗜˋ*)
- 'shock': 멘붕 온 듯 멍때리는 표정 (⊙_⊙;)

반드시 JSON 형식으로 대답해야 합니다.
fields:
- reply: 사용자의 대화에 대한 노답봇의 위트 있는 답변 (한국어로 작성)
- emotion: 위의 감정 문자열들 중 하나 ('clueless' | 'smug' | 'sigh' | 'angry' | 'joy' | 'shock')`;

    if (apiProvider === "deepseek") {
      const systemInstruction = `${systemPrompt}\n\n[현재 성격 모드 설정]\n${personalityPrompt}\n\nYou MUST respond in JSON format with exactly:
{
  "reply": "노답봇의 유쾌한 답변 텍스트",
  "emotion": "clueless" | "smug" | "sigh" | "angry" | "joy" | "shock"
}`;
      const resultText = await callDeepseek(
        messages,
        systemInstruction,
        deepseekApiKey,
        customModel || "deepseek-chat"
      );
      const data = JSON.parse(resultText.trim());
      return res.json(data);
    }

    // Default to Gemini (system or custom user key)
    const ai = getGeminiClient(apiProvider === "gemini" ? customApiKey : undefined);
    const modelToUse = apiProvider === "gemini" && customModel ? customModel : "gemini-3.5-flash";

    // Map conversation array to the expected SDK structure and ensure it alternate and starts with user.
    // The Gemini SDK uses the format: contents: [{role: 'user' | 'model', parts: [{text: '...'}]}]
    const rawContents = messages.map((m: any) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content || "" }],
    }));

    const apiContents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    
    for (const msg of rawContents) {
      if (apiContents.length === 0) {
        // Must start with user role
        if (msg.role === "user") {
          apiContents.push(msg);
        }
      } else {
        const lastMsg = apiContents[apiContents.length - 1];
        if (lastMsg.role === msg.role) {
          // Merge sequential contents with the same role to maintain strict alternation
          lastMsg.parts[0].text += "\n" + msg.parts[0].text;
        } else {
          apiContents.push(msg);
        }
      }
    }

    // Fallback: If we couldn't form a valid chat array starting with a user message,
    // construct one from the last message's content (or a generic fallback) so the API doesn't crash.
    if (apiContents.length === 0) {
      const lastUserContent = messages.filter((m: any) => m.role === "user").pop()?.content || "안녕";
      apiContents.push({
        role: "user",
        parts: [{ text: lastUserContent }],
      });
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: apiContents,
      config: {
        systemInstruction: `${systemPrompt}\n\n[현재 성격 모드 설정]\n${personalityPrompt}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "노답봇의 유쾌한 답변 텍스트",
            },
            emotion: {
              type: Type.STRING,
              enum: ["clueless", "smug", "sigh", "angry", "joy", "shock"],
              description: "대답에 어울리는 노답봇의 표정 상태",
            },
          },
          required: ["reply", "emotion"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("AI가 응답을 생성하지 못했습니다.");
    }

    const data = JSON.parse(resultText.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Chat Error:", error);
    let errorMessage = error.message || "노답봇 대화 중 에러가 났습니다. (진짜 노답 통신 장애 발생!)";
    
    if (typeof errorMessage === "string" && errorMessage.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch (e) {
        // use original error
      }
    }

    return res.status(500).json({
      error: errorMessage,
    });
  }
});

// Vite Middleware & Host Static files
async function startServer() {
  if (process.env.VERCEL) {
    // On Vercel, requests are routed to serverless handlers under /api.
    // Static assets are handled and served natively by Vercel CDN.
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[노답봇 서버] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
