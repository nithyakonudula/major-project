const configuredClientUrl = process.env.CLIENT_URL;

module.exports = configuredClientUrl
  ? new URL(configuredClientUrl.includes('://') ? configuredClientUrl : `https://${configuredClientUrl}`).origin
  : 'http://localhost:5173';
