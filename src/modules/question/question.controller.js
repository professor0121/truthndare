import { QuestionService } from "./question.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getCatalogQuestions = asyncHandler(async (req, res) => {
  const { type, difficulty, category, customOnly } = req.query;
  const questions = await QuestionService.getCatalogQuestions({
    type,
    difficulty,
    category,
    customOnly
  });

  return res
    .status(200)
    .json(new ApiResponse(200, questions, "Question catalog retrieved successfully."));
});

const createQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionService.createUserQuestion(req.user._id, req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, question, "Custom question created successfully."));
});

const generateAIQuestion = asyncHandler(async (req, res) => {
  const { type, difficulty, category, language } = req.body;
  const generatedQuestion = await QuestionService.generateAIQuestion(
    type,
    difficulty,
    category,
    language
  );

  return res
    .status(200)
    .json(new ApiResponse(200, generatedQuestion, "AI question generated successfully."));
});

export {
  getCatalogQuestions,
  createQuestion,
  generateAIQuestion
};
