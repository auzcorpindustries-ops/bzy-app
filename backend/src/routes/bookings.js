import { Router } from 'express';
import { listBookings, getBooking, createBooking, updateBooking, getAvailableSlots } from '../services/bookingService.js';
import { requireBusiness } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createBookingSchema, updateBookingSchema, listBookingsQuerySchema, availabilityQuerySchema } from '../schemas/bookings.js';
import { findOrCreateCustomer } from '../services/customerService.js';

const router = Router();

router.use(requireBusiness);

// GET /api/bookings/availability
router.get('/availability', validateQuery(availabilityQuerySchema), async (req, res, next) => {
  try {
    const result = await getAvailableSlots(req.businessId, req.query.service_id, req.query.date);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/bookings
router.get('/', validateQuery(listBookingsQuerySchema), async (req, res, next) => {
  try {
    const items = await listBookings(req.businessId, req.query);
    res.json({ items });
  } catch (err) { next(err); }
});

// POST /api/bookings
router.post('/', validateBody(createBookingSchema), async (req, res, next) => {
  try {
    // Find or create customer
    const customer = await findOrCreateCustomer(req.businessId, {
      name: req.body.customer_name,
      phone: req.body.customer_phone,
      email: req.body.customer_email,
    });

    const booking = await createBooking(req.businessId, {
      ...req.body,
      customer_id: customer.customer_id,
    });
    res.status(201).json(booking);
  } catch (err) { next(err); }
});

// GET /api/bookings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await getBooking(req.params.id);
    if (!booking || booking.business_id !== req.businessId) {
      return res.status(404).json({ error: 'not_found', message: 'Booking not found', status: 404 });
    }
    res.json(booking);
  } catch (err) { next(err); }
});

// PATCH /api/bookings/:id
router.patch('/:id', validateBody(updateBookingSchema), async (req, res, next) => {
  try {
    const booking = await updateBooking(req.params.id, req.businessId, req.body);
    res.json(booking);
  } catch (err) { next(err); }
});

export default router;
