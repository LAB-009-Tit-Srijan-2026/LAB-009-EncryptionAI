import os
import json
import google.generativeai as genai
from typing import List, Dict

class StayRecommendationAI:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None

    async def get_recommendation_summary(self, city: str, properties: List[Dict]):
        """
        Uses Gemini to generate a smart summary and ranking explanation for local stays.
        """
        if not self.model or not properties:
            return "Local homes available nearby. Great for groups and budget travelers."

        prompt = f"""
        You are a smart travel assistant. 
        In {city}, hotels are currently filling up or expensive. 
        I have a list of local shared stays and homes. 
        Summarize why these are better options right now.
        
        List of properties:
        {json.dumps(properties[:3])}
        
        Provide a 2-sentence summary that highlights the value of local stays in this context.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"AI Error: {e}")
            return "Authentic local stays available. Perfect for experiencing the city like a local while saving on peak hotel prices."

    async def generate_smart_description(self, property_title: str, room_type: str, city: str):
        """
        Generates a catchy AI description for a host's property.
        """
        if not self.model:
            return f"A comfortable {room_type} in the heart of {city}. Clean, safe, and host-verified."

        prompt = f"""
        Generate a catchy, inviting 20-word description for a travel listing.
        Title: {property_title}
        Type: {room_type}
        Location: {city}
        Focus on: Hospitality, local vibe, and comfort.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Experience {city} like a local in this cozy {room_type}. Managed by a verified host."
