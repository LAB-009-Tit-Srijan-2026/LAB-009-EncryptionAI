import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.local_stay import BookingOverflow, DemandHeatmap

class DemandEngine:
    @staticmethod
    async def analyze_demand(db: Session, destination: str):
        """
        Analyzes destination demand and hotel availability.
        Triggers overflow mode if criteria are met.
        """
        # In a real app, this would call external travel APIs (like Amadeus)
        # to check real-time hotel availability.
        # For this demo, we simulate demand based on day of the week and randomization.
        
        is_weekend = datetime.now().weekday() >= 4 # Friday, Saturday, Sunday
        base_demand = 0.4 if not is_weekend else 0.75
        
        # Add some random noise to simulate spikes
        current_demand = min(1.0, base_demand + (random.random() * 0.3))
        hotel_avail = max(0, 100 - (current_demand * 100))
        
        overflow_triggered = hotel_avail < 20 # Trigger if less than 20% hotels available
        
        # Log to heatmap
        heatmap_entry = DemandHeatmap(
            destination=destination,
            date=datetime.utcnow(),
            crowd_score=current_demand,
            demand_level="Peak" if current_demand > 0.8 else "High" if current_demand > 0.6 else "Moderate"
        )
        db.add(heatmap_entry)
        
        # Log to overflow table
        overflow_entry = BookingOverflow(
            destination=destination,
            demand_score=current_demand,
            hotel_availability=hotel_avail,
            overflow_triggered=overflow_triggered
        )
        db.add(overflow_entry)
        
        db.commit()
        
        return {
            "destination": destination,
            "demand_score": current_demand,
            "hotel_availability": hotel_avail,
            "overflow_triggered": overflow_triggered
        }

    @staticmethod
    def get_forecast(db: Session, destination: str, days: int = 7):
        """
        Returns demand forecast for the next few days.
        """
        forecast = []
        base_date = datetime.now()
        
        for i in range(days):
            date = base_date + timedelta(days=i)
            is_weekend = date.weekday() >= 4
            score = 0.85 if is_weekend else 0.45
            forecast.append({
                "date": date.strftime("%Y-%m-%d"),
                "score": score,
                "level": "High" if is_weekend else "Low"
            })
        return forecast
