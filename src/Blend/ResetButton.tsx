import { IconButton, Tooltip } from "@looker/components";
import { Refresh as Reset } from "@styled-icons/material";
import React from "react";
import { useBlendContext } from "./Context";

const ResetButton: React.FC = () => {
  const { queries, joins, resetAll } = useBlendContext();

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all queries and joins? This action cannot be undone."
      )
    ) {
      resetAll();
    }
  };

  // Don't show the button if there are no queries or joins
  if (queries.length === 0 && Object.keys(joins).length === 0) {
    return null;
  }

  return (
    <Tooltip content="Reset all queries and joins">
      <IconButton
        icon={<Reset />}
        onClick={handleReset}
        size="small"
        label="Reset"
        aria-label="Reset all queries and joins"
      />
    </Tooltip>
  );
};

export default ResetButton;
