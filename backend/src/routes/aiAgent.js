import { Router } from 'express';
import { getBusiness, updateBusiness, getBusinessRaw } from '../services/businessService.js';
import { requireBusiness } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { aiAgentSettingsSchema } from '../schemas/aiAgent.js';
import { provisionNumber, releaseNumber } from '../services/twilioService.js';
import { getSecret } from '../config/secrets.js';
import { badRequest } from '../utils/errors.js';
import logger from '../config/logger.js';

const router = Router();

router.use(requireBusiness);

// GET /api/ai-agent/status
router.get('/status', async (req, res, next) => {
  try {
    const business = await getBusiness(req.businessId);
    res.json({
      enabled: business.ai_agent_enabled,
      twilio_number: business.twilio_number,
      voice: business.ai_agent_voice || 'alloy',
      greeting: business.ai_agent_greeting || null,
      minutes_used: 0,
      minutes_included: business.plan === 'elite' ? 500 : 0,
    });
  } catch (err) { next(err); }
});

// POST /api/ai-agent/enable
router.post('/enable', async (req, res, next) => {
  try {
    const business = await getBusinessRaw(req.businessId);

    // If already enabled, just return status
    if (business.ai_agent_enabled && business.twilio_number) {
      return res.json({
        enabled: true,
        twilio_number: business.twilio_number,
        voice: business.ai_agent_voice || 'alloy',
        greeting: business.ai_agent_greeting || null,
        minutes_used: 0,
        minutes_included: 500,
      });
    }

    // Upgrade to elite plan
    await updateBusiness(req.businessId, { ai_agent_enabled: true, plan: 'elite' });

    // Provision a Twilio number (if credentials are configured)
    let twilioNumber = null;
    const twilioSid = getSecret('TWILIO_ACCOUNT_SID');
    if (twilioSid) {
      const webhookBase = process.env.WEBHOOK_BASE_URL || 'https://api.bzy.app';
      try {
        const result = await provisionNumber(req.businessId, webhookBase);
        twilioNumber = result.phoneNumber;
        logger.info(`Provisioned Twilio number ${twilioNumber} for business ${req.businessId}`);
      } catch (err) {
        logger.error(`Twilio provisioning failed for business ${req.businessId}: ${err.message}`);
        // Still mark as enabled — number can be provisioned later
      }
    } else {
      logger.warn('Twilio credentials not configured — AI agent enabled without phone number');
    }

    res.json({
      enabled: true,
      twilio_number: twilioNumber,
      voice: business.ai_agent_voice || 'alloy',
      greeting: business.ai_agent_greeting || null,
      minutes_used: 0,
      minutes_included: 500,
    });
  } catch (err) { next(err); }
});

// POST /api/ai-agent/disable
router.post('/disable', async (req, res, next) => {
  try {
    const business = await getBusinessRaw(req.businessId);

    // Release the Twilio number if we have one
    if (business.twilio_number) {
      const twilioSid = getSecret('TWILIO_ACCOUNT_SID');
      if (twilioSid) {
        try {
          await releaseNumber(req.businessId);
          logger.info(`Released Twilio number for business ${req.businessId}`);
        } catch (err) {
          logger.error(`Twilio release failed for business ${req.businessId}: ${err.message}`);
        }
      }
    }

    await updateBusiness(req.businessId, { ai_agent_enabled: false });

    res.json({
      enabled: false,
      twilio_number: null,
      voice: business.ai_agent_voice || 'alloy',
      greeting: business.ai_agent_greeting || null,
      minutes_used: 0,
      minutes_included: 500,
    });
  } catch (err) { next(err); }
});

// PATCH /api/ai-agent/settings
router.patch('/settings', validateBody(aiAgentSettingsSchema), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.voice) updates.ai_agent_voice = req.body.voice;
    if (req.body.greeting) updates.ai_agent_greeting = req.body.greeting;
    if (req.body.hours) updates.ai_agent_hours = req.body.hours;

    const business = await updateBusiness(req.businessId, updates);
    res.json({
      enabled: business.ai_agent_enabled,
      twilio_number: business.twilio_number,
      voice: business.ai_agent_voice || 'alloy',
      greeting: business.ai_agent_greeting || null,
      minutes_used: 0,
      minutes_included: business.plan === 'elite' ? 500 : 0,
    });
  } catch (err) { next(err); }
});

export default router;
