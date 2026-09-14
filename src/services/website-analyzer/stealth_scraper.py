import sys
import json
import asyncio
import re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
import subprocess

def fetch_html_curl(target_url):
    cmd = [
        "curl", "-s", "-L", "--compressed", "--max-time", "25",
        "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "-H", "Accept-Language: en-US,en;q=0.9",
        "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        target_url
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=30)
        out = proc.stdout.decode("utf-8", errors="ignore")
        if len(out) > 500:
            return out
        return None
    except Exception:
        return None

async def scrape(url: str):
    result = {
        "success": False,
        "url": url,
        "finalUrl": url,
        "title": "",
        "h1": "",
        "description": "",
        "productName": "",
        "priceText": "",
        "pricingPlans": [],
        "features": [],
        "integrations": [],
        "tags": [],
        "specs": {},
        "html": "",
        "thumbnailUrl": None,
        "headings": {"h1": [], "h2": [], "h3": []},
        "imageAltsCount": 0,
        "demoLink": None,
        "docsLink": None,
        "changelogLink": None,
        "comments": [],
        "error": None,
        # Universal & Platform Performance Data (Sales, Ratings, Reviews)
        "isEnvato": False,
        "isAmazon": False,
        "isShopify": False,
        "envatoSales": {
            "product_name": "",
            "product_url": url,
            "current_total_sales": None,
            "product_price": None,
            "discounted_price": None,
            "rating": None,
            "rating_count": None,
            "review_count": None,
            "comment_count": None,
            "publication_date": None,
            "last_update_date": None,
            "version": None,
            "author_name": None,
            "category": None,
            "product_status": None,
            "sales_data_unavailable": False,
            "thumbnail_url": None
        }
    }
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-position=0,0",
                ]
            )
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                viewport={'width': 1440, 'height': 900},
                extra_http_headers={
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                }
            )
            page = await context.new_page()
            await Stealth().apply_stealth_async(page)
            
            is_amazon_url = "amazon." in url or "amzn." in url
            curl_loaded = False

            if is_amazon_url:
                curl_html = fetch_html_curl(url)
                if curl_html and ("productTitle" in curl_html or "a-price" in curl_html or "customerVisiblePrice" in curl_html):
                    await page.set_content(curl_html)
                    curl_loaded = True

            if not curl_loaded:
                try:
                    response = await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                    await page.wait_for_timeout(2000)
                except Exception:
                    try:
                        await page.wait_for_load_state('domcontentloaded', timeout=10000)
                    except Exception:
                        pass

                page_html_check = await page.content()
                if is_amazon_url or "validateCaptcha" in page_html_check or "Click the button below to continue shopping" in page_html_check:
                    fallback_html = fetch_html_curl(url)
                    if fallback_html and ("productTitle" in fallback_html or "a-price" in fallback_html or "customerVisiblePrice" in fallback_html):
                        await page.set_content(fallback_html)

            result["finalUrl"] = url if (not page.url or page.url == "about:blank") else page.url
            result["title"] = (await page.title()) or ""
            
            # Universal Evaluate Function extracting Amazon, Shopify, Envato, SaaS, and Schema.org
            extracted = await page.evaluate(r'''() => {
                const title = document.title || '';
                const h1Els = Array.from(document.querySelectorAll('h1')).map(el => el.innerText.trim()).filter(Boolean);
                const h2Els = Array.from(document.querySelectorAll('h2')).map(el => el.innerText.trim()).filter(Boolean);
                const h3Els = Array.from(document.querySelectorAll('h3')).map(el => el.innerText.trim()).filter(Boolean);
                
                const contextHeader = document.querySelector('.context-header')?.innerText || '';
                const bodyText = document.body?.innerText || '';
                
                // 1. Universal Meta Description
                let metaDesc = document.querySelector('meta[name="description"]')?.content?.trim() || 
                               document.querySelector('meta[property="og:description"]')?.content?.trim() || '';
                
                if (metaDesc.startsWith('Buy ')) {
                    const idx = metaDesc.indexOf(' on CodeCanyon');
                    if (idx !== -1) {
                        const after = metaDesc.substring(idx + 14).trim();
                        if (after.length > 20) {
                            metaDesc = after.replace(/^[.\\s-]+/, '');
                        }
                    }
                }
                
                // 2. Universal Thumbnail / Product Image
                let thumbnailUrl = document.querySelector('meta[property="og:image"]')?.content ||
                                   document.querySelector('#landingImage, #imgBlkFront, .item-preview img, .item-thumbnail img, .product__image img, .woocommerce-product-gallery__image img, .screenshot-preview img')?.src || null;
                
                // 3. Universal JSON-LD / Schema.org (Used by Shopify, WooCommerce, Magento, BigCommerce, SaaS)
                let jsonLdOffers = null;
                let jsonLdName = null;
                let jsonLdRating = null;
                let jsonLdReviewCount = null;
                document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
                    try {
                        const parsed = JSON.parse(s.textContent);
                        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
                        for (const item of items) {
                            if (item['@type'] === 'Product' || item['@type'] === 'SoftwareApplication' || item.offers) {
                                if (item.offers && !jsonLdOffers) jsonLdOffers = item.offers;
                                if (item.name && !jsonLdName) jsonLdName = item.name;
                                if (item.aggregateRating) {
                                    if (!jsonLdRating) jsonLdRating = item.aggregateRating.ratingValue;
                                    if (!jsonLdReviewCount) jsonLdReviewCount = item.aggregateRating.reviewCount || item.aggregateRating.ratingCount;
                                }
                            }
                        }
                    } catch(e) {}
                });
                
                // 4. Universal Price Extraction (Amazon, Shopify, WooCommerce, Envato, SaaS)
                let priceText = '';
                const amazonInputPrice = document.querySelector('input[name*="customerVisiblePrice"][name*="displayString"]');
                if (amazonInputPrice && amazonInputPrice.value && amazonInputPrice.value.trim()) {
                    priceText = amazonInputPrice.value.trim();
                }
                
                if (!priceText) {
                    const amazonPriceEl = document.querySelector('#corePrice_feature_div .a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen, .apexPriceToPay .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, #price_inside_buybox, .a-price .a-offscreen');
                    if (amazonPriceEl && amazonPriceEl.innerText.trim()) {
                        priceText = amazonPriceEl.innerText.trim();
                    }
                }
                
                if (!priceText) {
                    const uccEl = document.querySelector('.ucc-v2-widget__table__col__container__price, .ucc-v2-widget__list-price');
                    if (uccEl) {
                        const m = uccEl.innerText.match(/(₹|Rs\.?|\$|€|£)\s*[\d,]+(\.\d{2})?/);
                        if (m) priceText = m[0].trim();
                    }
                }
                
                if (!priceText) {
                    const rawPriceMatch = document.body.innerText.match(/(₹|Rs\.?)\s*[\d,]{4,}(\.\d{2})?/);
                    if (rawPriceMatch) priceText = rawPriceMatch[0].trim();
                }
                
                if (!priceText) {
                    const shopifyPriceEl = document.querySelector('[itemprop="price"], [data-product-price], .product-price, .product__price, .price-item--sale, .price-item--regular, .woocommerce-Price-amount');
                    if (shopifyPriceEl) {
                        const contentAttr = shopifyPriceEl.getAttribute('content');
                        priceText = contentAttr ? `$${contentAttr}` : shopifyPriceEl.innerText.trim();
                    }
                }
                
                if (!priceText) {
                    const genericPriceEl = document.querySelector('.js-purchase-price, [data-view="purchasePrice"], .t-body.-size-xxl, .item-header__pricing, .price, [class*="pricing__amount"], [class*="plan-price"]');
                    if (genericPriceEl) {
                        priceText = genericPriceEl.innerText.trim();
                    }
                }
                
                if (!priceText) {
                    const metaPrice = document.querySelector('meta[property="product:price:amount"]')?.content ||
                                      document.querySelector('meta[property="og:price:amount"]')?.content;
                    if (metaPrice) priceText = `$${metaPrice}`;
                }

                // 5. Discounted / Strikethrough Price
                let strikethroughPrice = null;
                const strikeEl = document.querySelector('.a-text-price .a-offscreen, #priceblock_saleprice, .item-header__strikethrough-price, del, .strikethrough, .compare-at-price');
                if (strikeEl) {
                    strikethroughPrice = strikeEl.innerText.trim();
                }
                
                // 6. Universal Features & Bullet Points Extraction
                const features = [];
                const isNavShortcut = (str) => {
                    const l = str.toLowerCase();
                    return l.includes('shift + opt') || l.includes('opt + /') || l.includes('search opt') || 
                           l.includes('cart shift') || l.includes('home shift') || l.includes('skip to main') || 
                           l.includes('press enter') || l.includes('keyboard shortcut');
                };

                // Amazon Feature Bullets
                document.querySelectorAll('#feature-bullets ul li span.a-list-item, #featurebullets_feature_div ul li').forEach(el => {
                    const text = el.innerText.trim();
                    if (text.length >= 8 && text.length <= 350 && !text.includes('\n') && !features.includes(text) && !isNavShortcut(text)) {
                        features.push(text);
                    }
                });
                
                // Shopify / WooCommerce / E-Commerce description bullets
                if (features.length < 5) {
                    document.querySelectorAll('.product__description ul li, .product-description ul li, #tab-description ul li, .woocommerce-product-details__short-description ul li, [itemprop="description"] ul li').forEach(el => {
                        const text = el.innerText.trim();
                        if (text.length >= 8 && text.length <= 250 && !text.includes('\n') && !features.includes(text) && !isNavShortcut(text)) {
                            features.push(text);
                        }
                    });
                }
                
                // Envato / SaaS description content
                if (features.length < 5) {
                    const descEl = document.querySelector('.item-description__content, .user-html, main, article');
                    if (descEl) {
                        descEl.querySelectorAll('li, h3, h4').forEach(el => {
                            const text = el.innerText.trim();
                            if (text.length >= 8 && text.length <= 180 && !text.includes('\n') && !features.includes(text) && !isNavShortcut(text)) {
                                features.push(text);
                            }
                        });
                    }
                }
                
                if (features.length < 5) {
                    document.querySelectorAll('ul li').forEach(el => {
                        const text = el.innerText.trim();
                        if (text.length >= 8 && text.length <= 160 && !text.includes('\n') && !features.includes(text) && !isNavShortcut(text) && !text.includes('Cart') && !text.includes('Checkout')) {
                            features.push(text);
                        }
                    });
                }

                // 7. Universal Specifications & Attribute Table (Amazon, WooCommerce, Envato)
                const specs = {};
                // Amazon Product Details / Tech Specs Table
                document.querySelectorAll('#productOverview_feature_div table tr, #techSpecsMeasure table tr, #technicalSpecifications_section_1 tr').forEach(tr => {
                    const name = tr.querySelector('td:first-child, th')?.innerText?.trim();
                    const val = tr.querySelector('td:last-child, td')?.innerText?.trim();
                    if (name && val && name !== val && name.length < 50) {
                        specs[name] = val;
                    }
                });
                
                // WooCommerce / Shopify Attributes
                document.querySelectorAll('table.shop_attributes tr, .product-attributes tr, table.meta-attributes tr, .meta-attributes__attr-name').forEach(tr => {
                    const name = tr.querySelector('td:first-child, th, .meta-attributes__attr-name')?.innerText?.trim();
                    const val = tr.querySelector('td:last-child, .meta-attributes__attr-detail')?.innerText?.trim();
                    if (name && val && name !== val && name.length < 50) {
                        specs[name] = val;
                    }
                });
                
                // 8. Universal Ratings & Review Counts
                let ratingVal = jsonLdRating || null;
                let reviewCountVal = jsonLdReviewCount || null;
                
                // Amazon Rating
                const amazonRatingEl = document.querySelector('#acrPopover .a-size-base, span[data-hook="rating-out-of-text"], #averageCustomerReviews .a-icon-alt');
                if (amazonRatingEl && !ratingVal) {
                    const m = amazonRatingEl.innerText.match(/([0-9\.]+)\s*(?:out of 5|\/5)?/);
                    if (m) ratingVal = parseFloat(m[1]);
                }
                
                const amazonReviewCountEl = document.querySelector('#acrCustomerReviewText, [data-hook="total-review-count"]');
                if (amazonReviewCountEl && !reviewCountVal) {
                    const m = amazonReviewCountEl.innerText.match(/([0-9,]+)/);
                    if (m) reviewCountVal = parseInt(m[1].replace(/,/g, ''), 10);
                }
                
                // E-commerce widgets (Yotpo, Judge.me, Stamped)
                const widgetRatingEl = document.querySelector('.yotpo-stars, .jdgm-prev-badge__stars, [itemprop="ratingValue"]');
                if (widgetRatingEl && !ratingVal) {
                    const m = (widgetRatingEl.getAttribute('aria-label') || widgetRatingEl.innerText || '').match(/([0-9\.]+)/);
                    if (m) ratingVal = parseFloat(m[1]);
                }

                // 9. Amazon Sales Volume / Social Proof Signal
                let salesVelocityText = null;
                const socialProofEl = document.querySelector('#social-proofing-faceout-title-tk_bought, #socialProofingCheckbox_feature_div span, .social-proofing-faceout-title');
                if (socialProofEl) {
                    salesVelocityText = socialProofEl.innerText.trim();
                }

                // 10. Tags & Breadcrumbs
                let tags = [];
                if (specs['Tags']) {
                    tags = specs['Tags'].split(',').map(t => t.trim()).filter(Boolean);
                }

                const breadcrumbs = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a, .breadcrumbs a, nav.breadcrumbs a'))
                    .map(a => a.innerText.trim())
                    .filter(t => t && !t.includes('Home') && !t.includes('Back to results'));

                // 11. Author / Brand
                const amazonBrand = document.querySelector('#bylineInfo, a#bylineInfo')?.innerText?.trim() || '';
                const authorEl = document.querySelector('.author, [class*="author"], .item-header__author, a[rel="author"], .product__vendor');
                const authorText = amazonBrand || (authorEl ? authorEl.innerText.trim() : '');

                // 12. Public Reviews / Comments Extraction (Amazon, Envato, Reviews widgets)
                const comments = [];
                // Amazon Reviews
                document.querySelectorAll('[data-hook="review"]').forEach((r, idx) => {
                    if (idx >= 30) return;
                    const author = r.querySelector('.a-profile-name, [data-hook="review-author"]')?.innerText?.trim() || 'Amazon Customer';
                    const textEl = r.querySelector('[data-hook="reviewText"], [data-hook="reviewRichContentContainer"], [data-hook="review-body"], .review-text');
                    const text = (textEl ? textEl.innerText : '')
                        .replace(/Brief content visible.*?double tap to read full content\./gi, '')
                        .replace(/Full content visible.*?double tap to read brief content\./gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    const date = r.querySelector('[data-hook="review-date"]')?.innerText?.trim() || 'Recently';
                    const ratingEl = r.querySelector('i[data-hook="review-star-rating"] .a-icon-alt, .review-rating, .a-icon-alt');
                    let commentRating = null;
                    if (ratingEl) {
                        const m = (ratingEl.innerText || '').match(/([0-9\.]+)/);
                        if (m) commentRating = parseFloat(m[1]);
                    }
                    if (text.length > 10) {
                        comments.push({
                            author_name: author,
                            comment_text: text.slice(0, 1000),
                            comment_date: date,
                            comment_url: null,
                            rating: commentRating
                        });
                    }
                });
                
                // Generic / Envato Comments
                if (comments.length === 0) {
                    document.querySelectorAll('.comment__item, .js-comment, [class*="comment__item"], .comment, [class*="comment-item"], article.comment, .jdgm-rev, .yotpo-review').forEach((c, idx) => {
                        if (idx >= 35) return;
                        const author = c.querySelector('a[href^="/user/"], .comment__author, [class*="author"], a.user-info, .jdgm-rev__author')?.innerText?.trim() || 'Verified Buyer';
                        const text = c.querySelector('.comment__body, .js-comment__body, .t-preformatted, .comment__content, [class*="comment_body"], .user-html, .jdgm-rev__body, .content-review')?.innerText?.trim() || '';
                        const date = c.querySelector('.comment__date, time, [class*="date"], .jdgm-rev__timestamp')?.innerText?.trim() || 'Recently';
                        const commentUrl = c.querySelector('a.comment__date, a[href*="#comment"], a[href*="/comments/"]')?.href || null;
                        if (text.length > 10) {
                            comments.push({
                                author_name: author,
                                comment_text: text.slice(0, 1000),
                                comment_date: date,
                                comment_url: commentUrl,
                                rating: null
                            });
                        }
                    });
                }

                // 13. Image Alt count & Headings
                const imageAltsCount = Array.from(document.querySelectorAll('img')).filter(i => i.alt && i.alt.trim().length > 0).length;

                // Specific Product Title element
                const amazonTitle = document.querySelector('#productTitle, #title')?.innerText?.trim() || '';
                const shopifyTitle = document.querySelector('h1.product_title, h1.product-title, .product__title')?.innerText?.trim() || '';

                return {
                    amazonTitle,
                    shopifyTitle,
                    h1: amazonTitle || shopifyTitle || h1Els[0] || '',
                    h1Els: h1Els.slice(0, 5),
                    h2Els: h2Els.slice(0, 15),
                    h3Els: h3Els.slice(0, 20),
                    metaDesc,
                    contextHeader,
                    bodyTextSnippet: bodyText.slice(0, 4000),
                    jsonLdOffers,
                    jsonLdName,
                    ratingVal,
                    reviewCountVal,
                    salesVelocityText,
                    priceText,
                    strikethroughPrice,
                    specs,
                    tags,
                    breadcrumbs,
                    authorText,
                    thumbnailUrl,
                    imageAltsCount,
                    comments,
                    features: features.slice(0, 35)
                };
            }''');
            
            result["h1"] = extracted.get("h1", "")
            result["headings"] = {
                "h1": extracted.get("h1Els", []),
                "h2": extracted.get("h2Els", []),
                "h3": extracted.get("h3Els", [])
            }
            result["description"] = extracted.get("metaDesc", "")
            result["priceText"] = extracted.get("priceText", "")
            result["specs"] = extracted.get("specs", {})
            result["tags"] = extracted.get("tags", [])
            result["features"] = extracted.get("features", [])
            result["thumbnailUrl"] = extracted.get("thumbnailUrl")
            result["imageAltsCount"] = extracted.get("imageAltsCount", 0)
            result["comments"] = extracted.get("comments", [])
            
            # Platform Detection
            is_amazon = "amazon." in url
            is_envato = "codecanyon.net" in url or "themeforest.net" in url or "graphicriver.net" in url or "videohive.net" in url or "envato.com" in url
            is_shopify = extracted.get("shopifyTitle") or "myshopify.com" in url or "cdn.shopify.com" in (result["html"] or "")
            
            result["isEnvato"] = is_envato
            result["isAmazon"] = is_amazon
            result["isShopify"] = is_shopify

            # Determine Universal Product Name
            if extracted.get("amazonTitle"):
                result["productName"] = extracted["amazonTitle"]
            elif extracted.get("shopifyTitle"):
                result["productName"] = extracted["shopifyTitle"]
            elif result["h1"]:
                h1 = result["h1"]
                if "–" in h1:
                    result["productName"] = h1.split("–")[0].strip()
                elif "-" in h1 and not is_amazon:
                    result["productName"] = h1.split("-")[0].strip()
                elif "|" in h1:
                    result["productName"] = h1.split("|")[0].strip()
                else:
                    result["productName"] = h1
            else:
                result["productName"] = extracted.get("jsonLdName", "") or result["title"].split("-")[0].strip()
                
            # Construct Universal Pricing Plans
            plans = []
            json_offers = extracted.get("jsonLdOffers")
            if isinstance(json_offers, dict) and "price" in json_offers:
                currency = json_offers.get("priceCurrency", "USD")
                curr_symbol = "$" if currency == "USD" else currency + " "
                reg_price = f"{curr_symbol}{json_offers['price']}"
                plans.append({
                    "name": "Standard Purchase",
                    "priceMonthly": reg_price,
                    "priceAnnual": reg_price,
                    "features": result["features"][:4] if len(result["features"]) > 0 else ["Full product access"],
                    "isPopular": True
                })
            elif result["priceText"]:
                plans.append({
                    "name": "Standard Price",
                    "priceMonthly": result["priceText"],
                    "priceAnnual": result["priceText"],
                    "features": result["features"][:4] if len(result["features"]) > 0 else ["Full product access"],
                    "isPopular": True
                })
                
            result["pricingPlans"] = plans

            # Process Sales, Rating, and Performance Telemetry (Universal & Platform Specific)
            rating = extracted.get("ratingVal")
            review_count = extracted.get("reviewCountVal")
            product_price = result["priceText"] or None
            discounted_price = extracted.get("strikethroughPrice")
            total_sales = None
            
            # Amazon Sales Velocity (e.g. "200+ bought in past month")
            if is_amazon and extracted.get("salesVelocityText"):
                v_text = extracted["salesVelocityText"]
                m = re.search(r'([0-9,]+K?)\+?\s+bought', v_text, re.IGNORECASE)
                if m:
                    raw_num = m.group(1).upper()
                    if 'K' in raw_num:
                        try:
                            total_sales = int(float(raw_num.replace('K', '')) * 1000)
                        except:
                            total_sales = None
                    else:
                        try:
                            total_sales = int(raw_num.replace(',', ''))
                        except:
                            total_sales = None

            # Envato Sales Count
            if is_envato:
                header = extracted.get("contextHeader", "")
                sales_match = re.search(r'([0-9,]+)\s+sales', header, re.IGNORECASE) or re.search(r'([0-9,]+)\s+sales', extracted.get("bodyTextSnippet", ""), re.IGNORECASE)
                if sales_match:
                    try:
                        total_sales = int(sales_match.group(1).replace(',', ''))
                    except:
                        pass
                
                pub_date = result["specs"].get("Created")
                last_update = result["specs"].get("Last Update")
                version = result["specs"].get("Software Version") or result["specs"].get("Files Included")
            else:
                pub_date = None
                last_update = None
                version = result["specs"].get("Model") or result["specs"].get("Item model number") or None

            # Populate Universal Sales & Rating Object (used across the platform)
            category = "Smartphones & Consumer Electronics" if is_amazon else ("E-Commerce Store" if is_shopify else ("CodeCanyon / Envato" if is_envato else "Commercial SaaS"))
            
            result["envatoSales"] = {
                "product_name": result["productName"],
                "product_url": result["finalUrl"],
                "current_total_sales": total_sales,
                "product_price": product_price,
                "discounted_price": discounted_price,
                "rating": rating,
                "rating_count": review_count,
                "review_count": review_count,
                "comment_count": len(result["comments"]),
                "publication_date": pub_date,
                "last_update_date": last_update,
                "version": version,
                "author_name": extracted.get("authorText") or None,
                "category": category,
                "product_status": "Active",
                "sales_data_unavailable": total_sales is None,
                "thumbnail_url": result["thumbnailUrl"]
            }

            # Attempt to scrape /comments tab on Envato if not already populated
            if is_envato and len(result["comments"]) == 0 and ("codecanyon.net/item/" in url or "themeforest.net/item/" in url):
                try:
                    clean_url = url.split("?")[0].rstrip("/")
                    if not clean_url.endswith("/comments"):
                        comments_url = f"{clean_url}/comments"
                        comments_page = await context.new_page()
                        await Stealth().apply_stealth_async(comments_page)
                        await comments_page.goto(comments_url, wait_until='domcontentloaded', timeout=18000)
                        
                        comments_data = await comments_page.evaluate('''() => {
                            const list = [];
                            document.querySelectorAll('.comment__item, .js-comment, [class*="comment__item"], .comment, [class*="comment-item"], article.comment').forEach((c, idx) => {
                                if (idx >= 40) return;
                                const author = c.querySelector('a[href^="/user/"], .comment__author, [class*="author"], a.user-info')?.innerText?.trim() || 'Customer';
                                const text = c.querySelector('.comment__body, .js-comment__body, .t-preformatted, .comment__content, [class*="comment_body"], .user-html')?.innerText?.trim() || '';
                                const date = c.querySelector('.comment__date, time, [class*="date"]')?.innerText?.trim() || 'Recently';
                                if (text.length > 10) {
                                    list.push({
                                        author_name: author,
                                        comment_text: text.slice(0, 1000),
                                        comment_date: date,
                                        comment_url: null,
                                        rating: null
                                    });
                                }
                            });
                            return list;
                        }''')
                        if comments_data and len(comments_data) > 0:
                            result["comments"] = comments_data
                            result["envatoSales"]["comment_count"] = len(comments_data)
                        await comments_page.close()
                except Exception:
                    pass
            
            # Universal Tech & Integration Matching
            specs_str = " ".join([str(v) for v in result["specs"].values()])
            tags_str = " ".join(result["tags"])
            full_context = f"{result['title']} {result['h1']} {result['description']} {specs_str} {tags_str} {' '.join(result['features'])}".lower()
            
            tech_integrations = [
                "Flutter", "React Native", "Laravel", "Node.js", "PHP", "Firebase", 
                "Google Maps", "Stripe", "PayPal", "Razorpay", "Twilio", "AWS", 
                "PostgreSQL", "MySQL", "Redis", "Android", "iOS", "Pusher", "Shopify", "WooCommerce"
            ]
            
            found_integrations = []
            for tech in tech_integrations:
                if tech.lower() in full_context:
                    found_integrations.append(tech)
            result["integrations"] = found_integrations
            
            result["html"] = await page.content()
            result["success"] = True
            
            await browser.close()
    except Exception as e:
        result["error"] = str(e)
        
    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}))
        sys.exit(1)
    url = sys.argv[1]
    asyncio.run(scrape(url))
