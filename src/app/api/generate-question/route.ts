import { NextResponse } from "next/server";
import type { GeneratedQuestion } from "@/types";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ADMIN_WALLET = (process.env.ADMIN_WALLET || "").toLowerCase();

function isAdmin(req: Request) {
  const wallet = req.headers.get("x-admin-wallet")?.toLowerCase() || "";
  return wallet === ADMIN_WALLET;
}

const ALLOWED_CATEGORIES = ["Sports", "Crypto", "Tech", "Politics", "Pop Culture", "Science", "Macro"];

/**
 * GET /api/generate-question
 * Uses OpenRouter (DeepSeek V3 Flash) to generate a daily trivia question
 * suitable for WAGR — sports, entertainment, current events, etc.
 * Returns: { question, options, suggestedAnswer, category }
 */
export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const rawCat = searchParams.get("category") || "Sports";
  const categoryParam = ALLOWED_CATEGORIES.includes(rawCat) ? rawCat : "Sports";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const prompt = `You are generating a daily prediction question for WAGR, a social betting app where users pay $1 USDC to participate.

Today's date: ${today}

Generate ONE highly specific, trending, and exciting prediction question about ${categoryParam} happening LATER TODAY or TOMORROW. The question must be formulated so that the answer options are exactly ["Yes", "No"]. 

Requirements:
- NEVER GENERATE GENERIC QUESTIONS. Be hyper-specific using exact numbers, names, or targets (e.g., instead of "Will Bitcoin go up?", ask "Will Bitcoin cross $71,500 by midnight EST?").
- Ensure the topic is highly relevant to current global trends right now.
- The outcome must be in the future, unknown, but easily verifiable once the event completes.
- STRICTLY FORBIDDEN: Do not generate past trivia questions (e.g. "Did Argentina win the 2022 World Cup?").
- Options must be EXACTLY ["Yes", "No"].
- Feel free to generate questions about Crypto, Stock Markets, Geo-Politics, or Global events if it fits the category.

Return ONLY valid JSON in this exact format:
{
  "question": "Will LeBron James score more than 28.5 points tonight?",
  "options": ["Yes", "No"],
  "suggestedAnswer": 0,
  "category": "Sports"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://wagr.xyz",
        "X-Title": "WAGR Daily Question Generator",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed: GeneratedQuestion = JSON.parse(clean);

    // Validate structure
    if (
      typeof parsed.question !== "string" ||
      !Array.isArray(parsed.options) ||
      parsed.options.length < 2
    ) {
      throw new Error("Invalid AI response structure");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Generate question error:", err);
    // Return a fallback question so the admin page never breaks
    const fallback: GeneratedQuestion = {
      question: "Who will have more total assists in today's NBA games?",
      options: ["Western Conference players", "Eastern Conference players"],
      suggestedAnswer: 0,
      category: "Sports",
    };
    return NextResponse.json(fallback);
  }
}
