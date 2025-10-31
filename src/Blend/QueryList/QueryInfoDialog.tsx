import { Box, Button, ButtonTransparent, Dialog, FieldCheckbox, FieldText, Grid, Heading, IconButton, Label, Space, SpaceVertical } from "@looker/components";
import { Info } from "@styled-icons/material";
import { useFormik } from "formik";
import { set } from "lodash";
import React, { useEffect } from "react";
import { useBoolean } from "usehooks-ts";
import { useBlendContext } from "../Context";

interface IQueryInfoDialog {
    query: IQuery
}

interface IQueryForm {
    new_label?: string
    respect_limit?: boolean
}


const QueryInfoDialog = ({ query }: IQueryInfoDialog) => {
    const dialog_open = useBoolean(false)
    const { updateQuery } = useBlendContext();
    const initial_values: IQueryForm = {
        new_label: query.explore?.new_label || query.explore?.label || query.explore?.id || "",
        respect_limit: query.respect_limit || undefined
    }
    const formik = useFormik({
        initialValues: initial_values,
        onSubmit: (values) => {
            const new_query = { ...query }
            set(new_query, "explore.new_label", values.new_label?.length ? values.new_label : undefined)
            set(new_query, "respect_limit", values.respect_limit || undefined)
            updateQuery(new_query)
            dialog_open.setFalse()
        }
    })

    const values = formik.values;

    useEffect(() => {
        if (dialog_open.value === false) {
            formik.setValues(initial_values)
        }
    }, [dialog_open.value])

    return <Dialog
        height="50vh"
        width="50vw"
        key={`${dialog_open.value}`}
        isOpen={dialog_open.value}
        setOpen={() => { }}
        // onClose={() => { }}
        content={
            <SpaceVertical p={"medium"} height="100%">
                <Heading>Query Options</Heading>
                <Grid columns={2} >
                    <Label>Rename Query</Label>
                    <Label>Respect Query Limit</Label>
                    <FieldText name="new_label" value={values.new_label} onChange={formik.handleChange} />
                    <FieldCheckbox
                        name="respect_limit"
                        checked={values.respect_limit || false}
                        onChange={(e) =>
                            formik.setFieldValue("respect_limit", e.target.checked || undefined)
                        }
                    />
                </Grid>
                <Box flexGrow={1} />
                <Space justify="end">
                    <ButtonTransparent onClick={dialog_open.setFalse}>Cancel</ButtonTransparent>
                    <Button onClick={(e) => { formik.handleSubmit() }}>Save</Button>
                </Space>
            </SpaceVertical>
        }>
        <IconButton
            size="small"
            onMouseDown={(e) => {
                dialog_open.setTrue();
            }}
            disabled={false}
            toggle={false}
            icon={<Info size={18} />}
            label="Query Options"
        />
    </Dialog >
}

export default QueryInfoDialog;