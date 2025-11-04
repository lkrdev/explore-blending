import {
    Box,
    Button,
    ButtonTransparent,
    Dialog,
    Heading,
    IconButton,
    Space,
    SpaceVertical,
} from '@looker/components';
import { Info } from '@styled-icons/material';
import React, { useRef, useState } from 'react';
import { useBoolean } from 'usehooks-ts';
import { useBlendContext } from '../Context';
import QueryOptionsForm, { IQueryOptionsFormRef } from './QueryOptionsForm';

interface IQueryInfoDialog {
    query: IQuery;
}

const QueryInfoDialog = ({ query }: IQueryInfoDialog) => {
    const dialog_open = useBoolean(false);
    const [dirty, setDirty] = useState(false);
    const { updateQuery, queries } = useBlendContext();
    const formRef = useRef<IQueryOptionsFormRef>(null);

    return (
        <Dialog
            height="50vh"
            width="50vw"
            key={`${dialog_open.value}`}
            isOpen={dialog_open.value}
            setOpen={() => {}}
            content={
                <SpaceVertical p="medium" height="100%" width="100%">
                    <Heading>Query Options</Heading>
                    <QueryOptionsForm
                        ref={formRef}
                        query={query}
                        allQueries={queries}
                        onSave={(updatedQuery) => {
                            updateQuery(updatedQuery);
                            dialog_open.setFalse();
                            setDirty(false);
                        }}
                        isInDialog={true}
                        setDirty={setDirty}
                        dirty={dirty}
                    />
                    <Box flexGrow={1} />
                    <Space justify="end">
                        <ButtonTransparent onClick={dialog_open.setFalse}>
                            Cancel
                        </ButtonTransparent>
                        <Button
                            disabled={!dirty}
                            onClick={() => {
                                formRef.current?.submit();
                            }}
                        >
                            Save
                        </Button>
                    </Space>
                </SpaceVertical>
            }
        >
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
        </Dialog>
    );
};

export default QueryInfoDialog;
