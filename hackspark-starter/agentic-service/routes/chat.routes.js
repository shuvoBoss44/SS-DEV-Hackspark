const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

router.post('/', chatController.handleChat);
router.get('/sessions', chatController.getSessions);
router.get('/:sessionId/history', chatController.getHistory);
router.delete('/:sessionId', chatController.deleteSession);

module.exports = router;
