'use client';

import { ScrollPlane } from '../../components/ScrollPlane';
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobeComponent, ArcData } from "../../components/GlobeComponent";
import { StatsCard } from "../../components/StatsCard";
import { FlightPathDetails } from "../../components/FlightPathDetails";
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  VStack,
  Container,
  Input,
  Button,
  Flex,
  HStack,
  Link,
  useColorModeValue,
  FormControl,
  FormLabel,
  IconButton,
  List,
  ListItem,
  Tooltip,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import GridBackground from "../../components/GridBackground";
import NextLink from "next/link";

// Helper functions for coordinate offsetting

// Convert degrees to radians.
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Convert radians to degrees.
const toDeg = (rad: number) => (rad * 180) / Math.PI;

// Compute the initial bearing (forward azimuth) from (lat1, lng1) to (lat2, lng2)
const computeBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let brng = Math.atan2(y, x);
  brng = (brng + 2 * Math.PI) % (2 * Math.PI); // normalize to 0...2π
  return toDeg(brng);
};

// Given a starting coordinate, a distance (in km), and a bearing (in degrees),
// compute the destination point using the haversine formula.
const offsetPoint = (lat: number, lng: number, distanceKm: number, bearingDeg: number) => {
  const R = 6371; // Earth's radius in km
  const δ = distanceKm / R; // angular distance in radians
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  
  return { lat: toDeg(φ2), lng: toDeg(λ2) };
};

interface Route {
  id: number;
  start: {
    name: string;
    lat: number;
    lng: number;
  };
  end: {
    name: string;
    lat: number;
    lng: number;
  };
}

const Navbar = () => {
  const hoverColor = useColorModeValue("blue.600", "blue.200");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Flex
      as="nav"
      position="fixed"
      w={isScrolled ? "100%" : "80%"}
      top={0}
      left={isScrolled ? "0" : "50%"}
      transform={isScrolled ? "none" : "translateX(-50%)"}
      bg="rgba(255, 255, 255, 0.9)"
      backdropFilter="blur(10px)"
      zIndex={1500}
      px={8}
      py={4}
      borderBottom="1px solid"
      borderColor="gray.100"
      transition="all 0.3s ease"
      borderRadius={isScrolled ? "0" : "0 0 20px 20px"}
    >
      <Flex justify="space-between" w="100%" maxW="container.xl" mx="auto">
        <Link 
          as={NextLink} 
          href="/" 
          fontSize="xl" 
          fontWeight="bold" 
          color="blue.600"
          _hover={{ textDecoration: 'none', transform: 'scale(1.02)' }}
          transition="transform 0.2s"
        >
          EcoSky AI
        </Link>
        
        <HStack spacing={8}>
          <Link
            as={NextLink}
            href="#features"
            color="gray.600"
            _hover={{ color: hoverColor, transform: 'translateY(-2px)' }}
            fontWeight="500"
            transition="all 0.2s"
          >
            Features
          </Link>
          <Link
            as={NextLink}
            href="#stats"
            color="gray.600"
            _hover={{ color: hoverColor, transform: 'translateY(-2px)' }}
            fontWeight="500"
            transition="all 0.2s"
          >
            Statistics
          </Link>
          <Link
            as={NextLink}
            href="/dashboard"
            color="gray.600"
            _hover={{ color: hoverColor, transform: 'translateY(-2px)' }}
            fontWeight="500"
            transition="all 0.2s"
          >
            Live Flights
          </Link>
        </HStack>

        <HStack spacing={6}>
          <Link
            as={NextLink}
            href="/about"
            color="gray.600"
            _hover={{ color: hoverColor, transform: 'translateY(-2px)' }}
            fontWeight="500"
            transition="all 0.2s"
          >
            Guide
          </Link>
        </HStack>
      </Flex>
    </Flex>
  );
};

const Home: React.FC = () => {
  // Weather state
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const cardBg = useColorModeValue("white", "gray.800");

  // Route management state
  const [desiredRoutes, setDesiredRoutes] = useState<Route[]>([]);
  const [undesiredRoutes, setUndesiredRoutes] = useState<ArcData[]>([]);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [startLocation, setStartLocation] = useState<string>("");
  const [endLocation, setEndLocation] = useState<string>("");
  const [stormActive, setStormActive] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      
      if (!geoResponse.ok) throw new Error("Geocoding failed");
      const geoData = await geoResponse.json();
      
      if (!geoData.results?.length) throw new Error("Location not found");
      const { latitude, longitude, name, country } = geoData.results[0];

      // Fetch current weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );

      if (!weatherResponse.ok) throw new Error("Weather fetch failed");
      const weatherJson = await weatherResponse.json();

      setWeatherData({
        ...weatherJson.current_weather,
        location: `${name}, ${country}`,
      });
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startLocation.trim() || !endLocation.trim()) {
      setRouteError("Both start and end locations are required.");
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      // Geocode Start Location
      const startGeoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(startLocation)}&count=1`
      );

      if (!startGeoResponse.ok) throw new Error("Geocoding start location failed");
      const startGeoData = await startGeoResponse.json();

      if (!startGeoData.results?.length) throw new Error("Start location not found");
      const { latitude: startLat, longitude: startLng, name: startName, country: startCountry } = startGeoData.results[0];

      // Geocode End Location
      const endGeoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(endLocation)}&count=1`
      );

      if (!endGeoResponse.ok) throw new Error("Geocoding end location failed");
      const endGeoData = await endGeoResponse.json();

      if (!endGeoData.results?.length) throw new Error("End location not found");
      const { latitude: endLat, longitude: endLng, name: endName, country: endCountry } = endGeoData.results[0];

      // Add route as a desired route
      const newRoute: Route = {
        id: Date.now(),
        start: { name: `${startName}, ${startCountry}`, lat: startLat, lng: startLng },
        end: { name: `${endName}, ${endCountry}`, lat: endLat, lng: endLng },
      };

      setDesiredRoutes(prev => [...prev, newRoute]);

      // If storm mode is active, also add an undesired arc for this route
      if (stormActive) {
        const newUndesiredArc: ArcData = {
          startLat: startLat,
          startLng: startLng,
          endLat: endLat,
          endLng: endLng,
          type: 'undesired',
        };
        setUndesiredRoutes(prev => [...prev, newUndesiredArc]);
      }

      setStartLocation("");
      setEndLocation("");
    } catch (error) {
      console.error("Error:", error);
      setRouteError(error instanceof Error ? error.message : "Failed to add route");
    } finally {
      setRouteLoading(false);
    }
  };

  const removeRoute = (id: number) => {
    const routeToRemove = desiredRoutes.find(route => route.id === id);
    if (!routeToRemove) return;

    setDesiredRoutes(prev => prev.filter(route => route.id !== id));

    if (stormActive) {
      setUndesiredRoutes(prev => prev.filter(arc => {
        return !(
          arc.startLat === routeToRemove.start.lat &&
          arc.startLng === routeToRemove.start.lng &&
          arc.endLat === routeToRemove.end.lat &&
          arc.endLng === routeToRemove.end.lng
        );
      }));
    }
  };

  const toggleStormMode = () => {
    if (!stormActive) {
      const newUndesiredArcs: ArcData[] = desiredRoutes.map(route => ({
        startLat: route.start.lat,
        startLng: route.start.lng,
        endLat: route.end.lat,
        endLng: route.end.lng,
        type: 'undesired',
      }));
      setUndesiredRoutes(newUndesiredArcs);
      setStormActive(true);
    } else {
      setUndesiredRoutes([]);
      setStormActive(false);
    }
  };

  // Create original arcs from desired routes
  const desiredArcsData: ArcData[] = desiredRoutes.map(route => ({
    startLat: route.start.lat,
    startLng: route.start.lng,
    endLat: route.end.lat,
    endLng: route.end.lng,
    type: 'desired',
  }));

  // Combine desired and undesired arcs (original data for flight details)
  const combinedArcsData: ArcData[] = [
    ...desiredArcsData,
    ...undesiredRoutes,
  ];

  // Create a modified copy for the Globe display.
  // For undesired arcs, compute a lateral offset using the bearing.
  const globeArcsData: ArcData[] = combinedArcsData.map(arc => {
    if (arc.type === 'undesired') {
      // Compute bearing from start to end
      const brng = computeBearing(arc.startLat, arc.startLng, arc.endLat, arc.endLng);
      // Offset perpendicular to the bearing (e.g., add 90°)
      const offsetBearing = (brng + 90) % 360;
      // Choose a small offset distance (in km)
      const offsetDistanceKm = 50; // adjust as needed
      const newStart = offsetPoint(arc.startLat, arc.startLng, offsetDistanceKm, offsetBearing);
      const newEnd = offsetPoint(arc.endLat, arc.endLng, offsetDistanceKm, offsetBearing);
      return { ...arc, startLat: newStart.lat, startLng: newStart.lng, endLat: newEnd.lat, endLng: newEnd.lng };
    }
    return arc;
  });

  const getWeatherDescription = (code: number) => {
    const weatherCodes: { [key: number]: string } = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Light freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snowfall",
      73: "Moderate snowfall",
      75: "Heavy snowfall",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };
    return weatherCodes[code] || "Unknown weather condition";
  };

  return (
    <Box position="relative" overflow="hidden">
      <Navbar />
      <GridBackground />
      <ScrollPlane /> 
      <Box pt="80px">
        {/* Hero Section */}
        <Box position="relative" zIndex={1} height={{ base: "60vh", md: "80vh" }}>
          <Box
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            overflow="hidden"
            zIndex={-1}
          >
            <video
              src="/videos/ass.mp4"
              autoPlay
              muted
              loop
              playsInline
              poster="/images/poster.jpg"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            >
              Your browser does not support the video tag.
            </video>
          </Box>
          <VStack
            spacing={4}
            align="center"
            justify="center"
            height="100%"
            textAlign="center"
            px={4}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Heading size="2xl" mb={4} color="white" textShadow="0 2px 8px rgba(0,0,0,0.2)">
                Sustainable Flight Analytics
              </Heading>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <Text fontSize="xl" color="gray.200" textShadow="0 1px 4px rgba(0,0,0,0.2)">
                Optimizing air travel for a greener future
              </Text>
            </motion.div>
          </VStack>
        </Box>

        {/* Features Section */}
        <Box
          id="features"
          as="section"
          py={{ base: 10, md: 20 }}
          bg="rgba(255,255,255,0.02)"
          color="gray.200"
          zIndex={1}
          backdropFilter="blur(8px)"
        >
          <Container maxW="container.lg">
            <VStack spacing={6} align="center" textAlign="center">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <Heading size="xl" color="white" mb={6}>
                  Why Eco Sky is Necessary
                </Heading>
              </motion.div>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                {[
                  ["Reduce Fuel Consumption", "Identify inefficient flight paths"],
                  ["Lower Carbon Emissions", "Decrease CO₂ emissions"],
                  ["Enhance Efficiency", "Optimize scheduling & maintenance"],
                  ["Promote Green Tech", "Adopt eco-friendly practices"],
                ].map(([title, text], index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box
                      p={6}
                      bg={cardBg}
                      borderRadius="xl"
                      boxShadow="xl"
                      _hover={{
                        transform: 'translateY(-5px)',
                        boxShadow: '0 15px 30px rgba(0,0,0,0.2)'
                      }}
                      transition="all 0.3s ease"
                    >
                      <Heading size="md" mb={2} color="blue.500">
                        {title}
                      </Heading>
                      <Text color="gray.600">{text}</Text>
                    </Box>
                  </motion.div>
                ))}
              </SimpleGrid>
            </VStack>
          </Container>
        </Box>

        {/* Globe */}
        <Box w="100%" mt={8} px={0}>
          <GlobeComponent arcsData={globeArcsData} />
        </Box>

        {/* Flight Details */}
        <Container maxW="container.xl" mt={8}>
          <FlightPathDetails arcsData={combinedArcsData} />
        </Container>

        {/* Search & Weather Section */}
        <Box py={10} zIndex={1}>
          <Container maxW="container.lg">
            <VStack spacing={8}>
              {/* Climate Search */}
              <Box w="100%" maxW="600px">
                <form onSubmit={handleSearch}>
                  <VStack spacing={4}>
                    <Input
                      placeholder="Enter city or airport (e.g., London, JFK)"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      bg="black"
                      size="lg"
                      borderRadius="full"
                      px={6}
                      color="white"
                      _placeholder={{ color: "gray.400" }}
                    />
                    <Button
                      type="submit"
                      colorScheme="blue"
                      isLoading={loading}
                      loadingText="Analyzing..."
                      size="lg"
                      px={8}
                      borderRadius="full"
                    >
                      Get Climate Data
                    </Button>
                  </VStack>
                </form>
                {error && (
                  <Text color="red.500" mt={3} textAlign="center">
                    {error}
                  </Text>
                )}
              </Box>

              {/* Route Search */}
              <Box w="100%" maxW="600px">
                <form onSubmit={handleAddRoute}>
                  <VStack spacing={4}>
                    <FormControl id="start-location" isRequired>
                      <FormLabel>Start Location</FormLabel>
                      <Input
                        placeholder="Enter start location (e.g., New York)"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)}
                        bg="black"
                        size="lg"
                        borderRadius="md"
                        px={4}
                        color="white"
                        _placeholder={{ color: "gray.400" }}
                      />
                    </FormControl>
                    <FormControl id="end-location" isRequired>
                      <FormLabel>End Location</FormLabel>
                      <Input
                        placeholder="Enter end location (e.g., Tokyo)"
                        value={endLocation}
                        onChange={(e) => setEndLocation(e.target.value)}
                        bg="black"
                        size="lg"
                        borderRadius="md"
                        px={4}
                        color="white"
                        _placeholder={{ color: "gray.400" }}
                      />
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="green"
                      isLoading={routeLoading}
                      loadingText="Adding..."
                      size="lg"
                      px={8}
                      borderRadius="md"
                      width="100%"
                    >
                      Add Route
                    </Button>
                  </VStack>
                </form>
                {routeError && (
                  <Text color="red.500" mt={3} textAlign="center">
                    {routeError}
                  </Text>
                )}
              </Box>

              {/* List of Routes */}
              <Box w="100%" maxW="600px">
                <Heading size="md" mb={4} color="white">
                  Added Routes
                </Heading>
                {desiredRoutes.length === 0 ? (
                  <Text color="gray.400">No routes added yet.</Text>
                ) : (
                  <List spacing={3}>
                    {desiredRoutes.map(route => (
                      <ListItem key={route.id}>
                        <HStack
                          bg="rgba(255, 255, 255, 0.1)"
                          p={4}
                          borderRadius="md"
                          justify="space-between"
                        >
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">
                              {route.start.name} ➔ {route.end.name}
                            </Text>
                          </VStack>
                          <Tooltip label="Remove Route" aria-label="Remove Route Tooltip">
                            <IconButton
                              aria-label="Remove Route"
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              onClick={() => removeRoute(route.id)}
                            />
                          </Tooltip>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {/* Storm Mode Toggle */}
              <Box w="100%" maxW="600px">
                <Button
                  colorScheme={stormActive ? "red" : "blue"}
                  onClick={toggleStormMode}
                  size="lg"
                  variant="outline"
                  width="100%"
                >
                  {stormActive ? "Deactivate Weather Mode" : "Activate Weather Mode"}
                </Button>
              </Box>

              {/* Weather Data */}
              <AnimatePresence>
                {weatherData && (
                  <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    style={{ width: "100%" }}
                  >
                    <Flex
                      bg="linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
                      color="white"
                      py={4}
                      borderRadius="lg"
                      overflowX="auto"
                      boxShadow="lg"
                      position="relative"
                    >
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 1.5, delay: 0.2 }}
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: "3px",
                          background: "rgba(255,255,255,0.3)",
                          transformOrigin: "left center",
                        }}
                      />
                      <HStack spacing={8} px={4} flexShrink={0}>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <VStack align="flex-start" spacing={1} minW="220px">
                            <Heading size="md">{weatherData.location}</Heading>
                            <Text fontSize="sm" opacity={0.9}>
                              {getWeatherDescription(weatherData.weathercode)}
                            </Text>
                          </VStack>
                        </motion.div>
                        {[
                          ["Temperature", `${weatherData.temperature}°C`, "🌡️"],
                          ["Wind Speed", `${weatherData.windspeed} km/h`, "🌪️"],
                          ["Wind Direction", `${weatherData.winddirection}°`, "🧭"],
                          ["Is Day", weatherData.is_day ? "Yes" : "No", "☀️"],
                          ["Time", weatherData.time, "⏰"],
                        ].map(([title, value, emoji], index) => (
                          <motion.div
                            key={title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 + 0.4 }}
                          >
                            <HStack spacing={3} minW="150px">
                              <Text fontSize="2xl">{emoji}</Text>
                              <VStack align="flex-start" spacing={0}>
                                <Text fontSize="xs" fontWeight="semibold" opacity={0.8}>
                                  {title}
                                </Text>
                                <Text fontSize="lg" fontWeight="bold">
                                  {value}
                                </Text>
                              </VStack>
                            </HStack>
                          </motion.div>
                        ))}
                      </HStack>
                    </Flex>
                  </motion.div>
                )}
              </AnimatePresence>
            </VStack>
          </Container>
        </Box>

        {/* Stats Section */}
        <SimpleGrid
          id="stats"
          columns={{ base: 1, md: 3 }}
          spacing={6}
          mt={12}
          position="relative"
          zIndex={1}
          px={8}
          pb={12}
        >
          <StatsCard title="Fuel Saved" value="1.2M" unit="liters" icon="⛽" />
          <StatsCard title="CO₂ Reduced" value="3.4K" unit="tons" icon="🌱" />
          <StatsCard title="Flights Optimized" value="12.5K" unit="flights" icon="✈️" />
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default Home;
