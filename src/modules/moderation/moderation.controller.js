import { ModerationService } from "./moderation.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const submitReport = asyncHandler(async (req, res) => {
  const report = await ModerationService.createReport(req.user._id, req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, report, "Report submitted successfully."));
});

const getPendingReportsList = asyncHandler(async (req, res) => {
  // Admin role validation
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Forbidden. Admin privileges required.");
  }

  const reports = await ModerationService.getPendingReports();

  return res
    .status(200)
    .json(new ApiResponse(200, reports, "Pending reports queue retrieved."));
});

const resolveReportQueue = asyncHandler(async (req, res) => {
  // Admin role validation
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Forbidden. Admin privileges required.");
  }

  const { reportId } = req.params;
  const { action } = req.body;

  const resolvedReport = await ModerationService.resolveReport(
    reportId,
    action,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, resolvedReport, `Report resolved with action: ${action}.`));
});

export {
  submitReport,
  getPendingReportsList,
  resolveReportQueue
};
