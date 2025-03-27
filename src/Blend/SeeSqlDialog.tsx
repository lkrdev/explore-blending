import {
  Box,
  Button,
  Code,
  CopyToClipboard,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  IconButton,
  Space,
  Spinner,
} from "@looker/components";
import React, { useEffect, useState } from "react";
import { useExtensionContext } from "../Main";

interface SeeSqlDialogProps {
  onClose: () => void;
  handleBlend: () => Promise<void>;
  getQuerySql: () => Promise<string>;
}

export const SeeSqlDialog: React.FC<SeeSqlDialogProps> = ({
  onClose,
  handleBlend,
  getQuerySql,
}) => {
  const [sql, setSql] = useState<string | undefined>();

  const extension = useExtensionContext();

  useEffect(() => {
    getSql();
  }, []);

  const getSql = async () => {
    const sql = await getQuerySql();
    setSql(sql);
  };

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
          position="relative"
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
          {!loading && (
            <IconButton
              icon={<CopyToClipboard content={sql || ""} />}
              onClick={() => extension.extensionSDK.clipboardWrite(sql || "")}
              position="absolute"
              top="12px"
              right="12px"
              tooltip="Copy SQL"
            />
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
