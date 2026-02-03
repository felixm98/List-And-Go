"""
Advanced SEO Scorer for Etsy Listings
=====================================
Calculates a comprehensive 0-100 SEO score based on Etsy's actual
ranking algorithm factors and best practices.

Scoring Factors:
- Title Optimization (30%): Length, keyword placement, structure
- Tag Quality (25%): Diversity, long-tail phrases, relevance
- Description Quality (25%): Length, structure, keyword integration
- Keyword Consistency (20%): Cross-field optimization
"""

import re
from collections import Counter
from datetime import datetime

# =============================================================================
# ETSY HIGH-VALUE KEYWORDS DATABASE
# =============================================================================

# Product Type Keywords (high search volume)
PRODUCT_KEYWORDS = {
    'mockup', 'template', 'design', 'graphic', 'illustration', 'clipart',
    'pattern', 'bundle', 'kit', 'pack', 'set', 'collection', 'font',
    'logo', 'icon', 'vector', 'texture', 'background', 'overlay',
    'frame', 'border', 'banner', 'flyer', 'poster', 'card', 'invitation'
}

# Format/Delivery Keywords
FORMAT_KEYWORDS = {
    'digital download', 'instant download', 'printable', 'pdf', 'png',
    'svg', 'eps', 'ai', 'psd', 'jpeg', 'jpg', 'editable', 'customizable',
    'print ready', 'high resolution', 'commercial use', 'commercial license'
}

# Style Keywords (trending aesthetics)
STYLE_KEYWORDS = {
    'minimalist', 'modern', 'vintage', 'retro', 'boho', 'bohemian',
    'rustic', 'farmhouse', 'elegant', 'luxury', 'aesthetic', 'trendy',
    'classic', 'contemporary', 'scandinavian', 'mid century', 'art deco',
    'watercolor', 'hand drawn', 'handmade', 'artisan', 'organic'
}

# Occasion Keywords (gift-giving triggers)
OCCASION_KEYWORDS = {
    'wedding', 'birthday', 'christmas', 'valentine', 'easter', 'halloween',
    'thanksgiving', 'mother day', 'father day', 'graduation', 'baby shower',
    'bridal shower', 'anniversary', 'engagement', 'housewarming', 'retirement'
}

# Recipient Keywords (buyer intent triggers)
RECIPIENT_KEYWORDS = {
    'gift for her', 'gift for him', 'gift for mom', 'gift for dad',
    'gift for wife', 'gift for husband', 'gift for friend', 'gift for teacher',
    'bridesmaid gift', 'groomsmen gift', 'hostess gift', 'personalized gift'
}

# Business Keywords (B2B buyers)
BUSINESS_KEYWORDS = {
    'small business', 'etsy seller', 'shopify', 'print on demand', 'pod',
    'canva', 'photoshop', 'branding', 'marketing', 'social media', 'instagram'
}

# Combine all high-value keywords
HIGH_VALUE_KEYWORDS = (
    PRODUCT_KEYWORDS | FORMAT_KEYWORDS | STYLE_KEYWORDS |
    OCCASION_KEYWORDS | RECIPIENT_KEYWORDS | BUSINESS_KEYWORDS
)

# Words that waste title space
FILLER_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'very', 'really', 'just', 'only', 'also', 'even', 'still', 'already',
    'cute', 'nice', 'great', 'awesome', 'amazing', 'beautiful', 'lovely',
    'best', 'good', 'super', 'cool', 'pretty', 'perfect'  # Subjective fillers
}

# Overused/spam words that hurt rankings
SPAM_WORDS = {
    'best seller', 'bestseller', 'top rated', 'viral', 'trending now',
    'limited time', 'sale', 'discount', 'cheap', 'free', 'bargain'
}


def calculate_seo_score(title: str, description: str, tags: list) -> dict:
    """
    Calculate comprehensive SEO score for an Etsy listing.
    
    Args:
        title: Listing title (max 140 chars)
        description: Listing description
        tags: List of up to 13 tags
    
    Returns:
        Dictionary with overall score, breakdown, tips, and grade
    """
    scores = {
        'title_score': calculate_title_score(title),
        'description_score': calculate_description_score(description),
        'tag_score': calculate_tag_score(tags),
        'keyword_score': calculate_keyword_score(title, description, tags)
    }
    
    # Weighted average based on Etsy algorithm importance
    weights = {
        'title_score': 0.30,      # Title is most important for search
        'tag_score': 0.25,        # Tags are crucial for discovery
        'description_score': 0.25, # Description affects conversion
        'keyword_score': 0.20     # Consistency signals relevance
    }
    
    overall = sum(scores[k] * weights[k] for k in scores)
    
    # Generate actionable tips
    tips = generate_tips(title, description, tags, scores)
    
    # Detailed analysis
    analysis = analyze_listing(title, description, tags)
    
    return {
        'overall_score': round(overall),
        'breakdown': scores,
        'tips': tips,
        'grade': get_grade(overall),
        'analysis': analysis
    }


def calculate_title_score(title: str) -> int:
    """
    Score the title based on Etsy SEO best practices (0-100).
    
    Factors:
    - Length utilization (optimal: 100-140 chars)
    - Keyword placement (front-loading)
    - Structure (pipe separators)
    - Keyword quality
    - Avoiding filler/spam words
    """
    if not title:
        return 0
    
    score = 0
    title_lower = title.lower()
    words = title_lower.split()
    
    # 1. Length scoring (25 points max)
    # Etsy shows ~55-65 chars in search, but indexes all 140
    length = len(title)
    if 120 <= length <= 140:
        score += 25  # Optimal - using full space
    elif 100 <= length < 120:
        score += 22
    elif 80 <= length < 100:
        score += 18
    elif 60 <= length < 80:
        score += 12
    elif length > 140:
        score += 5   # Will be truncated
    else:
        score += 8   # Too short - wasted opportunity
    
    # 2. Front-loading keywords (25 points max)
    # First 40 characters are crucial for search visibility
    first_40_chars = title_lower[:40]
    first_words = first_40_chars.split()[:5]
    
    high_value_in_front = sum(1 for word in first_words 
                              if word in HIGH_VALUE_KEYWORDS or
                              any(kw in first_40_chars for kw in HIGH_VALUE_KEYWORDS if len(kw) > 3))
    score += min(high_value_in_front * 8, 25)
    
    # 3. Structure and readability (15 points max)
    if '|' in title or ' - ' in title:
        score += 10  # Good visual separation
    if not title.isupper():
        score += 5   # Not all caps (looks spammy)
    
    # 4. Keyword richness (20 points max)
    title_bigrams = set()
    title_words_list = title_lower.split()
    for i in range(len(title_words_list) - 1):
        title_bigrams.add(f"{title_words_list[i]} {title_words_list[i+1]}")
    
    all_title_terms = set(title_words_list) | title_bigrams
    matching_keywords = sum(1 for kw in HIGH_VALUE_KEYWORDS if kw in all_title_terms or kw in title_lower)
    score += min(matching_keywords * 4, 20)
    
    # 5. Avoid filler/spam words (15 points max - penalty based)
    base_points = 15
    filler_count = sum(1 for w in words if w in FILLER_WORDS)
    spam_found = any(spam in title_lower for spam in SPAM_WORDS)
    
    penalty = filler_count * 2
    if spam_found:
        penalty += 10
    
    score += max(base_points - penalty, 0)
    
    return min(score, 100)


def calculate_description_score(description: str) -> int:
    """
    Score the description based on conversion and SEO factors (0-100).
    
    Factors:
    - Length (optimal: 500-1500 chars for readability)
    - First 160 chars (appears in search results)
    - Structure (bullet points, sections)
    - Emoji usage (engagement)
    - Keyword integration
    - Call to action
    """
    if not description:
        return 0
    
    score = 0
    desc_lower = description.lower()
    
    # 1. Length scoring (20 points max)
    length = len(description)
    if 800 <= length <= 2000:
        score += 20  # Optimal length
    elif 500 <= length < 800:
        score += 16
    elif 2000 < length <= 3000:
        score += 18  # Long but still good
    elif 300 <= length < 500:
        score += 12
    else:
        score += 6   # Too short or extremely long
    
    # 2. First 160 characters hook (15 points max)
    first_160 = desc_lower[:160]
    has_hook = any(hook in first_160 for hook in [
        '✨', '⭐', '🎁', '💫', '🔥',  # Attention-grabbing emojis
        'perfect', 'beautiful', 'unique', 'handmade', 'premium',
        'instant', 'download', 'included', 'gift'
    ])
    has_keyword_in_hook = any(kw in first_160 for kw in list(HIGH_VALUE_KEYWORDS)[:20])
    
    if has_hook:
        score += 8
    if has_keyword_in_hook:
        score += 7
    
    # 3. Structure and formatting (20 points max)
    structure_score = 0
    
    # Bullet points or list items
    if any(marker in description for marker in ['•', '✓', '✔', '★', '►', '→', '·', '-  ']):
        structure_score += 8
    
    # Section headers (ALL CAPS or emoji headers)
    if re.search(r'[A-Z]{4,}:', description) or re.search(r'[🎁📦💡✨⭐🔥📩][A-Z\s]+:', description):
        structure_score += 6
    
    # Line breaks for readability
    line_count = description.count('\n')
    if line_count >= 5:
        structure_score += 6
    elif line_count >= 3:
        structure_score += 4
    
    score += min(structure_score, 20)
    
    # 4. Emoji engagement (10 points max)
    emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF]')
    emoji_count = len(emoji_pattern.findall(description))
    if 3 <= emoji_count <= 15:
        score += 10  # Good balance
    elif emoji_count > 0:
        score += 5
    
    # 5. Important sections present (20 points max)
    sections = {
        'what you get': ['what you get', 'included', "what's included", 'you will receive'],
        'features': ['feature', 'benefit', 'perfect for', 'great for', 'ideal for'],
        'how to': ['how to', 'how it works', 'instructions', 'steps'],
        'faq': ['faq', 'question', 'note:', 'please note'],
        'cta': ['favorite', 'follow', 'shop', 'message', 'contact']
    }
    
    sections_found = sum(1 for section_kws in sections.values() 
                        if any(kw in desc_lower for kw in section_kws))
    score += min(sections_found * 4, 20)
    
    # 6. Keyword integration (15 points max)
    keyword_matches = sum(1 for kw in HIGH_VALUE_KEYWORDS if kw in desc_lower)
    score += min(keyword_matches * 2, 15)
    
    return min(score, 100)


def calculate_tag_score(tags: list) -> int:
    """
    Score the tags based on Etsy tag best practices (0-100).
    
    Factors:
    - Using all 13 tags
    - Multi-word phrases (long-tail)
    - No duplicates
    - Tag length optimization
    - Keyword variety
    """
    if not tags:
        return 0
    
    score = 0
    
    # 1. Number of tags (25 points max)
    tag_count = len(tags)
    if tag_count == 13:
        score += 25  # Perfect - using all available slots
    elif tag_count >= 11:
        score += 20
    elif tag_count >= 8:
        score += 12
    elif tag_count >= 5:
        score += 6
    else:
        score += 2
    
    # 2. Tag uniqueness (15 points max)
    unique_tags = set(t.lower().strip() for t in tags)
    if len(unique_tags) == len(tags):
        score += 15  # No duplicates
    else:
        duplicate_penalty = (len(tags) - len(unique_tags)) * 3
        score += max(15 - duplicate_penalty, 0)
    
    # 3. Multi-word tags - long-tail strategy (20 points max)
    multi_word_tags = sum(1 for t in tags if ' ' in t.strip())
    if multi_word_tags >= 10:
        score += 20  # Excellent long-tail focus
    elif multi_word_tags >= 7:
        score += 15
    elif multi_word_tags >= 4:
        score += 10
    else:
        score += 3   # Too many single-word tags
    
    # 4. Tag length optimization (15 points max)
    # Optimal: 10-20 characters per tag
    optimal_length_tags = sum(1 for t in tags if 8 <= len(t.strip()) <= 20)
    score += min(optimal_length_tags * 1.5, 15)
    
    # 5. Keyword coverage (25 points max)
    all_tag_words = set()
    for tag in tags:
        all_tag_words.update(tag.lower().split())
        all_tag_words.add(tag.lower())  # Add full phrase too
    
    # Check coverage across different keyword categories
    category_coverage = 0
    if any(kw in all_tag_words or any(kw in t.lower() for t in tags) for kw in PRODUCT_KEYWORDS):
        category_coverage += 5
    if any(kw in all_tag_words or any(kw in t.lower() for t in tags) for kw in FORMAT_KEYWORDS):
        category_coverage += 5
    if any(kw in all_tag_words or any(kw in t.lower() for t in tags) for kw in STYLE_KEYWORDS):
        category_coverage += 5
    if any(kw in all_tag_words or any(kw in t.lower() for t in tags) for kw in OCCASION_KEYWORDS):
        category_coverage += 5
    if any(kw in all_tag_words or any(kw in t.lower() for t in tags) for kw in RECIPIENT_KEYWORDS):
        category_coverage += 5
    
    score += min(category_coverage, 25)
    
    return min(score, 100)


def calculate_keyword_score(title: str, description: str, tags: list) -> int:
    """
    Score keyword consistency and strategic placement (0-100).
    
    Factors:
    - Keywords appear across title, tags, and description
    - No over-repetition (keyword stuffing)
    - Strategic keyword variety
    """
    if not title or not tags:
        return 0
    
    score = 0
    
    # Extract significant words from title
    title_lower = title.lower()
    title_words = set(w for w in title_lower.split() if w not in FILLER_WORDS and len(w) > 2)
    
    # Extract tag keywords
    tag_words = set()
    tag_phrases = set()
    for tag in tags:
        tag_lower = tag.lower().strip()
        tag_phrases.add(tag_lower)
        tag_words.update(tag_lower.split())
    tag_words -= FILLER_WORDS
    
    # 1. Title keywords in tags (25 points max)
    # Important words from title should NOT be in tags (Etsy indexes separately)
    # But related concepts should be
    title_tag_overlap = title_words & tag_words
    if 1 <= len(title_tag_overlap) <= 3:
        score += 25  # Some strategic overlap
    elif len(title_tag_overlap) == 0:
        score += 15  # Good - no wasted tag space
    else:
        score += 10  # Too much overlap wastes tag space
    
    # 2. Tags reinforce title concept (25 points max)
    if description:
        desc_lower = description.lower()
        tags_in_desc = sum(1 for tag in tag_phrases if tag in desc_lower)
        title_words_in_desc = sum(1 for w in title_words if w in desc_lower)
        
        # Tags should appear naturally in description
        if tags_in_desc >= 5:
            score += 15
        elif tags_in_desc >= 3:
            score += 10
        else:
            score += 5
        
        # Title concepts should be in description
        if title_words_in_desc >= 5:
            score += 10
        elif title_words_in_desc >= 3:
            score += 7
        else:
            score += 3
    
    # 3. Keyword variety - not repeating same words (25 points max)
    all_words = list(title_words) + list(tag_words)
    word_freq = Counter(all_words)
    
    # Penalize over-repetition
    over_repeated = sum(1 for word, count in word_freq.items() if count > 3)
    variety_score = 25 - (over_repeated * 5)
    score += max(variety_score, 0)
    
    # 4. High-value keyword usage (25 points max)
    all_text = f"{title} {description if description else ''} {' '.join(tags)}".lower()
    high_value_found = sum(1 for kw in HIGH_VALUE_KEYWORDS if kw in all_text)
    score += min(high_value_found * 3, 25)
    
    return min(score, 100)


def analyze_listing(title: str, description: str, tags: list) -> dict:
    """
    Provide detailed analysis of the listing.
    """
    title_lower = title.lower() if title else ''
    
    # Identify found keywords by category
    found_categories = {
        'product_types': [kw for kw in PRODUCT_KEYWORDS if kw in title_lower],
        'formats': [kw for kw in FORMAT_KEYWORDS if kw in title_lower],
        'styles': [kw for kw in STYLE_KEYWORDS if kw in title_lower],
        'occasions': [kw for kw in OCCASION_KEYWORDS if kw in title_lower],
    }
    
    # Title analysis
    title_analysis = {
        'length': len(title) if title else 0,
        'optimal_length': 120 <= len(title) <= 140 if title else False,
        'uses_separators': '|' in title or ' - ' in title if title else False,
        'front_loaded': bool(found_categories['product_types']) or bool(found_categories['formats'])
    }
    
    # Tag analysis
    tag_analysis = {
        'count': len(tags),
        'multi_word_count': sum(1 for t in tags if ' ' in t),
        'avg_length': sum(len(t) for t in tags) / len(tags) if tags else 0,
        'unique_count': len(set(t.lower() for t in tags))
    }
    
    return {
        'keyword_categories_found': found_categories,
        'title_analysis': title_analysis,
        'tag_analysis': tag_analysis,
        'seasonal_relevance': get_current_seasonal_keywords()
    }


def get_current_seasonal_keywords() -> list:
    """Get relevant seasonal keywords for current month."""
    month = datetime.now().month
    
    seasonal_map = {
        1: ['new year', 'organization', 'planner', 'resolution'],
        2: ['valentine', 'love', 'romantic', 'galentine'],
        3: ['spring', 'easter', 'st patrick', 'pastel'],
        4: ['easter', 'spring wedding', 'earth day', 'mother day'],
        5: ['mother day', 'graduation', 'teacher appreciation'],
        6: ['father day', 'summer', 'wedding', 'graduation'],
        7: ['summer', 'fourth july', 'patriotic', 'beach'],
        8: ['back to school', 'teacher gift', 'fall prep'],
        9: ['fall', 'autumn', 'back to school', 'pumpkin'],
        10: ['halloween', 'fall', 'thanksgiving prep', 'spooky'],
        11: ['thanksgiving', 'black friday', 'christmas prep', 'holiday'],
        12: ['christmas', 'holiday', 'hanukkah', 'new year', 'gift']
    }
    
    return seasonal_map.get(month, ['evergreen'])


def generate_tips(title: str, description: str, tags: list, scores: dict) -> list:
    """Generate actionable improvement tips based on score breakdown."""
    tips = []
    
    # Title tips
    if scores['title_score'] < 80:
        if title and len(title) < 100:
            tips.append({
                'priority': 'high',
                'field': 'title',
                'tip': f"📝 Titeln är bara {len(title)} tecken. Använd alla 140 tecken för maximal synlighet!",
                'impact': '+15% söktrafik'
            })
        if title and '|' not in title and ' - ' not in title:
            tips.append({
                'priority': 'medium',
                'field': 'title',
                'tip': "📝 Lägg till | eller - för att separera nyckelord och göra titeln mer läsbar",
                'impact': '+5% klickfrekvens'
            })
    
    # Description tips
    if scores['description_score'] < 80:
        if description and len(description) < 500:
            tips.append({
                'priority': 'high',
                'field': 'description',
                'tip': "📄 Beskrivningen är för kort! Lägg till mer detaljer, bullet points och FAQ-sektion",
                'impact': '+20% konvertering'
            })
        if description and not any(e in description for e in ['✨', '📦', '🎁', '⭐', '💡']):
            tips.append({
                'priority': 'low',
                'field': 'description',
                'tip': "📄 Lägg till emojis för att göra beskrivningen mer engagerande och scanbar",
                'impact': '+10% engagemang'
            })
    
    # Tag tips
    if scores['tag_score'] < 80:
        if len(tags) < 13:
            tips.append({
                'priority': 'high',
                'field': 'tags',
                'tip': f"🏷️ Använd alla 13 tags! Du har bara {len(tags)} - varje tag är en sökväg!",
                'impact': '+30% upptäckt'
            })
        
        multi_word = sum(1 for t in tags if ' ' in t)
        if multi_word < 8:
            tips.append({
                'priority': 'medium',
                'field': 'tags',
                'tip': "🏷️ Använd fler flerordstags (long-tail). 'digital download' istället för 'digital'",
                'impact': '+25% relevans'
            })
    
    # Keyword tips
    if scores['keyword_score'] < 70:
        tips.append({
            'priority': 'medium',
            'field': 'keywords',
            'tip': "🔑 Säkerställ att huvudnyckelord finns naturligt i både titel och beskrivning",
            'impact': '+15% ranking'
        })
    
    # Seasonal tip
    seasonal = get_current_seasonal_keywords()
    if seasonal:
        tips.append({
            'priority': 'low',
            'field': 'seasonal',
            'tip': f"📅 Säsongsord just nu: {', '.join(seasonal[:3])}. Överväg att lägga till relevanta!",
            'impact': '+10-50% säsongstrafik'
        })
    
    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    tips.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 2))
    
    return tips[:6]  # Max 6 tips


def get_grade(score: int) -> str:
    """Convert score to letter grade with description."""
    if score >= 95:
        return 'A+'
    elif score >= 90:
        return 'A'
    elif score >= 85:
        return 'A-'
    elif score >= 80:
        return 'B+'
    elif score >= 75:
        return 'B'
    elif score >= 70:
        return 'B-'
    elif score >= 65:
        return 'C+'
    elif score >= 60:
        return 'C'
    elif score >= 50:
        return 'D'
    else:
        return 'F'
