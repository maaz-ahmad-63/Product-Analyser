# 🚀 SaaS Growth Agent — Complete Workflow Guide

Welcome to the **SaaS Growth & Competitor Intelligence Platform**. This guide explains every feature, workflow, and architecture component in detail, along with step-by-step instructions on configuring any AI model provider.

---

## 📑 Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Module 1: Two-URL Competitive Analysis](#2-module-1-two-url-competitive-analysis)
3. [Module 2: AI Opportunity & Recommendation Engine](#3-module-2-ai-opportunity--recommendation-engine)
4. [Module 3: Hourly Competitor Activity Monitor](#4-module-3-hourly-competitor-activity-monitor)
5. [Module 4: Own Envato Products & Comments Feed](#5-module-4-own-envato-products--comments-feed)
6. [Module 5: Database & Supabase Cloud Integration](#6-module-5-database--supabase-cloud-integration)
7. [Module 6: AI Configuration (Use ANY Model or Provider)](#7-module-6-ai-configuration-use-any-model-or-provider)

---

## 1. System Architecture Overview

```
 [ Public SaaS Websites ]               [ Envato Marketplace ]
 (Your Product vs Competitor)            (CodeCanyon / ThemeForest)
              │                                      │
              ▼                                      ▼
    [ Stealth Scraper ]                 [ Chrome Extension (ECA) ]
 (Python Playwright / Beautiful Soup)      (envato-comment-agent)
              │                                      │
              ├──────────────────────────────────────┤
              ▼                                      ▼
┌────────────────────────────────────────────────────────────┐
│              SaaS Growth Agent (Port 3000 / 3001)          │
│              • Next.js App Router (TypeScript)             │
│              • Multi-Tenant Isolation (Prisma ORM)         │
│              • AI Intelligence & Classification Engine     │
└─────────────────────────────┬──────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                  │
│       • Competitor Snapshots  • Price History              │
│       • Feature Matrix        • Comment Threads            │
│       • AI Reply Drafts       • Growth Opportunities       │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Module 1: Two-URL Competitive Analysis

### How It Works:
1. Navigate to the **Home / Analyze** page (`http://localhost:3000`).
2. Enter **Your SaaS Product URL** (e.g. `https://myproduct.com`) and a **Competitor URL** (e.g. `https://competitor.com`).
3. Click **"Run Competitive Analysis"**:
   - **Step 1: Stealth Scraping**: Uses an automated browser engine (`stealth_scraper.py`) that extracts page text, meta tags, pricing tiers, FAQs, and feature bullet points without getting blocked.
   - **Step 2: Feature Matrix Extraction**: Categorizes offerings into core categories (Authentication, Analytics, Integrations, Security, API support).
   - **Step 3: Pricing Comparison**: Extracts monthly/annual prices, free tier availability, and feature gating.
   - **Step 4: SEO & Keyword Comparison**: Analyzes H1-H3 structures, title tags, and meta descriptions.
4. Results are saved in `comparison_analyses` and displayed on the interactive analysis report page.

---

## 3. Module 2: AI Opportunity & Recommendation Engine

### How It Works:
1. Once comparison data is collected, the **Insights Engine** evaluates feature gaps:
   - Identifies high-value features your competitor has that you lack.
   - Identifies weaknesses in the competitor's pricing or offerings where you have an advantage.
2. Generates prioritized **Recommendations**:
   - **Quick Wins**: Immediate changes (e.g., adding missing payment gateway or updating pricing page comparison chart).
   - **Strategic Bets**: Long-term product roadmaps.
   - **Lead Generation**: Generates contextual cold outreach email drafts tailored to win over competitor customers.

---

## 4. Module 3: Hourly Competitor Activity Monitor

### How It Works:
1. Background worker (`scripts/activity-worker.ts`) runs scheduled checks against monitored competitors.
2. Checks for:
   - Pricing page changes (e.g. price increase, tier restructuring).
   - New feature releases or blog announcements.
   - Homepage copy or positioning changes.
3. Automatically writes change logs to `product_activity_records` and triggers in-app notifications.

---

## 5. Module 4: Own Envato Products & Comments Feed

### How It Works:
1. Open the **Comments** tab on your dashboard.
2. Click **"Own Envato Products"**:
   - View your verified items: **RideOn Taxi** (`#59633641`) and **UniBooker** (`#64442063`).
   - Register new products with documentation links and support policies.
3. In the **Discussion Feed**:
   - View all customer questions synced from CodeCanyon / ThemeForest by the Chrome extension.
   - Review AI-generated reply drafts.
   - Click **"Approve Draft"** or **"Dismiss"** with a custom reason.

---

## 6. Module 5: Database & Supabase Cloud Integration

Both `saas-growth-agent` and `envato-comment-agent` write to the exact same **Supabase Cloud PostgreSQL database**:
- **Host**: `aws-0-ap-southeast-1.pooler.supabase.com:5432`
- **Database**: `postgres` (schema `public`)
- **Key Tables**:
  - `saas_products`, `competitors`, `comparison_analyses`
  - `own_envato_products`, `engagement_threads`, `engagement_thread_messages`, `engagement_reply_drafts`
- **To inspect tables visually**: Open [Supabase Dashboard](https://supabase.com/dashboard) -> Select Project `fkkfqkhunfhlizarnsec` -> Click **Table Editor**.

---

## 7. Module 6: AI Configuration (Use ANY Model or Provider)

All AI features (reply drafting, pre-sale inquiry enhancement, insights generation) are completely agnostic and support **any OpenAI-compatible model or provider**!

### Where is the key stored?
The keys and model settings are read from your root **`.env`** file.

### Supported Providers & Examples:

#### Option A: Standard OpenAI
```ini
OPENAI_API_KEY="sk-proj-..."
AI_MODEL="gpt-4o-mini" # or "gpt-4o"
AI_BASE_URL="https://api.openai.com/v1"
```

#### Option B: OpenRouter (Access Claude 3.5 Sonnet, LLaMA 3.1, Mistral, Gemini)
```ini
AI_API_KEY="sk-or-v1-..."
AI_MODEL="anthropic/claude-3.5-sonnet"
AI_BASE_URL="https://openrouter.ai/api/v1"
```

#### Option C: Groq (Ultra-Fast 500+ tokens/sec)
```ini
AI_API_KEY="gsk_..."
AI_MODEL="llama-3.1-8b-instant"
AI_BASE_URL="https://api.groq.com/openai/v1"
```

#### Option D: DeepSeek
```ini
AI_API_KEY="sk-..."
AI_MODEL="deepseek-chat"
AI_BASE_URL="https://api.deepseek.com/v1"
```

#### Option E: Local Ollama (100% Free, Offline, No API Key Required!)
Run `ollama run llama3` on your laptop, then configure:
```ini
AI_API_KEY=""
AI_MODEL="llama3"
AI_BASE_URL="http://localhost:11434/v1"
```
