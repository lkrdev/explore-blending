import React from "react";

// --- SVG Icon Components ---

const SvgBase: React.FC<
    React.PropsWithChildren<React.SVGProps<SVGSVGElement>>
> = ({ children, ...props }) => (
    <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <defs>
            {/* Define the two circles */}
            <circle id="circleA" cx="9" cy="12" r="7" />
            <circle id="circleB" cx="15" cy="12" r="7" />

            {/* Mask for Circle A */}
            <mask id="maskA">
                <use href="#circleA" fill="white" />
            </mask>
            {/* Mask for Circle B */}
            <mask id="maskB">
                <use href="#circleB" fill="white" />
            </mask>
            {/* Mask for Intersection (A and B) */}
            <mask id="maskIntersection">
                {/* Draw B, but only where A exists */}
                <use href="#circleB" fill="white" mask="url(#maskA)" />
            </mask>
        </defs>
        {/* Draw the outlines */}
        <use href="#circleA" stroke="currentColor" strokeWidth="1" fill="none" />
        <use href="#circleB" stroke="currentColor" strokeWidth="1" fill="none" />
        {/* Render filled parts */}
        {children}
    </svg>
);

const InnerJoinIcon = () => (
    <SvgBase>
        {/* Fill a rectangle masked by the intersection */}
        <rect
            x="2"
            y="5"
            width="20"
            height="14"
            fill="currentColor"
            mask="url(#maskIntersection)"
        />
    </SvgBase>
);

const LeftJoinIcon = () => (
    <SvgBase>
        {/* Fill Circle A */}
        <use href="#circleA" fill="currentColor" />
    </SvgBase>
);

const RightJoinIcon = () => (
    <SvgBase>
        {/* Fill Circle B */}
        <use href="#circleB" fill="currentColor" />
    </SvgBase>
);

const FullOuterJoinIcon = () => (
    <SvgBase>
        {/* Fill both Circle A and Circle B */}
        <use href="#circleA" fill="currentColor" />
        <use href="#circleB" fill="currentColor" />
    </SvgBase>
);

// Cross Join visually represented as Full Outer
const CrossJoinIcon = FullOuterJoinIcon;

export const JOIN_ICONS: Record<TJoinType, React.FC> = {
    inner: InnerJoinIcon,
    left: LeftJoinIcon,
    right: RightJoinIcon,
    full: FullOuterJoinIcon,
    cross: CrossJoinIcon, // Using Full Outer icon for Cross
};