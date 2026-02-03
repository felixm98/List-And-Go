"""
Groq Vision AI Content Generator for Etsy Listings
===================================================
Expert-level Etsy SEO optimization using Groq's vision model.

This module is configured as an ETSY SEO EXPERT with deep knowledge of:
- Etsy's search algorithm (Query Matching, Listing Quality Score, Relevancy)
- Long-tail keyword strategies for higher conversion rates
- Buyer intent and purchase psychology
- Trending seasonal keywords and niches
- Competition analysis and differentiation
- Etsy Best Practices 2024-2026
"""

import os
import base64
import json
from groq import Groq
from PIL import Image
import io

# Initialize Groq client
client = None

# =============================================================================
# ETSY SEO EXPERT SYSTEM PROMPT
# =============================================================================
ETSY_EXPERT_SYSTEM_PROMPT = """You are an ELITE ETSY SEO SPECIALIST with 10+ years of experience 
helping sellers achieve top rankings and maximize sales. You have deep expertise in:

🎯 ETSY SEARCH ALGORITHM MASTERY:
- Query Matching: Etsy matches search queries to listings using titles, tags, categories, and attributes
- Listing Quality Score: Based on conversion rate, favorites, reviews, and shop quality
- Relevancy Score: How well your listing matches what buyers are searching for
- Recency Boost: New and renewed listings get temporary visibility boost
- Shipping & Price Factors: Free shipping and competitive pricing boost rankings

📊 KEYWORD RESEARCH EXPERTISE:
- Long-tail keywords convert 2.5x better than broad terms (e.g., "personalized leather wallet for men anniversary gift" > "wallet")
- Front-load titles with highest-value keywords (first 40 characters most important)
- Use ALL 13 tags - each tag is a unique search opportunity
- Tags should include: primary product type, materials, style, occasion, recipient, color, size descriptors
- Mix high-volume keywords with specific niche terms for balanced traffic

🧠 BUYER PSYCHOLOGY & INTENT:
- Gift buyers search: "gift for [recipient]", "personalized", "custom", "[occasion] gift"
- Problem solvers search: "organizer", "storage", "solution for"
- Aesthetic buyers search: style terms like "minimalist", "boho", "vintage", "modern farmhouse"
- Understand WHEN buyers search: seasonal trends, holidays, life events

✨ TITLE OPTIMIZATION RULES:
1. Start with primary keyword phrase (most searched term)
2. Include 2-3 secondary keyword phrases separated by | or -
3. Add gift occasions and recipient types
4. Use natural language that reads well
5. Never repeat the exact same word more than once
6. Maximum 140 characters - use them ALL wisely
7. Avoid filler words: "cute", "nice", "great" (waste of character space)

🏷️ TAG STRATEGY (13 tags required):
- Tag 1-3: Primary product keywords (exact match searches)
- Tag 4-6: Long-tail descriptive phrases (specific buyer searches)  
- Tag 7-9: Gift/occasion keywords (gift for mom, birthday gift, christmas gift)
- Tag 10-11: Style/aesthetic keywords (minimalist, boho, rustic, modern)
- Tag 12-13: Material/technique keywords (handmade, digital download, printable)

CRITICAL TAG RULES:
- Each tag max 20 characters
- Use multi-word phrases, not single words
- No repeating words already in title (Etsy indexes title separately)
- Include common misspellings if applicable
- Think about synonyms (couch/sofa, mug/cup, poster/print)

📝 DESCRIPTION OPTIMIZATION:
- First 160 characters appear in search results - make them count!
- Natural keyword integration (not stuffing)
- Bullet points for scanability
- Include ALL relevant details: dimensions, materials, care instructions
- Answer common buyer questions proactively
- Strong call-to-action at the end
- Use emojis strategically for visual appeal and scannability

🎪 SEASONAL & TRENDING AWARENESS:
- Q1: Valentine's Day, New Year organization
- Q2: Mother's Day, Father's Day, graduation, weddings
- Q3: Back to school, fall decor
- Q4: Halloween, Thanksgiving, Christmas, Hanukkah
- Always-trending: personalization, sustainability, handmade, small business support

💡 DIFFERENTIATION STRATEGIES:
- Highlight unique selling points
- Emphasize handmade/artisan quality
- Include customization options
- Mention fast shipping/processing
- Reference positive reviews indirectly"""


def init_groq():
    """Initialize Groq client with API key"""
    global client
    api_key = os.environ.get('GROQ_API_KEY')
    if api_key:
        client = Groq(api_key=api_key)
    return client is not None


def encode_image_to_base64(image_path: str, max_size: int = 1024) -> str:
    """
    Encode image to base64, resizing if needed to reduce token usage.
    
    Args:
        image_path: Path to the image file
        max_size: Maximum dimension (width or height)
    
    Returns:
        Base64 encoded string
    """
    with Image.open(image_path) as img:
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        return base64.standard_b64encode(buffer.getvalue()).decode('utf-8')


def encode_image_bytes_to_base64(image_bytes: bytes, max_size: int = 1024) -> str:
    """
    Encode image bytes to base64, resizing if needed.
    
    Args:
        image_bytes: Raw image bytes
        max_size: Maximum dimension
    
    Returns:
        Base64 encoded string
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        return base64.standard_b64encode(buffer.getvalue()).decode('utf-8')


def generate_listing_content(image_data: str, folder_name: str = None,
                            image_count: int = 1, category_hint: str = None) -> dict:
    """
    Generate optimized Etsy listing content using Groq Vision AI with expert SEO knowledge.
    
    Args:
        image_data: Base64 encoded image or file path
        folder_name: Name of the product folder (provides context)
        image_count: Number of images/variations in the product
        category_hint: Suggested category (optional)
    
    Returns:
        Dictionary with title, description, tags, category, style, and keyword insights
    """
    global client
    
    if not client:
        if not init_groq():
            raise ValueError("Groq API key not configured")
    
    # If it's a file path, encode it
    if not image_data.startswith('/9j/') and not image_data.startswith('iVBOR'):
        image_data = encode_image_to_base64(image_data)
    
    # Build context
    context_parts = []
    if folder_name:
        context_parts.append(f"📁 Product folder name: {folder_name}")
    if category_hint:
        context_parts.append(f"📂 Suggested category: {category_hint}")
    context_parts.append(f"🖼️ This listing includes {image_count} image variation(s)")
    
    context = "\n".join(context_parts)
    
    user_prompt = f"""Analyze this product image and create a PERFECTLY OPTIMIZED Etsy listing 
that will RANK HIGH in search and CONVERT browsers into buyers.

{context}

Apply ALL your Etsy SEO expertise to generate:

{{
    "title": "YOUR OPTIMIZED 140-CHAR TITLE HERE",
    "description": "YOUR FULL DESCRIPTION WITH EMOJIS AND FORMATTING",
    "tags": ["tag1", "tag2", ... exactly 13 tags],
    "category": "Primary Category > Subcategory > Specific",
    "style": "OneWordAesthetic",
    "primary_keywords": ["top", "3", "keywords"],
    "long_tail_phrases": ["specific phrase buyers search", "another long tail"],
    "target_buyer": "Description of ideal buyer persona",
    "seasonal_relevance": ["relevant seasons or occasions"]
}}

CRITICAL REQUIREMENTS:
✅ Title: Front-load with highest-value keyword, use full 140 characters
✅ Tags: Exactly 13 unique multi-word phrases, no single words, no title repeats
✅ Description: Hook in first 160 chars, use emojis, bullet points, answer FAQs
✅ Think like the BUYER - what would they type in Etsy search?

Respond with ONLY valid JSON. No markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[
                {
                    "role": "system",
                    "content": ETSY_EXPERT_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                        }
                    ]
                }
            ],
            max_tokens=2500,
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Handle potential markdown code blocks
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
        
        result = json.loads(content)
        
        # Validate and fix tags
        if 'tags' in result:
            # Ensure exactly 13 tags
            tags = result['tags'][:13]
            # Ensure each tag is max 20 characters
            tags = [tag[:20] if len(tag) > 20 else tag for tag in tags]
            # Ensure lowercase
            tags = [tag.lower() for tag in tags]
            # Remove duplicates while preserving order
            seen = set()
            unique_tags = []
            for tag in tags:
                if tag not in seen:
                    seen.add(tag)
                    unique_tags.append(tag)
            # Pad to 13 if needed
            while len(unique_tags) < 13:
                unique_tags.append(f"handmade gift {len(unique_tags)}")
            result['tags'] = unique_tags[:13]
        
        # Ensure title is max 140 chars
        if 'title' in result and len(result['title']) > 140:
            result['title'] = result['title'][:137] + '...'
        
        return result
        
    except json.JSONDecodeError as e:
        # Enhanced fallback with SEO-optimized defaults
        product_name = folder_name or "Premium Digital Product"
        return {
            'title': f'{product_name} | Instant Digital Download | Commercial Use License | Printable Design Template',
            'description': f'''✨ {product_name.upper()} - INSTANT DOWNLOAD ✨

Transform your creative projects with this professionally designed digital product!

📦 WHAT'S INCLUDED:
• {image_count} high-resolution file(s)
• Instant digital download
• Commercial use license
• Print-ready quality (300 DPI)

💡 PERFECT FOR:
• Small business owners
• Creative entrepreneurs  
• DIY crafters
• Print on demand sellers

🎁 MAKES A GREAT GIFT:
Perfect for anyone who loves quality digital designs!

⚡ INSTANT ACCESS:
Download immediately after purchase - no waiting!

📩 HOW IT WORKS:
1. Complete your purchase
2. Download your files
3. Start creating!

💬 QUESTIONS?
Message us anytime - we're here to help!

⭐ Don't forget to favorite our shop for new releases!''',
            'tags': [
                'digital download',
                'instant download',
                'commercial use',
                'printable design',
                'small business',
                'craft supplies',
                'diy project',
                'creative template',
                'print on demand',
                'handmade gift idea',
                'entrepreneur tools',
                'digital product',
                'instant access file'
            ],
            'category': 'Digital Downloads > Graphics',
            'style': 'Modern',
            'primary_keywords': ['digital download', 'instant download', 'commercial use'],
            'long_tail_phrases': ['instant digital download for commercial use', 'printable design template'],
            'target_buyer': 'Creative entrepreneurs and small business owners',
            'seasonal_relevance': ['year-round', 'small business saturday'],
            'error': f'AI parsing failed, using optimized fallback: {str(e)}'
        }
        
    except Exception as e:
        raise Exception(f"Groq API error: {str(e)}")


def regenerate_field(image_data: str, field: str, current_content: dict,
                     instruction: str = None) -> str:
    """
    Regenerate a specific field with expert-level Etsy SEO optimization.
    
    Args:
        image_data: Base64 encoded image
        field: Field to regenerate (title, description, tags)
        current_content: Current listing content for context
        instruction: Custom instruction for regeneration
    
    Returns:
        New optimized value for the field
    """
    global client
    
    if not client:
        if not init_groq():
            raise ValueError("Groq API key not configured")
    
    field_prompts = {
        'title': f"""As an Etsy SEO expert, create a NEW highly-optimized title for this product.

CURRENT TITLE: {current_content.get('title', '')}
CURRENT TAGS: {', '.join(current_content.get('tags', []))}

{f'SPECIFIC REQUEST: {instruction}' if instruction else 'Make it rank higher and convert better.'}

TITLE OPTIMIZATION CHECKLIST:
✅ Front-load with primary keyword (first 40 chars are crucial)
✅ Include 2-3 keyword phrases separated by | or -
✅ Add gift/occasion terms if applicable
✅ Use ALL 140 characters strategically
✅ No filler words (cute, nice, great)
✅ No repeated words
✅ Natural, readable flow

Respond with ONLY the new title, nothing else.""",

        'description': f"""As an Etsy SEO expert, write a NEW high-converting product description.

CURRENT DESCRIPTION:
{current_content.get('description', '')}

PRODUCT TITLE: {current_content.get('title', '')}

{f'SPECIFIC REQUEST: {instruction}' if instruction else 'Optimize for both SEO and conversion.'}

DESCRIPTION MUST INCLUDE:
✅ Hook in first 160 characters (appears in search results!)
✅ Emoji-enhanced headers for scannability
✅ "What's Included" section with bullet points
✅ Benefits & use cases
✅ Gift-giving suggestions
✅ FAQ answers (size, materials, delivery)
✅ Strong call-to-action
✅ Natural keyword integration (not stuffing!)

Respond with ONLY the new description.""",

        'tags': f"""As an Etsy SEO expert, generate 13 NEW perfectly-optimized tags.

CURRENT TAGS: {', '.join(current_content.get('tags', []))}
PRODUCT TITLE: {current_content.get('title', '')}

{f'SPECIFIC REQUEST: {instruction}' if instruction else 'Maximize search visibility with strategic tag selection.'}

TAG STRATEGY:
• Tags 1-3: Primary product keywords (exact match searches)
• Tags 4-6: Long-tail descriptive phrases
• Tags 7-9: Gift/occasion keywords
• Tags 10-11: Style/aesthetic keywords
• Tags 12-13: Material/technique keywords

TAG RULES:
✅ Each tag max 20 characters
✅ Multi-word phrases, not single words
✅ No words already in title (Etsy indexes separately)
✅ Include synonyms buyers might search
✅ Mix high-volume and niche terms

Respond with ONLY a JSON array of exactly 13 tags."""
    }
    
    prompt = field_prompts.get(field)
    if not prompt:
        raise ValueError(f"Unknown field: {field}")
    
    try:
        response = client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[
                {
                    "role": "system",
                    "content": ETSY_EXPERT_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                        }
                    ]
                }
            ],
            max_tokens=1500,
            temperature=0.8
        )
        
        content = response.choices[0].message.content.strip()
        
        if field == 'tags':
            # Parse JSON array
            if content.startswith('['):
                tags = json.loads(content)
            else:
                # Try to extract JSON from response
                import re
                match = re.search(r'\[.*\]', content, re.DOTALL)
                if match:
                    tags = json.loads(match.group())
                else:
                    tags = [t.strip().lower() for t in content.split(',')]
            
            # Validate tags
            tags = [tag[:20].lower() for tag in tags][:13]
            while len(tags) < 13:
                tags.append(f"handmade item {len(tags)}")
            return tags
        
        # For title, ensure max length
        if field == 'title' and len(content) > 140:
            content = content[:137] + '...'
        
        return content
        
    except Exception as e:
        raise Exception(f"Regeneration failed: {str(e)}")


def analyze_competition(product_type: str) -> dict:
    """
    Analyze competition and suggest differentiation strategies.
    
    Args:
        product_type: Type of product to analyze
    
    Returns:
        Competition insights and recommendations
    """
    global client
    
    if not client:
        if not init_groq():
            raise ValueError("Groq API key not configured")
    
    prompt = f"""As an Etsy market research expert, analyze the competitive landscape for: {product_type}

Provide insights on:
1. Estimated competition level (low/medium/high)
2. Average price range
3. Top-performing keywords
4. Differentiation opportunities
5. Seasonal demand patterns
6. Suggested niche angles

Respond in JSON format."""

    try:
        response = client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[
                {"role": "system", "content": ETSY_EXPERT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
        
        return json.loads(content)
        
    except Exception as e:
        return {
            "error": str(e),
            "competition_level": "unknown",
            "recommendation": "Unable to analyze - proceed with standard optimization"
        }


def suggest_seasonal_keywords(month: int = None) -> list:
    """
    Get seasonal keyword suggestions based on current or specified month.
    
    Args:
        month: Month number (1-12), defaults to current month
    
    Returns:
        List of seasonal keywords and occasions
    """
    from datetime import datetime
    
    if month is None:
        month = datetime.now().month
    
    seasonal_map = {
        1: ["new year", "organization", "planner", "resolution", "fresh start", "winter decor"],
        2: ["valentine", "love gift", "romantic", "galentine", "heart design", "couples gift"],
        3: ["spring decor", "easter", "st patrick", "spring cleaning", "pastel", "floral"],
        4: ["easter gift", "spring wedding", "earth day", "garden", "mother day early"],
        5: ["mother day", "mom gift", "graduation", "teacher appreciation", "memorial day"],
        6: ["father day", "dad gift", "summer", "wedding season", "graduation gift"],
        7: ["summer decor", "fourth july", "patriotic", "beach", "vacation", "outdoor"],
        8: ["back to school", "teacher gift", "dorm decor", "fall prep", "organize"],
        9: ["fall decor", "autumn", "pumpkin spice", "labor day", "back to school"],
        10: ["halloween", "spooky", "fall gift", "thanksgiving prep", "harvest"],
        11: ["thanksgiving", "black friday", "christmas early", "holiday gift", "gratitude"],
        12: ["christmas gift", "holiday", "hanukkah", "new year eve", "winter", "stocking stuffer"]
    }
    
    return seasonal_map.get(month, ["evergreen", "gift idea", "handmade"])
