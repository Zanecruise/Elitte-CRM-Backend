const express = require('express');
const router = express.Router();
const { search } = require('../controllers/searchController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.use(ensureAuthenticated);

router.post('/search', search);

module.exports = router;
