const Note = require('../models/SessionNote');
const Client = require('../models/Client');
const Session = require('../models/Session');
const { canAccess } = require('../services/entitlementService');

const noteTypes = new Set(['private', 'shared']);
const noteFormats = new Map([
  ['freeform', 'freeform'],
  ['soap', 'SOAP'],
  ['dap', 'DAP'],
]);

function normalizedType(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function normalizedFormat(value) {
  return typeof value === 'string' ? noteFormats.get(value.toLowerCase()) : undefined;
}

exports.list = async (req, res, next) => {
  try {
    const filter = { therapist_id: req.therapist._id };
    if (req.query.clientId) filter.client_id = req.query.clientId;
    res.json({
      notes: await Note.find(filter).sort({ updatedAt: -1 }),
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      clientId,
      type = 'private',
      format = 'freeform',
      title,
      content,
      sessionId,
    } = req.body;
    const safeType = normalizedType(type);
    const safeFormat = normalizedFormat(format);

    if (!noteTypes.has(safeType) || !safeFormat) {
      return res.status(400).json({ message: 'Choose a valid note visibility and template' });
    }
    if (!await Client.exists({ _id: clientId, therapist_id: req.therapist._id })) {
      return res.status(404).json({ message: 'Client not found' });
    }
    if (sessionId && !await Session.exists({
      _id: sessionId,
      therapist_id: req.therapist._id,
      client_id: clientId,
    })) {
      return res.status(404).json({ message: 'Session not found for this client' });
    }
    if (safeFormat === 'SOAP') {
      const access = await canAccess(req.therapist._id, 'features.soapNotes');
      if (!access.allowed) {
        return res.status(403).json({
          message: 'SOAP templates require a plan upgrade',
          upgradeRequired: true,
          entitlement: access,
        });
      }
    }
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const note = await Note.create({
      therapist_id: req.therapist._id,
      client_id: clientId,
      session_id: sessionId,
      type: safeType,
      format: safeFormat,
      title: typeof title === 'string' ? title.trim() : '',
      content: content.trim(),
    });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const update = {};
    for (const field of ['title', 'content']) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string') {
          return res.status(400).json({ message: `Invalid ${field}` });
        }
        update[field] = req.body[field].trim();
      }
    }
    if (req.body.type !== undefined) {
      update.type = normalizedType(req.body.type);
      if (!noteTypes.has(update.type)) {
        return res.status(400).json({ message: 'Choose a valid note visibility' });
      }
    }
    if (req.body.format !== undefined) {
      update.format = normalizedFormat(req.body.format);
      if (!update.format) {
        return res.status(400).json({ message: 'Choose a valid note template' });
      }
      if (update.format === 'SOAP') {
        const access = await canAccess(req.therapist._id, 'features.soapNotes');
        if (!access.allowed) {
          return res.status(403).json({
            message: 'SOAP templates require a plan upgrade',
            upgradeRequired: true,
            entitlement: access,
          });
        }
      }
    }
    if (update.content !== undefined && !update.content) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, therapist_id: req.therapist._id },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ note });
  } catch (error) {
    next(error);
  }
};

exports.sharedForClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.clientId,
      email: String(req.query.email || '').trim().toLowerCase(),
    });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const notes = await Note.find({
      client_id: client._id,
      therapist_id: client.therapist_id,
      type: 'shared',
    }).select('title content format createdAt updatedAt');
    res.json({ notes });
  } catch (error) {
    next(error);
  }
};
