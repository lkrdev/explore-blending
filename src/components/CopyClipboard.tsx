import { Box, IconButton, Tooltip } from '@looker/components';
import { ContentCopy } from '@styled-icons/material';
import React from 'react';
import styled from 'styled-components';
import useExtensionSdk from '../hooks/useExtensionSdk';

const FloatingContainer = styled(Box)`
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 5;
`;

const CopyClipboard = ({
    text,
    label,
    size,
}: {
    text: string;
    label?: string;
    size?: number;
}) => {
    const extension_sdk = useExtensionSdk();
    const handleCopy = async () => {
        try {
            await extension_sdk.clipboardWrite(text);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <FloatingContainer>
            <Tooltip content="Copy to clipboard">
                <IconButton
                    icon={<ContentCopy size={size || undefined} />}
                    onClick={handleCopy}
                    size="small"
                    label={label || 'Copy to clipboard'}
                    aria-label={label || 'Copy to clipboard'}
                />
            </Tooltip>
        </FloatingContainer>
    );
};

export default CopyClipboard;
