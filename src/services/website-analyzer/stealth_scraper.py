import sys
import json
import asyncio
import re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

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
        # Envato Market Specific Sales & Performance Data
        "isEnvato": False,
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
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                viewport={'width': 1280, 'height': 800}
            )
            page = await context.new_page()
            await Stealth().apply_stealth_async(page)
            
            try:
                response = await page.goto(url, wait_until='networkidle', timeout=35000)
            except Exception:
                try:
                    await page.wait_for_load_state('domcontentloaded', timeout=10000)
                except Exception:
                    pass

            result["finalUrl"] = page.url
            result["title"] = (await page.title()) or ""
            
            # Extract main data using browser evaluate
            extracted = await page.evaluate('''() => {
                const title = document.title || '';
                const h1Els = Array.from(document.querySelectorAll('h1')).map(el => el.innerText.trim()).filter(Boolean);
                const h2Els = Array.from(document.querySelectorAll('h2')).map(el => el.innerText.trim()).filter(Boolean);
                const h3Els = Array.from(document.querySelectorAll('h3')).map(el => el.innerText.trim()).filter(Boolean);
                
                const contextHeader = document.querySelector('.context-header')?.innerText || '';
                const bodyText = document.body?.innerText || '';
                
                let metaDesc = document.querySelector('meta[name="description"]')?.content?.trim() || 
                               document.querySelector('meta[property="og:description"]')?.content?.trim() || '';
                
                // Clean meta description
                if (metaDesc.startsWith('Buy ')) {
                    const idx = metaDesc.indexOf(' on CodeCanyon');
                    if (idx !== -1) {
                        const after = metaDesc.substring(idx + 14).trim();
                        if (after.length > 20) {
                            metaDesc = after.replace(/^[.\\s-]+/, '');
                        }
                    }
                }
                
                // Thumbnail / Preview image
                let thumbnailUrl = document.querySelector('meta[property="og:image"]')?.content ||
                                   document.querySelector('.item-preview img, .item-thumbnail img, .screenshot-preview img')?.src || null;
                
                // Pricing / Offer from JSON-LD
                let jsonLdOffers = null;
                let jsonLdName = null;
                let jsonLdRating = null;
                let jsonLdReviewCount = null;
                document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
                    try {
                        const parsed = JSON.parse(s.textContent);
                        if (parsed.offers) jsonLdOffers = parsed.offers;
                        if (parsed.name) jsonLdName = parsed.name;
                        if (parsed.aggregateRating) {
                            jsonLdRating = parsed.aggregateRating.ratingValue;
                            jsonLdReviewCount = parsed.aggregateRating.reviewCount || parsed.aggregateRating.ratingCount;
                        }
                    } catch(e) {}
                });
                
                // Price text on page
                const priceEl = document.querySelector('.js-purchase-price, [data-view="purchasePrice"], .t-body.-size-xxl, .item-header__pricing, .price');
                const priceText = priceEl ? priceEl.innerText.trim() : '';

                // Discounted price check
                const strikethroughPriceEl = document.querySelector('.item-header__strikethrough-price, del, .strikethrough');
                const strikethroughPrice = strikethroughPriceEl ? strikethroughPriceEl.innerText.trim() : null;
                
                // Specifications table (Envato / CodeCanyon)
                const specs = {};
                document.querySelectorAll('table tr, .meta-attributes__attr-name').forEach(tr => {
                    const name = tr.querySelector('td:first-child, .meta-attributes__attr-name')?.innerText?.trim();
                    const val = tr.querySelector('td:last-child, .meta-attributes__attr-detail')?.innerText?.trim();
                    if (name && val && name !== val) {
                        specs[name] = val;
                    }
                });
                
                // Extract features & bullet points
                const features = [];
                const descEl = document.querySelector('.item-description__content, .user-html, main, article');
                if (descEl) {
                    descEl.querySelectorAll('li, h3, h4').forEach(el => {
                        const text = el.innerText.trim();
                        if (text.length >= 8 && text.length <= 120 && !text.includes('\\n') && !features.includes(text)) {
                            features.push(text);
                        }
                    });
                }
                
                if (features.length < 5) {
                    document.querySelectorAll('ul li').forEach(el => {
                        const text = el.innerText.trim();
                        if (text.length >= 8 && text.length <= 120 && !text.includes('\\n') && !features.includes(text)) {
                            features.push(text);
                        }
                    });
                }
                
                // Tags
                let tags = [];
                if (specs['Tags']) {
                    tags = specs['Tags'].split(',').map(t => t.trim()).filter(Boolean);
                }

                // Breadcrumbs / category
                const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs li, .breadcrumbs a, nav.breadcrumbs a'))
                    .map(a => a.innerText.trim())
                    .filter(t => t && !t.includes('Home') && !t.includes('Files') && !t.includes('All Items') && !t.includes('Reviews') && !t.includes('Comments') && !t.includes('Add to') && !t.includes('Item Details') && !t.startsWith('By '));
                
                // Author element
                const authorEl = document.querySelector('.author, [class*="author"], .item-header__author, a[rel="author"]');
                const authorText = authorEl ? authorEl.innerText.trim() : '';

                // Links
                let demoLink = document.querySelector('a[href*="preview"], a[href*="demo"], a.live-preview, a[data-view="livePreview"]')?.href || null;
                let docsLink = document.querySelector('a[href*="doc"], a[href*="documentation"], a[href*="guide"]')?.href || null;
                let changelogLink = document.querySelector('a[href*="changelog"], a[href*="release-notes"]')?.href || null;

                // Image Alt count
                const imageAltsCount = Array.from(document.querySelectorAll('img')).filter(i => i.alt && i.alt.trim().length > 0).length;

                // Inline comments if present
                const comments = [];
                document.querySelectorAll('.comment__item, .js-comment, [class*="comment__item"], .comment, [class*="comment-item"], article.comment').forEach((c, idx) => {
                    if (idx >= 50) return;
                    const author = c.querySelector('a[href^="/user/"], .comment__author, [class*="author"], a.user-info')?.innerText?.trim() || 'Customer';
                    const text = c.querySelector('.comment__body, .js-comment__body, .t-preformatted, .comment__content, [class*="comment_body"], .user-html')?.innerText?.trim() || '';
                    const date = c.querySelector('.comment__date, time, [class*="date"]')?.innerText?.trim() || 'Recently';
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

                // Comment tab count from select dropdown or links
                let commentTabCount = null;
                const commTabEl = document.querySelector('option[value*="/comments"], a[href*="/comments"], [data-view="commentsCount"]');
                if (commTabEl) {
                    const text = commTabEl.innerText || commTabEl.textContent || '';
                    const m = text.match(/([0-9,]+)/);
                    if (m) {
                        commentTabCount = parseInt(m[1].replace(/,/g, ''), 10);
                    }
                }

                return {
                    h1: h1Els[0] || '',
                    h1Els: h1Els.slice(0, 5),
                    h2Els: h2Els.slice(0, 15),
                    h3Els: h3Els.slice(0, 20),
                    metaDesc,
                    contextHeader,
                    bodyTextSnippet: bodyText.slice(0, 4000),
                    jsonLdOffers,
                    jsonLdName,
                    jsonLdRating,
                    jsonLdReviewCount,
                    priceText,
                    strikethroughPrice,
                    specs,
                    tags,
                    breadcrumbs,
                    authorText,
                    thumbnailUrl,
                    demoLink,
                    docsLink,
                    changelogLink,
                    imageAltsCount,
                    comments,
                    commentTabCount,
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
            result["demoLink"] = extracted.get("demoLink")
            result["docsLink"] = extracted.get("docsLink")
            result["changelogLink"] = extracted.get("changelogLink")
            result["imageAltsCount"] = extracted.get("imageAltsCount", 0)
            result["comments"] = extracted.get("comments", [])
            
            # Determine Product Name
            h1 = result["h1"]
            if "–" in h1:
                result["productName"] = h1.split("–")[0].strip()
            elif "-" in h1:
                result["productName"] = h1.split("-")[0].strip()
            elif "|" in h1:
                result["productName"] = h1.split("|")[0].strip()
            elif h1:
                result["productName"] = h1
            else:
                result["productName"] = extracted.get("jsonLdName", "") or result["title"].split("-")[0].strip()
                
            # Pricing Plans
            plans = []
            json_offers = extracted.get("jsonLdOffers")
            if isinstance(json_offers, dict) and "price" in json_offers:
                currency = json_offers.get("priceCurrency", "USD")
                curr_symbol = "$" if currency == "USD" else currency + " "
                reg_price = f"{curr_symbol}{json_offers['price']}"
                plans.append({
                    "name": "Regular License",
                    "priceMonthly": f"{reg_price} (One-time)",
                    "priceAnnual": f"{reg_price} one-time payment",
                    "features": ["Single end product", "6 months author support", "Future updates included"],
                    "isPopular": True
                })
            elif result["priceText"]:
                plans.append({
                    "name": "Regular License",
                    "priceMonthly": f"{result['priceText']} (One-time)",
                    "priceAnnual": f"{result['priceText']} one-time payment",
                    "features": ["Single end product", "6 months author support", "Future updates included"],
                    "isPopular": True
                })
                
            result["pricingPlans"] = plans

            # Check if this is an Envato Market product
            is_envato = "codecanyon.net" in url or "themeforest.net" in url or "graphicriver.net" in url or "videohive.net" in url or "audiojungle.net" in url or "envato.com" in url
            result["isEnvato"] = is_envato

            if is_envato:
                header = extracted.get("contextHeader", "")
                specs = extracted.get("specs", {})
                
                # 1. Total Sales Count
                sales_match = re.search(r'([0-9,]+)\s+sales', header, re.IGNORECASE) or re.search(r'([0-9,]+)\s+sales', extracted.get("bodyTextSnippet", ""), re.IGNORECASE)
                total_sales = None
                if sales_match:
                    try:
                        total_sales = int(sales_match.group(1).replace(',', ''))
                    except:
                        total_sales = None

                # 2. Rating
                rating = None
                if extracted.get("jsonLdRating"):
                    try:
                        rating = float(extracted["jsonLdRating"])
                    except:
                        pass
                if rating is None:
                    rating_match = re.search(r'([0-9\.]+)\s+stars', header, re.IGNORECASE) or re.search(r'([0-9\.]+)\s+average based on', extracted.get("bodyTextSnippet", ""), re.IGNORECASE)
                    if rating_match:
                        try:
                            rating = float(rating_match.group(1))
                        except:
                            pass

                # 3. Review Count
                review_count = None
                if extracted.get("jsonLdReviewCount"):
                    try:
                        review_count = int(extracted["jsonLdReviewCount"])
                    except:
                        pass
                if review_count is None:
                    rev_match = re.search(r'([0-9,]+)\s+ratings', header, re.IGNORECASE) or re.search(r'([0-9,]+)\s+reviews', header, re.IGNORECASE)
                    if rev_match:
                        try:
                            review_count = int(rev_match.group(1).replace(',', ''))
                        except:
                            pass

                # 4. Comment Count
                comment_count = None
                # Check directly from extracted tab count
                if extracted.get("commentTabCount") is not None:
                    comment_count = extracted["commentTabCount"]

                # Check header for 'Comments134', 'Comments (134)', 'Comments: 134', 'Comments2'
                if comment_count is None:
                    comm_match = re.search(r'\bcomments?\s*[:\(-]?\s*([0-9,]+)', header, re.IGNORECASE)
                    if comm_match:
                        try:
                            comment_count = int(comm_match.group(1).replace(',', ''))
                        except:
                            pass

                # Check body text snippet for 'Comments (134)' or 'Comments: 134'
                if comment_count is None:
                    comm_match = re.search(r'\bcomments?\s*[:\(-]?\s*([0-9,]+)', extracted.get("bodyTextSnippet", ""), re.IGNORECASE)
                    if comm_match:
                        try:
                            comment_count = int(comm_match.group(1).replace(',', ''))
                        except:
                            pass

                # Fallback: standalone '[0-9,]+ comments' (ensuring not preceded by ratings/stars)
                if comment_count is None:
                    comm_match = re.search(r'(?:^|[\.\n;\|]|\babout|\bover)\s*([0-9,]+)\s+comments\b', extracted.get("bodyTextSnippet", ""), re.IGNORECASE)
                    if comm_match:
                        try:
                            comment_count = int(comm_match.group(1).replace(',', ''))
                        except:
                            pass

                # If inline comments were scraped, ensure comment_count is at least the scraped count
                if result.get("comments") and len(result["comments"]) > 0:
                    if comment_count is None or len(result["comments"]) > comment_count:
                        comment_count = len(result["comments"])

                # 5. Author Name
                author_name = None
                author_match = re.search(r'By\s+([a-zA-Z0-9_-]+)', header, re.IGNORECASE)
                if author_match:
                    author_name = author_match.group(1)
                elif extracted.get("authorText"):
                    author_name = extracted.get("authorText").replace('By ', '').strip()

                # 6. Category
                category = " / ".join(extracted.get("breadcrumbs", [])) if extracted.get("breadcrumbs") else specs.get("Software Version", "Envato Software Item")

                # 7. Price and Discounted Price
                product_price = result["priceText"] or (f"${json_offers['price']}" if isinstance(json_offers, dict) and "price" in json_offers else "Not specified")
                discounted_price = None
                if extracted.get("strikethroughPrice"):
                    discounted_price = product_price
                    product_price = extracted["strikethroughPrice"]

                # 8. Dates & Status
                pub_date = specs.get("Created")
                last_update = specs.get("Last Update")
                version = specs.get("Software Version") or specs.get("Files Included")
                product_status = "Recently Updated" if "recently updated" in header.lower() else "Active"

                result["envatoSales"] = {
                    "product_name": result["productName"],
                    "product_url": result["finalUrl"],
                    "current_total_sales": total_sales,
                    "product_price": product_price,
                    "discounted_price": discounted_price,
                    "rating": rating,
                    "rating_count": review_count,
                    "review_count": review_count,
                    "comment_count": comment_count,
                    "publication_date": pub_date,
                    "last_update_date": last_update,
                    "version": version,
                    "author_name": author_name,
                    "category": category,
                    "product_status": product_status,
                    "sales_data_unavailable": total_sales is None,
                    "thumbnail_url": result["thumbnailUrl"]
                }

                # Attempt to scrape /comments tab if item has comments and none extracted so far
                if len(result["comments"]) == 0 and ("codecanyon.net/item/" in url or "themeforest.net/item/" in url):
                    try:
                        clean_url = url.split("?")[0].rstrip("/")
                        if not clean_url.endswith("/comments"):
                            comments_url = f"{clean_url}/comments"
                            comments_page = await context.new_page()
                            await Stealth().apply_stealth_async(comments_page)
                            await comments_page.goto(comments_url, wait_until='domcontentloaded', timeout=20000)
                            
                            comments_data = await comments_page.evaluate('''() => {
                                const list = [];
                                document.querySelectorAll('.comment__item, .js-comment, [class*="comment__item"], .comment, [class*="comment-item"], article.comment').forEach((c, idx) => {
                                    if (idx >= 50) return;
                                    const author = c.querySelector('a[href^="/user/"], .comment__author, [class*="author"], a.user-info')?.innerText?.trim() || 'Customer';
                                    const text = c.querySelector('.comment__body, .js-comment__body, .t-preformatted, .comment__content, [class*="comment_body"], .user-html')?.innerText?.trim() || '';
                                    const date = c.querySelector('.comment__date, time, [class*="date"]')?.innerText?.trim() || 'Recently';
                                    const commentUrl = c.querySelector('a.comment__date, a[href*="#comment"], a[href*="/comments/"]')?.href || null;
                                    if (text.length > 10) {
                                        list.push({
                                            author_name: author,
                                            comment_text: text.slice(0, 1000),
                                            comment_date: date,
                                            comment_url: commentUrl,
                                            rating: null
                                        });
                                    }
                                });
                                return list;
                            }''')
                            if comments_data and len(comments_data) > 0:
                                result["comments"] = comments_data
                            await comments_page.close()
                    except Exception as comm_err:
                        pass
            
            # Detect Integrations from content and specs
            specs_str = " ".join([str(v) for v in result["specs"].values()])
            tags_str = " ".join(result["tags"])
            full_context = f"{result['title']} {result['h1']} {result['description']} {specs_str} {tags_str} {' '.join(result['features'])}".lower()
            
            tech_integrations = [
                "Flutter", "React Native", "Laravel", "Node.js", "PHP", "Firebase", 
                "Google Maps", "Stripe", "PayPal", "Razorpay", "Twilio", "AWS", 
                "PostgreSQL", "MySQL", "Redis", "Android", "iOS", "Pusher"
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
