import math
from typing import List
from models.local_stay import Property

class RecommendationEngine:
    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """
        Haversine formula to calculate distance between two points in km.
        """
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def rank_properties(
        properties: List[Property], 
        target_lat: float, 
        target_lon: float, 
        group_size: int = 1,
        max_budget: float = None
    ):
        """
        Ranks properties based on distance, price, and safety.
        """
        ranked_list = []
        
        for p in properties:
            distance = RecommendationEngine.calculate_distance(target_lat, target_lon, p.latitude, p.longitude)
            
            # Score components (lower is better for ranking usually, but here we calculate a match score 0-100)
            distance_score = max(0, 40 - (distance * 2)) # 40 points for distance
            price_score = 30 # Base price points
            
            if max_budget and p.price_per_night > max_budget:
                price_score = 0
            elif max_budget:
                price_score = 30 * (1 - (p.price_per_night / max_budget))
                
            safety_score = p.safety_rating * 6 # max 30 points
            
            total_score = distance_score + price_score + safety_score
            
            ranked_list.append({
                "property": p,
                "distance_km": round(distance, 2),
                "match_score": round(total_score, 1)
            })
            
        # Sort by match score descending
        return sorted(ranked_list, key=lambda x: x["match_score"], reverse=True)
