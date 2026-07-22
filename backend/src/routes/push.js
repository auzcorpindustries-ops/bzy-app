import { Router } from 'express';
import { registerPushToken, sendTestPush } from '../services/pushService.js';
import { requireBusiness } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { registerPushTokenSchema } from '../schemas/push.js';

const router = Router();

router.use(requireBusiness);

router.post('/token', validateBody(registerPushTokenSchema), async (req, res, next) => {
  try {
    await registerPushToken(req.businessId, req.body.token, req.body.platform);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/test', async (req, res, next) => {
  try {
    const result = await sendTestPush(req.businessId);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
