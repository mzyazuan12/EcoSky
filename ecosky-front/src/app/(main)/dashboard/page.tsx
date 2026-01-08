'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Center,
  Badge,
  Container,
} from '@chakra-ui/react';
import { fetchAllFlights, Flight } from '../../../lib/backend';

const DashboardPage = () => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchAllFlights();
        if (!cancelled) {
          setFlights(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load flights from backend'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container maxW="6xl" py={10}>
      <Heading mb={4}>Live Flights (Backend)</Heading>
      <Text mb={6} color="gray.500">
        Data served by the Flask backend at <code>/flights/all</code>.
      </Text>

      {loading && (
        <Center py={10}>
          <Spinner size="lg" />
        </Center>
      )}

      {error && !loading && (
        <Box mb={4} color="red.500">
          {error}
        </Box>
      )}

      {!loading && !error && flights.length === 0 && (
        <Text>No flights available from backend.</Text>
      )}

      {!loading && !error && flights.length > 0 && (
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflowX="auto"
          boxShadow="sm"
        >
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Callsign</Th>
                <Th>ICAO24</Th>
                <Th>Origin Country</Th>
                <Th isNumeric>Latitude</Th>
                <Th isNumeric>Longitude</Th>
                <Th isNumeric>Altitude (m)</Th>
                <Th isNumeric>Velocity (km/h)</Th>
                <Th>On Ground</Th>
              </Tr>
            </Thead>
            <Tbody>
              {flights.map((f) => (
                <Tr key={f.icao24 + f.callsign}>
                  <Td>{f.callsign || '-'}</Td>
                  <Td>{f.icao24}</Td>
                  <Td>{f.origin_country}</Td>
                  <Td isNumeric>{f.latitude.toFixed(3)}</Td>
                  <Td isNumeric>{f.longitude.toFixed(3)}</Td>
                  <Td isNumeric>{Math.round(f.baro_altitude)}</Td>
                  <Td isNumeric>{Math.round(f.velocity)}</Td>
                  <Td>
                    <Badge colorScheme={f.on_ground ? 'yellow' : 'green'}>
                      {f.on_ground ? 'Ground' : 'Airborne'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Container>
  );
};

export default DashboardPage;


