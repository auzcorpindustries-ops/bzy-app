import { Router } from 'express';
import { getBusiness, updateBusiness } from '../services/businessService.js';
import { requireBusiness } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateSettingsSchema } from '../schemas/settings.js';

const router = Router();

router.get('/', requireBusiness, async (req, res, next) => {
  try {
    const business = await getBusiness(req.businessId);
    res.json(business);
  } catch (err) { next(err); }
});

router.patch('/', requireBusiness, validateBody(updateSettingsSchema), async (req, res, next) => {
  try {
    const business = await updateBusiness(req.businessId, req.body);
    res.json(business);
  } catch (err) { next(err); }
});

export default router;
