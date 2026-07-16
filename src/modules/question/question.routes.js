import { Router } from "express";
import {
  getCatalogQuestions,
  createQuestion,
  generateAIQuestion
} from "./question.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { createQuestionSchema, generateQuestionSchema } from "./question.validator.js";

const router = Router();

// Protect all question routes
router.use(verifyJWT);

router
  .route("/")
  .get(getCatalogQuestions)
  .post(validate(createQuestionSchema), createQuestion);

router.route("/generate").post(validate(generateQuestionSchema), generateAIQuestion);

export default router;
