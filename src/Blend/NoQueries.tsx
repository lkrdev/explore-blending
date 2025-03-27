import {
  Box,
  Flex,
  InputSearch,
  SelectOptionGroupProps,
  SelectOptionObject,
  Span,
} from "@looker/components";
import React, { useMemo } from "react";
import { useAppContext } from "../AppContext";
import LearnMore from "../components/Guide/LearnMore";
import { APP_NAME } from "../constants";
import { useBlendContext } from "./Context";
const NoQueries = () => {
  const { models } = useAppContext();
  const { newQuery } = useBlendContext();
  const grouped: SelectOptionGroupProps[] = useMemo(() => {
    return models
      .reduce((acc, model) => {
        if (model?.explores?.length) {
          acc.push({
            label: model.label || "",
            options: model?.explores
              ?.map((explore) => ({
                label: explore.label || "",
                value: model.name + "::" + explore.name || "",
              }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          });
        }
        return acc;
      }, [] as SelectOptionGroupProps[])
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [models]);

  const handleSelectOption = async (option?: SelectOptionObject) => {
    if (option) {
      await newQuery(option.value, option.label || "");
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
        {APP_NAME}
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
          width="100%"
        />
      </Box>
      <LearnMore />
      <Box height="200px"></Box>
    </Flex>
  );
};

export default NoQueries;
