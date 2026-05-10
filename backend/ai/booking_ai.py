import os
import httpx
import json
import asyncio
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configuration
AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Global Caches
_amadeus_token = {"token": None, "expiry": None}
_city_code_cache = {}

async def _get_amadeus_token():
    """
    Set up OAuth2 client credentials authentication with Amadeus test API.
    Caches the access token so we don't re-fetch on every request.
    """
    global _amadeus_token
    now = datetime.now()
    
    if _amadeus_token["token"] and _amadeus_token["expiry"] > now:
        return _amadeus_token["token"]

    url = "https://test.api.amadeus.com/v1/security/oauth2/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": AMADEUS_CLIENT_ID,
        "client_secret": AMADEUS_CLIENT_SECRET
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data=data)
            response.raise_for_status()
            res_json = response.json()
            _amadeus_token["token"] = res_json["access_token"]
            _amadeus_token["expiry"] = now + timedelta(seconds=res_json["expires_in"] - 60)
            return _amadeus_token["token"]
        except Exception as e:
            print(f"Amadeus Auth Error: {e}")
            return None

async def _get_city_code(destination: str):
    """
    Converts a free-text destination like "Goa" into an IATA city code using Amadeus.
    """
    if destination in _city_code_cache:
        return _city_code_cache[destination]

    token = await _get_amadeus_token()
    if not token:
        return destination[:3].upper()

    url = "https://test.api.amadeus.com/v1/reference-data/locations"
    params = {
        "keyword": destination,
        "subType": "CITY",
        "page[limit]": 1
    }
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data.get("data") and len(data["data"]) > 0:
                code = data["data"][0]["iataCode"]
                _city_code_cache[destination] = code
                return code
        except Exception as e:
            print(f"City Lookup Error: {e}")
    
    return destination[:3].upper()

async def _fetch_real_hotels(trip_context: dict):
    """
    Using the Amadeus API and the city code, fetches real hotel offers.
    """
    destination = trip_context.get("destination")
    days = trip_context.get("days", 1)
    budget = trip_context.get("budget", 0)
    
    city_code = await _get_city_code(destination)
    token = await _get_amadeus_token()
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 1: Hotels by city
    async with httpx.AsyncClient() as client:
        try:
            url_list = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city"
            params_list = {"cityCode": city_code, "ratings": "3,4,5"}
            res_list = await client.get(url_list, params=params_list, headers=headers)
            res_list.raise_for_status()
            hotels_data = res_list.json().get("data", [])[:20]
            hotel_ids = [h["hotelId"] for h in hotels_data]
            
            if not hotel_ids:
                return []

            # Step 2: Hotel Offers
            check_in = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            check_out = (datetime.now() + timedelta(days=30 + days)).strftime("%Y-%m-%d")
            
            url_offers = "https://test.api.com/v3/shopping/hotel-offers" # Note: Prompt had v3/shopping/hotel-offers
            # Actually Amadeus v3 shopping hotel-offers uses GET but often requires specific IDs
            # According to prompt: params: hotelIds (comma-joined), adults=1, checkInDate, checkOutDate, currency=INR, bestRateOnly=True
            params_offers = {
                "hotelIds": ",".join(hotel_ids),
                "adults": 1,
                "checkInDate": check_in,
                "checkOutDate": check_out,
                "currency": "INR",
                "bestRateOnly": "true"
            }
            # The actual base for v3 is test.api.amadeus.com
            url_offers = "https://test.api.amadeus.com/v3/shopping/hotel-offers"
            
            res_offers = await client.get(url_offers, params=params_offers, headers=headers)
            res_offers.raise_for_status()
            offers_data = res_offers.json().get("data", [])
            
            results = []
            for offer in offers_data:
                hotel = offer["hotel"]
                price_info = offer["offers"][0]["price"]
                
                # Normalize results
                results.append({
                    "name": hotel.get("name", "Unknown Hotel"),
                    "price": float(price_info.get("total", 0)),
                    "rating": float(hotel.get("rating", 4.0)),
                    "amenities": [a.replace("_", " ") for a in hotel.get("amenities", [])[:5]],
                    "image": f"https://source.unsplash.com/featured/?hotel,{hotel.get('name', '').replace(' ', '')}",
                    "hotel_id": hotel.get("hotelId"),
                    "offer_id": offer["offers"][0].get("id"),
                    "check_in": check_in,
                    "check_out": check_out,
                    "source": "amadeus",
                    "reason": "",
                    "tag": "",
                    "ai_recommended": False
                })
            return results
        except Exception as e:
            print(f"Amadeus Hotel Error: {e}")
            return []

async def _fetch_real_activities(trip_context: dict):
    """
    Calls the Google Places Text Search API to find real attractions.
    """
    destination = trip_context.get("destination")
    interests = trip_context.get("interests")
    
    if not GOOGLE_PLACES_API_KEY:
        return []

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"{interests} attractions in {destination}",
        "key": GOOGLE_PLACES_API_KEY,
        "type": "tourist_attraction|museum|park|restaurant"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            places = data.get("results", [])[:8]
            
            results = []
            for p in places:
                price_lvl = p.get("price_level", 0)
                price_est = {0: 0, 1: 200, 2: 500, 3: 1200, 4: 2500}.get(price_lvl, 0)
                
                photo_ref = p.get("photos", [{}])[0].get("photo_reference")
                if photo_ref:
                    image_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference={photo_ref}&key={GOOGLE_PLACES_API_KEY}"
                else:
                    image_url = f"https://source.unsplash.com/featured/?{p.get('name','').replace(' ','')},attraction"

                results.append({
                    "name": p.get("name"),
                    "price": float(price_est),
                    "rating": float(p.get("rating", 4.0)),
                    "amenities": p.get("types", [])[:4],
                    "image": image_url,
                    "place_id": p.get("place_id"),
                    "address": p.get("formatted_address"),
                    "source": "google_places",
                    "reason": "",
                    "tag": "",
                    "ai_recommended": False
                })
            return results
        except Exception as e:
            print(f"Google Places Error: {e}")
            return []

async def _gemini_rank_and_tag(real_results, trip_context, search_type):
    """
    Uses Gemini to rank and tag real API results.
    """
    if not real_results or not GEMINI_API_KEY:
        if real_results:
            real_results[0]["tag"] = "Top Pick"
            real_results[0]["ai_recommended"] = True
            real_results[0]["reason"] = f"Highest rated option for your trip to {trip_context.get('destination')}"
        return real_results

    # Slim version for prompt
    slim_results = []
    for idx, r in enumerate(real_results):
        slim_results.append({
            "index": idx,
            "name": r["name"],
            "price": r["price"],
            "rating": r["rating"],
            "amenities": r["amenities"]
        })

    model = genai.GenerativeModel("gemini-1.5-flash-latest")
    prompt = f"""
    Based on the trip context: {json.dumps(trip_context)}
    And these real {search_type} results: {json.dumps(slim_results)}
    
    Fill in the following for each result:
    - reason: 1-sentence personalised reason for THIS trip context
    - tag: one of ["Best Value", "Cheapest", "Luxury", "Top Rated", "Trending"]
    - ai_recommended: true for exactly ONE best option, false for all others
    
    Return ONLY a JSON array of objects with keys: index, reason, tag, ai_recommended.
    """

    try:
        response = await model.generate_content_async(
            prompt, 
            generation_config={"response_mime_type": "application/json"}
        )
        updates = json.loads(response.text)
        
        for up in updates:
            idx = up.get("index")
            if idx is not None and idx < len(real_results):
                real_results[idx]["reason"] = up.get("reason", "")
                real_results[idx]["tag"] = up.get("tag", "")
                real_results[idx]["ai_recommended"] = up.get("ai_recommended", False)
                
        return real_results
    except Exception as e:
        print(f"Gemini Ranking Error: {e}")
        # Fallback
        real_results[0]["tag"] = "Top Pick"
        real_results[0]["ai_recommended"] = True
        real_results[0]["reason"] = f"Highest rated option for your trip to {trip_context.get('destination')}"
        return real_results

async def get_booking_recommendations(trip_context: dict, search_type: str = "hotels"):
    """
    Orchestrates the full booking pipeline.
    """
    results = []
    source = "static"
    
    # Degradation chain
    try:
        if search_type == "hotels" and AMADEUS_CLIENT_ID:
            print(f"Log: Fetching real hotels for {trip_context['destination']} via Amadeus")
            results = await _fetch_real_hotels(trip_context)
            source = "amadeus" if results else "ai_estimated"
        elif search_type == "activities" and GOOGLE_PLACES_API_KEY:
            print(f"Log: Fetching real activities for {trip_context['destination']} via Google Places")
            results = await _fetch_real_activities(trip_context)
            source = "google_places" if results else "ai_estimated"
        elif search_type == "transport":
            # _fetch_real_transport not fully implemented, fallback to AI
            source = "ai_estimated"
        else:
            source = "ai_estimated"

        if results:
            print(f"Log: Ranking {len(results)} results via Gemini")
            results = await _gemini_rank_and_tag(results, trip_context, search_type)
            return {"results": results, "source": source}

        # Fallback to Gemini Generation
        print(f"Log: Falling back to Gemini generation for {search_type}")
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        prompt = f"""
        Generate realistic {search_type} options in INR for a trip to {trip_context.get('destination')}.
        Context: {json.dumps(trip_context)}
        Return exactly 5 results. Mark source as "ai_estimated".
        Format: {{"results": [...]}}
        """
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        data = json.loads(response.text)
        for r in data.get("results", []):
            r["source"] = "ai_estimated"
        return {"results": data.get("results", []), "source": "ai_estimated"}

    except Exception as e:
        print(f"General Booking Error: {e}")
        source = "static"
        return {"results": _get_static_fallback(search_type), "source": "static"}

def _get_static_fallback(search_type):
    if search_type == "hotels":
        return [
            {
                "name": "Standard City Hotel",
                "price": 3500.0,
                "rating": 4.0,
                "amenities": ["WiFi", "AC"],
                "image": "https://source.unsplash.com/featured/?hotel",
                "reason": "Reliable fallback option.",
                "tag": "Standard",
                "ai_recommended": True,
                "source": "static"
            }
        ]
    return []
