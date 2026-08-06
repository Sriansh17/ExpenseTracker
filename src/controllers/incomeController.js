const service = require('../services/incomeService');
const send = (res, result, message = 'OK') => res.json({ code: 'OK', message, ...result });
async function create(req, res, next) { try { return res.status(201).json({ code: 'OK', message: 'Income created', ...(await service.create(req.userId, req.body)) }); } catch (e) { next(e); } }
async function getById(req, res, next) { try { return send(res, await service.getById(req.userId, req.params.id)); } catch (e) { next(e); } }
async function list(req, res, next) { try { return send(res, await service.list(req.userId, req.query)); } catch (e) { next(e); } }
async function update(req, res, next) { try { return send(res, await service.update(req.userId, req.params.id, req.body), 'Income updated'); } catch (e) { next(e); } }
async function remove(req, res, next) { try { return send(res, await service.delete(req.userId, req.params.id), 'Income deleted'); } catch (e) { next(e); } }
module.exports = { create, getById, list, update, delete: remove };
