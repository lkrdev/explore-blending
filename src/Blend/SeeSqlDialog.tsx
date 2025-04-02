import {
  Box,
  Code,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  IconButton,
  Popover,
  Space,
  Span,
  Spinner,
} from "@looker/components";
import { CopyAll } from "@styled-icons/material";
import React, { useEffect, useState } from "react";
import { useBoolean } from "usehooks-ts";
import { useExtensionContext } from "../Main";
import LoadingButton from "../components/ProgressButton";

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
  const loading_button = useBoolean(false);
  const copying = useBoolean(false);

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
            <Popover
              disableScrollLock
              placement="left"
              key={String(copying.value)}
              content={
                <Span fontSize={"xxsmall"} p="xxsmall">
                  Copied!
                </Span>
              }
              isOpen={copying.value}
            >
              <IconButton
                icon={<CopyAll size={24} color="black" />}
                onClick={() => {
                  extension.extensionSDK.clipboardWrite(sql || "");
                  copying.setTrue();
                  setTimeout(() => {
                    copying.setFalse();
                  }, 1000);
                }}
                position="absolute"
                top="12px"
                right="12px"
                tooltip="Copy SQL"
                style={{ alignSelf: "flex-start" }}
              />
            </Popover>
          )}
        </Box>
      </DialogContent>

      <DialogFooter>
        <Box display="flex" justifyContent="flex-end">
          <Space>
            <LoadingButton
              flexGrow={false}
              is_loading={loading_button.value}
              onClick={async () => {
                loading_button.setTrue();
                await handleBlend();
                onClose();
                loading_button.setFalse();
              }}
              disabled={loading_button.value}
              color="key"
            >
              Blend
            </LoadingButton>
          </Space>
        </Box>
      </DialogFooter>
    </Dialog>
  );
};
