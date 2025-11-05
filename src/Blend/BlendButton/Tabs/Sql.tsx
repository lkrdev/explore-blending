import { Box, Code } from '@looker/components';
import { set } from 'lodash';
import { format } from 'prettier-sql';
import React, { useState } from 'react';
import useSWR from 'swr';
import CopyClipboard from '../../../components/CopyClipboard';
import useSdk from '../../../hooks/useSdk';
import { STATUS_MESSAGES } from '../../../utils/getBlend';
import getQuerySql from '../../../utils/getSQL';
import { useBlendContext } from '../../Context';
var stringify = require('fast-stable-stringify');

const Sql = () => {
    const [status, setStatus] = useState<{ message: string; done: boolean }[]>(
        []
    );
    const { queries, joins, first_query_connection } = useBlendContext();
    const sdk = useSdk();

    const addStatus = (status: keyof typeof STATUS_MESSAGES, done: boolean) => {
        setStatus((p) => {
            const new_p: { message: string; done: boolean }[] = [...p];
            const index = new_p.findIndex(
                (s) => s.message === STATUS_MESSAGES[status]
            );
            if (index !== -1) {
                set(new_p, index, { message: STATUS_MESSAGES[status], done });
            } else {
                new_p.push({ message: STATUS_MESSAGES[status], done });
            }
            return new_p;
        });
    };

    const sql = useSWR(
        first_query_connection?.length
            ? stringify({ queries, joins, first_query_connection }) + '-sql'
            : null,
        () =>
            getQuerySql(sdk, queries, joins, first_query_connection!, addStatus)
    );

    if (sql.isLoading) {
        return <div>Loading...</div>;
    }
    if (sql.error) {
        return <div>Error: {sql.error}</div>;
    }

    return (
        <Box position="relative" height="100%" width="100%">
            <CopyClipboard
                text={sql.data || '-- No SQL generated --'}
                label="Copy SQL"
                size={16}
            />
            <Code
                fontSize="xxsmall"
                style={{
                    height: '100%',
                    width: '100%',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                }}
                lang="sql"
            >
                {format(sql.data || '-- No SQL generated --', {
                    language: 'sql',
                })}
            </Code>
        </Box>
    );
};

export default Sql;
