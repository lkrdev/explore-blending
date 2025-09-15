import {
  Box,
  InputSearch,
  SelectOptionGroupProps,
  SelectOptionObject,
} from "@looker/components";
import { ILookmlModelNavExplore } from "@looker/sdk";
import React, { useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import { useSettings } from "../SettingsContext";
import { useBlendContext } from "./Context";

const NewExplore: React.FC = () => {
  const { models, model_connections } = useAppContext();
  const { newQuery, queries, first_query_connection } = useBlendContext();
  const { config } = useSettings();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue(search, 500);
  const grouped: SelectOptionGroupProps[] = useMemo(() => {
    return models
      .reduce((acc, model) => {
        // create the grouped options for the model/explore options.

        if (model?.explores?.length) {
          const model_term = `${model.label} ${model.name}`.toLowerCase();
          const explores = model?.explores?.reduce((acc, explore) => {
            if (explore.hidden) {
              return acc;
            } else {
              const explore_term =
                `${explore.label} ${explore.name}`.toLowerCase();
              if (
                first_query_connection !== model_connections[`${model.name}`] &&
                !config?.collapse_connection
              ) {
                // if its not part of the first connection, don't add it
                // only do this if collapse connection is not enabled
                return acc;
              }

              if (!debouncedSearch?.length) {
                return [...acc, explore];
              } else {
                if (
                  explore_term.includes(debouncedSearch) ||
                  model_term.includes(debouncedSearch)
                ) {
                  return [...acc, explore];
                } else {
                  return acc;
                }
              }
            }
          }, [] as ILookmlModelNavExplore[]);

          if (explores?.length) {
            acc.push({
              label: model.label || "",
              options: explores
                ?.map((explore) => ({
                  label: explore.label || "",
                  value: model.name + "::" + explore.name || "",
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            });
          }
        }
        return acc;
      }, [] as SelectOptionGroupProps[])
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [models, debouncedSearch]);

  const handleSelectOption = async (option?: SelectOptionObject) => {
    if (option) {
      //activate blending button IF query length is above 0, could I rather keep it hidden or deactivated?
      await newQuery({
        explore_id: option.value,
        explore_label: option.label || "",
        create_join: queries.length > 0,
      });
      //await newQuery(option.value, option.label || "", false); // <-- Forced blending to false
    }
  };

  return (
    <Box width="100%">
      <InputSearch
        placeholder="New explore"
        openOnFocus
        changeOnSelect={false}
        onSelectOption={handleSelectOption}
        options={grouped}
        value={search}
        onChange={(value: string) => {
          setSearch(value);
          setDebouncedSearch(value.toLowerCase());
        }}
        width="100%"
      />
    </Box>
  );
};

export default NewExplore;
