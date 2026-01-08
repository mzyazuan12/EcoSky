'use client';

import { Providers } from '../providers'
import { Navigation } from '../../components/Navigation'
import { Box, Flex } from '@chakra-ui/react'
import type { Metadata } from 'next'


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Flex minH="100vh" direction="column">
            <Navigation />
            <Box as="main" flex="1" py={8}>
              {children}
            </Box>
          </Flex>
        </Providers>
      </body>
    </html>
  )
}