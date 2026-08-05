
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);



router.get('/', ctrl.getExpenses);
router.get('/summary/totals', ctrl.getExpenseSummary);
router.get('/:id', ctrl.getExpenseById);
router.post('/', upload.single('image'), ctrl.createExpense);
router.put('/:id', upload.single('image'), ctrl.updateExpense);
router.patch('/:id/status', ctrl.updateExpenseStatus);
router.delete('/:id', ctrl.deleteExpense);





module.exports = router;
