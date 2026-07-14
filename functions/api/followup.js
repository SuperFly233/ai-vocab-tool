import { runVercelModule } from '../_utils/vercel-adapter.js';

export async function onRequest(context) {
  return runVercelModule(() => import('../../api/followup.js'), context);
}
