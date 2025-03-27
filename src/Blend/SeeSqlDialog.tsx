import {
  Box,
  Button,
  Code,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Space,
  Spinner,
} from "@looker/components";
import React, { useEffect, useState } from "react";

interface SeeSqlDialogProps {
  onClose: () => void;
  handleBlend: () => Promise<void>;
}

export const SeeSqlDialog: React.FC<SeeSqlDialogProps> = ({
  onClose,
  handleBlend,
}) => {
  const [sql, setSql] = useState<string | undefined>();

  useEffect(() => {
    getSql();
  }, []);

  const getSql = async () => {};

  const loading = typeof sql === "undefined";

  return (
    <Dialog isOpen={true} width="60vw" onClose={onClose} height="90vh">
      <DialogHeader>
        <></>
      </DialogHeader>
      <DialogContent>
        <Box
          overflow="auto"
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100%"
          backgroundColor="lightgrey"
          p="medium"
        >
          {loading && <Spinner />}
          {!loading && (
            <Code
              fontSize="xxsmall"
              style={{
                height: "100%",
                width: "100%",
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
              lang="sql"
            >
              {sql}
            </Code>
          )}
        </Box>
      </DialogContent>
      <DialogFooter>
        <Box display="flex" justifyContent="flex-end">
          <Space>
            <Button
              onClick={async () => {
                await handleBlend();
                onClose();
              }}
              color="key"
            >
              Blend
            </Button>
          </Space>
        </Box>
      </DialogFooter>
    </Dialog>
  );
};
