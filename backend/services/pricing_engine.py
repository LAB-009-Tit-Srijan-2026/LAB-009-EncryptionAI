from typing import Optional

class PricingEngine:
    @staticmethod
    def calculate_suggested_price(
        base_price: float, 
        demand_score: float, 
        is_weekend: bool = False,
        nearby_hotel_avg: Optional[float] = None
    ):
        """
        Calculates suggested price based on demand and market conditions.
        """
        multiplier = 1.0
        
        # Demand surge logic
        if demand_score > 0.8:
            multiplier += 0.25 # Peak demand
        elif demand_score > 0.6:
            multiplier += 0.15 # High demand
            
        # Weekend logic
        if is_weekend:
            multiplier += 0.10
            
        suggested = base_price * multiplier
        
        # Guardrails: Don't allow more than 50% surge above base for local stays
        max_price = base_price * 1.5
        suggested = min(suggested, max_price)
        
        # Competitor logic: If nearby hotels are very expensive, we can increase slightly
        if nearby_hotel_avg and suggested < (nearby_hotel_avg * 0.7):
            suggested = suggested * 1.05
            
        return round(suggested, 2)

    @staticmethod
    def get_pricing_insights(current_price: float, suggested_price: float):
        """
        Returns textual insights about the pricing.
        """
        diff = suggested_price - current_price
        if diff > 0:
            percent = (diff / current_price) * 100
            return {
                "action": "increase",
                "message": f"Demand is high. Suggest increasing price by {round(percent, 1)}% to match market trends.",
                "type": "surge"
            }
        else:
            return {
                "action": "hold",
                "message": "Your current price is optimal for today's demand.",
                "type": "optimal"
            }
