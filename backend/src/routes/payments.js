import { Router } from 'express';
import { createDeposit, refundPayment } from '../services/paymentService.js';
import { requireBusiness } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createDepositSchema } from '../schemas/payments.js';

const router = Router();

// All payment routes require business auth
router.use(requireBusiness);

// POST /api/payments/deposit
router.post('/deposit', validateBody(createDepositSchema), async (req, res, next) => {
  try {
    const result = await createDeposit(req.businessId, req.body.booking_id);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// POST /api/payments/:id/refund
router.post('/:id/refund', async (req, res, next) => {
  try {
    const result = await refundPayment(req.businessId, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
