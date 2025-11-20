const express = require('express');
const router = express.Router();
const { summarize } = require('../controllers/aiController');

router.post('/summarize', summarize);

module.exports = router;
