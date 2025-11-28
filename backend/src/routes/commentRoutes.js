const express = require('express');
const {
  getNotesByClient,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} = require('../controllers/commentController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/client/:clientId', getNotesByClient);
router.post('/client/:clientId', createNote);
router.get('/:id', getNoteById);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
