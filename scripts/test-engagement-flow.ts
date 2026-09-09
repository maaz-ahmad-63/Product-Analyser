import { prisma } from '../src/lib/prisma'
import { extensionAuthService } from '../src/services/engagement/extension-auth.service'
import { engagementService } from '../src/services/engagement/engagement.service'
import { ownProductsService } from '../src/services/engagement/own-products.service'

async function runEndToEndVerification() {
  console.log('=== STARTING STRICT OWN-PRODUCT ENGAGEMENT E2E TEST ===')

  // 1. Fetch user and tenant
  const user = await prisma.user.findFirst({
    include: { tenantUsers: { include: { tenant: true } } },
  })

  if (!user || user.tenantUsers.length === 0) {
    throw new Error('No user or tenant found in DB')
  }

  const tenant = user.tenantUsers[0].tenant
  console.log(`✓ Active Tenant: ${tenant.name} (${tenant.id})`)

  // 2. Test Competitor Blocking (Zero Competitor Access)
  console.log('\n[TEST 1] Testing Competitor URL Blocking...')
  const competitorUrl = 'https://codecanyon.net/item/competitor-taxi-app/99999999'
  const competitorCheck = await ownProductsService.checkUrlAllowed(tenant.id, competitorUrl)
  
  if (competitorCheck.allowed) {
    throw new Error('Security violation: Competitor URL was allowed!')
  }
  console.log(`✓ Competitor check blocked as expected: allowed=${competitorCheck.allowed}, reason=${competitorCheck.reason}`)

  // Attempt sync on competitor URL -> must throw error
  let blocked = false
  try {
    await engagementService.syncComments(tenant.id, user.id, {
      product_url: competitorUrl,
      threads: [
        {
          root_comment_id: 'comp_1',
          commenter_username: 'Attacker',
          messages: [
            {
              external_comment_id: 'comp_1',
              author_type: 'customer',
              author_username: 'Attacker',
              message_text: 'Trying to scrape competitor comments',
            },
          ],
        },
      ],
    })
  } catch (err: any) {
    blocked = true
    console.log(`✓ Sync correctly rejected for unapproved product: "${err.message}"`)
  }

  if (!blocked) {
    throw new Error('Security violation: syncComments allowed an unapproved competitor URL!')
  }

  // 3. Test Adding Own Product (enters 'pending' status)
  console.log('\n[TEST 2] Registering Own Envato Product...')
  const testOwnUrl = 'https://codecanyon.net/item/rideon-taxi-complete-taxi-booking-solution/59633641'
  
  // Clean up any existing test product record
  await prisma.ownEnvatoProduct.deleteMany({
    where: { tenantId: tenant.id, productUrl: testOwnUrl },
  })

  const newOwnProduct = await ownProductsService.addOwnProduct(tenant.id, {
    productUrl: testOwnUrl,
    productName: 'RideOn Taxi – Complete Taxi Booking Solution',
    authorUsername: 'Pixelstrap',
    documentationUrl: 'https://docs.pixelstrap.com/rideon',
    supportPolicy: '6 months dedicated author support with free updates',
  })
  console.log(`✓ Registered own product: ${newOwnProduct.productName} (Status: ${newOwnProduct.verificationStatus})`)

  // Check that pending product is NOT allowed yet
  const pendingCheck = await ownProductsService.checkUrlAllowed(tenant.id, testOwnUrl)
  if (pendingCheck.allowed) {
    throw new Error('Pending unverified product was prematurely allowed!')
  }
  console.log(`✓ Pending product correctly blocked from ECA: reason=${pendingCheck.reason}`)

  // 4. Test Ownership Verification
  console.log('\n[TEST 3] Verifying Product Ownership...')
  const verifiedProduct = await ownProductsService.verifyOwnership(
    tenant.id,
    newOwnProduct.id,
    'author_claim',
    'Pixelstrap'
  )
  console.log(`✓ Product Verified! Status: ${verifiedProduct.verificationStatus}, VerifiedAt: ${verifiedProduct.verifiedAt?.toISOString()}`)

  const verifiedCheck = await ownProductsService.checkUrlAllowed(tenant.id, testOwnUrl)
  if (!verifiedCheck.allowed) {
    throw new Error('Verified product was not allowed!')
  }
  console.log(`✓ Verified product now allowed for ECA! (Product ID: ${verifiedCheck.product?.id})`)

  // 5. Test Global Pause
  console.log('\n[TEST 4] Testing Global Pause ECA Toggle...')
  await engagementService.updateSettings(tenant.id, { globalPaused: true })
  const pausedCheck = await ownProductsService.checkUrlAllowed(tenant.id, testOwnUrl)
  if (pausedCheck.allowed || pausedCheck.reason !== 'global_paused') {
    throw new Error('Global pause failed: product was allowed or wrong reason')
  }
  console.log('✓ Global pause successfully halted ECA!')

  // Resume ECA
  await engagementService.updateSettings(tenant.id, { globalPaused: false })
  const resumedCheck = await ownProductsService.checkUrlAllowed(tenant.id, testOwnUrl)
  if (!resumedCheck.allowed) {
    throw new Error('Resume ECA failed')
  }
  console.log('✓ ECA Resumed successfully!')

  // 6. Test Sync on Verified Own Product
  console.log('\n[TEST 5] Synchronizing Comments on Verified Own Product...')
  const syncResult = await engagementService.syncComments(tenant.id, user.id, {
    product_url: testOwnUrl,
    product_name: verifiedProduct.productName,
    platform: 'envato',
    threads: [
      {
        root_comment_id: 'own_thread_201',
        commenter_username: 'MarkBuyer',
        comment_url: `${testOwnUrl}#comment_own_thread_201`,
        comment_created_at: new Date().toISOString(),
        messages: [
          {
            external_comment_id: 'own_thread_201',
            author_type: 'customer',
            author_username: 'MarkBuyer',
            message_text: 'Hello author, does the backend support PostgreSQL 16 and automated daily database backups?',
            message_created_at: new Date().toISOString(),
          },
        ],
      },
    ],
  })
  console.log(`✓ Synced threads on own product: synced=${syncResult.syncedThreadsCount}, newMessages=${syncResult.newMessagesCount}`)

  // 7. Verify Thread Linked to ownProductId
  const { threads } = await engagementService.getThreads(tenant.id, { product_url: testOwnUrl })
  const ownThread = threads.find((t) => t.rootCommentId === 'own_thread_201')
  if (!ownThread || ownThread.ownProductId !== verifiedProduct.id) {
    throw new Error(`Thread was not correctly linked to ownProductId: ${ownThread?.ownProductId}`)
  }
  console.log(`✓ Thread verified and linked to ownProductId: ${ownThread.ownProductId}`)

  // 8. Test Contextual AI Reply Generation with Own Product Knowledge
  console.log('\n[TEST 6] Generating Contextual AI Reply for Own Product...')
  const draft = await engagementService.generateReplyForMessage(tenant.id, user.id, ownThread.id)
  console.log('✓ Draft successfully generated:')
  console.log(`  Classification: ${draft.classification}`)
  console.log(`  Confidence: ${draft.confidence}`)
  console.log(`  Reply: "${draft.generatedReply.slice(0, 90)}..."`)

  // 9. Test Duplicate Prevention
  const duplicateDraft = await engagementService.generateReplyForMessage(tenant.id, user.id, ownThread.id)
  if (duplicateDraft.id !== draft.id) {
    throw new Error('Duplicate prevention failed!')
  }
  console.log('✓ Duplicate draft prevented (returned existing draft)')

  // 10. Test Human Approval Workflow
  const approved = await engagementService.approveDraft(tenant.id, user.id, draft.id)
  console.log(`✓ Draft Approved: status=${approved.status}`)

  // 11. Test Insertion & Posting Workflow
  const inserted = await engagementService.markDraftInserted(tenant.id, user.id, draft.id)
  console.log(`✓ Draft Inserted: status=${inserted.status}`)

  const posted = await engagementService.markDraftPosted(tenant.id, user.id, draft.id)
  console.log(`✓ Draft Posted by Author: status=${posted.status}`)

  const updatedThread = await engagementService.getThreadById(tenant.id, ownThread.id)
  console.log(`✓ Thread status after author post: ${updatedThread?.threadStatus}`)

  console.log('\n=== ALL STRICT OWN-PRODUCT ENGAGEMENT TESTS PASSED! ===\n')
}

runEndToEndVerification()
  .catch((err) => {
    console.error('E2E TEST FAILURE:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
