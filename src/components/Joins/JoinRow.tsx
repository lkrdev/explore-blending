import {
    Box,
    FieldSelect,
    Icon,
    IconButton,
    SelectOptionGroupProps,
    SelectOptionObject,
    Tooltip,
} from "@looker/components";
import { Add, Delete, Error } from "@styled-icons/material";
import React from "react";
import { useDebounceValue } from "usehooks-ts";
import { IJoin } from "./types";

interface JoinRowProps {
    join: IJoin;
    to_field_options: SelectOptionObject[];
    from_field_options: SelectOptionGroupProps[];
    index: number;
    isLast: boolean;
    joinLength: number;
    onUpdate: (join: IJoin) => void;
    onDelete: (uuid: string) => void;
    onAdd: () => void;
}

const JoinRow: React.FC<JoinRowProps> = ({
    join,
    to_field_options,
    from_field_options,
    index,
    isLast,
    joinLength,
    onUpdate,
    onDelete,
    onAdd,
}) => {
    const [debouncedSearch, setDebouncedSearch] = useDebounceValue("", 500);
    const handleToFieldChange = (value: string) => {
        onUpdate({
            ...join,
            to_field: value,
        });
    };

    const handleFromFieldChange = (value: string) => {
        onUpdate({
            ...join,
            from_field: value,
        });
    };

    const isValid = join.to_field && join.from_field;
    const filtered_from_field_options = from_field_options.reduce(
        (acc, option) => {
            if (debouncedSearch === "") {
                acc.push(option);
            } else if (String(option.label).toLowerCase().includes(debouncedSearch)) {
                acc.push(option);
            } else {
                const new_options: SelectOptionObject[] = [];
                option.options.forEach((option) => {
                    if (String(option.label).toLowerCase().includes(debouncedSearch)) {
                        new_options.push(option);
                    }
                });
                if (new_options.length > 0) {
                    acc.push({
                        ...option,
                        options: new_options,
                    });
                }
            }
            return acc;
        },
        [] as SelectOptionGroupProps[]
    );
    return (
        <Box
            flexGrow={1}
            display="flex"
            flexDirection="row"
            style={{ gap: "4px", color: "black" }}
        >
            <FieldSelect
                label={index === 0 ? "From Field" : undefined}
                options={filtered_from_field_options}
                value={join.from_field}
                onChange={handleFromFieldChange}
                isFilterable
                onFilter={(value) => {
                    setDebouncedSearch(value.toLowerCase());
                }}
            />
            <FieldSelect
                label={index === 0 ? "To Field" : undefined}
                options={to_field_options}
                value={join.to_field}
                onChange={handleToFieldChange}
            />
            <IconButton
                label="Delete Join"
                icon={<Delete />}
                style={{
                    alignSelf: "center",
                    marginBottom: index === 0 ? "-18px" : "0px",
                    visibility: joinLength > 1 ? "visible" : "hidden",
                }}
                onClick={() => onDelete(join.uuid)}
            />
            <IconButton
                label="Add Join"
                icon={<Add />}
                style={{
                    alignSelf: "center",
                    marginBottom: index === 0 ? "-18px" : "0px",
                    visibility: isLast ? "visible" : "hidden",
                }}
                disabled={!isValid}
                onClick={onAdd}
            />
            <Tooltip content="Invalid joins, please select fields">
                <Icon
                    style={{
                        alignSelf: "center",
                        marginBottom: index === 0 ? (isLast ? "-18px" : "-18px") : "0px",
                        visibility: !isValid ? "visible" : "hidden",
                    }}
                    icon={<Error />}
                />
            </Tooltip>
        </Box>
    );
};

export default JoinRow;