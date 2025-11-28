const express = require('express');
const {
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
} = require('../controllers/partnerController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/', getAllPartners);
router.post('/', createPartner);
router.put('/:id', updatePartner);
router.delete('/:id', deletePartner);

module.exports = router;
