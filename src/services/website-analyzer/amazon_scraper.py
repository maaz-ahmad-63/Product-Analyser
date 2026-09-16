"""
amazon_scraper.py — Amazon product page scraper using crawl4ai + httpx fallback.
Strategy:
  1. Try crawl4ai with stealth Chromium (no hard CSS wait, time-based only)
  2. If no product data, try direct httpx with rotated headers
  3. Parse whichever HTML we get with regex extraction

Outputs JSON compatible with StealthScraperOutput interface used by collector.ts.
Usage: python3 amazon_scraper.py <amazon_product_url>
"""
import sys
import json
import asyncio
import re
import html as html_lib
import random


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _clean(s: str) -> str:
    s = re.sub(r'<[^>]+>', ' ', s or '')
    s = re.sub(r'\s+', ' ', s)
    return html_lib.unescape(s).strip()


def _find(pattern, text, group=1, flags=re.DOTALL | re.IGNORECASE):
    m = re.search(pattern, text or '', flags)
    return m.group(group).strip() if m else None


def _extract_from_html(html: str) -> dict:
    """Pure regex extraction from raw Amazon HTML — works on both full and partial pages."""
    out = {}

    # Is this a CAPTCHA page?
    is_captcha = 'validateCaptcha' in html or 'Type the characters' in html or 'robot check' in html.lower()
    out['is_captcha'] = is_captcha

    # Title
    title = _find(r'id=["\']productTitle["\'][^>]*>\s*(.*?)\s*</span>', html)
    if not title:
        title = _find(r'"title"\s*:\s*"([^"]{10,200})"', html)
    if not title:
        t = _find(r'<title>(.*?)</title>', html)
        if t and 'Amazon' in t:
            title = re.split(r'[:\|]', t)[0].strip()
            title = re.sub(r'\s*[-–]\s*Amazon\.(com|in|co\.uk|de).*$', '', title, flags=re.IGNORECASE).strip()
    out['productTitle'] = _clean(title) if title else ''

    # Meta description
    meta = _find(r'<meta\s+name=["\']description["\']\s+content="([^"]+)"', html) or \
           _find(r'<meta\s+content="([^"]+)"\s+name=["\']description["\']', html)
    out['metaDesc'] = _clean(meta) if meta else ''

    # Thumbnail
    thumb = _find(r'id=["\']landingImage["\'][^>]+src="([^"]+)"', html) or \
            _find(r'id=["\']imgBlkFront["\'][^>]+src="([^"]+)"', html) or \
            _find(r'"large"\s*:\s*"(https://m\.media-amazon\.com[^"]+)"', html) or \
            _find(r'<meta\s+property=["\']og:image["\']\s+content="([^"]+)"', html)
    out['thumbnailUrl'] = thumb

    # Price — multiple patterns
    price = None
    # Input hidden price
    m = re.search(r'name="[^"]*customerVisiblePrice[^"]*displayString[^"]*"\s+value="([^"]+)"', html)
    if m:
        price = m.group(1).strip()
    # a-offscreen inside corePrice_feature_div
    if not price:
        m = re.search(r'id="corePrice_feature_div".*?class="a-offscreen">\s*(.*?)\s*</span>', html, re.DOTALL)
        if m:
            p = _clean(m.group(1))
            if re.search(r'[\d,]{2,}', p):
                price = p
    # apexPriceToPay
    if not price:
        m = re.search(r'apexPriceToPay.*?class="a-offscreen">\s*(.*?)\s*</span>', html, re.DOTALL)
        if m:
            p = _clean(m.group(1))
            if re.search(r'[\d,]{2,}', p):
                price = p
    # General a-price offscreen (first match)
    if not price:
        m = re.search(r'class="a-offscreen">\s*((?:₹|\$|€|£|Rs\.?)\s*[\d,]+(?:\.\d{1,2})?)\s*</span>', html)
        if m:
            price = m.group(1).strip()
    # priceblock_ourprice / dealprice
    if not price:
        m = re.search(r'id="priceblock_(?:ourprice|dealprice|saleprice)"[^>]*>\s*(.*?)\s*</span>', html, re.DOTALL)
        if m:
            p = _clean(m.group(1))
            if re.search(r'[\d,]{2,}', p):
                price = p
    # JSON in page data
    if not price:
        m = re.search(r'"priceAmount"\s*:\s*([\d.]+)', html)
        if m:
            price = f"₹{float(m.group(1)):,.2f}"
    # Currency + digits from body
    if not price:
        m = re.search(r'(₹|Rs\.?)\s*([\d,]{3,}(?:\.\d{2})?)', html)
        if m:
            price = f"{m.group(1)}{m.group(2)}"
    out['priceText'] = _clean(price) if price else ''

    # Strikethrough price
    strike = _find(r'class="a-text-price"[^>]*>.*?class="a-offscreen">\s*(.*?)\s*</span>', html)
    out['strikethroughPrice'] = _clean(strike) if strike else None

    # Rating
    rating = None
    m = re.search(r'([0-9]\.[0-9])\s+out of 5\s+stars', html, re.IGNORECASE)
    if m:
        try:
            rating = float(m.group(1))
        except Exception:
            pass
    if not rating:
        m = re.search(r'"ratingScore"\s*:\s*"?([\d.]+)"?', html)
        if m:
            try:
                rating = float(m.group(1))
            except Exception:
                pass
    out['ratingVal'] = rating

    # Review count
    review_count = None
    m = re.search(r'([0-9,]+)\s+(?:global\s+)?(?:customer\s+)?ratings?', html, re.IGNORECASE)
    if m:
        try:
            review_count = int(m.group(1).replace(',', ''))
        except Exception:
            pass
    if not review_count:
        m = re.search(r'"totalReviewCount"\s*:\s*(\d+)', html)
        if m:
            try:
                review_count = int(m.group(1))
            except Exception:
                pass
    out['reviewCountVal'] = review_count

    # Sales velocity
    sv = _find(r'social-proofing-faceout-title[^>]*>([^<]+)<', html) or \
         _find(r'([0-9,]+K?\+?\s+bought\s+in\s+past\s+month)', html)
    out['salesVelocityText'] = _clean(sv) if sv else None

    # Feature bullets
    features = []
    bullet_section = re.search(r'id=["\']feature-bullets["\'].*?</ul>', html, re.DOTALL)
    if bullet_section:
        bullets = re.findall(r'class="a-list-item">\s*(.*?)\s*</span>', bullet_section.group(0), re.DOTALL)
        for b in bullets:
            t = _clean(b)
            nav_words = ['shift', 'skip to main', 'press enter', 'keyboard', 'opt +', 'checkout']
            if 8 <= len(t) <= 400 and t not in features and not any(w in t.lower() for w in nav_words):
                features.append(t)
    # JSON bullets fallback
    if not features:
        for m_b in re.finditer(r'"feature"\s*:\s*"([^"]{10,400})"', html):
            t = _clean(m_b.group(1))
            if t and t not in features:
                features.append(t)
    out['features'] = features[:30]

    # Specs
    specs = {}
    po_pattern = re.compile(r'class="po-row[^"]*"(.*?)(?=class="po-row|</table)', re.DOTALL)
    for row_m in po_pattern.finditer(html):
        row = row_m.group(1)
        k_m = re.search(r'class="po-title[^"]*"[^>]*>.*?<span[^>]*>(.*?)</span>', row, re.DOTALL)
        v_m = re.search(r'class="po-value[^"]*"[^>]*>.*?<span[^>]*>(.*?)</span>', row, re.DOTALL)
        if k_m and v_m:
            k = _clean(k_m.group(1))
            v = _clean(v_m.group(1))
            if k and v and k != v and 'Best Sellers' not in k and 'Customer Reviews' not in k:
                specs[k] = v
    for tr in re.findall(r'<tr[^>]*>.*?</tr>', html, re.DOTALL):
        th = re.search(r'<th[^>]*>(.*?)</th>', tr, re.DOTALL)
        td = re.search(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        if th and td:
            k = _clean(th.group(1)).replace('\u200e', '').replace('\u200f', '').strip(' :')
            v = _clean(td.group(1))
            if k and v and k != v and len(k) < 60 and 'Best Sellers' not in k and 'Customer Reviews' not in k and k not in specs:
                specs[k] = v
    out['specs'] = specs

    # BSR
    bsr = None
    bsr_m = re.search(r'#\s*([0-9,]+)\s+in\s+([A-Za-z ,&\-/]+?)(?:\s*<|\s*\(|\s*\n)', html)
    if bsr_m:
        try:
            rank = int(bsr_m.group(1).replace(',', ''))
            cat = bsr_m.group(2).strip().rstrip(',& -/')
            if rank < 10_000_000 and 3 < len(cat) < 80:
                bsr = {'rank': rank, 'rankFormatted': f'#{rank:,}', 'category': cat,
                       'subcategories': [], 'rawText': f'#{rank:,} in {cat}'}
        except Exception:
            pass
    out['amazonBsr'] = bsr

    # Brand / Author
    author = _find(r'id=["\']bylineInfo["\'][^>]*>(.*?)</(?:a|span)', html)
    out['authorText'] = _clean(author) if author else ''

    # Reviews
    comments = []
    for block in re.findall(r'data-hook="review".*?(?=data-hook="review"|</ol>)', html, re.DOTALL)[:20]:
        a_m = re.search(r'class="a-profile-name"[^>]*>([^<]+)<', block)
        t_m = re.search(r'data-hook="review-body"[^>]*>.*?<span[^>]*>(.*?)</span>', block, re.DOTALL)
        d_m = re.search(r'data-hook="review-date"[^>]*>([^<]+)<', block)
        r_m = re.search(r'([0-9.]+) out of 5 stars', block)
        if t_m:
            text = _clean(t_m.group(1))
            if len(text) > 10:
                comments.append({
                    'author_name': _clean(a_m.group(1)) if a_m else 'Amazon Customer',
                    'comment_text': text[:1000],
                    'comment_date': _clean(d_m.group(1)) if d_m else 'Recently',
                    'comment_url': None,
                    'rating': float(r_m.group(1)) if r_m else None
                })
    out['comments'] = comments

    # H2 headings
    out['h2Els'] = [_clean(h) for h in re.findall(r'<h2[^>]*>(.*?)</h2>', html, re.DOTALL)
                   if _clean(h) and len(_clean(h)) < 200][:15]

    # Image alts count
    out['imageAltsCount'] = len([a for a in re.findall(r'<img[^>]+alt="([^"]+)"', html) if a.strip()])

    return out


async def _try_httpx(url: str) -> str | None:
    """Fallback: plain HTTPS request with realistic headers — works when bot-detection is session-based."""
    try:
        import httpx
    except ImportError:
        return None

    user_agents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ]
    headers = {
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
    }
    try:
        async with httpx.AsyncClient(
            headers=headers,
            follow_redirects=True,
            timeout=25.0,
            http2=True,
        ) as client:
            resp = await client.get(url)
            html = resp.text
            # Accept if we got actual product content
            if ('productTitle' in html or 'feature-bullets' in html or 'a-price' in html):
                return html
            return None
    except Exception as e:
        return None


async def scrape_amazon(url: str) -> dict:
    result = {
        'success': False,
        'url': url,
        'finalUrl': url,
        'title': '',
        'h1': '',
        'description': '',
        'productName': '',
        'priceText': '',
        'pricingPlans': [],
        'features': [],
        'integrations': [],
        'tags': [],
        'specs': {},
        'html': '',
        'thumbnailUrl': None,
        'headings': {'h1': [], 'h2': [], 'h3': []},
        'imageAltsCount': 0,
        'demoLink': None,
        'docsLink': None,
        'changelogLink': None,
        'comments': [],
        'error': None,
        'isEnvato': False,
        'isAmazon': True,
        'isShopify': False,
        'amazonBsr': None,
        'amazonPurchaseBadge': None,
        'envatoSales': {
            'product_name': '',
            'product_url': url,
            'current_total_sales': None,
            'product_price': None,
            'discounted_price': None,
            'rating': None,
            'rating_count': None,
            'review_count': None,
            'comment_count': None,
            'publication_date': None,
            'last_update_date': None,
            'version': None,
            'author_name': None,
            'category': 'Amazon Marketplace',
            'product_status': 'Active',
            'sales_data_unavailable': True,
            'thumbnail_url': None
        }
    }

    html_content = None

    # ── Strategy 1: crawl4ai with stealth browser (no hard CSS wait) ──────────
    try:
        from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

        browser_cfg = BrowserConfig(
            browser_type='chromium',
            headless=True,
            verbose=False,
            extra_args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-infobars',
                '--window-size=1440,900',
                '--disable-web-security',
                '--lang=en-IN',
            ],
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            headers={
                'Accept-Language': 'en-IN,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
            },
        )

        # NOTE: No wait_for CSS selector — Amazon may not render #productTitle
        # if it shows a CAPTCHA first. Use pure time-based wait instead.
        run_cfg = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            wait_for=None,                     # ← no hard CSS wait
            delay_before_return_html=5.0,      # wait 5s for JS to settle
            page_timeout=50000,
            simulate_user=True,
            magic=True,
            override_navigator=True,
            remove_overlay_elements=True,
        )

        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            crawl_result = await crawler.arun(url=url, config=run_cfg)

        if crawl_result and crawl_result.html:
            raw_html = crawl_result.html
            # Only use this if it actually has product data (not just CAPTCHA)
            if 'productTitle' in raw_html or 'feature-bullets' in raw_html or 'a-price' in raw_html:
                html_content = raw_html
                result['finalUrl'] = crawl_result.url or url
                if crawl_result.metadata:
                    result['title'] = crawl_result.metadata.get('title', '')
    except Exception as e:
        result['error'] = f'crawl4ai: {str(e)}'

    # ── Strategy 2: httpx fallback (no headless detection) ────────────────────
    if not html_content:
        html_content = await _try_httpx(url)
        if html_content:
            # Extract title from HTML
            t = _find(r'<title>(.*?)</title>', html_content)
            if t:
                result['title'] = re.sub(r'\s*[-–:]\s*Amazon\.(com|in|co\.uk).*$', '', t, flags=re.IGNORECASE).strip()

    if not html_content:
        result['error'] = (result.get('error') or 'All scraping strategies failed') + ' | httpx also blocked'
        print(json.dumps(result, ensure_ascii=False))
        return result

    # ── Parse the HTML we have ────────────────────────────────────────────────
    result['html'] = html_content
    extracted = _extract_from_html(html_content)

    result['h1'] = extracted.get('productTitle', '')
    if not result['title']:
        result['title'] = result['h1']
    result['headings']['h1'] = [result['h1']] if result['h1'] else []
    result['headings']['h2'] = extracted.get('h2Els', [])
    result['description'] = extracted.get('metaDesc', '')
    result['priceText'] = extracted.get('priceText', '')
    result['features'] = extracted.get('features', [])
    result['specs'] = extracted.get('specs', {})
    result['thumbnailUrl'] = extracted.get('thumbnailUrl')
    result['imageAltsCount'] = extracted.get('imageAltsCount', 0)
    result['comments'] = extracted.get('comments', [])
    result['amazonBsr'] = extracted.get('amazonBsr')
    result['amazonPurchaseBadge'] = extracted.get('salesVelocityText')
    result['productName'] = (
        extracted.get('productTitle') or
        result['title'].split(' - ')[0].strip() or
        result['title'].split(':')[0].strip() or
        result['title']
    )

    sv_text = extracted.get('salesVelocityText')
    total_sales = None
    if sv_text:
        m = re.search(r'([0-9,]+K?)\+?\s+bought', sv_text, re.IGNORECASE)
        if m:
            raw = m.group(1).upper()
            try:
                total_sales = int(float(raw.replace('K', '')) * 1000) if 'K' in raw else int(raw.replace(',', ''))
            except Exception:
                pass

    if result['priceText']:
        result['pricingPlans'] = [{
            'name': 'Standard Price',
            'priceMonthly': result['priceText'],
            'priceAnnual': result['priceText'],
            'features': result['features'][:4] if result['features'] else ['Full product access'],
            'isPopular': True
        }]

    result['envatoSales'] = {
        'product_name': result['productName'],
        'product_url': result['finalUrl'],
        'current_total_sales': total_sales,
        'product_price': result['priceText'] or None,
        'discounted_price': extracted.get('strikethroughPrice'),
        'rating': extracted.get('ratingVal'),
        'rating_count': extracted.get('reviewCountVal'),
        'review_count': extracted.get('reviewCountVal'),
        'comment_count': len(result['comments']),
        'publication_date': None,
        'last_update_date': None,
        'version': result['specs'].get('Model') or result['specs'].get('Item model number') or None,
        'author_name': extracted.get('authorText') or None,
        'category': 'Amazon Marketplace',
        'product_status': 'Active',
        'sales_data_unavailable': total_sales is None,
        'thumbnail_url': result['thumbnailUrl']
    }

    # Mark success if we extracted anything meaningful
    if result['productName'] or result['priceText'] or result['features'] or extracted.get('ratingVal'):
        result['success'] = True

    return result


async def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No URL provided'}))
        sys.exit(1)
    url = sys.argv[1]
    result = await scrape_amazon(url)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    asyncio.run(main())
