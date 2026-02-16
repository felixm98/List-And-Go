"""
Mockup Analyzer & Nano Banano Pro Prompt Generator
===================================================
Analyzes product mockup images (from Etsy bestsellers or user uploads)
and generates structured JSON prompts for Nano Banano Pro AI image generation.

Features:
- Etsy bestseller search & image analysis
- Drag-and-drop image upload analysis
- Clipboard/screenshot paste analysis
- Structured JSON prompt output for Nano Banano Pro
"""

import os
import io
import base64
import json
import logging
import requests
from PIL import Image
from groq import Groq

logger = logging.getLogger(__name__)

# Groq client (shared with ai_generator)
client = None


def init_groq():
    """Initialize Groq client"""
    global client
    api_key = os.environ.get('GROQ_API_KEY')
    if api_key:
        client = Groq(api_key=api_key)
    return client is not None


def encode_image_bytes(image_bytes: bytes, max_size: int = 1024) -> str:
    """Encode image bytes to base64, resizing if needed."""
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


def encode_image_from_url(url: str, max_size: int = 1024) -> str:
    """Download and encode an image from URL to base64."""
    try:
        resp = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        resp.raise_for_status()
        return encode_image_bytes(resp.content, max_size)
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
        raise


# =============================================================================
# NANO BANANO PRO PROMPT SYSTEM
# =============================================================================

MOCKUP_ANALYSIS_SYSTEM_PROMPT = """You are an EXPERT PRODUCT PHOTOGRAPHY & MOCKUP ANALYST with deep knowledge of:

📸 PHOTOGRAPHY ANALYSIS:
- Composition techniques (rule of thirds, leading lines, symmetry, negative space)
- Lighting setups (natural, studio, softbox, ring light, golden hour, flat lay lighting)
- Camera angles (overhead, 45-degree, eye-level, low angle, bird's eye)
- Depth of field (shallow/bokeh, deep/sharp, tilt-shift)
- Color grading and mood (warm, cool, muted, vibrant, pastel, moody)

🎨 PRODUCT STYLING:
- Props and accessories used in the scene
- Background types (marble, wood, fabric, solid color, gradient, lifestyle scene)
- Product placement and arrangement
- Brand aesthetic and visual identity
- Seasonal/thematic styling

🖼️ MOCKUP DESIGN:
- Digital mockup techniques (frame mockups, device mockups, packaging mockups)
- Texture and material rendering
- Shadow and reflection effects
- Scene composition for product presentation
- AI-ready prompt structure for recreating similar images

Your task is to analyze product images and create detailed, structured JSON prompts 
that can be used with Nano Banano Pro to generate similar professional-quality mockup images."""


ANALYSIS_PROMPT_TEMPLATE = """Analyze this product/mockup image in EXTREME DETAIL and create a structured JSON prompt
that could be used to recreate a similar professional image with Nano Banano Pro.

Break down EVERY visual element you see:

Respond with ONLY this JSON structure (no markdown, no explanation):

{{
    "nano_banano_prompt": {{
        "scene_description": "A detailed 1-2 sentence description of the overall scene",
        "product_type": "What type of product is shown (e.g., t-shirt mockup, mug, poster, phone case)",
        "product_details": {{
            "design_on_product": "Describe any design/print/pattern visible on the product",
            "product_color": "Base color of the product itself",
            "product_material": "Material appearance (cotton, ceramic, glossy, matte, etc.)",
            "product_state": "How the product is presented (flat lay, worn, held, hanging, on shelf)"
        }},
        "composition": {{
            "camera_angle": "overhead | 45-degree | eye-level | low-angle | close-up",
            "framing": "centered | rule-of-thirds | off-center | full-frame | cropped",
            "depth_of_field": "shallow-bokeh | medium | deep-sharp | tilt-shift",
            "negative_space": "minimal | moderate | generous"
        }},
        "lighting": {{
            "type": "natural-window | studio-softbox | ring-light | golden-hour | flat-even | dramatic-directional | backlit",
            "direction": "left | right | top | front | behind | diffused-all",
            "intensity": "soft | medium | bright | high-contrast",
            "color_temperature": "warm | neutral | cool | mixed",
            "shadows": "soft-diffused | medium | hard-dramatic | minimal"
        }},
        "background": {{
            "type": "solid-color | gradient | textured-surface | lifestyle-scene | blurred-environment | studio-backdrop",
            "color_or_surface": "Describe the specific background (white marble, light wood, sage green, etc.)",
            "props": ["list", "of", "visible", "props", "and", "accessories"],
            "environment": "studio | home | outdoor | office | cafe | abstract"
        }},
        "color_palette": {{
            "dominant_colors": ["color1", "color2", "color3"],
            "accent_colors": ["accent1", "accent2"],
            "overall_mood": "warm-cozy | cool-modern | bright-cheerful | muted-elegant | dark-moody | pastel-soft | earth-tones",
            "saturation": "vibrant | natural | muted | desaturated"
        }},
        "style": {{
            "aesthetic": "minimalist | rustic | modern | bohemian | luxury | vintage | scandinavian | industrial | cottagecore",
            "editing_style": "clean-crisp | film-grain | hdr | matte | high-contrast | dreamy-soft",
            "brand_vibe": "professional | artisan-handmade | trendy | classic-timeless | playful | premium"
        }},
        "technical": {{
            "image_quality": "professional-dslr | smartphone | studio | ai-generated",
            "aspect_ratio": "1:1-square | 4:5-portrait | 3:2-landscape | 16:9-wide",
            "resolution_feel": "ultra-sharp | naturally-sharp | soft-focus-areas"
        }}
    }},
    "generation_prompt": "A single, complete text prompt combining all the above elements into one paragraph that Nano Banano Pro can use directly to generate a similar image. Be very specific and descriptive. Include style references, lighting details, camera settings feel, and mood.",
    "negative_prompt": "Things to AVOID in the generated image (artifacts, unwanted elements, quality issues)",
    "style_tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
    "difficulty_to_recreate": "easy | medium | hard | expert",
    "tips": ["Practical tip 1 for getting the best result", "Tip 2", "Tip 3"]
}}

Be EXTREMELY specific and detailed. The JSON prompt should contain enough information 
for someone to recreate a very similar mockup image using AI generation tools."""


def analyze_image_for_prompt(image_base64: str, context: str = None) -> dict:
    """
    Analyze a product/mockup image and generate a Nano Banano Pro JSON prompt.
    
    Args:
        image_base64: Base64-encoded image data
        context: Optional context about the image (e.g., Etsy listing title)
    
    Returns:
        Structured JSON prompt for Nano Banano Pro
    """
    global client
    if not client:
        if not init_groq():
            raise ValueError("Groq API key not configured. Set GROQ_API_KEY environment variable.")

    user_message = ANALYSIS_PROMPT_TEMPLATE
    if context:
        user_message += f"\n\nADDITIONAL CONTEXT: {context}"

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "system",
                    "content": MOCKUP_ANALYSIS_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_message},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                        }
                    ]
                }
            ],
            max_completion_tokens=3000,
            temperature=0.5,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content.strip()

        # Handle potential markdown code blocks
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
            content = content.strip()
        if content.endswith('```'):
            content = content[:-3].strip()

        result = json.loads(content)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        # Return a structured error with partial data
        return {
            "error": f"AI response parsing failed: {str(e)}",
            "raw_response": content if 'content' in dir() else "No response",
            "nano_banano_prompt": {
                "scene_description": "Analysis failed - please try again",
                "product_type": "unknown",
                "product_details": {},
                "composition": {},
                "lighting": {},
                "background": {},
                "color_palette": {},
                "style": {},
                "technical": {}
            },
            "generation_prompt": "Professional product mockup photograph, studio lighting, clean background",
            "negative_prompt": "blurry, low quality, distorted",
            "style_tags": [],
            "difficulty_to_recreate": "medium",
            "tips": ["Try re-analyzing with a clearer image"]
        }
    except Exception as e:
        logger.error(f"Groq API error during mockup analysis: {e}")
        raise Exception(f"Image analysis failed: {str(e)}")


def search_etsy_bestsellers(query: str, api_key: str, limit: int = 20,
                            sort_on: str = "score", min_price: float = None,
                            max_price: float = None) -> list:
    """
    Search for bestselling products on Etsy using the Open API.
    
    Args:
        query: Search query (e.g., "t-shirt mockup", "mug mockup")
        api_key: Etsy API key
        limit: Number of results (max 100)
        sort_on: Sort order - "score" (relevancy), "price_asc", "price_desc", "created"
        min_price: Minimum price filter
        max_price: Maximum price filter
    
    Returns:
        List of product dicts with title, images, price, url, etc.
    """
    headers = {
        'x-api-key': api_key,
        'Accept': 'application/json'
    }

    params = {
        'keywords': query,
        'limit': min(limit, 100),
        'sort_on': sort_on,
        'includes': 'Images',  # Include listing images
    }
    
    if min_price is not None:
        params['min_price'] = min_price
    if max_price is not None:
        params['max_price'] = max_price

    try:
        url = 'https://openapi.etsy.com/v3/application/listings/active'
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        results = []
        for listing in data.get('results', []):
            images = []
            for img in listing.get('images', []):
                images.append({
                    'url_570xN': img.get('url_570xN', ''),
                    'url_170x135': img.get('url_170x135', ''),
                    'url_fullxfull': img.get('url_fullxfull', ''),
                })

            results.append({
                'listing_id': listing.get('listing_id'),
                'title': listing.get('title', ''),
                'description': listing.get('description', '')[:200],
                'price': f"{listing.get('price', {}).get('amount', 0) / listing.get('price', {}).get('divisor', 100):.2f}",
                'currency': listing.get('price', {}).get('currency_code', 'USD'),
                'url': listing.get('url', ''),
                'views': listing.get('views', 0),
                'num_favorers': listing.get('num_favorers', 0),
                'images': images,
                'shop_name': listing.get('shop', {}).get('shop_name', ''),
                'tags': listing.get('tags', []),
                'quantity': listing.get('quantity', 0),
            })

        return results

    except requests.exceptions.HTTPError as e:
        logger.error(f"Etsy API HTTP error: {e}")
        if e.response.status_code == 403:
            raise Exception("Etsy API access forbidden. Check your API key.")
        elif e.response.status_code == 429:
            raise Exception("Rate limited by Etsy. Please try again in a moment.")
        raise Exception(f"Etsy API error: {str(e)}")
    except Exception as e:
        logger.error(f"Etsy bestseller search failed: {e}")
        raise


def batch_analyze_images(image_urls: list, context_list: list = None) -> list:
    """
    Analyze multiple images and generate prompts for each.
    
    Args:
        image_urls: List of image URLs to analyze
        context_list: Optional list of context strings (same length as image_urls)
    
    Returns:
        List of analysis results
    """
    results = []
    for i, url in enumerate(image_urls):
        try:
            context = context_list[i] if context_list and i < len(context_list) else None
            image_b64 = encode_image_from_url(url)
            analysis = analyze_image_for_prompt(image_b64, context=context)
            analysis['source_url'] = url
            analysis['index'] = i
            results.append(analysis)
        except Exception as e:
            results.append({
                'error': str(e),
                'source_url': url,
                'index': i
            })
    return results
