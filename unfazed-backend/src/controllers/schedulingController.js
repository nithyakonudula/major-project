const Session = require('../models/Session');
const Client = require('../models/Client');
const Availability = require('../models/Availability');
const notifications = require('../services/notificationService');
const withBookingLock = require('../services/bookingLockService');

function parseBooking(startsAt, duration, mode) {
  const start = new Date(startsAt);
  const minutes = Number(duration);
  if (
    !startsAt ||
    !Number.isFinite(start.getTime()) ||
    start <= new Date() ||
    !Number.isInteger(minutes) ||
    minutes < 15 ||
    minutes > 240 ||
    !['online', 'in-person'].includes(mode)
  ) {
    return null;
  }
  return { start, end: new Date(start.getTime() + minutes * 60_000), minutes };
}

async function createBooking(therapistId, client, booking, mode, price) {
  return withBookingLock(therapistId, async () => {
    const overlap = await Session.exists({
      therapist_id: therapistId,
      status: { $ne: 'cancelled' },
      startsAt: { $lt: booking.end },
      endsAt: { $gt: booking.start },
    });
    if (overlap) {
      const error = new Error('That slot is no longer available');
      error.status = 409;
      throw error;
    }
    return Session.create({
      therapist_id: therapistId,
      client_id: client._id,
      startsAt: booking.start,
      endsAt: booking.end,
      duration: booking.minutes,
      mode,
      price,
    });
  });
}

exports.list = async (req, res, next) => {
  try {
    const sessions = await Session.find({ therapist_id: req.therapist._id })
      .populate('client_id', 'name email')
      .sort({ startsAt: 1 });
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

exports.setAvailability = async (req, res, next) => {
  try {
    const availability = await Availability.findOneAndUpdate(
      { therapist_id: req.therapist._id },
      {
        $set: {
          weekly: req.body.weekly || [],
          blockedSlots: req.body.blockedSlots || [],
          sessionDuration: req.body.sessionDuration || 50,
          bufferMinutes: req.body.bufferMinutes ?? 10,
        },
      },
      { new: true, upsert: true, runValidators: true },
    );
    res.json({ availability });
  } catch (error) {
    next(error);
  }
};

exports.getAvailability = async (req, res, next) => {
  try {
    res.json({
      availability: await Availability.findOne({
        therapist_id: req.therapist._id,
      }),
    });
  } catch (error) {
    next(error);
  }
};

exports.book = async (req, res, next) => {
  try {
    const { clientId, startsAt, duration = 50, mode = 'online' } = req.body;
    const booking = parseBooking(startsAt, duration, mode);
    if (!booking) {
      return res.status(400).json({ message: 'Choose a valid future time and session length' });
    }

    const client = await Client.findOne({
      _id: clientId,
      therapist_id: req.therapist._id,
    });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const session = await createBooking(
      req.therapist._id,
      client,
      booking,
      mode,
      req.therapist.sessionRate,
    );
    await notifications.send('booking.confirmed', {
      sessionId: session._id,
      clientId: client._id,
    });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const session = await Session.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist_id: req.therapist._id,
        status: 'booked',
      },
      { status: 'cancelled' },
      { new: true },
    );
    if (!session) return res.status(404).json({ message: 'Active booking not found' });
    res.json({ session });
  } catch (error) {
    next(error);
  }
};

exports.publicBook = async (req, res, next) => {
  try {
    const Therapist = require('../models/Therapist');
    const therapist = await Therapist.findOne({ slug: req.params.slug });
    if (!therapist) return res.status(404).json({ message: 'Profile not found' });

    const {
      name,
      email,
      phone,
      startsAt,
      duration = 50,
      mode = 'online',
      consent,
    } = req.body;
    if (!name || !email || consent !== true) {
      return res.status(400).json({ message: 'Name, email and consent are required' });
    }

    const booking = parseBooking(startsAt, duration, mode);
    if (!booking) {
      return res.status(400).json({ message: 'Choose a valid future time and session length' });
    }

    const session = await withBookingLock(therapist._id, async () => {
      const overlap = await Session.exists({
        therapist_id: therapist._id,
        status: { $ne: 'cancelled' },
        startsAt: { $lt: booking.end },
        endsAt: { $gt: booking.start },
      });
      if (overlap) {
        const error = new Error('That slot is no longer available');
        error.status = 409;
        throw error;
      }

      const client = await Client.findOneAndUpdate(
        { therapist_id: therapist._id, email: email.trim().toLowerCase() },
        {
          $set: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone,
            consent: { accepted: true, acceptedAt: new Date() },
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
      );
      const createdSession = await Session.create({
        therapist_id: therapist._id,
        client_id: client._id,
        startsAt: booking.start,
        endsAt: booking.end,
        duration: booking.minutes,
        mode,
        price: therapist.sessionRate,
      });
      return { client, session: createdSession };
    });

    await notifications.send('booking.confirmed', {
      sessionId: session.session._id,
      clientId: session.client._id,
    });
    res.status(201).json({ message: 'Booking confirmed', sessionId: session.session._id });
  } catch (error) {
    next(error);
  }
};
