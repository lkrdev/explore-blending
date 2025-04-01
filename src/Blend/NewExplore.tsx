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
import { useBlendContext } from "./Context";

const NewExplore: React.FC = () => {
  const { models } = useAppContext();
  const { newQuery, queries } = useBlendContext();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue(search, 500);
  const grouped: SelectOptionGroupProps[] = useMemo(() => {
    return models
      .reduce((acc, model) => {
        if (model?.explores?.length) {
          const model_term = `${model.label} ${model.name}`.toLowerCase();
          const explores = model?.explores?.reduce((acc, explore) => {
            const explore_term =
              `${explore.label} ${explore.name}`.toLowerCase();
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
      await newQuery(option.value, option.label || "", queries.length > 0);
    }
  };

  return (
    <Box mt="medium">
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
