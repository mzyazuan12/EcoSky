'use client';

import React, { useEffect, useRef, useMemo } from "react";
import Globe from "react-globe.gl";
import {
  Box,
  useColorMode,
  Button,
  VStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tooltip,
} from "@chakra-ui/react";

/** -----------------------
 * 1) Types & Interfaces
 * -----------------------*/
export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  type: 'desired' | 'undesired';
}

interface GlobePath {
  id: number;                   // unique ID for each path
  type: 'desired' | 'undesired';
  points: [number, number][];   // array of [lat, lng] pairs
}

interface GlobeComponentProps {
  arcsData: ArcData[];
}

/** -----------------------
 * 2) Spherical Math Helpers
 * -----------------------*/
// Convert degrees ↔ radians
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Haversine-based distance in radians between two points. */
function haversineRadians(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Interpolate along the great circle at fraction t (0..1). */
function interpolateGreatCircle(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  t: number
) {
  // Convert to radians
  const φ1 = toRad(lat1);
  const λ1 = toRad(lng1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lng2);

  // Angular distance between the two points
  const Δσ = haversineRadians(lat1, lng1, lat2, lng2);

  // If points are nearly identical, just return the start
  if (Δσ < 1e-8) {
    return { lat: lat1, lng: lng1 };
  }

  // Interpolate along the great circle
  // Source: https://www.movable-type.co.uk/scripts/latlong.html
  const θ = Δσ * t;
  const sinΔσ = Math.sin(Δσ);
  const A = Math.sin(Δσ - θ) / sinΔσ;
  const B = Math.sin(θ) / sinΔσ;

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);

  return {
    lat: toDeg(φi),
    lng: toDeg(λi),
  };
}

/** Compute bearing from p1 to p2 (used for lateral offset). */
function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let brng = Math.atan2(y, x);
  brng = (brng + 2 * Math.PI) % (2 * Math.PI); // normalize
  return toDeg(brng);
}

/** Offset a lat/lng point by `distanceKm` at `bearingDeg`. */
function offsetPoint(
  lat: number, lng: number,
  distanceKm: number, bearingDeg: number
) {
  const R = 6371; // Earth radius (km)
  const δ = distanceKm / R;
  const θ = toRad(bearingDeg);

  const φ1 = toRad(lat);
  const λ1 = toRad(lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return { lat: toDeg(φ2), lng: toDeg(λ2) };
}

/** -----------------------
 * 3) Build Parallel Arcs
 * -----------------------*/
/**
 * Returns an array of [lat, lng] for a "parallel" arc.
 *  - Both arcs share the same endpoints.
 *  - For undesired arcs, we offset each *intermediate* point sideways.
 */
function buildParallelPath(arc: ArcData, steps = 32): [number, number][] {
  const { startLat, startLng, endLat, endLng, type } = arc;
  const points: [number, number][] = [];

  // Precompute the route's bearing for lateral offset
  const bearing = computeBearing(startLat, startLng, endLat, endLng);
  // Shift bearing by +90° for a perpendicular offset
  const offsetBearing = (bearing + 90) % 360;
  // Lateral distance to offset for undesired arcs
  const OFFSET_DISTANCE_KM = 50;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Interpolate along the great circle
    const { lat, lng } = interpolateGreatCircle(startLat, startLng, endLat, endLng, t);

    // For the first/last point or for desired arcs, no offset
    if (i === 0 || i === steps || type === 'desired') {
      points.push([lat, lng]);
    } else {
      // For undesired arcs, offset intermediate points only
      const offset = offsetPoint(lat, lng, OFFSET_DISTANCE_KM, offsetBearing);
      points.push([offset.lat, offset.lng]);
    }
  }
  return points;
}

/** -----------------------
 * 4) GlobeComponent
 * -----------------------*/
export const GlobeComponent: React.FC<GlobeComponentProps> = ({ arcsData }) => {
  const globeRef = useRef<any>();
  const { colorMode } = useColorMode();
  const [autoRotate, setAutoRotate] = React.useState(true);
  const [zoom, setZoom] = React.useState(1.5);

  /**
   * Convert each ArcData into a "pathsData" item,
   * so we can pass polylines to react-globe.
   */
  const pathsData = useMemo<GlobePath[]>(() => {
    return arcsData.map((arc, index) => ({
      id: index,
      type: arc.type,
      points: buildParallelPath(arc),
    }));
  }, [arcsData]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = autoRotate;
      globeRef.current.controls().autoRotateSpeed = 0.3;
    }
  }, [autoRotate]);

  const handleZoom = (value: number) => {
    setZoom(value);
    if (globeRef.current) {
      globeRef.current.camera().fov = 45 / value;
      globeRef.current.camera().updateProjectionMatrix();
    }
  };

  // Accessors for react-globe paths
  const getPathPoints = (path: GlobePath) => path.points;
  const getPathColor = (path: GlobePath) =>
    path.type === 'undesired' ? '#EF4444' : '#10B981';

  return (
    <VStack spacing={4} w="full" h="100vh" p={4}>
      <Box
        h="80vh"
        w="full"
        borderRadius="2xl"
        overflow="hidden"
        boxShadow="2xl"
        bg={colorMode === "light" ? "white" : "gray.800"}
      >
        <Globe
          ref={globeRef}
          // We now use "pathsData" instead of "arcsData"
          pathsData={pathsData}
          pathPoints={getPathPoints}
          pathColor={getPathColor}
          // Thicker stroke for visibility
          pathStroke={4}
          // Draw them as arcs
          pathArcs={true}
          // We'll handle great-circle logic ourselves, so set this false
          pathUseGreatCircle={false}
          // Optional dash effect
          pathDashLength={0.3}
          pathDashGap={0.05}
          pathDashAnimateTime={1500}
          // Background & textures
          globeImageUrl={
            colorMode === "light"
              ? 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
              : 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
          }
          backgroundImageUrl={
            colorMode === "light"
              ? undefined
              : 'https://unpkg.com/three-globe/example/img/night-sky.png'
          }
          cloudsImageUrl="https://unpkg.com/three-globe/example/img/clouds.png"
          cloudsOpacity={0.4}
          cloudsAltitude={0.1}
          atmosphereColor={colorMode === "light" ? "#BFDBFE" : "#1E3A8A"}
          onGlobeClick={() => {
            // Temporarily pause auto-rotate on user interaction
            setAutoRotate(false);
            setTimeout(() => setAutoRotate(true), 5000);
          }}
        />
      </Box>

      {/* Zoom & Rotation Controls */}
      <VStack spacing={4} w="full" maxW="lg">
        <Slider
          aria-label="zoom-control"
          value={zoom}
          min={0.5}
          max={3}
          step={0.1}
          onChange={handleZoom}
        >
          <SliderTrack bg="gray.100">
            <SliderFilledTrack bg="blue.500" />
          </SliderTrack>
          <SliderThumb boxSize={6} />
        </Slider>

        <Tooltip
          label={autoRotate ? "Pause Rotation" : "Resume Rotation"}
          aria-label="Auto Rotate Tooltip"
        >
          <Button
            colorScheme="green"
            onClick={() => setAutoRotate(!autoRotate)}
            size="lg"
            variant="outline"
          >
            {autoRotate ? "Pause Rotation" : "Resume Rotation"}
          </Button>
        </Tooltip>
      </VStack>
    </VStack>
  );
};
