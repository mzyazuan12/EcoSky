# File: ecosky-backend/data/test_fetch_flight_data.py

from ingest_api import fetch_flight_data
from preprocess import preprocess_flight_data

def test_flight_data_fetching():
    raw_data = fetch_flight_data()
    if raw_data:
        print("Raw Flight Data:", raw_data)
        processed_data = preprocess_flight_data(raw_data)
        print("Processed Flight Data:", processed_data)
    else:
        print("Failed to fetch flight data.")

if __name__ == "__main__":
    test_flight_data_fetching()
