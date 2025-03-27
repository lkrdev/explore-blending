import {
  Box,
  InputSearch,
  SelectOptionGroupProps,
  SelectOptionObject,
} from "@looker/components";
import React, { useMemo } from "react";
import { useAppContext } from "../AppContext";
import { useBlendContext } from "./Context";

const NewExplore: React.FC = () => {
  const { models } = useAppContext();
  const { newQuery, queries } = useBlendContext();
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
        width="100%"
      />
    </Box>
  );
};

export default NewExplore;
