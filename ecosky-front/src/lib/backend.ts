export interface Flight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  velocity: number;
  baro_altitude: number;
  on_ground: boolean;
}

interface FlightsResponse {
  status: 'success' | 'error';
  data?: Flight[];
  message?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:4000';

export const getBackendBaseUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BASE_URL;

export async function fetchAllFlights(): Promise<Flight[]> {
  const baseUrl = getBackendBaseUrl().replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/flights/all`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Backend request failed with status ${res.status}`);
  }

  const json = (await res.json()) as FlightsResponse;

  if (json.status !== 'success' || !Array.isArray(json.data)) {
    throw new Error(json.message || 'Unexpected backend response format');
  }

  return json.data;
}


