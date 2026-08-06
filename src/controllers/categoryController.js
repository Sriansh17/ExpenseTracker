const service = require('../services/categoryService');
const send = (res, result, message = 'OK') => res.json({ code: 'OK', message, ...(Array.isArray(result) ? { categories: result } : result) });
async function list(req, res, next) { try { return send(res, await service.list(req.userId)); } catch (e) { next(e); } }
async function create(req, res, next) { try { return res.status(201).json({ code: 'OK', message: 'Category created', category: await service.create(req.userId, req.body) }); } catch (e) { next(e); } }
async function update(req, res, next) { try { return send(res, { category: await service.update(req.userId, req.params.id, req.body) }, 'Category updated'); } catch (e) { next(e); } }
async function remove(req, res, next) { try { return send(res, await service.remove(req.userId, req.params.id), 'Category deleted'); } catch (e) { next(e); } }
module.exports = { list, create, update, delete: remove };
