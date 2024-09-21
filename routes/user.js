const express = require('express');
const multerConfig = require('../utils/multerConfig');
const userCtrl = require('../controllers/userCtrl');
const jwtUtils = require('../utils/jwtUtils');

const userRouter = express.Router();

userRouter.post('/register', multerConfig.single('image'), userCtrl.register);
userRouter.post('/login', userCtrl.login);
userRouter.get('/profil', jwtUtils.tokenValidation, userCtrl.getProfile);
userRouter.put('/profil', jwtUtils.tokenValidation, multerConfig.single('image'), userCtrl.updateUserProfile);
userRouter.post('/logout', jwtUtils.tokenValidation, userCtrl.logout);

module.exports = userRouter;
