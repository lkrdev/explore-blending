import {
  Button,
  InputSearch,
  MessageBar,
  SelectOptionObject,
  SpaceVertical,
} from "@looker/components";
import { create_dashboard_element, IWriteDashboardElement } from "@looker/sdk";
import React from "react";
import { useBoolean, useCounter } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import { useCore40SDK, useExtensionContext } from "../Main";
import { useBlendedContext } from "./Context";
const SidebarItems: React.FC = () => {
  const sdk = useCore40SDK();
  const { extensionSDK } = useExtensionContext();
  const { dashboards } = useAppContext();
  const { setSelectedDashboard, selected_dashboard, query } =
    useBlendedContext();
  const counter = useCounter(0);
  const saved = useBoolean(false);

  const handleSelectOption = (option: SelectOptionObject) => {
    counter.increment();
    const dashboard = dashboards.find((d) => d.id === option.value)!;

    setSelectedDashboard(dashboard);
  };
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
      <InputSearch
        key={counter.count}
        defaultValue={selected_dashboard?.title}
        placeholder="Search dashboards..."
        openOnFocus
        changeOnSelect={false}
        onClose={() => {
          counter.increment();
        }}
        onSelectOption={handleSelectOption}
        options={dashboards.map((d) => ({
          label: d.title,
          value: d.id,
        }))}
        isClearable={false}
        // value={selected_dashboard?.title}
        width="100%"
      />
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
