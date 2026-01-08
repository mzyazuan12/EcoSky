import numpy as np
import logging

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def preprocess_flight_data(flight_data):
    """
    Preprocess flight data for the AI model.

    Args:
        flight_data (dict): Raw JSON data from OpenSky API.

    Returns:
        list: List of dictionaries with relevant flight information.
    """
    processed_flights = []

    if not flight_data or 'states' not in flight_data:
        logger.warning("No flight data available to preprocess.")
        return processed_flights

    for state in flight_data['states']:
        # OpenSky state vector fields:
        # [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
        # [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude,
        # [8] on_ground, [9] velocity, [10] true_track, [11] vertical_rate,
        # [12] sensors, [13] geo_altitude, [14] squawk, [15] spi, [16] position_source

        # Ensure that position data is present
        if state[5] is None or state[6] is None:
            continue  # Skip flights without position data

        flight_info = {
            'icao24': state[0],
            'callsign': state[1].strip() if state[1] else '',
            'origin_country': state[2],
            'longitude': state[5],
            'latitude': state[6],
            'velocity': state[9] if state[9] else 0,  # km/h
            'baro_altitude': state[7] if state[7] else 0,  # meters
            'on_ground': state[8]
        }

        processed_flights.append(flight_info)

    logger.info(f"Processed {len(processed_flights)} flights.")
    return processed_flights

def preprocess_weather_alerts(weather_data):
    """
    Preprocess weather alerts for the AI model.
    
    - If geometry is missing (None), we store the alert with None coords.
    - If geometry is 'Point' or a Polygon type, we attempt to parse coords.
    - We only keep alerts whose event name is storm/tornado/hurricane/thunderstorm.

    Args:
        weather_data (dict): Raw JSON data from a weather alerts API.

    Returns:
        list[dict]: Each alert is { event, longitude, latitude }.
    """
    processed_alerts = []

    if not weather_data or 'features' not in weather_data:
        logger.warning("No weather data available to preprocess.")
        return processed_alerts

    for feature in weather_data['features']:
        # Make sure feature is a dict
        if not isinstance(feature, dict):
            logger.warning(f"Skipping non-dict feature: {feature}")
            continue

        properties = feature.get('properties', {})
        event_str = (properties.get('event') or "").lower()

        # Only keep if "event" has certain keywords
        if not any(k in event_str for k in ['storm', 'tornado', 'hurricane', 'thunderstorm']):
            continue

        geometry = feature.get('geometry')  # Could be None, dict, or something else
        # Default coords:
        lon = None
        lat = None

        if isinstance(geometry, dict):
            # Attempt to parse geometry
            geom_type = geometry.get('type', '')
            coords = geometry.get('coordinates', [])

            if geom_type == 'Point':
                # Expect [lon, lat]
                if (isinstance(coords, list) 
                    and len(coords) == 2
                    and all(isinstance(c, (float, int)) for c in coords)):
                    lon, lat = coords
                else:
                    logger.warning(f"Point with invalid coords: {coords}")

            elif geom_type in ['Polygon', 'MultiPolygon']:
                # Attempt a centroid
                try:
                    if geom_type == 'Polygon':
                        polygon_coords = coords[0] if coords and isinstance(coords[0], list) else []
                    else:
                        # 'MultiPolygon'
                        polygon_coords = coords[0][0] if coords and isinstance(coords[0], list) else []
                    polygon_array = np.array(polygon_coords, dtype=float)
                    if polygon_array.shape[1] == 2:
                        centroid = polygon_array.mean(axis=0)
                        lon, lat = centroid
                    else:
                        logger.warning(f"Invalid polygon shape: {polygon_array.shape}")
                except Exception as e:
                    logger.error(f"Error computing polygon centroid: {e}")
            else:
                logger.warning(f"Unhandled geometry type: {geom_type}")
        else:
            # geometry is None or not a dict
            logger.warning(f"No valid geometry. Storing alert with no coords: {feature}")

        # Regardless, store the alert. lon/lat might be None if geometry was missing/invalid.
        processed_alerts.append({
            'event': properties.get('event', ''),
            'longitude': lon,
            'latitude': lat
        })

    logger.info(f"Processed {len(processed_alerts)} weather alerts.")
    return processed_alerts


if __name__ == "__main__":
    """
    Test the preprocessing scripts with sample data.
    """
    # Import ingest_api functions for testing
    try:
        from ingest_api import fetch_flight_data, fetch_weather_alerts
    except ImportError as e:
        logger.error(f"Failed to import ingest_api module: {e}")
        logger.error("Ensure that 'ingest_api.py' exists and contains 'fetch_flight_data' and 'fetch_weather_alerts' functions.")
        exit(1)

    # Fetch raw data
    flight_raw = fetch_flight_data()
    weather_raw = fetch_weather_alerts()

    # Preprocess data
    # Since preprocess_flight_data and preprocess_weather_alerts are defined in the same script,
    # there's no need to import them again. Instead, call them directly.
    processed_flights = preprocess_flight_data(flight_raw)
    processed_weather = preprocess_weather_alerts(weather_raw)

    # Print sample processed data
    print("Sample Processed Flights:")
    for flight in processed_flights[:5]:  # Display first 5 flights
        print(flight)

    print("\nSample Processed Weather Alerts:")
    for alert in processed_weather[:5]:  # Display first 5 alerts
        print(alert)
