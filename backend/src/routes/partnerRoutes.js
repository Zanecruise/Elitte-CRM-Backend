const express = require('express');
const {
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
} = require('../controllers/partnerController');

const router = express.Router();

router.get('/', getAllPartners);
router.post('/', createPartner);
router.put('/:id', updatePartner);
router.delete('/:id', deletePartner);

module.exports = router;
