const express = require('express');
const messageMulter = require('../utils/messageMulterConfig');
const messageCtrl = require('../controllers/messageCtrl');
const likeCtrl = require('../controllers/likesCtrl');
const jwtUtils = require('../utils/jwtUtils');

const messageRouter = express.Router();

messageRouter.post('/new', jwtUtils.tokenValidation, messageMulter.array('images', 10), messageCtrl.createMessage);
messageRouter.post('/:id/reply', jwtUtils.tokenValidation, messageMulter.array('images', 10), messageCtrl.createMessage);
messageRouter.get('/all', messageCtrl.getAllMessages);
messageRouter.get('/:id/specific', messageCtrl.getOneMessage);
messageRouter.post('/:id/like', jwtUtils.tokenValidation, likeCtrl.likesPost);
messageRouter.post('/:id/dislike', jwtUtils.tokenValidation, likeCtrl.dislikesPost);
messageRouter.post('/:id/nullify', jwtUtils.tokenValidation, likeCtrl.nullifyReaction);

module.exports = messageRouter;
