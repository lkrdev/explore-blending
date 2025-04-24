import {
  Box,
  Flex,
  InputSearch,
  SelectOptionGroupProps,
  SelectOptionObject,
  Span,
} from "@looker/components";
import { ILookmlModelNavExplore } from "@looker/sdk";
import React, { useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import LearnMore from "../components/Guide/LearnMore";
import { APP_NAME } from "../constants";
import { useBlendContext } from "./Context";
const NoQueries = () => {
  const { models } = useAppContext();
  const { newQuery } = useBlendContext();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue(search, 500);
  const grouped: SelectOptionGroupProps[] = useMemo(() => {
    return models
      .reduce((acc, model) => {
        if (model?.explores?.length) {
          const model_term = `${model.label} ${model.name}`.toLowerCase();
          const explores = model?.explores?.reduce((acc, explore) => {
            if (explore.hidden) {
              return acc;
            } else {
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
      await newQuery({
        explore_id: option.value,
        explore_label: option.label || "",
      });
    }
  };

  return (
    <Flex
      height="100%"
      width="100%"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      <Span as="h1" textAlign="center">
        🔗 {APP_NAME}
      </Span>
      <br />

      <Span as="h3" textAlign="center">
        Get started by creating your first query
      </Span>
      <br />
      <Span textAlign="center">Choose an Explore to get started</Span>
      <Box mt="large" width="400px">
        <InputSearch
          placeholder="Search explores..."
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
      <LearnMore />
      <Box height="200px"></Box>
    </Flex>
  );
};

export default NoQueries;
