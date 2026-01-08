# File: app.py

import logging
from flask import Flask, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from ingest_api import fetch_flight_data, fetch_weather_alerts
from preprocess import preprocess_flight_data
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Scheduler for periodic updates (optional)
scheduler = BackgroundScheduler()

def scheduled_data_update():
    try:
        logger.info("Scheduled data update started...")
        flight_raw = fetch_flight_data(
            username=os.getenv('OPENSKY_USERNAME'),
            password=os.getenv('OPENSKY_PASSWORD')
        )
        logger.info("Scheduled data update completed.")
    except Exception as e:
        logger.error(f"Error during scheduled data update: {e}")

scheduler.add_job(func=scheduled_data_update, trigger="interval", hours=1)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

@app.route("/flights/all", methods=["GET"])
def get_live_flights():
    """
    Endpoint to fetch all live flight data from OpenSky API.
    """
    try:
        flight_raw = fetch_flight_data(
            username=os.getenv('OPENSKY_USERNAME'),
            password=os.getenv('OPENSKY_PASSWORD')
        )
        processed_flights = preprocess_flight_data(flight_raw)
        return jsonify({"status": "success", "data": processed_flights}), 200
    except Exception as e:
        logger.error(f"Error fetching live flights: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    logger.info("Starting Flask server on port 4000...")
    app.run(host="0.0.0.0", port=4000)
