import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  GEMINI_API_KEY is not set in environment. Gemini AI generation will fall back to static questions.");
    return null;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};

/**
 * Calls Gemini Generative AI to create a novel Truth or Dare question.
 */
const generateQuestionAI = async (type, difficulty, category, language = "en") => {
  try {
    if (!genAI) {
      initGemini();
    }
    if (!genAI) {
      return null; // Graceful degradation fallback
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Generate a single, engaging Truth or Dare question for a multiplayer social game.
Requirements:
- Action Type: ${type} (either 'truth' or 'dare')
- Difficulty: ${difficulty} (easy, medium, or hard)
- Category/Vibe: ${category} (funny, personal, embarrassing, or 18+)
- Language: ${language}
- Output format: Return ONLY the raw question text. Do not include quotes, markdown, prefixes like "Truth:" or "Dare:", or any other formatting or introductory text.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Basic formatting cleanups (remove potential leading/trailing quotes)
    return responseText.trim().replace(/^['"]|['"]$/g, "");
  } catch (error) {
    console.error("Gemini AI API call FAILED: ", error);
    return null; // Fallback to catalog
  }
};

export { initGemini, generateQuestionAI };
