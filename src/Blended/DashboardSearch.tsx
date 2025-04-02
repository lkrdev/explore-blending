import { Box, InputSearch, SelectOptionObject } from "@looker/components";
import orderBy from "lodash/orderBy";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useBoolean, useCounter, useDebounceValue } from "usehooks-ts";
import { useCore40SDK } from "../Main";
import { useBlendedContext } from "./Context";

const ProgressBar = styled(Box)`
  animation: progress 1s ease-in-out infinite;
  @keyframes progress {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const DashboardSearch: React.FC = () => {
  const { setSelectedDashboard, selected_dashboard } = useBlendedContext();
  const [recent_dashboards, setRecentDashboards] = useState<
    SelectOptionObject[]
  >([]);
  const [searched_dashboards, setSearchedDashboards] = useState<
    SelectOptionObject[]
  >([]);
  const [search, setSearch] = useState<string>("");
  const [debounced_search, setDebouncedSearch] = useDebounceValue(search, 500);
  const counter = useCounter(0);
  const sdk = useCore40SDK();
  const loading = useBoolean(true);

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    const my_recent = await sdk.ok(
      sdk.search_dashboards({
        //   sorts: "last_viewed_at DESC",
        limit: 51,
      })
    );
    setRecentDashboards(
      orderBy(my_recent, "title", "asc").map((d) => ({
        label: d.title || "",
        value: d.id || "",
      }))
    );

    loading.setFalse();
  };

  useEffect(() => {
    if (debounced_search?.length) {
      loadSearchedDashboards();
    }
  }, [debounced_search]);

  const loadSearchedDashboards = async () => {
    const searched = await sdk.ok(
      sdk.search_dashboards({
        title: `%${debounced_search}%`,
        //   sorts: "last_viewed_at DESC",
        limit: 49,
      })
    );
    setSearchedDashboards(
      orderBy(searched, "title", "asc").map((d) => ({
        label: d.title || "",
        value: d.id || "",
      }))
    );

    loading.setFalse();
  };

  const handleSelectOption = async (option: SelectOptionObject) => {
    counter.increment();
    const dashboard = await sdk.ok(sdk.dashboard(option.value));
    setSelectedDashboard(dashboard);
  };

  const value =
    selected_dashboard?.title && !search?.length
      ? selected_dashboard?.title
      : search;

  return (
    <Box position="relative" width="100%">
      <InputSearch
        key={counter.count}
        defaultValue={selected_dashboard?.title}
        placeholder="Search dashboards..."
        openOnFocus
        onChange={(value: string) => {
          if (value.length) {
            if (!loading.value) {
              loading.setTrue();
            }
          } else {
            if (loading.value) {
              loading.setFalse();
            }
          }
          setSearch(value);
          setDebouncedSearch(value);
        }}
        value={value}
        changeOnSelect={false}
        onClose={() => {
          counter.increment();
        }}
        onSelectOption={handleSelectOption}
        options={search?.length > 0 ? searched_dashboards : recent_dashboards}
        isClearable={false}
        width="100%"
      />
      <Box
        position="absolute"
        bottom={2}
        left={0}
        width="100%"
        height="2px"
        overflow="hidden"
        style={{
          visibility: loading.value ? "visible" : "hidden",
        }}
      >
        <ProgressBar
          position="absolute"
          height="100%"
          width="100%"
          backgroundColor="key"
        />
      </Box>
    </Box>
  );
};

export default DashboardSearch;
