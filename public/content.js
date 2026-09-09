/**
 * Envato Comment Assistant - Content Script
 * Extracts comments and replies, injects AI draft controls, safely inserts responses.
 */

(() => {
  // Prevent multiple executions on the same frame
  if (window.__ECA_CONTENT_SCRIPT_LOADED__) return
  window.__ECA_CONTENT_SCRIPT_LOADED__ = true

  let activeThreads = new Map()
  let isSyncing = false
  let lastSyncTime = 0

  // Utility to generate a deterministic hash when external comment ID is missing
  function simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // Get current Product URL and Title
  function getProductDetails() {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')
    const productUrl = (canonical || window.location.href).split('?')[0].split('#')[0]

    let productTitle = ''
    const h1 = document.querySelector('h1.item-header__title, h1[data-test-id="item-title"], h1')
    if (h1) {
      productTitle = h1.textContent.trim()
    } else {
      productTitle = document.title.split(' - ')[0] || 'Envato Product'
    }

    return { productUrl, productTitle }
  }

  // Detect author type
  function getAuthorType(el) {
    const text = (el.innerText || el.textContent || '').toLowerCase()
    const classList = el.className ? el.className.toLowerCase() : ''
    if (
      classList.includes('seller') ||
      classList.includes('author') ||
      el.querySelector('.badge--author, .author-badge, [title*="Author"]')
    ) {
      return 'seller'
    }
    if (classList.includes('moderator') || el.querySelector('.badge--moderator')) {
      return 'moderator'
    }
    return 'customer'
  }

  // Parse a single comment element
  function parseCommentElement(commentEl, isRoot = false) {
    let id = commentEl.getAttribute('data-comment-id') ||
             commentEl.getAttribute('id') ||
             commentEl.querySelector('[data-comment-id]')?.getAttribute('data-comment-id')

    if (id && id.startsWith('comment_')) {
      id = id.replace('comment_', '')
    }

    // Author
    const authorEl = commentEl.querySelector(
      '.comment__author, a[href*="/user/"], .user-info__username, .author, strong'
    )
    const authorUsername = authorEl ? authorEl.textContent.trim() : 'Customer'
    const authorType = getAuthorType(commentEl)

    // Body
    const bodyEl = commentEl.querySelector(
      '.comment__body, .comment-body, .comment__text, .comment-text, p'
    )
    const messageText = bodyEl ? bodyEl.textContent.trim() : ''

    // Date
    const timeEl = commentEl.querySelector('time, .comment__date, .date, span[title]')
    const messageCreatedAt = timeEl?.getAttribute('datetime') ||
                             timeEl?.getAttribute('title') ||
                             timeEl?.textContent?.trim() ||
                             new Date().toISOString()

    // Fallback deterministic ID
    if (!id || id.trim() === '') {
      id = `gen_${simpleHash(authorUsername + '_' + messageCreatedAt + '_' + messageText.slice(0, 30))}`
    }

    return {
      external_comment_id: String(id),
      author_type: authorType,
      author_username: authorUsername,
      message_text: messageText,
      message_created_at: messageCreatedAt,
    }
  }

  // Extract all threads from the current page
  function extractThreads() {
    const { productUrl } = getProductDetails()
    const threads = []

    // Selector patterns matching ThemeForest, CodeCanyon, and the Mock Test Page
    const rootCommentSelectors = [
      'li.comment:not(.reply):not(.child)',
      'li[id^="comment_"]:not(.reply)',
      '.comment-thread',
      '.comment__container--root',
      '.item-comment--root',
      '[data-root-comment="true"]',
    ]

    let rootElements = document.querySelectorAll(rootCommentSelectors.join(', '))

    // Fallback: If specific root selectors find nothing, look for all comment items
    if (rootElements.length === 0) {
      rootElements = document.querySelectorAll('.comment-item, li.comment')
    }

    rootElements.forEach((rootEl) => {
      const rootMsg = parseCommentElement(rootEl, true)
      if (!rootMsg.message_text) return

      const messages = [rootMsg]

      // Find replies inside this root element
      const replyElements = rootEl.querySelectorAll(
        'li.reply, li.child, .comment__reply, .comment-reply, .replies .comment, [data-is-reply="true"]'
      )

      replyElements.forEach((replyEl) => {
        const replyMsg = parseCommentElement(replyEl, false)
        if (replyMsg.message_text && replyMsg.external_comment_id !== rootMsg.external_comment_id) {
          replyMsg.parent_external_comment_id = rootMsg.external_comment_id
          messages.push(replyMsg)
        }
      })

      threads.push({
        root_comment_id: rootMsg.external_comment_id,
        commenter_username: rootMsg.author_username,
        comment_url: `${productUrl}#comment_${rootMsg.external_comment_id}`,
        comment_created_at: rootMsg.message_created_at,
        messages,
      })
    })

    return threads
  }

  // Injects AI reply bar and preview UI into a thread element
  function injectThreadControls(threadEl, threadData) {
    if (threadEl.getAttribute('data-eca-injected') === 'true') return
    threadEl.setAttribute('data-eca-injected', 'true')

    const bar = document.createElement('div')
    bar.className = 'eca-action-bar'
    bar.setAttribute('data-eca-root-id', threadData.root_comment_id)

    bar.innerHTML = `
      <div class="eca-bar-header">
        <div class="eca-brand-badge">
          <span class="eca-dot"></span>
          <strong>ECA Assistant</strong>
        </div>
        <div class="eca-bar-actions">
          <button type="button" class="eca-btn eca-btn-primary eca-btn-sm eca-gen-btn">
            ✨ Generate AI Reply
          </button>
        </div>
      </div>
      <div class="eca-draft-container" style="display: none;"></div>
    `

    // Find insertion point (preferably before or inside the reply form, or at bottom of comment)
    const replyContainer = threadEl.querySelector('.comment__reply, .comment-form, .replies, .reply-box')
    if (replyContainer) {
      replyContainer.parentNode.insertBefore(bar, replyContainer)
    } else {
      threadEl.appendChild(bar)
    }

    const genBtn = bar.querySelector('.eca-gen-btn')
    const draftContainer = bar.querySelector('.eca-draft-container')

    genBtn.addEventListener('click', async () => {
      genBtn.disabled = true
      genBtn.innerHTML = `⏳ Analyzing thread...`

      // 1. Sync thread first to ensure it's in DB
      const { productUrl, productTitle } = getProductDetails()
      const syncRes = await sendMessageAsync({
        type: 'SYNC_COMMENTS',
        payload: {
          product_url: productUrl,
          product_name: productTitle,
          platform: 'envato',
          threads: [threadData],
        },
      })

      if (!syncRes?.success) {
        genBtn.disabled = false
        genBtn.innerHTML = `✨ Generate AI Reply`
        alert(`Failed to sync thread: ${syncRes?.error || 'Please connect extension in popup.'}`)
        return
      }

      // 2. Fetch thread ID from backend or query
      const threadsRes = await sendMessageAsync({
        type: 'GET_THREADS',
        payload: { product_url: productUrl, status: 'all' },
      })

      const matchedThread = threadsRes?.data?.threads?.find(
        (t) => t.rootCommentId === threadData.root_comment_id
      )

      if (!matchedThread) {
        genBtn.disabled = false
        genBtn.innerHTML = `✨ Generate AI Reply`
        alert('Could not find synced thread. Please check extension connection.')
        return
      }

      // 3. Trigger reply generation
      const replyRes = await sendMessageAsync({
        type: 'GENERATE_REPLY',
        payload: { threadId: matchedThread.id },
      })

      genBtn.disabled = false
      genBtn.innerHTML = `✨ Re-generate AI Reply`

      if (replyRes?.success && replyRes.data?.draft) {
        renderDraftPreview(draftContainer, replyRes.data.draft, threadEl)
      } else {
        alert(`Reply generation failed: ${replyRes?.error || 'Unknown error'}`)
      }
    })
  }

  // Render Draft Preview with Approval & Safe Insertion
  function renderDraftPreview(container, draft, threadEl) {
    container.style.display = 'block'
    const classificationBadgeClass = getBadgeColorClass(draft.classification)

    container.innerHTML = `
      <div class="eca-draft-box">
        <div class="eca-draft-header">
          <span class="eca-chip ${classificationBadgeClass}">
            ${(draft.classification || 'general').toUpperCase()}
          </span>
          <span class="eca-confidence">
            ${Math.round((draft.confidence || 0.85) * 100)}% Match
          </span>
          <span class="eca-status-pill eca-status-${draft.status}">
            ${draft.status.replace('_', ' ')}
          </span>
        </div>

        <div class="eca-draft-content" contenteditable="true">
          ${escapeHtml(draft.generatedReply)}
        </div>

        <div class="eca-warning-banner">
          <span class="eca-warn-icon">⚠️</span>
          <span><strong>Human Review Required:</strong> Auto-posting is disabled. Verify accuracy, then click "Insert into Reply" and manually click Envato's "Post" button.</span>
        </div>

        <div class="eca-draft-buttons">
          ${
            draft.status === 'needs_review' || draft.status === 'draft'
              ? `<button type="button" class="eca-btn eca-btn-success eca-btn-sm eca-approve-btn">
                  ✓ Approve Draft
                </button>`
              : ''
          }
          <button type="button" class="eca-btn eca-btn-primary eca-btn-sm eca-insert-btn">
            📝 Insert into Reply Box
          </button>
          <button type="button" class="eca-btn eca-btn-outline eca-btn-sm eca-reject-btn">
            ✕ Dismiss
          </button>
        </div>
      </div>
    `

    const approveBtn = container.querySelector('.eca-approve-btn')
    const insertBtn = container.querySelector('.eca-insert-btn')
    const rejectBtn = container.querySelector('.eca-reject-btn')
    const editableReply = container.querySelector('.eca-draft-content')

    if (approveBtn) {
      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true
        approveBtn.textContent = 'Approving...'
        const res = await sendMessageAsync({
          type: 'APPROVE_REPLY',
          payload: { draftId: draft.id },
        })
        if (res?.success) {
          approveBtn.remove()
          const statusPill = container.querySelector('.eca-status-pill')
          if (statusPill) {
            statusPill.className = 'eca-status-pill eca-status-approved'
            statusPill.textContent = 'approved'
          }
        } else {
          approveBtn.disabled = false
          approveBtn.textContent = '✓ Approve Draft'
          alert(`Approval failed: ${res?.error}`)
        }
      })
    }

    insertBtn.addEventListener('click', async () => {
      const textToInsert = editableReply.innerText.trim()
      const inserted = insertTextIntoReplyBox(threadEl, textToInsert)

      if (inserted) {
        insertBtn.textContent = '✓ Inserted!'
        insertBtn.classList.add('eca-btn-success')

        // Mark inserted in backend
        await sendMessageAsync({
          type: 'MARK_INSERTED',
          payload: { draftId: draft.id },
        })

        // Listen for when author manually clicks Post button
        monitorEnvatoPostSubmission(threadEl, draft.id)
      } else {
        alert('Could not locate the reply box for this thread. Please click Envato\'s "Reply" button first and try again.')
      }
    })

    rejectBtn.addEventListener('click', async () => {
      const res = await sendMessageAsync({
        type: 'REJECT_REPLY',
        payload: { draftId: draft.id, reason: 'Dismissed by user' },
      })
      if (res?.success) {
        container.style.display = 'none'
      }
    })
  }

  // Safe Insertion into specific thread reply textarea
  function insertTextIntoReplyBox(threadEl, text) {
    // 1. Look for a reply toggle button if form is hidden
    const replyToggle = threadEl.querySelector(
      'button.reply, a.reply, [data-reply-button], .js-reply-button, a[href*="reply"]'
    )
    if (replyToggle && !threadEl.querySelector('textarea:visible, textarea')) {
      replyToggle.click()
    }

    // 2. Find textarea in thread or closest reply form
    const textarea = threadEl.querySelector(
      'textarea[name="comment[body]"], textarea[name="body"], textarea.comment-form__body, textarea'
    ) || document.querySelector('#comment_body, textarea[name="comment[body]"]')

    if (!textarea) return false

    // Set value
    textarea.focus()
    textarea.value = text

    // Dispatch input & change events for frameworks like React/Vue/vanilla
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))

    // Smooth scroll to textarea
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Highlight briefly
    textarea.classList.add('eca-highlight-textarea')
    setTimeout(() => textarea.classList.remove('eca-highlight-textarea'), 2500)

    return true
  }

  // Monitor when the author clicks Envato's submit/post button
  function monitorEnvatoPostSubmission(threadEl, draftId) {
    const postButton = threadEl.querySelector(
      'button[type="submit"], input[type="submit"], button.btn-post, .js-comment-submit'
    ) || document.querySelector('button[type="submit"], input[type="submit"]')

    if (postButton && !postButton.hasAttribute('data-eca-monitored')) {
      postButton.setAttribute('data-eca-monitored', 'true')
      postButton.addEventListener('click', () => {
        setTimeout(() => {
          sendMessageAsync({
            type: 'MARK_POSTED',
            payload: { draftId },
          })
        }, 1500)
      })
    }
  }

  // Helper colors for classification badge
  function getBadgeColorClass(classification) {
    switch (classification) {
      case 'appreciation': return 'eca-chip-green'
      case 'pre-sale': return 'eca-chip-blue'
      case 'feature request': return 'eca-chip-purple'
      case 'technical question':
      case 'compatibility': return 'eca-chip-indigo'
      case 'installation problem':
      case 'bug report': return 'eca-chip-amber'
      case 'complaint':
      case 'refund request': return 'eca-chip-red'
      case 'spam': return 'eca-chip-gray'
      default: return 'eca-chip-slate'
    }
  }

  function escapeHtml(str) {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // Promise wrapper for chrome.runtime.sendMessage (with direct web fallback)
  function sendMessageAsync(msg) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage(msg, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('sendMessageAsync lastError:', chrome.runtime.lastError)
              resolve({ success: false, error: chrome.runtime.lastError.message })
            } else {
              resolve(response)
            }
          })
        } else {
          // Direct web fallback when testing without chrome extension context
          if (msg.type === 'DRAFT_QUERY') {
            fetch('/api/engagement/queries/draft', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg.payload),
            })
              .then((r) => r.json())
              .then(resolve)
              .catch((err) => resolve({ success: false, error: err.message }))
          } else {
            resolve({ success: false, error: 'chrome.runtime is not available' })
          }
        }
      } catch (err) {
        resolve({ success: false, error: err.message })
      }
    })
  }

  // Main scanner routine
  function scanAndInject() {
    const threads = extractThreads()
    if (!threads || threads.length === 0) return

    const rootCommentSelectors = [
      'li.comment:not(.reply):not(.child)',
      'li[id^="comment_"]:not(.reply)',
      '.comment-thread',
      '.comment__container--root',
      '.item-comment--root',
      '[data-root-comment="true"]',
      '.comment-item',
    ]

    const rootElements = document.querySelectorAll(rootCommentSelectors.join(', '))

    rootElements.forEach((el, index) => {
      const threadData = threads[index] || threads.find(t => {
        const id = el.getAttribute('data-comment-id') || el.getAttribute('id')
        return id && id.includes(t.root_comment_id)
      })

      if (threadData) {
        injectThreadControls(el, threadData)
      }
    })
  }

  // Check if current page is an item discussion/product page
  function isItemPage() {
    const href = window.location.href.toLowerCase()
    return (
      href.includes('codecanyon.net') ||
      href.includes('themeforest.net') ||
      href.includes('test-envato-page.html') ||
      href.includes('localhost') ||
      href.includes('127.0.0.1')
    )
  }

  // Inject a clear, non-intrusive status banner
  function showStatusBanner(type, message, details) {
    const existing = document.getElementById('eca-status-notification')
    if (existing) existing.remove()

    const banner = document.createElement('div')
    banner.id = 'eca-status-notification'
    banner.className = `eca-status-banner eca-status-${type}`

    banner.innerHTML = `
      <div class="eca-banner-content">
        <span class="eca-banner-icon">${type === 'active' ? '🛡️' : '⚠️'}</span>
        <div class="eca-banner-text">
          <strong>${message}</strong>
          ${details ? `<span class="eca-banner-sub">${details}</span>` : ''}
        </div>
      </div>
      <button type="button" class="eca-banner-close" aria-label="Dismiss">✕</button>
    `

    banner.querySelector('.eca-banner-close')?.addEventListener('click', () => {
      banner.remove()
    })

    const mainContainer = document.querySelector(
      'main, #content, .content-s, .page-container, #comments, .comments, .item-discussion'
    )
    if (mainContainer) {
      mainContainer.insertBefore(banner, mainContainer.firstChild)
    } else if (document.body) {
      document.body.insertBefore(banner, document.body.firstChild)
    }
  }

  // Auto-sync visible comments periodically or on load
  async function autoSync() {
    const now = Date.now()
    if (now - lastSyncTime < 15000) return // Throttle auto-sync to every 15s
    lastSyncTime = now

    const threads = extractThreads()
    if (threads.length === 0) return

    const { productUrl, productTitle } = getProductDetails()
    await sendMessageAsync({
      type: 'SYNC_COMMENTS',
      payload: {
        product_url: productUrl,
        product_name: productTitle,
        platform: 'envato',
        threads,
      },
    })
  }

  // Local smart query generator fallback
  function generateLocalQuery(rawQuery, productTitle, tone = 'courteous', category = null) {
    const qLower = (rawQuery || '').toLowerCase().trim()
    let cat = category
    if (!cat) {
      if (/install|setup|document|guide|manual|video|cpanel|vps|server/i.test(qLower)) cat = 'installation'
      else if (/flutter|laravel|php|version|compatib|dart/i.test(qLower)) cat = 'compatibility'
      else if (/license|extended|regular|source|code/i.test(qLower)) cat = 'license'
      else if (/demo|preview|test|login|credential|admin/i.test(qLower)) cat = 'demo'
      else if (/custom|feature|add|integrat|payment|gateway|sms|otp|whatsapp/i.test(qLower)) cat = 'features'
      else if (/server|hosting|shared|vps|requirement/i.test(qLower)) cat = 'server'
      else cat = 'general'
    }

    switch (cat) {
      case 'installation':
        if (tone === 'technical') {
          return `Hello author,\n\nCould you please confirm if full step-by-step installation documentation is included for both the Flutter mobile app and the Laravel admin panel?\n- Server prerequisites & recommended PHP extensions\n- Database setup & seeders guide\n- Flutter build & Firebase configuration\n\nThank you!`
        } else if (tone === 'concise') {
          return `Hello author, is detailed step-by-step installation documentation included for both the Flutter app and Laravel admin panel? Thank you!`
        }
        return `Hello author,\n\nCould you please clarify if comprehensive step-by-step installation and setup documentation is provided with the package? Specifically, does the documentation guide both the Flutter mobile application setup and the Laravel admin panel configuration?\n\nAlso, do you offer basic installation guidance or video tutorials if needed?\n\nThank you in advance!`

      case 'compatibility':
        if (tone === 'technical') {
          return `Hello author,\n\nCould you please specify the exact supported versions:\n- Flutter SDK & Dart version\n- Laravel framework & PHP version\n- Compatibility with Android 14 and iOS 17+\n\nAre all packages upgraded to null safety? Thank you!`
        } else if (tone === 'concise') {
          return `Hello author, what are the exact versions of Flutter, Dart, and Laravel/PHP supported in the latest release? Thank you!`
        }
        return `Hello author,\n\nCould you please share which versions of Flutter and Laravel/PHP are supported in the current release? Is it fully tested and compatible with Flutter 3.x and the latest Android/iOS versions?\n\nThank you for your time!`

      case 'license':
        return `Hello author,\n\nBefore purchasing, could you please confirm if the license grants access to the complete uncompiled source code for customization and branding? Can we freely modify the design and integrate our own APIs?\n\nThank you!`

      case 'demo':
        return `Hello author,\n\nCould you please share the live demo link and test credentials for both the customer mobile app (or APK) and the Laravel admin panel? We would like to test the complete workflow before purchasing.\n\nThank you!`

      case 'server':
        return `Hello author,\n\nCould you please confirm the minimum server requirements (PHP version, MySQL, required extensions, shared vs VPS hosting compatibility) to run the Laravel admin panel smoothly? Thank you!`

      case 'custom':
        return `Hello author,\n\nWe are interested in purchasing this product and would like to know if your team offers custom feature development or installation services? What is the best way to contact you for custom requirements? Thank you!`

      default:
        if (rawQuery && rawQuery.trim().length > 3) {
          const trimmed = rawQuery.trim()
          const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
          const formatted = cap.endsWith('?') ? cap : `${cap}?`
          return `Hello author,\n\nI am interested in ${productTitle} and have a question before purchasing:\n\n${formatted}\n\nLooking forward to your response, thank you!`
        }
        return `Hello author,\n\nCould you please clarify if step-by-step setup documentation and support are provided with ${productTitle}? Thank you!`
    }
  }

  // Find comment textarea anywhere on page
  function findCommentTextarea() {
    const specific = document.querySelector([
      '#comment_body',
      'textarea[name="comment[body]"]',
      'textarea[name="body"]',
      'textarea[name="comment"]',
      'textarea[placeholder*="comment" i]',
      'textarea[placeholder*="author" i]',
      'textarea[placeholder*="leave" i]',
      '#add-a-comment textarea',
      '.comment-form--item textarea',
      'form[action*="comment"] textarea',
      '.comment-form textarea',
      '.comments textarea',
      '.comments__form textarea',
      '#comments textarea'
    ].join(', '))

    if (specific) return specific

    const all = Array.from(document.querySelectorAll('textarea'))
    if (all.length > 0) {
      const nearSubmit = all.find(t => {
        const p = t.closest('form, div, section')
        return p && /post comment|submit/i.test(p.innerText || '')
      })
      return nearSubmit || all[all.length - 1]
    }
    return null
  }

  // Detect and inject ECA Query Assistant for the main "Add a comment" form
  function injectNewCommentAssistant() {
    if (document.getElementById('eca-query-assistant-box')) return

    const textarea = findCommentTextarea()
    if (!textarea) {
      return
    }

    console.log('[ECA] Found comment textarea, injecting Query Assistant bar:', textarea)
    const { productTitle, productUrl } = getProductDetails()
    let currentTone = 'courteous'
    let currentCategory = null

    // Create Assistant Bar
    const box = document.createElement('div')
    box.id = 'eca-query-assistant-box'
    box.className = 'eca-query-box'

    box.innerHTML = `
      <div class="eca-query-header">
        <div class="eca-brand-badge">
          <span class="eca-dot-purple"></span>
          <strong>✨ ECA Query Assistant</strong>
          <span class="eca-badge-sub">Pre-Sale & Technical Questions</span>
        </div>
        <div class="eca-query-actions">
          <button type="button" class="eca-btn eca-btn-primary eca-btn-sm eca-polish-query-btn" title="Enhance current draft or generate query">
            ✨ Polish / Ask Query
          </button>
          <button type="button" class="eca-btn eca-btn-outline eca-btn-sm eca-templates-toggle-btn">
            📋 Templates ▾
          </button>
        </div>
      </div>

      <!-- Quick Templates Tray -->
      <div class="eca-templates-tray" style="display: none;">
        <div class="eca-tray-title">Select Pre-Sale Inquiry Template:</div>
        <div class="eca-template-chips">
          <button type="button" class="eca-template-chip" data-cat="installation">📦 Installation & Setup Docs</button>
          <button type="button" class="eca-template-chip" data-cat="compatibility">🔄 Flutter & Laravel Version</button>
          <button type="button" class="eca-template-chip" data-cat="license">🔑 100% Source Code & License</button>
          <button type="button" class="eca-template-chip" data-cat="demo">🌐 Live Demo & Admin Login</button>
          <button type="button" class="eca-template-chip" data-cat="server">⚙️ Server Requirements</button>
          <button type="button" class="eca-template-chip" data-cat="custom">🛠️ Custom Features & Support</button>
        </div>
      </div>

      <!-- Polished Inquiry Preview Card -->
      <div class="eca-query-draft-card" style="display: none;">
        <div class="eca-query-draft-header">
          <span class="eca-chip eca-chip-purple eca-query-cat-badge">PRE-SALE QUERY</span>
          <span class="eca-query-hint">💡 Review & edit before inserting into CodeCanyon</span>
          <div class="eca-tone-selector">
            <span class="eca-tone-label">Tone:</span>
            <button type="button" class="eca-tone-btn active" data-tone="courteous">🤝 Courteous</button>
            <button type="button" class="eca-tone-btn" data-tone="technical">🛠️ Technical</button>
            <button type="button" class="eca-tone-btn" data-tone="concise">⚡ Concise</button>
          </div>
        </div>
        <div class="eca-query-draft-content" contenteditable="true"></div>
        <div class="eca-query-draft-actions">
          <button type="button" class="eca-btn eca-btn-success eca-btn-sm eca-insert-query-btn">
            📝 Insert into Comment Box
          </button>
          <button type="button" class="eca-btn eca-btn-outline eca-btn-sm eca-dismiss-query-btn">
            ✕ Dismiss
          </button>
        </div>
      </div>
    `

    // Find best insertion point
    let inserted = false

    // 1. Look for 'Add a comment' heading on page
    const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, div, strong, span, p'))
    const addCommentHeading = allHeadings.find(el => {
      const t = (el.innerText || el.textContent || '').trim().toLowerCase()
      return (t === 'add a comment' || t.startsWith('add a comment')) && el.children.length === 0
    })

    if (addCommentHeading && addCommentHeading.parentNode) {
      addCommentHeading.parentNode.insertBefore(box, addCommentHeading.nextSibling)
      inserted = true
    } else {
      // 2. Look for comment form or container
      const form = textarea.closest('form, #add-a-comment, .comment-form--item, .comment-form')
      if (form && form.parentNode) {
        form.parentNode.insertBefore(box, form)
        inserted = true
      }
    }

    if (!inserted) {
      const wrapper = textarea.closest('.comment-form__body-wrapper, .comment-form__input, .input, .comment-box') || textarea
      wrapper.parentNode.insertBefore(box, wrapper)
    }

    // DOM References
    const polishBtn = box.querySelector('.eca-polish-query-btn')
    const templatesToggleBtn = box.querySelector('.eca-templates-toggle-btn')
    const templatesTray = box.querySelector('.eca-templates-tray')
    const draftCard = box.querySelector('.eca-query-draft-card')
    const draftContent = box.querySelector('.eca-query-draft-content')
    const insertBtn = box.querySelector('.eca-insert-query-btn')
    const dismissBtn = box.querySelector('.eca-dismiss-query-btn')
    const catBadge = box.querySelector('.eca-query-cat-badge')
    const toneButtons = box.querySelectorAll('.eca-tone-btn')
    const templateChips = box.querySelectorAll('.eca-template-chip')

    // Helper to generate & render query
    async function draftAndRender(rawText, cat, tone) {
      polishBtn.disabled = true
      polishBtn.innerHTML = '⏳ Enhancing...'

      let generated = ''
      try {
        const apiRes = await sendMessageAsync({
          type: 'DRAFT_QUERY',
          payload: {
            userQuery: rawText,
            productTitle,
            productUrl,
            category: cat,
            tone,
          },
        })

        if (apiRes?.success && apiRes?.data?.query) {
          generated = apiRes.data.query
          if (apiRes.data.category) {
            catBadge.textContent = apiRes.data.category.toUpperCase() + ' INQUIRY'
          }
        }
      } catch (e) {
        console.warn('Backend draft failed, using local generator:', e)
      }

      if (!generated) {
        generated = generateLocalQuery(rawText, productTitle, tone, cat)
        catBadge.textContent = (cat || 'PRE-SALE').toUpperCase() + ' INQUIRY'
      }

      draftContent.innerText = generated
      draftCard.style.display = 'block'
      polishBtn.disabled = false
      polishBtn.innerHTML = '✨ Re-Polish Query'
      draftCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }

    // Event: Polish current user text or default inquiry
    polishBtn.addEventListener('click', async () => {
      const text = textarea.value.trim()
      await draftAndRender(text, currentCategory, currentTone)
    })

    // Event: Toggle Templates Tray
    templatesToggleBtn.addEventListener('click', () => {
      const isVisible = templatesTray.style.display !== 'none'
      templatesTray.style.display = isVisible ? 'none' : 'block'
      templatesToggleBtn.innerHTML = isVisible ? '📋 Templates ▾' : '📋 Templates ▴'
    })

    // Event: Template Chips
    templateChips.forEach((chip) => {
      chip.addEventListener('click', async () => {
        currentCategory = chip.getAttribute('data-cat')
        const text = textarea.value.trim()
        await draftAndRender(text, currentCategory, currentTone)
      })
    })

    // Event: Tone Switchers
    toneButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        toneButtons.forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        currentTone = btn.getAttribute('data-tone')
        const text = textarea.value.trim()
        await draftAndRender(text, currentCategory, currentTone)
      })
    })

    // Event: Insert into Comment Textarea
    insertBtn.addEventListener('click', () => {
      const textToInsert = draftContent.innerText.trim()
      if (!textToInsert) return

      textarea.focus()
      textarea.value = textToInsert

      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
      textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))

      textarea.classList.add('eca-highlight-textarea')
      setTimeout(() => textarea.classList.remove('eca-highlight-textarea'), 2500)

      insertBtn.textContent = '✓ Inserted into Comment Box!'
      insertBtn.classList.add('eca-btn-primary')
      setTimeout(() => {
        insertBtn.textContent = '📝 Insert into Comment Box'
        insertBtn.classList.remove('eca-btn-primary')
      }, 2500)

      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    // Event: Dismiss Draft Card
    dismissBtn.addEventListener('click', () => {
      draftCard.style.display = 'none'
    })
  }

  // Initialize with strict own product verification guard
  async function init() {
    console.log('[ECA] Content script initialized on:', window.location.href)
    if (!isItemPage()) {
      console.log('[ECA] Not an Envato product/item page. Inactive.')
      return
    }

    const { productUrl, productTitle } = getProductDetails()

    // 1. Immediate injection attempt
    injectNewCommentAssistant()

    // 2. Retry interval in case comments load asynchronously
    let retries = 0
    const retryInterval = setInterval(() => {
      retries++
      if (document.getElementById('eca-query-assistant-box')) {
        clearInterval(retryInterval)
        return
      }
      injectNewCommentAssistant()
      if (retries >= 20) clearInterval(retryInterval)
    }, 500)

    // 3. Query SaaS backend to verify if this is an approved Own Product for seller auto-replies
    const checkRes = await sendMessageAsync({
      type: 'CHECK_OWN_PRODUCT',
      payload: { url: productUrl },
    })

    if (!checkRes?.success || !checkRes?.data?.allowed) {
      const reason = checkRes?.data?.reason
      console.log(`[ECA] Seller Guard: Inactive for author auto-replies (${reason || checkRes?.error})`)

      showStatusBanner(
        'active',
        `✨ ECA Query Assistant Active: ${productTitle}`,
        'Ready to polish and craft pre-sale queries. (To manage seller auto-replies on customer comments, pair this product in your SaaS dashboard).'
      )

      observeDom()
      return
    }

    // 4. Product is verified as Own Product! Enable seller controls and sync
    const verifiedProduct = checkRes.data.product
    showStatusBanner(
      'active',
      `✓ ECA Active: ${verifiedProduct?.productName || productTitle}`,
      'Seller auto-reply drafting and customer query assistant active.'
    )

    scanAndInject()
    autoSync()
    observeDom()
  }

  function observeDom() {
    let debounceTimer = null
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        injectNewCommentAssistant()
        scanAndInject()
      }, 1000)
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // Also listen to PJAX/Turbo/navigation events
    window.addEventListener('popstate', () => setTimeout(injectNewCommentAssistant, 500))
    document.addEventListener('pjax:end', () => setTimeout(injectNewCommentAssistant, 500))
    document.addEventListener('turbo:load', () => setTimeout(injectNewCommentAssistant, 500))
  }

  // Listen for trigger from popup (e.g. "Sync Visible Comments" button)
  if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage?.addListener) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'TRIGGER_PAGE_SYNC') {
        const { productUrl, productTitle } = getProductDetails()

        // Double-check ownership before manual sync
        sendMessageAsync({
          type: 'CHECK_OWN_PRODUCT',
          payload: { url: productUrl },
        }).then((checkRes) => {
          if (!checkRes?.data?.allowed) {
            sendResponse({
              success: false,
              error: 'This product is not configured as one of your own verified products. Sync blocked.',
            })
            return
          }

          const threads = extractThreads()
          sendMessageAsync({
            type: 'SYNC_COMMENTS',
            payload: {
              product_url: productUrl,
              product_name: productTitle,
              platform: 'envato',
              threads,
            },
          }).then((res) => {
            injectNewCommentAssistant()
            scanAndInject()
            sendResponse({ success: true, count: threads.length, result: res })
          })
        })

        return true
      }

      if (request.type === 'INJECT_ASSISTANT') {
        injectNewCommentAssistant()
        scanAndInject()
        sendResponse({ success: true })
        return true
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
