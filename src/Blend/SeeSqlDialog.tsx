import {
  Box,
  Button,
  Code,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  IconButton,
  Popover, // Ensure Popover is imported
  Space,
  Span,
  Spinner,
} from "@looker/components";
import { CopyAll } from "@styled-icons/material";
import React, { useEffect, useState } from "react";
import { useBoolean } from "usehooks-ts";
import { useExtensionContext } from "../Main";
import LoadingButton from "../components/ProgressButton"; // Assuming LoadingButtonProps requires is_loading


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

  // Handler function (assuming handleRenameQueriesIterative is defined correctly as before)
  const handleRenameQueriesIterative = async () => {
    // ... (previous implementation for iterative rename) ...
    if (!sql) {
      console.warn("No SQL content to rename.");
      return;
    }
    const aliasRegex = /q(\d+)/g;
    const uniqueAliases = Array.from(
      new Set(sql.match(aliasRegex) || [])
    ).sort();
    if (uniqueAliases.length === 0) {
      alert("No query aliases like 'q1', 'q2', etc. found to rename.");
      return;
    }
    const renameMap = new Map<string, string>();
    let userCancelled = false;
    for (const alias of uniqueAliases) {
      const newName = window.prompt(
        `Enter new name for alias '${alias}':\n(Leave empty or cancel to keep '${alias}')`,
        alias
      );
      if (newName === null) {
        const confirmCancel = window.confirm(
          `You cancelled renaming '${alias}'. Do you want to abort renaming all aliases?`
        );
        if (confirmCancel) {
          userCancelled = true;
          break;
        } else {
          renameMap.set(alias, alias);
        }
      } else {
        renameMap.set(alias, newName.trim() || alias);
      }
    }
    if (!userCancelled) {
        let currentSql = sql;
        renameMap.forEach((newName, originalAlias) => {
            const escapedAlias = originalAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const aliasReplaceRegex = new RegExp(`\\b${escapedAlias}\\b`, 'g');
            currentSql = currentSql.replace(aliasReplaceRegex, newName);
        });
      setSql(currentSql);
    } else {
       alert("Alias renaming aborted.");
    }
  };


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
          position="relative" // Needed for absolute positioning of children
        >
          {loading && <Spinner />}
          {!loading && (
            <> {/* Use Fragment to group Code and Popover */}
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

              {/* --- Copy Button --- */}
              {/* Wrap IconButton in Box for positioning */}
              <Box position="absolute" top="12px" right="12px">
                 <Popover
                   // Ensure content is always defined when Popover renders
                   content={<Span fontSize={"xxsmall"} p="xxsmall">Copied!</Span>}
                   isOpen={copying.value}
                   disableScrollLock // Keep other necessary Popover props
                   placement="left"
                   // key prop might not be strictly needed if isOpen controls visibility reliably
                   // key={String(copying.value)}
                 >
                    {/* IconButton is now the child of Popover, Box handles position */}
                    <IconButton
                      icon={<CopyAll size={24} color="black" />}
                      onClick={() => {
                        if (sql) {
                          extension.extensionSDK.clipboardWrite(sql);
                          copying.setTrue();
                          setTimeout(() => {
                            copying.setFalse();
                          }, 1000);
                        }
                      }}
                      tooltip="Copy SQL"
                      // Remove positioning props from IconButton
                      // style={{ alignSelf: 'flex-start' }} // This style might not be needed on IconButton now
                    />
                 </Popover>
              </Box>
              {/* --- End Copy Button --- */}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogFooter>
        <Box display="flex" justifyContent="flex-end" width="100%">
          <Space between>
             {/* Rename Button - check if overload persists */}
             <Button
                onClick={handleRenameQueriesIterative}
                tooltip="Rename each 'qN' alias individually"
                disabled={loading}
             >
               Rename Query
             </Button>

            {/* Blend Button - Add is_loading prop back */}
            <LoadingButton
              is_loading={loading_button.value} // *** FIX: Add this prop back ***
              disabled={loading_button.value || loading}
              color="key"
              // flexGrow={false} // Keep other props if needed
              onClick={async () => {
                loading_button.setTrue();
                await handleBlend();
                onClose();
                loading_button.setFalse();
              }}
            >
              Blend
            </LoadingButton>
          </Space>
        </Box>
      </DialogFooter>
    </Dialog>
  );
};