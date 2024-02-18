import React from "react";
import { Avatar, Heading, VStack, Box } from "@chakra-ui/react";
import FullScreenSection from "./FullScreenSection";

const greeting = "Hello, I am Kherin!";
const bio1 = "A frontend developer";
const bio2 = "specialised in React";

const LandingSection = () => (
  <FullScreenSection
    justifyContent="center"
    alignItems="center"
    isDarkBackground
    backgroundColor="#2A4365"
  >
    <VStack spacing={2}>
      <Box p={1}>
        <Avatar
          name="Kherin Bundhoo"
          src="https://avatars.githubusercontent.com/u/34603561?s=400"
          size="2xl"
        />
      </Box>
      <Box p={1}>
        <Heading as="h1" size="sm" color="white">
          {greeting}
        </Heading>
      </Box>
      <Box p={1}>
        <Heading as="h1" size="xl" color="white">
          {bio1}
        </Heading>
        <Heading as="h1" size="xl" color="white">
          {bio2}
        </Heading>
      </Box>
    </VStack>
  </FullScreenSection>
);

export default LandingSection;
