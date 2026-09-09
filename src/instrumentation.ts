// src/instrumentation.ts
// Next.js server lifecycle hook to boot the server-side hourly activity monitor

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { activityScheduler } = await import('./services/activity-monitor/scheduler')
    console.log('[Instrumentation] Initializing server-side activity scheduler...')
    activityScheduler.start()
  }
}
