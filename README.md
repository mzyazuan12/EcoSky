## EcoSky

EcoSky is an AI‑powered flight visualization and route‑optimization platform.  
It consumes live traffic data from the OpenSky Network, preprocesses it on a Flask backend, and exposes it to a modern 3D globe UI built with Next.js and React.  
Reinforcement learning (via Ray RLlib) is used to prototype more efficient and environmentally friendly routes.

---

### High‑Level Architecture

- **Backend (`ecosky-back/`)**
  - Flask API with CORS enabled.
  - Periodic data ingestion from external APIs (e.g. OpenSky) via `apscheduler`.
  - Preprocessing pipeline to clean and normalize flight data.
  - AI / RL components for route optimization using Ray RLlib.
  - Exposes REST endpoints such as:
    - `GET /flights/all` – returns processed live flights.
    - `POST /optimize` – optimizes a route given start/end and weather conditions (see `ai_model/flight_optimizer.py`).

- **Frontend (`ecosky-front/`)**
  - Next.js 15 (App Router) and React 19.
  - Chakra UI + TailwindCSS for styling/layout.
  - 3D globe visualization with `react-globe.gl` and `three`.
  - Consumes the Flask API via `src/lib/backend.ts` with a configurable backend base URL.

---

### Project Structure

- **Root**
  - `ecosky-back/` – Python backend, ingestion, preprocessing, RL environment and training.
  - `ecosky-front/` – Next.js frontend application.
  - `ai_model/` – (optional) additional global AI artifacts / models.

- **Backend (`ecosky-back/`)**
  - `ai_model/app.py` – main Flask application (serves `/flights/all` and starts the scheduler).
  - `ai_model/flight_optimizer.py` – blueprint and endpoint for route optimization.
  - `ai_model/inference.py` – uses saved RL models to optimize routes.
  - `ai_model/ingest_api.py` – pulls live flight/weather data from external APIs.
  - `ai_model/preprocess.py` – transforms raw API responses into structured flight data.
  - `ai_model/rl_env.py` – custom RL environment for training agents.
  - `ai_model/train_model.py` – training entrypoint for RLlib models.
  - `ai_model/saved_models/` – saved RLlib checkpoints and policies.
  - `data/` – data utilities/tests for ingestion.
  - `requirements.txt` – Python backend and ML dependencies.

- **Frontend (`ecosky-front/`)**
  - `src/app/(main)/` – main application pages (dashboard, landing, layout).
  - `src/components/` – UI components (e.g. `GlobeComponent`, `FlightCard`, `FlightPathDetails`).
  - `src/lib/backend.ts` – backend client and TypeScript types for flights.
  - `public/` – static assets (icons, illustrations, videos).

---

### Prerequisites

- **Backend**
  - Python 3.10+ (recommended)
  - `pip` and optionally `virtualenv`

- **Frontend**
  - Node.js 20+ (to be compatible with Next.js 15 / React 19)
  - `npm` (or `pnpm`, `yarn`, etc.)

---

### Environment Variables

Backend (Flask app, in `ecosky-back/`):

- **Required**
  - `OPENSKY_USERNAME` – OpenSky Network username.
  - `OPENSKY_PASSWORD` – OpenSky Network password.

These are loaded via `python-dotenv` in `ai_model/app.py`, so you can define them in a `.env` file placed in `ecosky-back/ai_model/` or the working directory you use to run the app:

```bash
OPENSKY_USERNAME=your_username
OPENSKY_PASSWORD=your_password
```

Frontend (Next.js app, in `ecosky-front/`):

- **Optional**
  - `NEXT_PUBLIC_BACKEND_URL` – base URL of the Flask backend (defaults to `http://localhost:4000`).

Example `.env.local` in `ecosky-front/`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

### Backend – Setup & Run

From the project root:

```bash
cd ecosky-back

# (recommended) create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # on macOS / Linux
# .venv\Scripts\activate   # on Windows PowerShell

# install dependencies
pip install -r requirements.txt
```

Ensure your `.env` file or shell exports `OPENSKY_USERNAME` and `OPENSKY_PASSWORD`, then start the Flask server:

```bash
cd ai_model
python app.py
```

By default, the backend will:

- Start a Flask server on **`http://0.0.0.0:4000`**.
- Schedule periodic background data updates using `apscheduler`.
- Expose `GET /flights/all` and (via the optimizer blueprint) `POST /optimize`.

You can check `app.log` in `ecosky-back/ai_model/` for runtime logs.

---

### Frontend – Setup & Run

From the project root:

```bash
cd ecosky-front

npm install
# or: pnpm install / yarn install
```

Start the development server:

```bash
npm run dev
```

The app will run on **`http://localhost:3000`** by default.

If the backend is not running on `http://localhost:4000`, configure:

```bash
NEXT_PUBLIC_BACKEND_URL=http://your-backend-host:4000
```

and restart `npm run dev`.

---

### Key API Endpoints

- **`GET /flights/all`**
  - **Description**: Returns processed live flight data from OpenSky.
  - **Response shape** (from `src/lib/backend.ts`):
    - `{ status: "success", data: Flight[] }` on success.
    - `{ status: "error", message: string }` on failure.

- **`POST /optimize`**
  - **Description**: Optimizes a flight route considering current flights and storm data.
  - **Example payload**:
    ```json
    {
      "start": [52.52, 13.405],
      "end": [40.7128, -74.0060],
      "weather": "storm"
    }
    ```
  - **Response**:
    - `optimized_path`: list/array of `[lat, lon]` points.
    - `fuel_saved`: numeric fuel savings estimate.
    - `co2_reduced`: numeric CO₂ reduction estimate.

---

### Training & AI Components

The reinforcement learning pipeline is defined under `ecosky-back/ai_model/`:

- `rl_env.py` – defines the custom Gymnasium environment modeling flight paths, constraints, and rewards.
- `train_model.py` – orchestrates training using Ray RLlib and logs to `train_model.log`.
- `saved_models/flight_optimizer/` – contains RLlib checkpoints and policies used by `inference.py`.

To train or re‑train models (high‑level steps):

```bash
cd ecosky-back
source .venv/bin/activate  # if using a venv
cd ai_model
python train_model.py
```

After training, restart the backend so the latest checkpoints are loaded by `inference.py`.

---

### Development Notes

- **Logging**
  - Backend logs to both stdout and `app.log` (configured in `ai_model/app.py`).
  - RL training logs to `train_model.log` and Ray log directories.

- **CORS**
  - `Flask-Cors` is enabled so that the Next.js frontend can access the API in development.

- **Frontend Tech**
  - Uses Chakra UI and TailwindCSS together; Chakra for component primitives, Tailwind for utility styling.
  - 3D globe built with `react-globe.gl` and `three` for flight path visualization.

---

### Running Everything Together

1. **Start the backend**
   - In `ecosky-back/ai_model/`: `python app.py`
2. **Start the frontend**
   - In `ecosky-front/`: `npm run dev`
3. Open **`http://localhost:3000`** in your browser and interact with the EcoSky dashboard.

---

### Future Improvements (Ideas)

- Add authentication and user‑specific dashboards (favorite routes, saved optimizations).
- Expand weather integration (richer storm and wind layers).
- Add historical replay mode for past traffic patterns.
- Containerize the stack with Docker for easier deployment.
