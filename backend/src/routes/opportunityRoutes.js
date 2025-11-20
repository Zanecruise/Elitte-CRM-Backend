const express = require('express');
const {
  getAllOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
} = require('../controllers/opportunityController');

const router = express.Router();

router.get('/', getAllOpportunities);
router.post('/', createOpportunity);
router.put('/:id', updateOpportunity);
router.delete('/:id', deleteOpportunity);

module.exports = router;
