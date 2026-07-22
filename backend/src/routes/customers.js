import { Router } from 'express';
import { listCustomers, getCustomerDetail } from '../services/customerService.js';
import { requireBusiness } from '../middleware/auth.js';

const router = Router();

router.use(requireBusiness);

router.get('/', async (req, res, next) => {
  try {
    const items = await listCustomers(req.businessId);
    res.json({ items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await getCustomerDetail(req.params.id, req.businessId);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
