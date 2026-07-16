import { Report } from "./report.model.js";
import { UserService } from "../user/user.service.js";
import { QuestionService } from "../question/question.service.js";
import { ApiError } from "../../utils/ApiError.js";

// Local in-memory storage for mock mode
const mockReports = [];

class ModerationService {
  /**
   * Creates a new pending report.
   */
  static async createReport(reporterId, reportData) {
    const { reportedUserId, contentType, contentId, contentPreview, reason } = reportData;
    const reporterIdStr = reporterId.toString();
    const reportedUserIdStr = reportedUserId.toString();

    // Verify target user exists
    const reportedUser = await UserService.findById(reportedUserIdStr);
    if (!reportedUser) {
      throw new ApiError(404, "Reported user not found.");
    }

    if (process.env.USE_MOCK_DB === "true") {
      const newReport = {
        _id: `rep_${Math.random().toString(36).substring(2, 9)}`,
        reporterId: reporterIdStr,
        reportedUserId: reportedUserIdStr,
        contentType,
        contentId: contentId || null,
        contentPreview,
        reason,
        status: "pending",
        actionTaken: "none",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockReports.push(newReport);
      return newReport;
    }

    return await Report.create({
      reporterId: reporterIdStr,
      reportedUserId: reportedUserIdStr,
      contentType,
      contentId: contentId || null,
      contentPreview,
      reason,
      status: "pending"
    });
  }

  /**
   * Lists all pending reports.
   */
  static async getPendingReports() {
    if (process.env.USE_MOCK_DB === "true") {
      return mockReports.filter((r) => r.status === "pending");
    }
    return await Report.find({ status: "pending" }).sort({ createdAt: -1 });
  }

  /**
   * Resolves a report with an action (dismiss, mute, ban, delete_content).
   */
  static async resolveReport(reportId, action, adminUserId) {
    const reportIdStr = reportId.toString();

    let report = null;

    if (process.env.USE_MOCK_DB === "true") {
      report = mockReports.find((r) => r._id === reportIdStr);
    } else {
      report = await Report.findById(reportIdStr);
    }

    if (!report) {
      throw new ApiError(404, "Report not found.");
    }

    if (report.status === "resolved") {
      throw new ApiError(400, "Report has already been resolved.");
    }

    // Process moderation actions
    let actionTaken = "none";

    if (action === "dismiss") {
      actionTaken = "none";
    } else if (action === "mute") {
      actionTaken = "mute";
      const user = await UserService.findById(report.reportedUserId);
      if (user) {
        user.isMuted = true;
        await user.save();
      }
    } else if (action === "ban") {
      actionTaken = "ban";
      const user = await UserService.findById(report.reportedUserId);
      if (user) {
        user.isBanned = true;
        await user.save();
      }
    } else if (action === "delete_content") {
      actionTaken = "deleted";
      if (report.contentType === "question" && report.contentId) {
        // Delete the custom question from the catalog
        await QuestionService.deleteQuestion(report.contentId);
      }
    } else {
      throw new ApiError(400, "Invalid resolution action.");
    }

    // Save resolution state
    report.status = "resolved";
    report.actionTaken = actionTaken;
    report.resolvedBy = adminUserId.toString();
    report.updatedAt = new Date();

    if (process.env.USE_MOCK_DB === "true") {
      const idx = mockReports.findIndex((r) => r._id === reportIdStr);
      if (idx !== -1) mockReports[idx] = report;
    } else {
      await report.save();
    }

    return report;
  }
}

export { ModerationService, mockReports };
