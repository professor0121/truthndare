import { Question } from "./question.model.js";
import { generateQuestionAI } from "../../config/gemini.js";
import { cleanMessage } from "../../utils/moderation.js";
import { ApiError } from "../../utils/ApiError.js";

// Local in-memory store fallback for mock mode
const mockQuestions = [];

const INITIAL_QUESTIONS = [
  { text: "What is your biggest secret?", type: "truth", difficulty: "medium", category: "personal" },
  { text: "Have you ever lied to anyone in this room?", type: "truth", difficulty: "easy", category: "funny" },
  { text: "What is the most embarrassing thing you've ever done?", type: "truth", difficulty: "hard", category: "embarrassing" },
  { text: "What is your biggest fear?", type: "truth", difficulty: "medium", category: "personal" },
  { text: "Who was your first crush?", type: "truth", difficulty: "easy", category: "personal" },
  { text: "Do 10 pushups.", type: "dare", difficulty: "easy", category: "funny" },
  { text: "Sing a song out loud.", type: "dare", difficulty: "medium", category: "funny" },
  { text: "Send a silly selfie to the chat.", type: "dare", difficulty: "hard", category: "embarrassing" },
  { text: "Tell a funny joke.", type: "dare", difficulty: "easy", category: "funny" },
  { text: "Do a funny dance for 30 seconds.", type: "dare", difficulty: "medium", category: "funny" },
  { text: "What is the worst date you've ever been on?", type: "truth", difficulty: "hard", category: "embarrassing" },
  { text: "Say 3 nice things about the host.", type: "dare", difficulty: "easy", category: "funny" }
];

class QuestionService {
  /**
   * Seeds default system questions into MongoDB/mock memory store if empty.
   */
  static async seedStaticQuestions() {
    if (process.env.USE_MOCK_DB === "true") {
      if (mockQuestions.length === 0) {
        INITIAL_QUESTIONS.forEach((q, idx) => {
          mockQuestions.push({
            _id: `q_system_${idx}`,
            ...q,
            language: "en",
            isAI: false,
            createdBy: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
        console.log(`🌱 Mock database seeded with ${mockQuestions.length} system questions.`);
      }
      return;
    }

    try {
      const count = await Question.countDocuments({ createdBy: null });
      if (count === 0) {
        await Question.insertMany(
          INITIAL_QUESTIONS.map((q) => ({
            ...q,
            language: "en",
            isAI: false,
            createdBy: null
          }))
        );
        console.log("🌱 Primary MongoDB database seeded with default system questions.");
      }
    } catch (error) {
      console.error("Failed to seed questions database:", error);
    }
  }

  /**
   * Fetches a list of catalog questions matching filters.
   */
  static async getCatalogQuestions(filters = {}) {
    const { type, difficulty, category, customOnly, createdBy } = filters;
    const query = {};

    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;
    
    if (customOnly === "true") {
      query.createdBy = { $ne: null };
    } else if (createdBy) {
      query.createdBy = createdBy;
    }

    if (process.env.USE_MOCK_DB === "true") {
      return mockQuestions.filter((q) => {
        if (type && q.type !== type) return false;
        if (difficulty && q.difficulty !== difficulty) return false;
        if (category && q.category !== category) return false;
        if (customOnly === "true" && q.createdBy === null) return false;
        if (createdBy && q.createdBy !== createdBy) return false;
        return true;
      });
    }

    return await Question.find(query).sort({ createdAt: -1 });
  }

  /**
   * Returns a random catalog question matching filters. Falls back to general matches if none found.
   */
  static async getRandomCatalogQuestion(filters = {}) {
    const { type, difficulty, category, language = "en" } = filters;

    if (process.env.USE_MOCK_DB === "true") {
      let filtered = mockQuestions.filter(
        (q) =>
          q.type === type &&
          (!difficulty || q.difficulty === difficulty) &&
          (!category || q.category === category) &&
          q.language === language
      );

      // Fallback: relax difficulty and category filters
      if (filtered.length === 0) {
        filtered = mockQuestions.filter((q) => q.type === type && q.language === language);
      }
      // Ultimate fallback: relax type filter
      if (filtered.length === 0) {
        filtered = mockQuestions;
      }

      const randomIndex = Math.floor(Math.random() * filtered.length);
      return filtered[randomIndex] || null;
    }

    // Mongoose MongoDB query
    const matchStage = { type, language };
    if (difficulty) matchStage.difficulty = difficulty;
    if (category) matchStage.category = category;

    let aggregateResults = await Question.aggregate([
      { $match: matchStage },
      { $sample: { size: 1 } }
    ]);

    // Fallback: relax category and difficulty
    if (aggregateResults.length === 0) {
      aggregateResults = await Question.aggregate([
        { $match: { type, language } },
        { $sample: { size: 1 } }
      ]);
    }

    return aggregateResults[0] || null;
  }

  /**
   * Creates a user-contributed custom question.
   */
  static async createUserQuestion(userId, questionData) {
    const { text, type, difficulty = "medium", category = "funny", language = "en" } = questionData;
    
    // Pass through moderation filter
    const cleanedText = cleanMessage(text);

    if (process.env.USE_MOCK_DB === "true") {
      const newQuestion = {
        _id: `q_user_${Math.random().toString(36).substring(2, 9)}`,
        text: cleanedText,
        type,
        difficulty,
        category,
        language,
        isAI: false,
        createdBy: userId.toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockQuestions.push(newQuestion);
      return newQuestion;
    }

    return await Question.create({
      text: cleanedText,
      type,
      difficulty,
      category,
      language,
      isAI: false,
      createdBy: userId.toString()
    });
  }

  /**
   * Generates a novel question using Gemini AI, with moderation filtering and catalog fallbacks.
   */
  static async generateAIQuestion(type, difficulty = "medium", category = "funny", language = "en") {
    // 1. Invoke Gemini AI client
    const aiText = await generateQuestionAI(type, difficulty, category, language);
    
    if (aiText) {
      // 2. Clean the question with the moderation filter
      const cleanedText = cleanMessage(aiText);

      // Return generated structure
      return {
        _id: `ai_${Math.random().toString(36).substring(2, 9)}`,
        text: cleanedText,
        type,
        difficulty,
        category,
        language,
        isAI: true,
        createdBy: "gemini_ai"
      };
    }

    // 3. Graceful degradation: pick a random matching question from the static catalog
    console.log("⚠️  AI Generation failed or bypassed. Falling back to local catalog question.");
    return await this.getRandomCatalogQuestion({ type, difficulty, category, language });
  }

  /**
   * Deletes a question from MongoDB or in-memory mock store.
   */
  static async deleteQuestion(questionId) {
    const idStr = questionId.toString();

    if (process.env.USE_MOCK_DB === "true") {
      const idx = mockQuestions.findIndex((q) => q._id === idStr);
      if (idx !== -1) {
        mockQuestions.splice(idx, 1);
        return { success: true };
      }
      return { success: false };
    }

    const result = await Question.findByIdAndDelete(idStr);
    return { success: !!result };
  }
}

export { QuestionService, mockQuestions };
