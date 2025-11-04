import {
    Box,
    FieldCheckbox,
    FieldText,
    Grid,
    Label,
    SpaceVertical,
    Span,
} from '@looker/components';
import { useFormik } from 'formik';
import { set } from 'lodash';
import React, {
    Dispatch,
    forwardRef,
    SetStateAction,
    useEffect,
    useImperativeHandle,
} from 'react';
import styled from 'styled-components';
import getExploreLabelFromQuery from '../../utils/explore_label';

interface IQueryOptionsForm {
    query: IQuery;
    allQueries: IQuery[];
    onSave: (query: IQuery) => void;
    isInDialog?: boolean;
    dirty: boolean;
    setDirty: Dispatch<SetStateAction<boolean>>;
}

export interface IQueryOptionsFormRef {
    submit: () => void;
    isValid: () => boolean;
    reset: () => void;
}

interface IQueryForm {
    alias?: string;
    new_label?: string;
    respect_limit?: boolean;
}

const StyledGrid = styled(Grid)`
    row-gap: ${({ theme }) => theme.space.xsmall};
    & label {
        margin-top: ${({ theme }) => theme.space.small};
    }
`;

const alias_regex = /^[a-z][a-z0-9_]*$/;
const alias_regex_error =
    'Alias must start with a letter and contain only letters and numbers';

const transformAliasInput = (rawValue: string): string => {
    // Transform to match regex: must start with letter, then only letters, numbers, underscores
    let transformed = rawValue
        .toLowerCase() // Convert to lowercase
        .replace(/[^a-z0-9_ ]/g, '_') // Replace invalid characters with underscores (including spaces)
        .replace(/ /g, '_'); // Replace spaces with underscores

    return transformed;
};

const QueryOptionsForm = forwardRef<IQueryOptionsFormRef, IQueryOptionsForm>(
    (
        { query, allQueries, onSave, isInDialog = false, dirty, setDirty },
        ref
    ) => {
        const initial_values: IQueryForm = {
            new_label: getExploreLabelFromQuery(query),
            respect_limit: query.respect_limit || undefined,
            alias: query.alias || undefined,
        };

        const formik = useFormik({
            enableReinitialize: true,
            initialValues: initial_values,
            onSubmit: (values, formikHelpers) => {
                const new_query = { ...query };
                set(new_query, ['explore', 'new_label'], values.new_label);
                set(new_query, ['respect_limit'], values.respect_limit);
                set(new_query, ['alias'], values.alias);
                onSave(new_query);
            },
            validate: (values) => {
                const errors: Record<string, string> = {};
                if (values.alias && values.alias.length > 0) {
                    if (!alias_regex.test(values.alias)) {
                        errors.alias = alias_regex_error;
                    } else {
                        if (
                            allQueries.some((q) => {
                                if (q.uuid === query.uuid) {
                                    return false;
                                } else if (q.alias === values.alias) {
                                    return true;
                                } else if (q.uuid === values.alias) {
                                    if (q.alias) {
                                        return false;
                                    } else {
                                        return true;
                                    }
                                } else {
                                    return false;
                                }
                            })
                        ) {
                            errors.alias = 'Alias must be unique';
                        }
                    }
                }
                return errors;
            },
        });

        useEffect(() => {
            setDirty(formik.dirty);
        }, [formik.dirty]);

        useImperativeHandle(ref, () => ({
            submit: () => {
                formik.handleSubmit();
            },
            isValid: () => {
                return Object.keys(formik.errors).length === 0;
            },
            reset: () => {
                formik.resetForm();
            },
            dirty: formik.dirty,
        }));

        const values = formik.values;

        return (
            <SpaceVertical
                p={isInDialog ? 'medium' : undefined}
                height={isInDialog ? '100%' : undefined}
            >
                <StyledGrid columns={2}>
                    <Label>Rename Query</Label>
                    <Label>Respect Query Limit</Label>
                    <FieldText
                        name="new_label"
                        value={values.new_label || ''}
                        placeholder={query.explore.label || ''}
                        onChange={(e) => {
                            formik.handleChange(e);
                            const transformed = transformAliasInput(
                                e.target.value
                            );
                            formik.setFieldValue('alias', transformed);
                        }}
                    />
                    <FieldCheckbox
                        name="respect_limit"
                        checked={values.respect_limit || false}
                        onChange={(e) => {
                            formik.setFieldValue(
                                'respect_limit',
                                e.target.checked
                            );
                        }}
                    />
                    <Label>Query Alias</Label>
                    <Label></Label>
                    <SpaceVertical>
                        <FieldText
                            name="alias"
                            value={values.alias || ''}
                            placeholder={transformAliasInput(query.uuid)}
                            onChange={(e) => {
                                const transformed = transformAliasInput(
                                    e.target.value
                                );
                                formik.setFieldValue('alias', transformed);
                            }}
                        />
                        <Span fontSize="small" color="critical">
                            {formik.errors.alias}
                        </Span>
                    </SpaceVertical>
                    <Box></Box>
                </StyledGrid>
            </SpaceVertical>
        );
    }
);

export default QueryOptionsForm;
