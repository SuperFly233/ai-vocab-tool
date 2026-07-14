import { DEFAULT_SYSTEM_PROMPT } from './analyze.js';

export default function handler(_request, response) {
  response.status(200).json({
    hasApiUrl: Boolean(process.env.AI_API_URL),
    hasApiKey: Boolean(process.env.AI_API_KEY),
    model: process.env.AI_MODEL || '',
    adminRestricted: Boolean(process.env.ADMIN_EMAILS),
    hasIpv4Relay: Boolean(process.env.AI_IPV4_RELAY_BASE_URL || process.env.AI_RELAY_BASE_URL),
    defaultAnalyzePrompt: DEFAULT_SYSTEM_PROMPT,
  });
}
