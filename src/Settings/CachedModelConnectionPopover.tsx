import {
  Box,
  CodeBlock,
  IconButton,
  Popover,
  PopoverFooter,
  PopoverLayout,
  SpaceVertical,
  Span,
} from "@looker/components";
import { Info } from "@styled-icons/material";
import React, { useMemo } from "react";
import styled from "styled-components";
import { useBoolean } from "usehooks-ts";
import {
  ModelConnectionCache,
  ModelConnections,
  useAppContext,
} from "../AppContext";
import LoadingButton from "../components/ProgressButton";

const StyledIconButton = styled(IconButton)<{
  color: "critical" | "neutral";
}>`
  color: ${({ color, theme }) =>
    color === "critical" ? theme.colors.critical : theme.colors.neutral};
  &:hover {
    color: ${({ color, theme }) =>
      color === "critical" ? theme.colors.critical : theme.colors.neutral};
  }
`;

const CachedModelConnectionPopover: React.FC<{
  cached_model_connection_data?: ModelConnectionCache;
  updateModelConnection: (model_connection: ModelConnections) => void;
}> = ({ cached_model_connection_data, updateModelConnection }) => {
  const open = useBoolean(false);
  const running = useBoolean(false);

  const { models, getModelConnectionPromise } = useAppContext();

  const getCachedModelConnection = async () => {
    running.setTrue();
    const all_model_connections = await Promise.all(
      models.map(async (model) => {
        let retrieved_model = false;
        while (model.explores.length > 0 && !retrieved_model) {
          const first_explore = model.explores.shift();
          try {
            const connection = await getModelConnectionPromise(
              `${model.name}::${first_explore?.name}`
            );
            if (connection) {
              retrieved_model = true;
              return connection;
            }
          } catch (error) {
            console.error(
              `Failed to get model connection for ${model.name}::${first_explore?.name}`,
              error
            );
          }
        }
        if (!retrieved_model) {
          return Promise.resolve(null);
        }
      })
    );
    const mc = all_model_connections.reduce((acc, m) => {
      if (m) {
        acc[m.model] = m.connection;
      }
      return acc;
    }, {} as ModelConnections);

    updateModelConnection(mc);
    running.setFalse();
    open.setFalse();
  };

  const last_updated = useMemo(() => {
    if (cached_model_connection_data?.expires_at) {
      const dt = new Date(cached_model_connection_data.expires_at);
      if (dt) {
        return new Date(
          dt.getTime() - 1000 * 60 * 60 * 24 * 365 * 10
        ).toLocaleString();
      }
    }
    return;
  }, [cached_model_connection_data]);

  return (
    <Popover
      width={"50%"}
      content={
        <PopoverLayout
          header={"Refresh Cached Model Connection"}
          footer={false}
        >
          <SpaceVertical gap="xxsmall" width="100%">
            <Span>
              This will refresh the cached model connection. This is useful if
              you have made changes to the model connection in the server.
            </Span>
            {last_updated && (
              <Span fontSize="xxsmall">Last updated: {last_updated}</Span>
            )}
            <Box width="100%" height="300px" overflow="auto">
              <CodeBlock fontSize="xxsmall">
                {JSON.stringify(cached_model_connection_data || {}, null, 2)}
              </CodeBlock>
            </Box>
          </SpaceVertical>
          <PopoverFooter closeButton={<></>}>
            {" "}
            <LoadingButton
              onClick={getCachedModelConnection}
              disabled={running.value}
              is_loading={running.value}
            >
              Update
            </LoadingButton>
          </PopoverFooter>
        </PopoverLayout>
      }
      onClose={() => open.setFalse()}
      placement="right"
    >
      <StyledIconButton
        disabled={running.value}
        color={
          Object.keys(cached_model_connection_data || {}).length > 0
            ? "neutral"
            : "critical"
        }
        icon={<Info size={24} />}
        label="Cached Model Connection"
        onClick={() => open.setTrue()}
      />
    </Popover>
  );
};

export default CachedModelConnectionPopover;
