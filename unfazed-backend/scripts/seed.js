require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Therapist = require('../src/models/Therapist');
const Client = require('../src/models/Client');
const Session = require('../src/models/Session');
const SessionNote = require('../src/models/SessionNote');
const Payment = require('../src/models/Payment');
const Availability = require('../src/models/Availability');
const ClientPackage = require('../src/models/ClientPackage');
const Lead = require('../src/models/Lead');
const Package = require('../src/models/Package');
const Tier = require('../src/models/SubscriptionTierConfig');

const demoEmail = 'demo@unfazed.in';
const tiers = [
  {
    name: 'starter',
    monthlyPrice: 0,
    caps: { activeClients: 20 },
    features: { analyticsAdvanced: false, soapNotes: false, packages: false, chat: true },
  },
  {
    name: 'growth',
    monthlyPrice: 1499,
    caps: { activeClients: 100 },
    features: { analyticsAdvanced: true, soapNotes: true, packages: true, chat: true },
  },
  {
    name: 'studio',
    monthlyPrice: 2999,
    caps: { activeClients: 500 },
    features: { analyticsAdvanced: true, soapNotes: true, packages: true, chat: true },
  },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Copy .env.example to .env and configure it.');
  }
  await connectDB();

  try {
    const previous = await Therapist.findOne({ email: demoEmail });
    if (previous) {
      const therapistId = previous._id;
      await Promise.all([
        Client.deleteMany({ therapist_id: therapistId }),
        Session.deleteMany({ therapist_id: therapistId }),
        SessionNote.deleteMany({ therapist_id: therapistId }),
        Payment.deleteMany({ therapist_id: therapistId }),
        Availability.deleteMany({ therapist_id: therapistId }),
        ClientPackage.deleteMany({ therapist_id: therapistId }),
        Lead.deleteMany({ therapist_id: therapistId }),
        Package.deleteMany({ therapist_id: therapistId }),
      ]);
    }

    const therapist = await Therapist.findOneAndUpdate(
      { email: demoEmail },
      {
        $set: {
          name: 'Dr. Ananya Sharma',
          email: demoEmail,
          password_hash: await bcrypt.hash('UnfazedDemo123!', 12),
          slug: 'dr-ananya-sharma',
          bio: 'A warm, evidence-informed space to understand yourself and move forward at your own pace.',
          specializations: ['Anxiety', 'Relationships', 'Stress management'],
          languages: ['English', 'Hindi'],
          location: 'Chennai, India',
          sessionRate: 1500,
          tier: 'growth',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );

    await Tier.bulkWrite(tiers.map((tier) => ({
      updateOne: {
        filter: { name: tier.name },
        update: { $set: { ...tier, active: true } },
        upsert: true,
      },
    })));

    const clients = await Client.insertMany([
      {
        therapist_id: therapist._id,
        name: 'Aarav Mehta',
        email: 'aarav@example.com',
        status: 'active',
        tags: ['Anxiety', 'Weekly'],
        consent: { accepted: true, acceptedAt: new Date() },
      },
      {
        therapist_id: therapist._id,
        name: 'Diya Rao',
        email: 'diya@example.com',
        status: 'active',
        tags: ['Relationships'],
        consent: { accepted: true, acceptedAt: new Date() },
      },
      {
        therapist_id: therapist._id,
        name: 'Ishaan Kumar',
        email: 'ishaan@example.com',
        status: 'paused',
        tags: ['Stress'],
        consent: { accepted: true, acceptedAt: new Date() },
      },
    ]);

    const now = new Date();
    await Session.insertMany([
      {
        therapist_id: therapist._id,
        client_id: clients[0]._id,
        startsAt: new Date(now.getTime() + 86_400_000),
        endsAt: new Date(now.getTime() + 86_400_000 + 50 * 60_000),
        duration: 50,
        price: 1500,
        status: 'booked',
      },
      {
        therapist_id: therapist._id,
        client_id: clients[1]._id,
        startsAt: new Date(now.getTime() + 2 * 86_400_000),
        endsAt: new Date(now.getTime() + 2 * 86_400_000 + 50 * 60_000),
        duration: 50,
        price: 1500,
        status: 'booked',
      },
      {
        therapist_id: therapist._id,
        client_id: clients[0]._id,
        startsAt: new Date(now.getTime() - 86_400_000),
        endsAt: new Date(now.getTime() - 86_400_000 + 50 * 60_000),
        duration: 50,
        price: 1500,
        status: 'completed',
      },
    ]);

    await Payment.insertMany([
      {
        therapist_id: therapist._id,
        client_id: clients[0]._id,
        amount: 1500,
        platform_fee: 75,
        net_amount: 1425,
        status: 'paid',
        paidAt: new Date(now.getTime() - 20 * 86_400_000),
        invoiceNumber: 'UF-SEED-01',
      },
      {
        therapist_id: therapist._id,
        client_id: clients[1]._id,
        amount: 1500,
        platform_fee: 75,
        net_amount: 1425,
        status: 'paid',
        paidAt: new Date(now.getTime() - 5 * 86_400_000),
        invoiceNumber: 'UF-SEED-02',
      },
    ]);

    console.log('Seed complete. Login: demo@unfazed.in / UnfazedDemo123!');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
