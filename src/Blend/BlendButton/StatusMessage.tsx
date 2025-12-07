import { Span } from '@looker/components';
import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useBlendButtonContext } from './BlendButtonContext';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
`;

const MessageText = styled.div<{
    isVisible: boolean;
    shouldAnimateExit: boolean;
}>`
    font-size: ${({ theme }) => theme.fontSizes.small};
    font-weight: ${({ theme }) => theme.fontWeights.semiBold};
    text-align: center;
    pointer-events: none;
    opacity: 0;
    animation: ${({ isVisible, shouldAnimateExit }) =>
        isVisible
            ? css`
                  ${fadeIn} 0.3s ease-out forwards
              `
            : shouldAnimateExit
            ? css`
                  ${fadeOut} 0.3s ease-in forwards
              `
            : 'none'};
`;

export const StatusMessage: React.FC = () => {
    const { status, error, success, setSuccess } = useBlendButtonContext();
    const [currentMessage, setCurrentMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<
        'success' | 'error' | 'info'
    >('info');
    const [isVisible, setIsVisible] = useState(false);
    const [shouldAnimateExit, setShouldAnimateExit] = useState(false);
    const queueRef = useRef<string[]>([]);
    const processingRef = useRef(false);
    const lastProcessedMessageRef = useRef<string | null>(null);

    // Handle status updates, errors, and success
    useEffect(() => {
        // Handle Error
        if (error) {
            queueRef.current = [];
            setCurrentMessage(error);
            setMessageType('error');
            setShouldAnimateExit(true);
            setIsVisible(true);
            processingRef.current = false;
            return;
        }

        // Handle Reset
        if (status.length === 0) {
            setCurrentMessage(null);
            setMessageType('info');
            setIsVisible(false);
            setShouldAnimateExit(false);
            queueRef.current = [];
            processingRef.current = false;
            lastProcessedMessageRef.current = null;
            return;
        }

        // Update Queue
        const activeStatus = status.filter((s) => !s.done);
        if (activeStatus.length > 0) {
            const latest = activeStatus[activeStatus.length - 1].message;
            if (
                latest !== lastProcessedMessageRef.current &&
                !queueRef.current.includes(latest)
            ) {
                queueRef.current.push(latest);
            }
        }

        // Trigger Processing
        if (!processingRef.current) {
            processQueue();
        }
    }, [status, error, success]);

    const processQueue = async () => {
        if (processingRef.current || error) return;

        if (queueRef.current.length === 0) {
            // Queue empty. Check if success is pending.
            if (success && currentMessage !== 'Success!') {
                // Show success
                processingRef.current = true;
                if (currentMessage) {
                    setIsVisible(false);
                    await new Promise((resolve) => setTimeout(resolve, 300));
                } else {
                    // First message (success immediately?)
                    setCurrentMessage('Success!');
                    setIsVisible(false);
                    setShouldAnimateExit(false);
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
                setMessageType('success');
                setCurrentMessage('Success!');
                setShouldAnimateExit(true);
                setIsVisible(true);

                // Auto clear after 10s
                setTimeout(() => {
                    if (success) {
                        // Check if still success (not reset)
                        setIsVisible(false);
                        setTimeout(() => {
                            setCurrentMessage(null);
                            setSuccess(false); // Reset success state
                        }, 300);
                    }
                }, 10000);

                processingRef.current = false;
                return;
            }

            // If not success and queue empty, maybe hide?
            // Only hide if NOT success and NOT error.
            if (
                !success &&
                !error &&
                currentMessage &&
                messageType === 'info'
            ) {
                // Wait a bit then hide? Or keep last status?
                // User said "last not completed one".
                // If all done and no success/error, maybe hide.
                const allDone =
                    status.length > 0 && status.every((s) => s.done);
                if (allDone) {
                    setIsVisible(false);
                    setTimeout(() => setCurrentMessage(null), 300);
                }
            }
            return;
        }

        processingRef.current = true;
        const nextMessage = queueRef.current.shift();

        if (nextMessage) {
            lastProcessedMessageRef.current = nextMessage;

            if (currentMessage) {
                setIsVisible(false);
                await new Promise((resolve) => setTimeout(resolve, 300));
            } else {
                // First message: ensure it mounts invisible first to trigger fade-in
                setCurrentMessage(nextMessage);
                setIsVisible(false);
                setShouldAnimateExit(false);
                // Allow a render cycle to happen
                await new Promise((resolve) => setTimeout(resolve, 50));
            }

            setMessageType('info');
            setCurrentMessage(nextMessage);
            setShouldAnimateExit(true);
            setIsVisible(true);

            await new Promise((resolve) => setTimeout(resolve, 500));

            processingRef.current = false;
            processQueue();
        } else {
            processingRef.current = false;
        }
    };

    if (!currentMessage && !isVisible) return null;

    return (
        <MessageText
            isVisible={isVisible}
            shouldAnimateExit={shouldAnimateExit}
        >
            <Span
                color={
                    messageType === 'error'
                        ? 'critical'
                        : messageType === 'success'
                        ? 'positive'
                        : undefined
                }
            >
                {currentMessage}
            </Span>
        </MessageText>
    );
};
