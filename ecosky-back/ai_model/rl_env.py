
import gymnasium as gym
import numpy as np
import logging

logger = logging.getLogger(__name__)

class FlightEnv(gym.Env):
    

    def __init__(self, config=None):
        super().__init__()
        config = config or {}

        self.start = np.array(config.get("start", [51.5074, -0.1278]), dtype=np.float32)  # Default: London
        self.target = np.array(config.get("target", [40.7128, -74.0060]), dtype=np.float32)  # Default: NYC
        self.storms = config.get("storms_data", [])  # List of dicts: [{"center": [lat, lon], "radius": 1.0}, ...]
        self.max_steps = config.get("max_steps", 1000)

        self.start_altitude = config.get("start_altitude", 1000.0)  # meters
        self.start_heading = config.get("start_heading", 90.0)      # degrees from north
        self.start_velocity = config.get("start_velocity", 100.0)   # m/s
        self.start_fuel = config.get("start_fuel", 10000.0)         # arbitrary units

        self._reset_internal()

        self.action_space = gym.spaces.Box(
            low=np.array([-10.0, -0.2, -50.0], dtype=np.float32),
            high=np.array([+10.0, +0.2, +50.0], dtype=np.float32),
            shape=(3,),
            dtype=np.float32
        )

        self.observation_space = gym.spaces.Box(
            low=np.array([-180.0, -180.0,   0.0,   0.0,   0.0,   0.0, -180.0, -180.0], dtype=np.float32),
            high=np.array([ 180.0,  180.0, 20000.0, 360.0, 500.0, 200000.0, 180.0, 180.0], dtype=np.float32),
            shape=(8,),
            dtype=np.float32
        )

    def _reset_internal(self):
        """
        Internal method to reset environment variables.
        """
        self.current_step = 0
        self.latitude = self.start[0]
        self.longitude = self.start[1]
        self.altitude = self.start_altitude
        self.heading = self.start_heading % 360.0
        self.velocity = self.start_velocity
        self.fuel = self.start_fuel

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self._reset_internal()
        obs = self._get_obs()
        info = {}
        return np.array(obs, dtype=np.float32),info

    def _get_obs(self):
        """
        Build the current observation vector.
        """
        return np.array([
            self.latitude,
            self.longitude,
            self.altitude,
            self.heading,
            self.velocity,
            self.fuel,
            self.target[0],
            self.target[1]
        ], dtype=np.float32)

    def step(self, action):
        """
        Execute one timestep with physics updates based on the given action.
        """
        self.current_step += 1

        # 1) Clip the action to ensure it's within the action space
        dh, dthrottle, dalt = np.clip(
            action,
            self.action_space.low,
            self.action_space.high
        )

        # 2) Update heading
        self.heading = (self.heading + dh) % 360.0

        # 3) Update velocity with throttle
        #    dthrottle is a fraction change, e.g., -0.2 to +0.2
        new_velocity = self.velocity * (1.0 + dthrottle)
        self.velocity = np.clip(new_velocity, 0.0, 500.0)  # m/s

        # 4) Update altitude
        self.altitude = np.clip(self.altitude + dalt, 0.0, 20000.0)  # meters

        # 5) Move the plane based on heading & velocity
        #    Assuming dt = 1 second per step
        dt = 1.0  # seconds
        rad = np.deg2rad(self.heading)

        # Approximate meters per degree latitude and longitude
        lat_meters = 111320.0  # meters per degree latitude
        cos_factor = np.cos(np.deg2rad(self.latitude))
        lon_meters = 111320.0 * cos_factor  # meters per degree longitude

        distance_traveled = self.velocity * dt  # meters
        delta_x = distance_traveled * np.sin(rad)  # East component
        delta_y = distance_traveled * np.cos(rad)  # North component

        # Convert movement back to degrees
        dlon_deg = delta_x / lon_meters if lon_meters != 0 else 0.0
        dlat_deg = delta_y / lat_meters

        self.latitude += dlat_deg
        self.longitude += dlon_deg

        # 6) Fuel usage
        # Simple model: fuel used = distance_traveled (km) * 0.1
        fuel_used = 0.1 * (distance_traveled / 1000.0)  # units
        self.fuel = max(0.0, self.fuel - fuel_used)

        # 7) Compute reward
        #    - Negative distance to target
        #    - Negative fuel usage
        #    - Penalty for entering storm areas
        #    - Penalty for being too high or too low
        #    - Bonus for reaching the target within a threshold

        # Compute distance to target
        dist_to_target = self._distance_to_target()

        # Initialize reward
        reward = -dist_to_target  # Encourage minimizing distance

        # Penalize fuel usage
        reward -= (fuel_used * 2.0)  # Weight can be adjusted

        # Check for storms and apply penalties
        storm_penalty = 0.0
        for storm in self.storms:
            center = np.array(storm.get("center", [0.0, 0.0]), dtype=float)
            radius = storm.get("radius", 1.0)  # in km
            storm_dist = self._haversine(self.latitude, self.longitude, center[0], center[1])
            if storm_dist < radius:
                storm_penalty = -200.0  # Fixed penalty; can be scaled
                break  # Apply only one storm penalty per step

        reward += storm_penalty

        # Additional penalties for altitude deviation
        optimal_altitude = 10000.0  # meters; can be parameterized
        alt_deviation = abs(self.altitude - optimal_altitude)
        reward -= (alt_deviation * 0.01)  # Small penalty for deviation

        # 8) Check termination conditions
        done = False
        truncated = False

        if dist_to_target < 1.0:
            reward += 1000.0  # Large bonus for reaching the target
            done = True
            logger.info("Target reached successfully.")
        elif self.fuel <= 0.0:
            reward -= 1000.0  # Large penalty for running out of fuel
            done = True
            logger.info("Out of fuel. Simulation terminated.")
        elif self.current_step >= self.max_steps:
            truncated = True
            done = True
            logger.info("Maximum steps reached. Simulation terminated.")

        # Prepare observation and info
        obs = self._get_obs()
        info = {
            "dist_to_target": dist_to_target,
            "storm_penalty": storm_penalty,
            "fuel_used": fuel_used,
            "alt_deviation": alt_deviation
        }

        return np.array(obs, dtype=np.float32), reward, done, truncated, info

    def _distance_to_target(self):
        """
        Calculate the distance to the target using the Haversine formula.
        """
        return self._haversine(self.latitude, self.longitude, self.target[0], self.target[1])

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2):
        """
        Calculate the great-circle distance between two points on the Earth's surface.
        Returns distance in kilometers.
        """
        R = 6371.0  # Earth radius in km
        lat1_rad = np.deg2rad(lat1)
        lon1_rad = np.deg2rad(lon1)
        lat2_rad = np.deg2rad(lat2)
        lon2_rad = np.deg2rad(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = np.sin(dlat / 2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        distance = R * c
        return distance

    def render(self, mode='human'):
        """
        Simple console-based rendering of the current state.
        """
        status = (
            f"Step: {self.current_step}\n"
            f"Position: {self.latitude:.4f}°, {self.longitude:.4f}°\n"
            f"Altitude: {self.altitude:.0f}m | Heading: {self.heading:.1f}°\n"
            f"Speed: {self.velocity:.1f}m/s | Fuel: {self.fuel:.1f} units\n"
            f"Distance to Target: {self._distance_to_target():.2f} km\n"
            f"Storm Penalty: {self._current_storm_penalty()}\n"
            f"Altitude Deviation: {abs(self.altitude - 10000.0):.2f}m\n"
        )
        print(status)

    def _current_storm_penalty(self):
        """
        Helper method to determine current storm penalty.
        """
        for storm in self.storms:
            center = np.array(storm.get("center", [0.0, 0.0]), dtype=float)
            radius = storm.get("radius", 1.0)  # in km
            storm_dist = self._haversine(self.latitude, self.longitude, center[0], center[1])
            if storm_dist < radius:
                return f"In Storm (Distance: {storm_dist:.2f} km)"
        return "No Storm Nearby"

    def close(self):
        """
        Perform any necessary cleanup.
        """
        pass
