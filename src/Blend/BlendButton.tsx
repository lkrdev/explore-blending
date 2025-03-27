import { Box, Button, IconButton, Space } from "@looker/components";
import { Code } from "@styled-icons/material";
import React from "react";
import { useBoolean } from "usehooks-ts";
import { useBlendContext } from "./Context";
import { SeeSqlDialog } from "./SeeSqlDialog";

interface BlendButtonProps {}

export const BlendButton: React.FC<BlendButtonProps> = ({}) => {
  const { queries } = useBlendContext();
  const openDialog = useBoolean(true);
  const can_blend = queries.length > 1;

  const handleBlend = async () => {
    if (can_blend) {
      return;
    }
  };

  return (
    <Box display="flex" dir="row" width="100%" justifyContent="space-between">
      <Space width="85%">
        <Button
          fullWidth
          size="medium"
          onClick={handleBlend}
          disabled={!can_blend}
        >
          Blend
        </Button>
        <IconButton
          size="medium"
          onClick={openDialog.setTrue}
          disabled={!can_blend}
          icon={<Code size={24} />}
          tooltip="SQL"
        />
      </Space>
      {openDialog.value && (
        <SeeSqlDialog onClose={openDialog.setFalse} handleBlend={handleBlend} />
      )}
    </Box>
  );
};
