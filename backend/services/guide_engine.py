from sqlalchemy.orm import Session
from models.guide import TouristGuide
from ai.guide_ai import GuideAIEngine
from typing import List, Dict
import math

class GuideMatchingEngine:
    @staticmethod
    async def get_recommendations_for_activity(db: Session, activity_name: str, city: str, context: dict):
        """
        Orchestrates AI analysis and DB matching to find the best guides.
        """
        # 1. AI Analysis
        ai_analysis = await GuideAIEngine.analyze_guide_necessity(activity_name, city, context)
        
        if not ai_analysis.get("recommended") and ai_analysis.get("priority", 0) < 5:
            return None
            
        # 2. DB Matching
        # Search for guides in the city with matching specialties
        query = db.query(TouristGuide).filter(TouristGuide.city.ilike(f"%{city}%"))
        
        # Filter by specialty if AI suggested one
        target_specialty = ai_analysis.get("guide_type")
        guides = query.all()
        
        ranked_guides = []
        for guide in guides:
            score = 0
            # Specialty Match
            if target_specialty and target_specialty.lower() in [s.lower() for s in (guide.specialties_json or [])]:
                score += 50
            
            # Rating Match
            score += (guide.rating or 0) * 5
            
            # Experience Match
            score += min(20, (guide.experience_years or 0) * 2)
            
            # Verified Bonus
            if guide.verification_status == "Verified":
                score += 15
                
            ranked_guides.append({
                "guide": guide,
                "score": score
            })
            
        # Sort by score
        ranked_guides.sort(key=lambda x: x["score"], reverse=True)
        
        # 3. Format Response
        top_guides = []
        for item in ranked_guides[:2]: # Top 2 matches
            guide = item["guide"]
            top_guides.append({
                "id": guide.id,
                "name": guide.name,
                "specialties": guide.specialties_json,
                "languages": guide.languages_json,
                "price": guide.price_per_day,
                "rating": guide.rating,
                "phone": guide.phone,
                "verified": guide.verification_status == "Verified",
                "ai_reason": ai_analysis.get("reason"),
                "match_reason": await GuideAIEngine.generate_guide_match_reason(guide.name, guide.specialties_json, activity_name)
            })
            
        return {
            "activity": activity_name,
            "guide_recommended": True,
            "analysis": ai_analysis,
            "guides": top_guides
        }

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        # Haversine formula
        R = 6371 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
