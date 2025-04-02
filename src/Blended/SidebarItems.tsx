import { Button, MessageBar, SpaceVertical } from "@looker/components";
import { create_dashboard_element, IWriteDashboardElement } from "@looker/sdk";
import React from "react";
import { useBoolean } from "usehooks-ts";
import { useCore40SDK, useExtensionContext } from "../Main";
import { useBlendedContext } from "./Context";
import DashboardSearch from "./DashboardSearch";

const SidebarItems: React.FC = () => {
  const sdk = useCore40SDK();
  const { extensionSDK } = useExtensionContext();
  const { selected_dashboard, query } = useBlendedContext();
  const saved = useBoolean(false);

  const handleSave = async () => {
    if (selected_dashboard?.id && query?.id) {
      const element: IWriteDashboardElement = {
        dashboard_id: selected_dashboard.id,
        query_id: query.id,
        title: "Blended Query",
        type: "vis",
      };
      const new_element = await sdk?.ok(
        create_dashboard_element(sdk, {
          body: element,
        })
      );
      saved.setTrue();
      setTimeout(() => {
        saved.setFalse();
      }, 5000);
    }
  };
  return (
    <SpaceVertical>
      <DashboardSearch />
      <Button fullWidth disabled={!selected_dashboard} onClick={handleSave}>
        Save to Dashboard
      </Button>
      {saved.value && (
        <MessageBar
          intent="positive"
          title="Saved"
          primaryAction="View"
          onPrimaryClick={() => {
            if (selected_dashboard?.id) {
              const url = `/dashboards/${selected_dashboard.id}`;
              extensionSDK.openBrowserWindow(url, "_blank");
            }
          }}
        >
          Saved
        </MessageBar>
      )}
    </SpaceVertical>
  );
};

export default SidebarItems;
