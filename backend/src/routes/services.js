import { Router } from 'express';
import { listServices, createService, updateService, deleteService } from '../services/serviceService.js';
import { requireBusiness } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createServiceSchema, updateServiceSchema } from '../schemas/services.js';

const router = Router();

router.use(requireBusiness);

router.get('/', async (req, res, next) => {
  try {
    const items = await listServices(req.businessId);
    res.json({ items });
  } catch (err) { next(err); }
});

router.post('/', validateBody(createServiceSchema), async (req, res, next) => {
  try {
    const service = await createService(req.businessId, req.body);
    res.status(201).json(service);
  } catch (err) { next(err); }
});

router.patch('/:id', validateBody(updateServiceSchema), async (req, res, next) => {
  try {
    const service = await updateService(req.params.id, req.businessId, req.body);
    res.json(service);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteService(req.params.id, req.businessId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
