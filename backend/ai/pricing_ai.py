import os
import google.generativeai as genai

class PricingAI:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None

    async def get_pricing_strategy(self, current_price: float, demand_level: str, city: str):
        """
        AI suggests a pricing strategy based on market demand.
        """
        if not self.model:
            return "Keep pricing stable. Monitor weekend occupancy."

        prompt = f"""
        Act as a hospitality revenue manager. 
        A host in {city} currently charges ₹{current_price} per night.
        The market demand level is: {demand_level}.
        
        Provide a short (15 word) pricing strategy for the host. 
        Example: 'Demand is surging for the upcoming festival. Increase prices by 15% to maximize revenue.'
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return "Market demand is shifting. Consider dynamic pricing for upcoming weekend spikes."
