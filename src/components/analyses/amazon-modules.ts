import {
  Sparkles,
  MessageSquare,
  TrendingUp,
  Search,
  Swords,
} from 'lucide-react'

export interface AmazonModuleOption {
  id: string
  label: string
  items: string[]
  underlyingModules: string[]
  icon: any
}

export const AMAZON_MODULES: AmazonModuleOption[] = [
  {
    id: 'product_intelligence',
    label: 'Product Intelligence',
    items: ['Features', 'Product positioning', 'Listing/product attributes', 'Listing quality'],
    underlyingModules: ['product_intelligence'],
    icon: Sparkles,
  },
  {
    id: 'customer_intelligence',
    label: 'Customer Intelligence',
    items: ['Reviews', 'Ratings', 'Sentiment', 'Complaints', 'Customer requests/language'],
    underlyingModules: ['reviews', 'comments'],
    icon: MessageSquare,
  },
  {
    id: 'market_competitors',
    label: 'Market & Competitors',
    items: ['Competitor comparison', 'BSR / market position', 'Pricing & offers', 'Competitive product differences'],
    underlyingModules: ['sales'],
    icon: TrendingUp,
  },
  {
    id: 'search_discoverability',
    label: 'Search & Discoverability',
    items: ['Search topics/keywords', 'Listing content coverage', 'Competitor topic gaps'],
    underlyingModules: ['seo'],
    icon: Search,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    items: ['Customer-backed gaps', 'Competitor weaknesses', 'Feature gaps', 'Pricing/content opportunities'],
    underlyingModules: ['opportunities'],
    icon: Swords,
  },
]
