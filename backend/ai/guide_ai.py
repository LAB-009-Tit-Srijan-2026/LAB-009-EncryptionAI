import google.generativeai as genai
import os
import json
from typing import List, Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class GuideAIEngine:
    @staticmethod
    async def analyze_guide_necessity(activity_name: str, city: str, context: dict):
        """
        Uses Gemini to decide if a guide is useful for a specific activity
        and generates a personalized reason.
        """
        if not GEMINI_API_KEY:
            return {"recommended": False, "reason": ""}

        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        Activity: {activity_name} in {city}
        Trip Context: {json.dumps(context)}
        
        Analyze if a professional tourist guide is recommended for this specific activity.
        Consider: 
        1. Cultural/Historical depth
        2. Crowd management/VIP access
        3. Language barriers
        4. Safety (for adventure/trekking)
        5. Navigation (for old cities/markets)
        
        Return ONLY valid JSON:
        {{
            "recommended": boolean,
            "reason": "1-sentence persuasive reason for the traveler",
            "guide_type": "string (one of: Spiritual, Food, History, Adventure, General)",
            "priority": "number (1-10)"
        }}
        """
        
        try:
            response = await model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Guide AI Error: {e}")
            return {"recommended": False, "reason": "", "guide_type": "General", "priority": 0}

    @staticmethod
    async def generate_guide_match_reason(guide_name: str, guide_specialties: List[str], activity: str):
        """
        Explains why this SPECIFIC guide is a good match for the activity.
        """
        if not GEMINI_API_KEY:
            return f"Experienced local expert for {activity}."

        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"Guide {guide_name} specializes in {guide_specialties}. Explain in 10 words why they are perfect for '{activity}'."
        
        try:
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except:
            return f"Top-rated {guide_specialties[0]} expert for this location."
