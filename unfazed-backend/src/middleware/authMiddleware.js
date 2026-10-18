const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');

module.exports = async function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: 'Authentication required' });

  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    return next(error);
  }

  try {
    const therapist = await Therapist.findById(decoded.id).select('-password_hash');
    if (!therapist) return res.status(401).json({ message: 'Account not found' });
    req.therapist = therapist;
    return next();
  } catch (error) {
    return next(error);
  }
};
