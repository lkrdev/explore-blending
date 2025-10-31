import { Box, ButtonBase, Header, Icon, IconButton, Paragraph, Space, SpaceVertical, Spinner } from "@looker/components"
import { CopyAll, Delete } from "@styled-icons/material"
import { reduce } from "lodash"
import React, { useRef } from 'react'
import styled from "styled-components"
import { useAppContext } from "../../AppContext"
import Join from "../SelectedQuery/Join"
import QueryInfoDialog from "./QueryInfoDialog"

interface IQueryListItem {
    selected: boolean
    onClick: () => void
    duplicating: boolean
    query: IQuery
    index: number
    handleDelete: (uuid: string) => void
    handleDuplicate: (query: IQuery) => void
    loading: boolean
}

const StyledButtonBase = styled(ButtonBase) <{ selected: boolean }>`
    &:hover .icon-actions {
        visibility: visible;
    }
    & .icon-actions {
        visibility: hidden;
    }
    background-color: ${(theme) => {
        return (theme.selected ? theme.theme.colors.keySubtle : undefined)
    }}
`


const StyledSpace = styled(Space)`
    min-width: 56px;
    & .icon - actions {
        visibility: hidden;
    }
`;

const QueryListItem: React.FC<IQueryListItem> = ({
    selected,
    onClick,
    handleDelete,
    handleDuplicate,
    duplicating,
    query,
    index,
    loading
}) => {
    const { getExploreField } = useAppContext();

    const itemRef = useRef<HTMLDivElement>(null)
    const explore_label = `${query.explore?.new_label || query.explore?.label || query.explore?.id || index + 1}`
    const Fields = reduce(query.fields, (result, field) => {
        const field_metadata = query.explore?.id
            ? getExploreField(query.explore.id, field.id)
            : null;
        const itemColor =
            field_metadata?.type === "measure"
                ? "measure"
                : field_metadata?.type === "dimension"
                    ? "dimension"
                    : "key";
        const label = (field_metadata?.view_label?.length && field_metadata?.label_short?.length) ? `${field_metadata?.view_label}: ${field_metadata?.label_short}` : field_metadata?.label || field.id;
        const Field = <Paragraph
            key={`${query.uuid}-${field.id}`}
            style={{ pointerEvents: "none" }} // Not interactive
            color={itemColor}
            fontSize="xsmall"
            title={field.id}
        >
            {label}
        </Paragraph>
        if (field.type === "dimension") {
            result.dimensions.push(Field)
        } else {
            result.measures.push(Field)
        }
        return result
    }, { dimensions: [] as React.ReactNode[], measures: [] as React.ReactNode[] })


    return <StyledButtonBase
        as="li"
        selected={selected}
        style={{
            cursor: "pointer",
            userSelect: loading ? "none" : "auto",
            padding: "8px 4px"
        }}
        onClick={onClick}
    >
        <Space gap="xxsmall" align="start">
            <SpaceVertical flexGrow={1} gap="xxsmall">
                <Header>{explore_label}</Header>
                <Box as="ul" pl={"medium"}>
                    {Fields.dimensions}
                    {Fields.measures}
                </Box>
            </SpaceVertical>
            <SpaceVertical gap="none" flexGrow={0} width="auto" className="icon-actions">
                <StyledSpace gap="none" justify="end">
                    <IconButton
                        icon={<Delete />}
                        label={`Delete query`}
                        size="small"
                        // Hide delete button if only one query exists
                        // Disable during any duplication process
                        disabled={duplicating}
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            e.preventDefault()
                            handleDelete(query.uuid);
                        }}
                    />
                    <IconButton
                        // Show spinner when this item is duplicating
                        icon={
                            duplicating ? (
                                <Spinner size={16} />
                            ) : (
                                <Icon size="medium" icon={<CopyAll size={24} />} />
                            )
                        }
                        label="Duplicate Query"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDuplicate(query); // Call updated handler
                        }}
                        // Disable if this specific item or any item is duplicating
                        disabled={duplicating}
                        size="small"
                    />
                </StyledSpace>
                {<StyledSpace gap="none" justify="end">
                    {index > 0 && <Join popover_ref={itemRef} hidden={false} disabled={false} query={query} />}
                    <QueryInfoDialog query={query} />
                </StyledSpace>
                }
            </SpaceVertical>
        </Space>
    </StyledButtonBase>
}

export default QueryListItem