import { prisma } from '@/lib/prisma'
import { replyGeneratorService, ThreadMessageContext, ProductContext } from './reply-generator'
import { ownProductsService } from './own-products.service'

export interface ExtractedMessagePayload {
  external_comment_id: string
  parent_external_comment_id?: string | null
  author_type?: 'customer' | 'seller' | 'moderator'
  author_username: string
  message_text: string
  message_url?: string | null
  message_created_at?: string | null
  raw_metadata?: Record<string, any>
}

export interface ExtractedThreadPayload {
  root_comment_id: string
  commenter_username: string
  comment_url?: string | null
  comment_created_at?: string | null
  messages: ExtractedMessagePayload[]
}

export interface SyncCommentsPayload {
  product_url: string
  product_name?: string | null
  platform?: string
  threads: ExtractedThreadPayload[]
}

export interface GetThreadsFilter {
  status?: string // 'all' | 'open' | 'needs_reply' | 'replied' | 'ignored' | 'closed'
  product_url?: string
  search?: string
  needs_review?: boolean
  limit?: number
  offset?: number
}

export class EngagementService {
  /**
   * Retrieves or initializes default engagement settings for a tenant.
   */
  async getSettings(tenantId: string) {
    let settings = await prisma.engagementSettings.findUnique({
      where: { tenantId },
    })

    if (!settings) {
      settings = await prisma.engagementSettings.create({
        data: {
          tenantId,
          enabled: false,
          autoGenerate: true,
          autoInsert: false,
          autoPost: false,
          dailyReplyLimit: 20,
          requireApprovalForAll: true,
        },
      })
    }

    return settings
  }

  /**
   * Updates tenant engagement settings.
   */
  async updateSettings(
    tenantId: string,
    updateData: {
      enabled?: boolean
      globalPaused?: boolean
      autoGenerate?: boolean
      autoInsert?: boolean
      autoPost?: boolean
      dailyReplyLimit?: number
      requireApprovalForAll?: boolean
    }
  ) {
    return prisma.engagementSettings.upsert({
      where: { tenantId },
      update: updateData,
      create: {
        tenantId,
        enabled: updateData.enabled ?? false,
        globalPaused: updateData.globalPaused ?? false,
        autoGenerate: updateData.autoGenerate ?? true,
        autoInsert: updateData.autoInsert ?? false,
        autoPost: updateData.autoPost ?? false,
        dailyReplyLimit: updateData.dailyReplyLimit ?? 20,
        requireApprovalForAll: updateData.requireApprovalForAll ?? true,
      },
    })
  }

  /**
   * Synchronizes extracted threads from the Chrome Extension into PostgreSQL.
   * Preserves thread hierarchies, detects new messages, updates status.
   * STRICTLY RESTRICTED to verified own products.
   */
  async syncComments(tenantId: string, userId: string, payload: SyncCommentsPayload) {
    const { product_url, product_name, platform = 'envato', threads } = payload
    const settings = await this.getSettings(tenantId)

    // 1. STRICT OWN PRODUCT GUARD
    const check = await ownProductsService.checkUrlAllowed(tenantId, product_url)
    if (!check.allowed) {
      throw new Error(
        `This product is not configured as one of your verified own products (Reason: ${check.reason}). ECA is disabled on competitor and unapproved pages.`
      )
    }

    const matchedOwnProduct = check.product

    // Optional: Match existing SaaSProduct by websiteUrl if exists
    const matchedProduct = await prisma.saaSProduct.findFirst({
      where: {
        tenantId,
        websiteUrl: { contains: product_url },
      },
    })

    let syncedThreadsCount = 0
    let newMessagesCount = 0
    let draftsGeneratedCount = 0

    for (const rawThread of threads) {
      if (!rawThread.root_comment_id || !rawThread.messages || rawThread.messages.length === 0) {
        continue
      }

      // 1. Find or create root EngagementThread
      const thread = await prisma.engagementThread.upsert({
        where: {
          tenantId_platform_productUrl_rootCommentId: {
            tenantId,
            platform,
            productUrl: product_url,
            rootCommentId: rawThread.root_comment_id,
          },
        },
        update: {
          lastSyncedAt: new Date(),
          commenterUsername: rawThread.commenter_username || 'Customer',
          commentUrl: rawThread.comment_url || null,
          productName: product_name || matchedOwnProduct?.productName || undefined,
          ownProductId: matchedOwnProduct?.id || undefined,
        },
        create: {
          tenantId,
          platform,
          productUrl: product_url,
          productName: product_name || matchedOwnProduct?.productName || 'Envato Product',
          productId: matchedProduct?.id || null,
          ownProductId: matchedOwnProduct?.id || null,
          rootCommentId: rawThread.root_comment_id,
          commenterUsername: rawThread.commenter_username || 'Customer',
          commentUrl: rawThread.comment_url || null,
          threadStatus: 'open',
          lastCommentAt: rawThread.comment_created_at ? new Date(rawThread.comment_created_at) : new Date(),
        },
      })
      syncedThreadsCount++

      // 2. Insert messages
      let latestMessage: any = null

      for (const msg of rawThread.messages) {
        const existingMsg = await prisma.engagementThreadMessage.findUnique({
          where: {
            threadId_externalCommentId: {
              threadId: thread.id,
              externalCommentId: msg.external_comment_id,
            },
          },
        })

        if (!existingMsg) {
          const createdMsg = await prisma.engagementThreadMessage.create({
            data: {
              threadId: thread.id,
              externalCommentId: msg.external_comment_id,
              parentExternalCommentId: msg.parent_external_comment_id || null,
              authorType: msg.author_type || 'customer',
              authorUsername: msg.author_username,
              messageText: msg.message_text,
              messageUrl: msg.message_url || null,
              messageCreatedAt: msg.message_created_at ? new Date(msg.message_created_at) : new Date(),
              rawMetadata: msg.raw_metadata || {},
            },
          })
          newMessagesCount++
          latestMessage = createdMsg

          // Emit comment detected event
          await prisma.engagementReplyEvent.create({
            data: {
              tenantId,
              threadId: thread.id,
              eventType: 'comment_detected',
              eventData: {
                messageId: createdMsg.id,
                author: msg.author_username,
                authorType: msg.author_type,
              },
            },
          })
        } else {
          latestMessage = existingMsg
        }
      }

      // 3. Determine if thread needs response
      const allMessages = await prisma.engagementThreadMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'asc' },
      })

      const lastMsg = allMessages[allMessages.length - 1]
      const needsResponse = lastMsg && lastMsg.authorType === 'customer'

      if (needsResponse && thread.threadStatus !== 'ignored' && thread.threadStatus !== 'closed') {
        await prisma.engagementThread.update({
          where: { id: thread.id },
          data: {
            threadStatus: 'needs_reply',
            lastCommentAt: lastMsg.createdAt,
          },
        })

        // 4. Auto-generate reply draft if enabled
        if (settings.autoGenerate) {
          const existingDraft = await prisma.engagementReplyDraft.findFirst({
            where: {
              tenantId,
              threadId: thread.id,
              targetMessageId: lastMsg.id,
              status: { notIn: ['rejected', 'failed'] },
            },
          })

          if (!existingDraft) {
            try {
              await this.generateReplyForMessage(tenantId, userId, thread.id, lastMsg.id)
              draftsGeneratedCount++
            } catch (err) {
              console.error(`Auto-generate draft error for thread ${thread.id}:`, err)
            }
          }
        }
      } else if (lastMsg && lastMsg.authorType === 'seller') {
        await prisma.engagementThread.update({
          where: { id: thread.id },
          data: { threadStatus: 'replied' },
        })
      }

      // Record audit event
      await prisma.engagementReplyEvent.create({
        data: {
          tenantId,
          threadId: thread.id,
          eventType: 'thread_synced',
          eventData: {
            messagesCount: allMessages.length,
            rootCommentId: rawThread.root_comment_id,
          },
        },
      })
    }

    return {
      syncedThreadsCount,
      newMessagesCount,
      draftsGeneratedCount,
    }
  }

  /**
   * Retrieves threads with status, product, search filtering.
   */
  async getThreads(tenantId: string, filter: GetThreadsFilter = {}) {
    const { status = 'all', product_url, search, needs_review, limit = 50, offset = 0 } = filter

    const where: any = { tenantId }

    if (status !== 'all') {
      where.threadStatus = status
    }

    if (product_url) {
      where.productUrl = product_url
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { commenterUsername: { contains: q, mode: 'insensitive' } },
        { productName: { contains: q, mode: 'insensitive' } },
        {
          messages: {
            some: {
              OR: [
                { authorUsername: { contains: q, mode: 'insensitive' } },
                { messageText: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ]
    }

    if (needs_review) {
      where.drafts = {
        some: {
          status: 'needs_review',
        },
      }
    }

    const [threads, totalCount] = await Promise.all([
      prisma.engagementThread.findMany({
        where,
        orderBy: { lastCommentAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          drafts: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
      prisma.engagementThread.count({ where }),
    ])

    return { threads, totalCount }
  }

  /**
   * Retrieves a single thread by ID with all messages and drafts.
   */
  async getThreadById(tenantId: string, threadId: string) {
    return prisma.engagementThread.findFirst({
      where: { id: threadId, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        drafts: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
  }

  /**
   * Generates a context-aware AI reply draft for a thread or specific message.
   * Enforces duplicate prevention and daily reply limits.
   */
  async generateReplyForMessage(
    tenantId: string,
    userId: string,
    threadId: string,
    targetMessageId?: string
  ) {
    const thread = await prisma.engagementThread.findFirst({
      where: { id: threadId, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        product: true,
        ownProduct: true,
      },
    })

    if (!thread || thread.messages.length === 0) {
      throw new Error('Thread not found or contains no messages.')
    }

    // Determine target message: either specified, or last customer message
    let targetMsg = targetMessageId
      ? thread.messages.find((m) => m.id === targetMessageId)
      : null

    if (!targetMsg) {
      const customerMsgs = thread.messages.filter((m) => m.authorType === 'customer')
      targetMsg = customerMsgs[customerMsgs.length - 1] || thread.messages[thread.messages.length - 1]
    }

    if (!targetMsg) {
      throw new Error('No target message found to reply to.')
    }

    // DUPLICATE CHECK: Prevent duplicate active drafts for this target message
    const existingDraft = await prisma.engagementReplyDraft.findFirst({
      where: {
        tenantId,
        threadId: thread.id,
        targetMessageId: targetMsg.id,
        status: { in: ['draft', 'needs_review', 'approved', 'inserted'] },
      },
    })

    if (existingDraft) {
      await prisma.engagementReplyEvent.create({
        data: {
          tenantId,
          threadId: thread.id,
          draftId: existingDraft.id,
          eventType: 'duplicate_prevented',
          eventData: { reason: 'Active draft already exists for target message' },
        },
      })
      return existingDraft
    }

    // Check daily limit
    const settings = await this.getSettings(tenantId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dailyDraftsCount = await prisma.engagementReplyDraft.count({
      where: {
        tenantId,
        createdAt: { gte: today },
      },
    })

    if (dailyDraftsCount >= settings.dailyReplyLimit) {
      throw new Error(`Daily reply limit of ${settings.dailyReplyLimit} reached for this account.`)
    }

    // Assemble product knowledge from OwnEnvatoProduct, SaaSProduct, or ComparisonAnalysis
    let features: string[] = []
    let description = thread.ownProduct?.productName || thread.product?.description || null
    let docsLink: string | null = thread.ownProduct?.documentationUrl || null
    let supportPolicy: string = thread.ownProduct?.supportPolicy || 'Standard 6-month Envato author support'

    if (thread.product) {
      const dbFeatures = await prisma.feature.findMany({
        where: { productId: thread.product.id },
        select: { name: true },
      })
      features = dbFeatures.map((f) => f.name)
    }

    // Fallback: search ComparisonAnalysis if product URL matches
    if (features.length === 0) {
      const analysis = await prisma.comparisonAnalysis.findFirst({
        where: {
          myUrl: { contains: thread.productUrl },
        },
        select: { myProduct: true },
      })
      if (analysis?.myProduct && typeof analysis.myProduct === 'object') {
        const myProd = analysis.myProduct as any
        features = myProd.features || []
        description = description || myProd.description || null
        docsLink = docsLink || myProd.docsLink || null
      }
    }

    const productContext: ProductContext = {
      productName: thread.ownProduct?.productName || thread.productName || thread.product?.name || 'Our Envato Product',
      productUrl: thread.productUrl,
      description,
      features,
      docsLink,
      supportPolicy,
    }

    const threadHistory: ThreadMessageContext[] = thread.messages.map((m) => ({
      authorType: m.authorType as any,
      authorUsername: m.authorUsername,
      messageText: m.messageText,
      messageCreatedAt: m.messageCreatedAt?.toISOString(),
    }))

    // Generate AI Reply
    const generated = await replyGeneratorService.generateReply(
      targetMsg.messageText,
      targetMsg.authorUsername,
      threadHistory,
      productContext
    )

    // Save draft
    const draft = await prisma.engagementReplyDraft.create({
      data: {
        tenantId,
        threadId: thread.id,
        targetMessageId: targetMsg.id,
        generatedReply: generated.reply,
        classification: generated.classification,
        confidence: generated.confidence,
        requiresHumanReview: generated.requires_human_review,
        reason: generated.reason,
        status: 'needs_review',
      },
    })

    // Emit event
    await prisma.engagementReplyEvent.create({
      data: {
        tenantId,
        threadId: thread.id,
        draftId: draft.id,
        eventType: 'reply_generated',
        eventData: {
          classification: generated.classification,
          confidence: generated.confidence,
        },
      },
    })

    return draft
  }

  /**
   * Approves a reply draft.
   */
  async approveDraft(tenantId: string, userId: string, draftId: string) {
    const draft = await prisma.engagementReplyDraft.findFirst({
      where: { id: draftId, tenantId },
    })
    if (!draft) throw new Error('Draft not found')

    const updated = await prisma.engagementReplyDraft.update({
      where: { id: draftId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
    })

    await prisma.engagementReplyEvent.create({
      data: {
        tenantId,
        threadId: draft.threadId,
        draftId: draft.id,
        eventType: 'reply_approved',
        eventData: { userId },
      },
    })

    return updated
  }

  /**
   * Rejects a reply draft with a reason.
   */
  async rejectDraft(tenantId: string, userId: string, draftId: string, reason?: string) {
    const draft = await prisma.engagementReplyDraft.findFirst({
      where: { id: draftId, tenantId },
    })
    if (!draft) throw new Error('Draft not found')

    const updated = await prisma.engagementReplyDraft.update({
      where: { id: draftId },
      data: {
        status: 'rejected',
        rejectionReason: reason || 'Rejected by user',
      },
    })

    await prisma.engagementReplyEvent.create({
      data: {
        tenantId,
        threadId: draft.threadId,
        draftId: draft.id,
        eventType: 'reply_rejected',
        eventData: { reason, userId },
      },
    })

    return updated
  }

  /**
   * Records that an approved reply was inserted into the Envato reply box.
   */
  async markDraftInserted(tenantId: string, userId: string, draftId: string) {
    const draft = await prisma.engagementReplyDraft.findFirst({
      where: { id: draftId, tenantId },
    })
    if (!draft) throw new Error('Draft not found')

    const updated = await prisma.engagementReplyDraft.update({
      where: { id: draftId },
      data: {
        status: 'inserted',
        insertedAt: new Date(),
      },
    })

    await prisma.engagementReplyEvent.create({
      data: {
        tenantId,
        threadId: draft.threadId,
        draftId: draft.id,
        eventType: 'reply_inserted',
        eventData: { userId },
      },
    })

    return updated
  }

  /**
   * Records that the reply was successfully posted to the Envato marketplace.
   */
  async markDraftPosted(tenantId: string, userId: string, draftId: string) {
    const draft = await prisma.engagementReplyDraft.findFirst({
      where: { id: draftId, tenantId },
    })
    if (!draft) throw new Error('Draft not found')

    const updated = await prisma.engagementReplyDraft.update({
      where: { id: draftId },
      data: {
        status: 'posted',
        postedAt: new Date(),
      },
    })

    // Update parent thread to replied
    await prisma.engagementThread.update({
      where: { id: draft.threadId },
      data: { threadStatus: 'replied' },
    })

    await prisma.engagementReplyEvent.create({
      data: {
        tenantId,
        threadId: draft.threadId,
        draftId: draft.id,
        eventType: 'reply_posted',
        eventData: { userId },
      },
    })

    return updated
  }

  /**
   * Retrieves reply drafts for review with thread context.
   */
  async getDrafts(
    tenantId: string,
    filter: { status?: string; limit?: number; offset?: number } = {}
  ) {
    const { status, limit = 50, offset = 0 } = filter
    const where: any = { tenantId }
    if (status && status !== 'all') {
      where.status = status
    }

    return prisma.engagementReplyDraft.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        thread: {
          select: {
            productName: true,
            productUrl: true,
            commenterUsername: true,
            commentUrl: true,
          },
        },
        targetMessage: {
          select: {
            authorUsername: true,
            messageText: true,
            messageCreatedAt: true,
          },
        },
      },
    })
  }

  /**
   * Retrieves a single draft by ID.
   */
  async getDraftById(tenantId: string, draftId: string) {
    return prisma.engagementReplyDraft.findFirst({
      where: { id: draftId, tenantId },
      include: {
        thread: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
        targetMessage: true,
      },
    })
  }
}

export const engagementService = new EngagementService()
