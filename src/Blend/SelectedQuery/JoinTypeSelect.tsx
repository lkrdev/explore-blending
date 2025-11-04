import { ButtonTransparent, Paragraph, Space, SpaceVertical } from "@looker/components";
import React from "react";
import styled from "styled-components";
import { JOIN_ICONS } from '../../components/Joins/JoinSvgs';

const StyledButtonTransparent = styled(ButtonTransparent) <{ current_join: boolean }>`
    background-color: ${p => p.current_join ? p.theme.colors.keySubtle : undefined};
    color: ${p => p.current_join ? p.theme.colors.key : undefined};
    cursor: pointer;
`

const OPTIONS: { label: string; value: TJoinType }[] = [
    { label: "Inner", value: "inner" },
    { label: "Left", value: "left" },
    { label: "Right", value: "right" },
    { label: "Full", value: "full" },
    { label: "Cross", value: "cross" },
];

const JoinTypeSelect = ({
    current,
    updateJoinType
}: {
    current: TJoinType,
    updateJoinType: (type: TJoinType) => void
}) => {
    return <Space justify="center" gap="small">
        {OPTIONS.map(j => {
            const C = JOIN_ICONS[j.value]
            return <StyledButtonTransparent
                as={SpaceVertical}
                current_join={current === j.value}
                justify="center"
                align="center"
                gap="none"
                textAlign={"center"}
                key={j.value}
                onClick={() => updateJoinType(j.value)}
            >
                <Paragraph>{j.label}</Paragraph>
                <C />
            </StyledButtonTransparent>
        })}
    </Space>
}

export default JoinTypeSelect;