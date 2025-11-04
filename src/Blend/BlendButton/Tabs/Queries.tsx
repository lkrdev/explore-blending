import {
    Box,
    ButtonTransparent,
    Card,
    Grid,
    Heading,
    Space,
} from '@looker/components';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { useDebounceCallback } from 'usehooks-ts';
import { useBlendContext } from '../../Context';
import QueryOptionsForm, {
    IQueryOptionsFormRef,
} from '../../QueryList/QueryOptionsForm';

const StyledCard = styled(Card)`
    &:focus-within {
        outline: 1px solid ${(p) => p.theme.colors.key};
    }
    &:focus-within .button-actions {
        visibility: visible;
    }
    & .button-actions.dirty {
        visibility: visible;
    }
    & .button-actions {
        visibility: hidden;
    }
`;

const Queries = () => {
    const { queries, updateQuery } = useBlendContext();
    const formRefs = useRef<{ [key: string]: IQueryOptionsFormRef | null }>({});

    const updateFormQuery = () => {
        Object.values(formRefs.current).forEach((ref) => {
            if (ref && ref.isValid()) {
                // ref.submit();
                // enable blend button
            }
        });
    };

    const debouncedUpdateFormQuery = useDebounceCallback(updateFormQuery, 1000);

    if (queries.length === 0) {
        return (
            <Box p="medium">
                <Heading>No queries available</Heading>
            </Box>
        );
    }

    return (
        <>
            <Grid columns={2} gap="xsmall">
                {queries.map((query) => {
                    const [dirty, setDirty] = useState(false);
                    return (
                        <StyledCard key={query.uuid} p="medium">
                            <Heading fontSize="medium" fontWeight="semiBold">
                                {query.explore?.label ||
                                    query.explore?.id ||
                                    'Unnamed Query'}
                            </Heading>
                            <QueryOptionsForm
                                dirty={dirty}
                                setDirty={setDirty}
                                ref={(ref) => {
                                    formRefs.current[query.uuid] = ref;
                                }}
                                query={query}
                                allQueries={queries}
                                onSave={(updatedQuery) => {
                                    updateQuery(updatedQuery);
                                    debouncedUpdateFormQuery();
                                }}
                            />
                            <Space
                                justify="end"
                                className={`button-actions ${
                                    dirty ? 'dirty' : ''
                                }`}
                            >
                                <ButtonTransparent
                                    size="small"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        formRefs.current[query.uuid]?.reset();
                                        setDirty(false);
                                        (e.target as HTMLButtonElement)?.blur();
                                    }}
                                >
                                    Cancel
                                </ButtonTransparent>
                                <ButtonTransparent
                                    size="small"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        formRefs.current[query.uuid]?.submit();
                                        setDirty(false);
                                        (e.target as HTMLButtonElement)?.blur();
                                    }}
                                >
                                    Save
                                </ButtonTransparent>
                            </Space>
                        </StyledCard>
                    );
                })}
            </Grid>
        </>
    );
};

export default Queries;
