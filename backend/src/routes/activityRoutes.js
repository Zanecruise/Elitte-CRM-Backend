const express = require('express');
const {
  getAllActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} = require('../controllers/activityController');

const router = express.Router();

router.get('/', getAllActivities);
router.post('/', createActivity);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

module.exports = router;
