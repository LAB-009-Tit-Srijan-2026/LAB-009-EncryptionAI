import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Use the pro model for better structured output
model = genai.GenerativeModel('gemini-1.5-flash')

def generate_trip_itinerary(destination: str, budget: float, days: int, group_size: int, interests: str):
    if not GEMINI_API_KEY:
        # Fallback dummy data if no key is provided
        return {
            "destination": destination,
            "days": [{"day": i+1, "activities": ["Visit landmark", "Lunch", "Dinner"], "cost": 100} for i in range(days)],
            "estimated_cost": {"hotel": 500, "food": 300, "transport": 100, "activities": 100},
            "tips": ["Carry water", "Book in advance"]
        }

    prompt = f"""
    Generate a {days}-day travel itinerary for a group of {group_size} people to {destination}.
    Their total budget is {budget} in their local currency.
    Their interests are: {interests}.
    
    Provide a day-wise itinerary including places to visit, hotel suggestions, food suggestions, and estimated costs.
    
    IMPORTANT: You MUST return ONLY a valid JSON object. Do not include markdown code blocks, formatting, or any extra text. 
    The JSON should have this exact structure:
    {{
        "destination": "{destination}",
        "days": [
            {{
                "day": 1,
                "activities": ["Activity 1", "Activity 2"],
                "hotel": "Hotel Name Suggestion",
                "food": ["Restaurant 1", "Restaurant 2"],
                "cost_estimate": 150
            }}
        ],
        "budget_breakdown": {{
            "hotel": 500,
            "food": 300,
            "transport": 100,
            "activities": 100
        }},
        "travel_tips": ["Tip 1", "Tip 2"]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        # Try to parse the response as JSON. Strip markdown if the model hallucinates it.
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Error generating itinerary: {e}")
        # Fallback in case of failure
        return {"error": "Failed to generate itinerary. Please try again later."}
