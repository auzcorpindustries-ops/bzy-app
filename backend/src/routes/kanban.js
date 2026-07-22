import { Router } from 'express';
import { ScanCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import logger from '../config/logger.js';

const router = Router();
const TABLE = 'bzy-kanban';

// Simple API key auth (same pattern as Auzora admin)
const KANBAN_API_KEY = process.env.KANBAN_API_KEY || 'bzy-kanban-key-2026';

router.use((req, _res, next) => {
  // Allow requests from nginx proxy (which injects the API key header)
  // Also allow direct access with API key in header
  const key = req.headers['x-api-key'];
  if (key === KANBAN_API_KEY) {
    return next();
  }
  // Allow requests from localhost (nginx proxy)
  const ip = req.ip || req.socket.remoteAddress;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return next();
  }
  return _res.status(401).json({ error: 'unauthorized', message: 'Invalid API key' });
});

// GET /api/kanban/tasks — list all tasks
router.get('/tasks', async (_req, res, next) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE }));
    res.json(result.Items || []);
  } catch (err) { next(err); }
});

// GET /api/kanban/tasks/:id — get single task
router.get('/tasks/:id', async (req, res, next) => {
  try {
    const { Item } = await docClient.send(new GetCommand({
      TableName: TABLE,
      Key: { task_id: req.params.id },
    }));
    if (!Item) return res.status(404).json({ error: 'not_found', message: 'Task not found' });
    res.json(Item);
  } catch (err) { next(err); }
});

// POST /api/kanban/tasks — create task
router.post('/tasks', async (req, res, next) => {
  try {
    const task_id = req.body.task_id || `t_${uuid().slice(0, 8)}`;
    const now = new Date().toISOString();
    const task = {
      task_id,
      title: req.body.title || 'Untitled',
      body: req.body.body || req.body.desc || '',
      status: req.body.status || 'backlog',
      assignee: req.body.assignee || req.body.agent || 'engineer',
      priority: req.body.priority || 'medium',
      blocked: req.body.blocked || false,
      blocker_note: req.body.blocker_note || req.body.blockerNote || '',
      mcp: req.body.mcp || [],
      screenshot: req.body.screenshot || null,
      created_at: req.body.created_at || now,
      updated_at: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLE, Item: task }));
    logger.info(`Kanban task created: ${task_id}`);
    res.status(201).json(task);
  } catch (err) { next(err); }
});

// PUT /api/kanban/tasks/:id — update task (full replace)
router.put('/tasks/:id', async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const updates = {
      title: req.body.title,
      body: req.body.body || req.body.desc,
      status: req.body.status,
      assignee: req.body.assignee || req.body.agent,
      priority: req.body.priority,
      blocked: req.body.blocked,
      blocker_note: req.body.blocker_note || req.body.blockerNote,
      mcp: req.body.mcp,
      screenshot: req.body.screenshot,
      updated_at: now,
    };

    const setExpressions = [];
    const exprValues = {};
    const exprNames = {};
    let i = 0;
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      i++;
      const nameKey = `#k${i}`;
      const valKey = `:v${i}`;
      setExpressions.push(`${nameKey} = ${valKey}`);
      exprNames[nameKey] = key;
      exprValues[valKey] = value;
    }

    if (setExpressions.length === 0) {
      return res.json({ message: 'No updates' });
    }

    const { Attributes } = await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { task_id: req.params.id },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: 'ALL_NEW',
    }));

    res.json(Attributes);
  } catch (err) { next(err); }
});

// PATCH /api/kanban/tasks/:id — partial update
router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const allowed = ['title', 'body', 'status', 'assignee', 'priority', 'blocked', 'blocker_note', 'mcp', 'screenshot'];
    const fieldMap = {
      desc: 'body',
      agent: 'assignee',
      blockerNote: 'blocker_note',
    };

    const setExpressions = ['updated_at = :now'];
    const exprValues = { ':now': now };
    const exprNames = {};
    let i = 0;

    for (const [key, value] of Object.entries(req.body)) {
      const mappedKey = fieldMap[key] || key;
      if (!allowed.includes(mappedKey)) continue;
      i++;
      const nameKey = `#k${i}`;
      const valKey = `:v${i}`;
      setExpressions.push(`${nameKey} = ${valKey}`);
      exprNames[nameKey] = mappedKey;
      exprValues[valKey] = value;
    }

    if (setExpressions.length === 1) {
      return res.json({ message: 'No updates' });
    }

    const { Attributes } = await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { task_id: req.params.id },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: 'ALL_NEW',
    }));

    res.json(Attributes);
  } catch (err) { next(err); }
});

// DELETE /api/kanban/tasks/:id
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { task_id: req.params.id },
    }));
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
