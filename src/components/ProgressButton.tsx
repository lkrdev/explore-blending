import { Box, Button, ButtonProps } from "@looker/components";
import React from "react";
import styled, { keyframes } from "styled-components";

const progressAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const ProgressBar = styled(Box)`
  animation: ${progressAnimation} 1s linear infinite;
`;

interface LoadingButtonProps extends ButtonProps {
  flexGrow?: boolean;
  is_loading: boolean;
}

const LoadingButton = ({
  flexGrow,
  children,
  is_loading,
  ...button_props
}: LoadingButtonProps) => {
  return (
    <Box flexGrow={flexGrow === false ? 0 : 1} position="relative">
      <Button width="100%" {...button_props}>
        {children}
      </Button>
      <Box
        position="absolute"
        bottom={0}
        left={0}
        width="100%"
        height="2px"
        overflow="hidden"
        style={{
          visibility: is_loading ? "visible" : "hidden",
        }}
      >
        <ProgressBar
          position="absolute"
          height="100%"
          width="100%"
          backgroundColor="key"
        />
      </Box>
    </Box>
  );
};

export default LoadingButton;
