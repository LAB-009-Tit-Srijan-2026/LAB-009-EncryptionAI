import json
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "gemini-1.5-flash-latest"

async def get_booking_recommendations(trip_context: dict, search_type: str = "hotels"):
    """
    Uses Gemini to generate and rank mock booking options based on trip context.
    """
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = f"""
        Act as a travel booking expert. Based on this trip context:
        {json.dumps(trip_context)}
        
        Generate 5 realistic mock {search_type} options for this trip.
        For each option, provide:
        1. Name
        2. Price (in INR)
        3. Rating (1-5)
        4. Key features/amenities
        5. AI Recommendation Reason (contextual to the trip)
        6. AI Tag (e.g., "Cheapest", "Best Value", "Luxury", "Near Activity")
        7. Image URL (use realistic placeholder like https://images.unsplash.com/photo-...)
        
        Return ONLY valid JSON in this format:
        {{"results": [
            {{
                "name": "string",
                "price": number,
                "rating": number,
                "amenities": ["string"],
                "reason": "string",
                "tag": "string",
                "image": "string",
                "ai_recommended": boolean
            }}
        ]}}
        """
        
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        print(f"AI Booking Error: {e}")
        return {"results": get_fallback_bookings(search_type)}

def get_fallback_bookings(search_type):
    # Static fallback data for reliability
    if search_type == "hotels":
        return [
            {"name": "Ocean View Resort", "price": 4500, "rating": 4.5, "amenities": ["Pool", "WiFi"], "reason": "Great reviews and near the beach.", "tag": "Best Value", "ai_recommended": True},
            {"name": "City Center Inn", "price": 2200, "rating": 3.8, "amenities": ["Parking"], "reason": "Most affordable option for your budget.", "tag": "Cheapest", "ai_recommended": False}
        ]
    return []
