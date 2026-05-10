import asyncio
import os
import json
from dotenv import load_dotenv
from ai.booking_ai import (
    _get_amadeus_token, 
    _get_city_code, 
    _fetch_real_hotels, 
    _gemini_rank_and_tag,
    get_booking_recommendations
)

load_dotenv()

async def test_pipeline():
    print("[START] Starting Booking Pipeline Tests...\n")

    # Test 1: Amadeus Token
    print("Test 1: Amadeus token fetch...")
    try:
        token = await _get_amadeus_token()
        if token:
            print("[OK] Token OK")
        else:
            print("[FAILED] Auth failed: No token returned")
    except Exception as e:
        print(f"[FAILED] Auth failed: {e}")

    # Test 2: City Lookup
    print("\nTest 2: City code lookup for 'Goa'...")
    try:
        code = await _get_city_code("Goa")
        print(f"[OK] City Code: {code}")
    except Exception as e:
        print(f"[FAILED] City Lookup failed: {e}")

    # Test 3: Hotel Search
    print("\nTest 3: Hotel search for 'Goa'...")
    trip_context = {"destination": "Goa", "budget": 30000, "days": 3, "interests": "beach"}
    try:
        hotels = await _fetch_real_hotels(trip_context)
        if hotels:
            print(f"[OK] Found {len(hotels)} results")
            print(f"First Hotel: {hotels[0]['name']} - INR {hotels[0]['price']}")
        else:
            print("[INFO] No real hotels found (might be API limits or no availability)")
    except Exception as e:
        print(f"[FAILED] Hotel Search failed: {e}")

    # Test 4: Gemini Ranking
    print("\nTest 4: Gemini ranking on hotel results...")
    try:
        # Create a mock list if Test 3 failed
        sample_results = [
            {"name": "Taj Exotica", "price": 15000, "rating": 5.0, "amenities": ["Spa", "Pool"], "source": "amadeus", "reason": "", "tag": "", "ai_recommended": False}
        ]
        ranked = await _gemini_rank_and_tag(sample_results, trip_context, "hotels")
        print(f"[OK] First result Tag: {ranked[0]['tag']}")
        print(f"[OK] First result Reason: {ranked[0]['reason']}")
    except Exception as e:
        print(f"[FAILED] Gemini Ranking failed: {e}")

    # Test 5: Full Orchestration
    print("\nTest 5: Full get_booking_recommendations()...")
    try:
        full_res = await get_booking_recommendations(trip_context, "hotels")
        print(f"[OK] Source used: {full_res.get('source')}")
        print(f"[OK] Result count: {len(full_res.get('results', []))}")
    except Exception as e:
        print(f"[FAILED] Orchestration failed: {e}")

    print("\n[DONE] All tests completed.")

if __name__ == "__main__":
    asyncio.run(test_pipeline())
