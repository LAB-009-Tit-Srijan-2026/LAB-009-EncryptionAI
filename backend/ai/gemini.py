import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Use a modern model. In 2026, gemini-flash-latest is a standard stable choice.
MODEL_NAME = 'gemini-flash-latest'
model = genai.GenerativeModel(MODEL_NAME)

def generate_trip_itinerary(destination: str, budget: float, days: int, group_size: int, interests: str):
    """
    Generates a travel itinerary using Gemini AI with a robust fallback.
    """
    
    # Improved 'from scratch' template-based generator as a fallback
    def local_fallback():
        return {
            "destination": destination,
            "days": [
                {
                    "day": i + 1,
                    "activities": [
                        f"Morning exploration of {destination} main attractions",
                        f"Lunch at a local {interests} themed cafe",
                        f"Afternoon visit to {interests} related spots",
                        "Evening relaxation and dinner"
                    ],
                    "hotel": "Recommended central hotel based on budget",
                    "food": ["Local Bistro", "Street Food Market"],
                    "cost_estimate": budget / (days * 2) if days > 0 else 100
                } for i in range(days)
            ],
            "budget_breakdown": {
                "hotel": budget * 0.4,
                "food": budget * 0.3,
                "transport": budget * 0.15,
                "activities": budget * 0.15
            },
            "travel_tips": [
                f"Explore {destination} mainly on foot to save costs",
                f"Check for {interests} events happening during your stay",
                "Keep a digital copy of your documents"
            ],
            "is_ai_generated": False
        }

    if not GEMINI_API_KEY:
        return local_fallback()

    prompt = f"""
    Generate a detailed {days}-day travel itinerary for a group of {group_size} people to {destination}.
    Total budget: {budget}.
    Interests: {interests}.
    
    Return a JSON object with the following structure:
    {{
        "destination": "string",
        "days": [
            {{
                "day": number,
                "activities": ["string"],
                "hotel": "string",
                "food": ["string"],
                "cost_estimate": number
            }}
        ],
        "budget_breakdown": {{
            "hotel": number,
            "food": number,
            "transport": number,
            "activities": number
        }},
        "travel_tips": ["string"]
    }}
    """
    
    try:
        # Use native JSON mode (response_mime_type) for guaranteed valid JSON
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        if not response.text:
            print("Empty response from Gemini")
            return local_fallback()
            
        return json.loads(response.text)
        
    except Exception as e:
        print(f"Error generating itinerary with Gemini ({MODEL_NAME}): {e}")
        # Return the 'from scratch' local generator if AI fails or quota is hit
        return local_fallback()

async def parse_receipt(image_data: bytes):
    """
    Uses Gemini to extract structured info from a receipt image.
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        prompt = """
        Analyze this receipt and extract:
        1. Total Amount (number only)
        2. Merchant/Shop Name
        3. Category (one of: Food, Transport, Accommodation, Entertainment, Shopping, Other)
        Return ONLY valid JSON.
        Format: {"amount": float, "merchant": "string", "category": "string"}
        """
        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ], generation_config={"response_mime_type": "application/json"})
        
        return json.loads(response.text)
    except Exception as e:
        print(f"OCR Error: {e}")
        return {"amount": 0.0, "merchant": "Unknown", "category": "Other"}
