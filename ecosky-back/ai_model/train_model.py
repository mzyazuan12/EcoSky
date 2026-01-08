import logging
import ray
from ray.rllib.algorithms.ppo import PPOConfig
from ray.tune.registry import register_env

# Import your custom environment and utilities
from ai_model.ingest_api import fetch_flight_data, fetch_weather_alerts
from data.preprocess import preprocess_flight_data, preprocess_weather_alerts
from ai_model.rl_env import FlightEnv  # Ensure this path is correct

# Load environment variables
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("train_model.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def env_creator(env_config):
    """
    Creator function for RLlib to build our advanced FlightEnv.
    """
    return FlightEnv(env_config)

def train_model():
    """
    Train a PPO model on the advanced FlightEnv, saving checkpoints
    to saved_models/flight_optimizer/.
    """
    total_cpus = 4  # Adjust based on your machine's capabilities
    ray.init(ignore_reinit_error=True, num_cpus=total_cpus)

    try:
        # Register the custom environment
        register_env("FlightEnv", env_creator)

        # Build the PPO config
        config = PPOConfig()

        # Configure the environment
        config = config.environment(
            env="FlightEnv",
            env_config={
                "start": [51.5074, -0.1278],     # London
                "target": [40.7128, -74.0060],   # NYC
                "storms_data": [
                    {"center": [55.0, -10.0], "radius": 2.0},   # Sample storms
                    {"center": [60.0, -20.0], "radius": 1.5}
                ],
                "max_steps": 2000,
                "start_altitude": 1500.0,
                "start_heading": 45.0,
                "start_velocity": 120.0,
                "start_fuel": 5000.0
            }
        )

        # Configure environment runners (replace deprecated num_rollout_workers)
        config.num_env_runners = 2           # Number of parallel workers
        config.rollout_fragment_length = 500  # Rollout fragment length

        # Framework configuration
        config.framework("torch")  # Change to "torch" if using PyTorch

        # Training configuration
        config.train_batch_size = 4000
        config.sgd_minibatch_size = 256
        config.num_sgd_iter = 20
        config.gamma = 0.99
        config.lr = 1e-4
        config.entropy_coeff = 0.01
        config.lambda_ = 0.95
        config.clip_param = 0.2

        # Resources configuration
        config.resources(
            num_gpus=1 if ray.available_resources().get("GPU", 0) > 0 else 0,
            num_cpus_per_worker=1,
        )

        # Model configuration using RLModule
        config.rl_module(model_config={
            "fcnet_hiddens": [512, 512],
            "fcnet_activation": "relu",
            "vf_share_layers": True,
            "max_seq_len": 20
        })

        # **Important:** Do NOT set `exploration_config` directly.
        # To avoid the error, set it to an empty dictionary.
        config.exploration_config = {}

        # Build the PPO Algorithm using `build_algo()`
        algo = config.build_algo()

        # Training loop
        num_iterations = 100
        for i in range(num_iterations):
            result = algo.train()
            mean_reward = result.get("episode_reward_mean", 0)
            logger.info(f"Iteration {i + 1}/{num_iterations}, mean_reward = {mean_reward:.2f}")

            # Save intermediate checkpoints
            if (i + 1) % 10 == 0:
                checkpoint_path = algo.save(f"saved_models/flight_optimizer_iter_{i + 1}")
                logger.info(f"Checkpoint saved at {checkpoint_path}")

        # Save final checkpoint
        checkpoint_path = algo.save("saved_models/flight_optimizer")
        logger.info(f"Final checkpoint saved at {checkpoint_path}")

    finally:
        ray.shutdown()

if __name__ == "__main__":
    train_model()
