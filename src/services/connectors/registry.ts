// src/services/connectors/registry.ts
// Central registry for resolving and querying platform connectors

import { PlatformConnector } from './types'
import { EnvatoConnector } from './envato-connector'
import { GenericConnector } from './generic-connector'
import {
  ShopifyConnector,
  AmazonConnector,
  ChromeWebStoreConnector,
  WordPressConnector,
} from './future-connectors'

export class ConnectorRegistry {
  private static instance: ConnectorRegistry
  private connectors: Map<string, PlatformConnector> = new Map()

  private constructor() {
    // Register active connectors
    this.register(new EnvatoConnector())
    this.register(new GenericConnector())

    // Register architectural future connectors
    this.register(new ShopifyConnector())
    this.register(new AmazonConnector())
    this.register(new ChromeWebStoreConnector())
    this.register(new WordPressConnector())
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry()
    }
    return ConnectorRegistry.instance
  }

  public register(connector: PlatformConnector): void {
    this.connectors.set(connector.platformId.toLowerCase(), connector)
  }

  /**
   * Resolves a connector by platform identifier or URL pattern
   */
  public get(platformOrUrl?: string | null): PlatformConnector {
    if (!platformOrUrl) {
      return this.connectors.get('generic')!
    }

    const key = platformOrUrl.trim().toLowerCase()

    // 1. Direct platform key match
    if (this.connectors.has(key)) {
      return this.connectors.get(key)!
    }

    // 2. URL heuristics
    if (key.includes('codecanyon.net') || key.includes('themeforest.net') || key.includes('envato.com')) {
      return this.connectors.get('envato')!
    }
    if (key.includes('apps.shopify.com')) {
      return this.connectors.get('shopify')!
    }
    if (key.includes('amazon.com')) {
      return this.connectors.get('amazon')!
    }
    if (key.includes('chromewebstore.google.com') || key.includes('chrome.google.com/webstore')) {
      return this.connectors.get('chrome_web_store')!
    }
    if (key.includes('wordpress.org/plugins')) {
      return this.connectors.get('wordpress')!
    }

    // Fallback to generic connector
    return this.connectors.get('generic')!
  }

  /**
   * Lists all connectors and their status
   */
  public list(): Array<{
    platformId: string
    platformName: string
    isAvailable: boolean
    statusMessage: string
  }> {
    return Array.from(this.connectors.values()).map((c) => ({
      platformId: c.platformId,
      platformName: c.platformName,
      isAvailable: c.isAvailable,
      statusMessage: c.statusMessage,
    }))
  }
}

export const connectorRegistry = ConnectorRegistry.getInstance()
