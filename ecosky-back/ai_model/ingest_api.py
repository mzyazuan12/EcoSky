# File: ecosky-back/ai_model/ingest_api.py

import requests
import logging
from datetime import datetime, timedelta

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_flight_data(username=None, password=None):
    """
    Fetch raw flight data from the OpenSky Network API.
    
    Args:
        username (str, optional): OpenSky Network username for authenticated access.
        password (str, optional): OpenSky Network password for authenticated access.
    
    Returns:
        dict: Raw JSON data containing flight states.
    """
    url = "https://opensky-network.org/api/states/all"
    try:
        if username and password:
            # Authenticated request (higher rate limits)
            response = requests.get(url, auth=(username, password), timeout=10)
        else:
            # Unauthenticated request
            response = requests.get(url, timeout=10)
        response.raise_for_status()
        logger.info("Successfully fetched flight data from OpenSky API.")
        return response.json()
    except requests.HTTPError as http_err:
        logger.error(f"HTTP error occurred while fetching flight data: {http_err}")
    except requests.ConnectionError as conn_err:
        logger.error(f"Connection error occurred while fetching flight data: {conn_err}")
    except requests.Timeout as timeout_err:
        logger.error(f"Timeout error occurred while fetching flight data: {timeout_err}")
    except requests.RequestException as req_err:
        logger.error(f"An error occurred while fetching flight data: {req_err}")
    return {}

def fetch_weather_alerts():
    """
    Fetch raw weather alerts data from the NOAA Weather API.
    
    Returns:
        dict: Raw JSON data containing weather alerts.
    """
    # NOAA Weather API endpoint for active alerts
    # Documentation: https://www.weather.gov/documentation/services-web-api
    url = "https://api.weather.gov/alerts/active"
    headers = {
        'User-Agent': 'EcoskyProject/1.0 (youremail@example.com)',  # Replace with your contact info
        'Accept': 'application/geo+json'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info("Successfully fetched weather alerts from NOAA API.")
        return response.json()
    except requests.HTTPError as http_err:
        logger.error(f"HTTP error occurred while fetching weather alerts: {http_err}")
    except requests.ConnectionError as conn_err:
        logger.error(f"Connection error occurred while fetching weather alerts: {conn_err}")
    except requests.Timeout as timeout_err:
        logger.error(f"Timeout error occurred while fetching weather alerts: {timeout_err}")
    except requests.RequestException as req_err:
        logger.error(f"An error occurred while fetching weather alerts: {req_err}")
    return {}

def fetch_historical_flight_data(time_window_minutes=10, username=None, password=None):
    """
    Fetch historical flight data from the OpenSky Network API within a specific time window.
    
    Args:
        time_window_minutes (int, optional): Time window in minutes to fetch historical data. Defaults to 10.
        username (str, optional): OpenSky Network username for authenticated access.
        password (str, optional): OpenSky Network password for authenticated access.
    
    Returns:
        dict: Raw JSON data containing flight states.
    """
    url = "https://opensky-network.org/api/states/all"
    current_time = datetime.utcnow()
    past_time = current_time - timedelta(minutes=time_window_minutes)
    try:
        params = {
            'time': int(past_time.timestamp())
        }
        if username and password:
            response = requests.get(url, auth=(username, password), params=params, timeout=10)
        else:
            response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        logger.info(f"Successfully fetched historical flight data from OpenSky API for the past {time_window_minutes} minutes.")
        return response.json()
    except requests.HTTPError as http_err:
        logger.error(f"HTTP error occurred while fetching historical flight data: {http_err}")
    except requests.ConnectionError as conn_err:
        logger.error(f"Connection error occurred while fetching historical flight data: {conn_err}")
    except requests.Timeout as timeout_err:
        logger.error(f"Timeout error occurred while fetching historical flight data: {timeout_err}")
    except requests.RequestException as req_err:
        logger.error(f"An error occurred while fetching historical flight data: {req_err}")
    return {}
