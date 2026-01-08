from flask import Blueprint, request, jsonify
import logging
import sys
import os
import numpy as np

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from ai_model
from inference import optimize_flight_route
from ingest_api import fetch_flight_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

flight_optimizer_bp = Blueprint('flight_optimizer', __name__)

@flight_optimizer_bp.route('/optimize', methods=['POST'])
def optimize():
    """
    Endpoint to optimize flight routes based on current flight and weather data.
    
    Expected JSON Payload:
    {
        "start": [latitude, longitude],
        "end": [latitude, longitude],
        "weather": "storm"  # or "clear"
    }

    Returns:
        JSON response with optimized path and savings metrics
    """
    try:
        data = request.get_json()

        # Validate input data
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        start = data.get('start')
        end = data.get('end')
        weather_trigger = data.get('weather', '').lower()

        # Validate coordinates
        if not isinstance(start, list) or len(start) != 2:
            return jsonify({"error": "Invalid start coordinates format"}), 400
            
        if not isinstance(end, list) or len(end) != 2:
            return jsonify({"error": "Invalid end coordinates format"}), 400

        # Fetch real-time data
        fetched_data = fetch_flight_data(
            username=os.getenv('OPENSKY_USERNAME'),
            password=os.getenv('OPENSKY_PASSWORD')
        )

        # Extract flights and storms data
        processed_flights = fetched_data.get('flights', [])
        processed_storms = fetched_data.get('storms', [])

        # Call the optimize_flight_route function
        optimized_path, fuel_saved, co2_reduced = optimize_flight_route(
            start=start,
            end=end,
            flights=processed_flights,
            storms=processed_storms,
            trigger=weather_trigger
        )

        # Convert numpy arrays to lists for JSON serialization
        if isinstance(optimized_path, np.ndarray):
            optimized_path = optimized_path.tolist()

        # Prepare the response
        response = {
            "optimized_path": optimized_path,
            "fuel_saved": float(fuel_saved),
            "co2_reduced": float(co2_reduced)
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Optimization failed: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
