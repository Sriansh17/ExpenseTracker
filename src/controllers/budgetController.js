const service = require('../services/budgetService');
async function list(req,res,next){try{res.json({code:'OK',message:'OK',...(await service.getStatus(req.userId))});}catch(e){next(e);}}
async function setMonthly(req,res,next){try{res.status(201).json({code:'OK',message:'Monthly budget saved',...(await service.setMonthlyBudget(req.userId,req.body.amount))});}catch(e){next(e);}}
async function setCategory(req,res,next){try{res.status(201).json({code:'OK',message:'Category budget saved',...(await service.setCategoryBudget(req.userId,req.body.categoryId,req.body.amount))});}catch(e){next(e);}}
module.exports={list,setMonthly,setCategory,getStatus:list};
