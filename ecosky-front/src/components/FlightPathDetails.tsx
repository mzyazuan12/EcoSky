'use client';

import React from 'react';
import { Box, Heading, Text, VStack, useColorMode } from '@chakra-ui/react';

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  type: 'desired' | 'undesired';
}

// Helper: Convert degrees to radians
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Helper: Compute haversine distance (in radians) between two points
const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Helper: Compute the distance in kilometers (using Earth's radius ~6371 km)
// For undesired paths, simulate a weather detour by increasing distance by 7%
const computeDistanceKm = (arc: ArcData) => {
  const angularDistance = haversineDistance(
    arc.startLat,
    arc.startLng,
    arc.endLat,
    arc.endLng
  );
  const baseDistance = angularDistance * 6371;
  return arc.type === 'undesired' ? baseDistance * 1.07 : baseDistance;
};

// Helper: Compute flight time (in hours and minutes) given an average speed (default 900 km/h)
// For undesired paths, add an extra 20 minutes delay.
const computeFlightTimeForArc = (arc: ArcData, avgSpeed = 900) => {
  const distanceKm = computeDistanceKm(arc);
  let timeHours = distanceKm / avgSpeed;
  if (arc.type === 'undesired') {
    timeHours += 0.33; // extra 20 minutes delay
  }
  const hours = Math.floor(timeHours);
  const minutes = Math.round((timeHours - hours) * 60);
  return { hours, minutes };
};

interface FlightPathDetailsProps {
  arcsData: ArcData[];
}

export const FlightPathDetails: React.FC<FlightPathDetailsProps> = ({ arcsData }) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      p={4}
      bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
      borderRadius="md"
      boxShadow="md"
      w="full"
      mt={8}
      overflowY="auto"
    >
      <Heading size="md" mb={4}>
        Weather Mode: Flight Path Details
      </Heading>
      {arcsData.length === 0 ? (
        <Text>No flight paths to display.</Text>
      ) : (
        <VStack spacing={4} align="stretch">
          {arcsData.map((arc, index) => {
            const distanceKm = computeDistanceKm(arc);
            const { hours, minutes } = computeFlightTimeForArc(arc);
            return (
              <Box
                key={index}
                p={3}
                border="1px solid"
                borderColor={colorMode === 'light' ? 'gray.200' : 'gray.600'}
                borderRadius="md"
              >
                <Text fontWeight="bold" mb={1}>
                  {arc.type === 'desired' ? 'Desired Path' : 'Undesired Path'}
                </Text>
                <Text>
                  <strong>Start:</strong> ({arc.startLat.toFixed(4)}, {arc.startLng.toFixed(4)})
                </Text>
                <Text>
                  <strong>End:</strong> ({arc.endLat.toFixed(4)}, {arc.endLng.toFixed(4)})
                </Text>
                <Text>
                  <strong>Distance:</strong> {distanceKm.toFixed(2)} km
                </Text>
                <Text>
                  <strong>Flight Time:</strong> {hours}h {minutes}m
                </Text>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
};
