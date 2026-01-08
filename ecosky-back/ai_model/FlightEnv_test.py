# File: ecosky-back/ai_model/test_env.py

from ai_model.rl_env import FlightEnv

def test_flight_env():
    env = FlightEnv()
    obs, info = env.reset()
    done = False
    total_reward = 0.0

    while not done:
        action = env.action_space.sample()  # Random action
        obs, reward, done, truncated, info = env.step(action)
        total_reward += reward
        env.render()  # If implemented

    print(f"Episode finished. Total Reward: {total_reward}")

if __name__ == "__main__":
    test_flight_env()
