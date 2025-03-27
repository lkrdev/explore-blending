import { Button } from "@looker/components";
import React from "react";
import { useBlendContext } from "./Context";

interface BlendButtonProps {}

export const BlendButton: React.FC<BlendButtonProps> = ({}) => {
  const { queries } = useBlendContext();
  const can_blend = queries.length > 1;

  const onClick = () => {
    if (can_blend) {
      console.log("blend");
    }
  };

  return (
    <Button
      mt="medium"
      size="medium"
      width="100%"
      onClick={onClick}
      disabled={!can_blend}
    >
      Blend
    </Button>
  );
};
