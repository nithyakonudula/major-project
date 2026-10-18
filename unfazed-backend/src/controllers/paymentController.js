const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Session = require('../models/Session');
const Therapist = require('../models/Therapist');
const getRazorpay = require('../config/razorpay');
const crypto = require('crypto');
const notifications = require('../services/notificationService');
const createInvoice = require('../services/invoiceService');

function signaturesMatch(expected, received) {
  if (typeof received !== 'string' || !/^[a-f\d]{64}$/i.test(received)) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

exports.list = async (req, res, next) => {
  try {
    const payments = await Payment.find({ therapist_id: req.therapist._id })
      .populate('client_id', 'name email')
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { clientId, sessionId } = req.body;
    const client = await Client.findOne({
      _id: clientId,
      therapist_id: req.therapist._id,
    });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    let session;
    if (sessionId) {
      session = await Session.findOne({
        _id: sessionId,
        therapist_id: req.therapist._id,
        client_id: client._id,
        status: 'booked',
      });
      if (!session) return res.status(404).json({ message: 'Session not found for this client' });
    }

    const amount = Number(session ? session.price : req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }
    if (amount > 1_000_000) {
      return res.status(400).json({ message: 'Amount exceeds the supported limit' });
    }

    const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
    const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    if (hasKeyId !== hasKeySecret) {
      return res.status(503).json({ message: 'Both Razorpay keys must be configured' });
    }
    const razorpay = getRazorpay();
    const order = razorpay
      ? await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `unfazed_${crypto.randomUUID()}`,
      })
      : {
        id: `demo_${crypto.randomUUID()}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
      };

    const payment = await Payment.create({
      therapist_id: req.therapist._id,
      client_id: client._id,
      session_id: session?._id,
      amount,
      platform_fee: Math.round(amount * 0.05 * 100) / 100,
      net_amount: Math.round(amount * 0.95 * 100) / 100,
      gateway_order_id: order.id,
      status: 'pending',
    });
    res.status(201).json({
      payment,
      order,
      keyId: process.env.RAZORPAY_KEY_ID || null,
      demo: !razorpay,
    });
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const {
      paymentId,
      razorpay_order_id: orderId,
      razorpay_payment_id: transactionId,
      razorpay_signature: signature,
    } = req.body;
    const payment = await Payment.findOne({
      _id: paymentId,
      therapist_id: req.therapist._id,
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'pending') {
      return res.status(409).json({ message: 'Payment is not awaiting verification' });
    }
    if (!orderId || orderId !== (payment.gateway_order_id || payment.gateway_transaction_id)) {
      return res.status(400).json({ message: 'Payment order does not match' });
    }

    const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
    const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    if (hasKeyId !== hasKeySecret) {
      return res.status(503).json({ message: 'Both Razorpay keys must be configured' });
    }
    if (hasKeyId) {
      if (!transactionId || !signature) {
        return res.status(400).json({ message: 'Razorpay payment verification data is required' });
      }
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${transactionId}`)
        .digest('hex');
      if (!signaturesMatch(expected, signature)) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    } else if (
      !String(orderId).startsWith('demo_') ||
      !String(transactionId || '').startsWith('demo_')
    ) {
      return res.status(503).json({ message: 'Configure Razorpay keys to verify live payments' });
    }

    const update = {
      status: 'paid',
      gateway_transaction_id: transactionId,
      paidAt: new Date(),
      invoiceNumber: `UF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    };
    const verifiedPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        therapist_id: req.therapist._id,
        status: 'pending',
      },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!verifiedPayment) {
      return res.status(409).json({ message: 'Payment was already processed' });
    }
    await notifications.send('payment.success', { paymentId: verifiedPayment._id });
    res.json({ payment: verifiedPayment, demo: !hasKeyId });
  } catch (error) {
    next(error);
  }
};

exports.webhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(503).json({ message: 'Razorpay webhook secret is not configured' });
    }
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', secret).update(req.rawBody || Buffer.alloc(0)).digest('hex');
    if (!signaturesMatch(expected, signature)) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const entity = req.body?.payload?.payment?.entity;
    if (!entity?.order_id) return res.status(400).json({ message: 'Payment order is missing' });
    const status = {
      'payment.captured': 'paid',
      'payment.failed': 'failed',
    }[req.body.event];
    if (!status) return res.json({ received: true });

    const update = { status };
    if (status === 'paid') {
      update.paidAt = new Date();
      update.invoiceNumber = `UF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      update.gateway_transaction_id = entity.id;
    }
    await Payment.findOneAndUpdate(
      {
        $or: [
          { gateway_order_id: entity.order_id },
          { gateway_transaction_id: entity.order_id },
        ],
        status: 'pending',
      },
      { $set: update },
      { new: true, runValidators: true },
    );
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

exports.invoice = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      therapist_id: req.therapist._id,
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const [client, therapist] = await Promise.all([
      Client.findById(payment.client_id),
      Therapist.findById(payment.therapist_id),
    ]);
    if (!client || !therapist) {
      return res.status(404).json({ message: 'Invoice details are unavailable' });
    }
    createInvoice(res, payment, client, therapist);
  } catch (error) {
    next(error);
  }
};
