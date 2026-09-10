const alertService = require('../services/alert.service');

exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await alertService.getActiveAlertsForInstructor(req.user.id);
    const count = await alertService.getAlertCountForInstructor(req.user.id);
    res.status(200).json({ data: alerts, count });
  } catch (error) {
    next(error);
  }
};

exports.getAlertCount = async (req, res, next) => {
  try {
    const count = await alertService.getAlertCountForInstructor(req.user.id);
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

exports.dismissAlert = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const learnerId = req.params.learnerId;
    await alertService.dismissAlert(req.user.id, courseId, learnerId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
