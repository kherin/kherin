import { Heading, HStack, Image, Text, VStack, Box } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import React from "react";

const Card = ({ title, description, imageSrc }) => {
  return (
    <VStack spacing={4} backgroundColor={"white"} borderRadius={"15px"}>
      <Box>
        <Image src={imageSrc} borderRadius={"15px"} />
      </Box>
      <Box width={"100%"} display={"flex"} justifyContent={"flex-start"} pl={5}>
        <Heading color={"black"} fontSize={"2xl"}>
          {title}
        </Heading>
      </Box>
      <Box>
        <Text color={"grey"} px={5}>
          {description}
        </Text>
      </Box>
      <Box
        width={"100%"}
        display={"flex"}
        justifyContent={"flex-start"}
        pl={5}
        pb={5}
      >
        <HStack spacing={2}>
          <Box display="flex" justifyContent={"start"}>
            <Text color={"black"}>See more</Text>
          </Box>
          <Box>
            <Text>
              <FontAwesomeIcon color={"black"} icon={faArrowRight} size="1x" />
            </Text>
          </Box>
        </HStack>
      </Box>
    </VStack>
  );
};

export default Card;
