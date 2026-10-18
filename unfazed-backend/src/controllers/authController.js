const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Therapist = require('../models/Therapist');
const generateSlug = require('../utils/generateSlug');

exports.registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

exports.loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Please check your details',
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;
    if (await Therapist.exists({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const base = generateSlug(name);
    let slug = base;
    let suffix = 2;
    while (await Therapist.exists({ slug })) slug = `${base}-${suffix++}`;

    const therapist = await Therapist.create({
      name,
      email,
      password_hash: await bcrypt.hash(password, 12),
      slug,
    });
    res.status(201).json({
      token: jwt.sign({ id: therapist._id }, process.env.JWT_SECRET, { expiresIn: '7d' }),
      therapist: publicTherapist(therapist),
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Please provide a valid email and password',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    const therapist = await Therapist.findOne({ email });
    if (!therapist || !await bcrypt.compare(password, therapist.password_hash)) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }
    res.json({
      token: jwt.sign({ id: therapist._id }, process.env.JWT_SECRET, { expiresIn: '7d' }),
      therapist: publicTherapist(therapist),
    });
  } catch (error) {
    next(error);
  }
};

exports.me = (req, res) => res.json({ therapist: req.therapist });

function publicTherapist(therapist) {
  return {
    _id: therapist._id,
    name: therapist.name,
    email: therapist.email,
    slug: therapist.slug,
    bio: therapist.bio,
    specializations: therapist.specializations,
    languages: therapist.languages,
    location: therapist.location,
    sessionRate: therapist.sessionRate,
    tier: therapist.tier,
    timezone: therapist.timezone,
  };
}
