import { Router } from "express";
import {
  submitReport,
  getPendingReportsList,
  resolveReportQueue
} from "./moderation.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { createReportSchema, resolveReportSchema } from "./moderation.validator.js";

const router = Router();

// Require JWT auth for all moderation actions
router.use(verifyJWT);

router
  .route("/reports")
  .post(validate(createReportSchema), submitReport);

router
  .route("/reports/pending")
  .get(getPendingReportsList);

router
  .route("/reports/:reportId/resolve")
  .post(validate(resolveReportSchema), resolveReportQueue);

export default router;
