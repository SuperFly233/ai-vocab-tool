export default function handler(_request, response) {
  response.status(200).json({
    hasApiUrl: Boolean(process.env.AI_API_URL),
    hasApiKey: Boolean(process.env.AI_API_KEY),
    model: process.env.AI_MODEL || '',
    adminRestricted: Boolean(process.env.ADMIN_EMAILS),
  });
}
