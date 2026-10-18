const { randomUUID } = require('crypto');
const Therapist = require('../models/Therapist');

module.exports = async function withBookingLock(therapistId, operation) {
  const token = randomUUID();
  const now = new Date();
  const lock = await Therapist.findOneAndUpdate(
    {
      _id: therapistId,
      $or: [
        { bookingLockExpiresAt: { $exists: false } },
        { bookingLockExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        bookingLockToken: token,
        bookingLockExpiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      },
    },
    { new: true },
  ).select('_id');

  if (!lock) {
    const error = new Error('Another booking is being processed. Please try again.');
    error.status = 409;
    throw error;
  }

  try {
    return await operation();
  } finally {
    await Therapist.updateOne(
      { _id: therapistId, bookingLockToken: token },
      { $unset: { bookingLockToken: 1, bookingLockExpiresAt: 1 } },
    );
  }
};
