const express = require('express');
const router = express.Router();
const { summarize } = require('../controllers/aiController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.use(ensureAuthenticated);

router.post('/summarize', summarize);

module.exports = router;
