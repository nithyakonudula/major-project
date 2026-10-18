module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with these details already exists' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Request data is invalid' });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status < 500 ? error.message : 'Server error';
  return res.status(status).json({ message });
};
