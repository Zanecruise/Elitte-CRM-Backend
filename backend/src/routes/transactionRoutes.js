const express = require('express');
const {
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

const router = express.Router();

router.get('/', getAllTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
