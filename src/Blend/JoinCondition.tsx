import { Box, Heading, Text } from "@looker/components";
import React from "react";

interface JoinConditionProps {
  leftTable: string;
  rightTable: string;
  conditions: Array<{
    leftField: string;
    rightField: string;
  }>;
}

export const JoinCondition: React.FC<JoinConditionProps> = ({
  leftTable,
  rightTable,
  conditions,
}) => {
  return (
    <Box>
      <Heading as="h3">Outer Join</Heading>
      {conditions.map((condition, index) => (
        <Text key={index} color="neutral">
          {`${leftTable}.${condition.leftField} = ${rightTable}.${condition.rightField}`}
        </Text>
      ))}
    </Box>
  );
};
