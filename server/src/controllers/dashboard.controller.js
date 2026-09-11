const dashboardService = require('../services/dashboard.service');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const dashboardData = await dashboardService.getDashboardSummary(req.user.id);
    res.status(200).json({ data: dashboardData });
  } catch (error) {
    next(error);
  }
};
