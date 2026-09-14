// scripts/activity-worker.ts
// Standalone server-side worker for hourly activity monitoring

import 'dotenv/config'
import { activityScheduler } from '../src/services/activity-monitor/scheduler'

async function main() {
  const args = process.argv.slice(2)
  const isOnce = args.includes('--once')
  const targetId = args.find((a) => a.startsWith('--id='))?.split('=')[1]

  console.log('--- SaaS Growth Agent: Hourly Activity Monitor Worker ---')

  if (isOnce) {
    console.log(`Running single check cycle${targetId ? ` for analysis ID: ${targetId}` : ''}...`)
    const results = await activityScheduler.runMonitoringCycle(targetId)
    console.log(`Cycle finished. Processed ${results.length} projects.`)
    process.exit(0)
  } else {
    console.log('Starting continuous background monitoring (runs every 1 hour)...')
    activityScheduler.start()

    // Run first cycle immediately
    await activityScheduler.runMonitoringCycle(targetId)

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nStopping activity worker...')
      activityScheduler.stop()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      console.log('\nStopping activity worker...')
      activityScheduler.stop()
      process.exit(0)
    })
  }
}

main().catch((err) => {
  console.error('Fatal error in activity worker:', err)
  process.exit(1)
})
