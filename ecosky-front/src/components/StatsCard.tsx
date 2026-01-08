'use client';
import { Box, Heading, Text } from '@chakra-ui/react'

export const StatsCard = ({ title, value, unit, icon }: { 
  title: string
  value: string
  unit: string
  icon: string
}) => (
  <Box
    p={6}
    borderRadius="xl"
    bg="white"
    _dark={{ bg: 'gray.700' }}
    boxShadow="md"
    transition="all 0.2s"
    _hover={{ transform: 'translateY(-4px)' }}
  >
    <Text fontSize="3xl" mb={2}>
      {icon}
    </Text>
    <Heading size="xl" mb={2}>
      {value}
    </Heading>
    <Text fontSize="lg" color="gray.500">
      {title}
    </Text>
    <Text fontSize="sm" color="aviation.500">
      {unit}
    </Text>
  </Box>
)