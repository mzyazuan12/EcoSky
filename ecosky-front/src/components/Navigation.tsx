'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import { useColorMode, Flex, Heading, IconButton, Icon } from '@chakra-ui/react'

export const Navigation = () => {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      p={4}
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      boxShadow="md"
    >
      <Flex align="center" gap={2}>
        <Heading size="lg" color="aviation.500">
          
        </Heading>
      </Flex>

      <Flex gap={4}>
        <IconButton
          aria-label="Toggle color mode"
          icon={
            colorMode === 'light' ? (
              <Icon as={MoonIcon} boxSize={5} />
            ) : (
              <Icon as={SunIcon} boxSize={5} />
            )
          }
          onClick={toggleColorMode}
          variant="ghost"
        />
      </Flex>
    </Flex>
  )
}
