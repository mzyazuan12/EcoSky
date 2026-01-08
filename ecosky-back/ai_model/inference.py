import sys
import os
import logging
import numpy as np
from ray.rllib.algorithms.ppo import PPOConfig
from ray.tune.registry import register_env

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import your custom environment
from rl_env import FlightEnv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Environment registration
def env_creator(env_config):
    return FlightEnv(env_config)

register_env("FlightEnv", env_creator)


def load_trained_model():
    """Load trained PPO model from checkpoint"""
    try:
        logger.info("Loading PPO model from saved_models/flight_optimizer")

        # Recreate exact training configuration
        config = (
            PPOConfig()
            .environment(
                env="FlightEnv",
                env_config={
                    "start": [51.5074, -0.1278],  # London
                    "target": [40.7128, -74.0060],  # NYC
                    "max_steps": 2000,
                    "start_altitude": 1500.0,
                    "start_heading": 45.0,
                    "start_velocity": 120.0,
                    "start_fuel": 5000.0
                }
            )
            .framework("torch")
        )

        algo = config.build()
        checkpoint_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "saved_models/flight_optimizer"
        )
        algo.restore(checkpoint_path)
        return algo

    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise


def optimize_flight_route(start, end, flights, storms, trigger):
    """
    Run inference with the trained model and optimize the flight route.

    Args:
        start (list): Starting coordinates [latitude, longitude].
        end (list): Ending coordinates [latitude, longitude].
        flights (list): List of current flights data.
        storms (list): List of storm data.
        trigger (str): Weather condition, e.g., "storm" or "clear".

    Returns:
        tuple: Optimized route (list of coordinates), total fuel saved, and total CO2 reduced.
    """
    try:
        algo = load_trained_model()

        # Environment configuration
        env_config = {
            "start": start,
            "target": end,
            "storms_data": [
                {"center": storm.get("center", [0, 0]), "radius": storm.get("radius", 1.0)}
                for storm in storms
            ],
            "max_steps": 2000,
            "start_altitude": 1500.0,
            "start_heading": 45.0,
            "start_velocity": 120.0,
            "start_fuel": 5000.0
        }

        env = FlightEnv(env_config)
        obs, _ = env.reset()
        done = False
        route = []
        total_fuel = 0.0
        total_co2 = 0.0

        while not done:
            action = algo.compute_single_action(obs)
            obs, reward, done, truncated, info = env.step(action)
            
            # Append the current observation (route point) to the route
            route.append(obs.tolist() if isinstance(obs, np.ndarray) else obs)
            total_fuel += float(info.get("fuel_used", 0))
            total_co2 += float(info.get("co2_emissions", 0))

            if done or truncated:
                break

        logger.info(f"Optimized route length: {len(route)} points")
        logger.info(f"Fuel saved: {total_fuel:.2f} units")
        logger.info(f"CO2 reduced: {total_co2:.2f} units")

        return route, total_fuel, total_co2

    except Exception as e:
        logger.error(f"Error during flight optimization: {str(e)}")
        raise


if __name__ == "__main__":
    try:
        # Mock test data for standalone execution
        start = [51.5074, -0.1278]  # London
        end = [40.7128, -74.0060]  # NYC
        flights = [{"icao24": "4b1816", "latitude": 50.0, "longitude": -10.0}]
        storms = [{"center": [55.0, -10.0], "radius": 2.0}]
        trigger = "clear"

        route, fuel, co2 = optimize_flight_route(start, end, flights, storms, trigger)
        print(f"Optimization completed. First 3 points: {route[:3]}")
    except Exception as e:
        logger.error(f"Main execution failed: {str(e)}")
        exit(1)
