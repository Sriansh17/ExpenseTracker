const service = require('../services/dashboardService');
async function overview(req, res, next) { try { res.json({ code: 'OK', message: 'OK', ...(await service.getOverview(req.userId)) }); } catch (e) { next(e); } }
async function charts(req, res, next) { try { res.json({ code: 'OK', message: 'OK', ...(await service.getChartData(req.userId, req.query)) }); } catch (e) { next(e); } }
module.exports = { overview, charts };
