const Therapist = require('../models/Therapist');
const Tier = require('../models/SubscriptionTierConfig');
const Client = require('../models/Client');

async function getTier(therapistId) {
  const therapist = await Therapist.findById(therapistId).select('tier');
  if (!therapist) return null;

  const assignedTier = await Tier.findOne({ name: therapist.tier, active: true });
  if (assignedTier) return assignedTier;

  const starterTier = await Tier.findOne({ name: 'starter', active: true });
  if (starterTier) return starterTier;

  if (await Tier.exists({})) return null;
  return new Tier({ name: 'starter' });
}

async function canAccess(therapistId, featureKey) {
  const tier = await getTier(therapistId);
  if (!tier) {
    return { allowed: false, reason: 'No active subscription tier', tier: 'unknown' };
  }

  if (featureKey === 'activeClient') {
    const count = await Client.countDocuments({
      therapist_id: therapistId,
      status: 'active',
    });
    const limit = tier.caps.activeClients;
    return {
      allowed: count < limit,
      reason: count >= limit ? 'Active-client limit reached' : null,
      tier: tier.name,
      limit,
      used: count,
    };
  }

  const value = featureKey
    .split('.')
    .reduce((current, key) => current && current[key], tier.toObject());
  return {
    allowed: Boolean(value),
    reason: value ? null : 'This feature is not included in your plan',
    tier: tier.name,
  };
}

module.exports = { canAccess, getTier };
