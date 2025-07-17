import React, { useEffect, useRef, useState } from "react";

interface LkrLoadingProps {
  size?: number;
  color?: string;
  duration?: number;
  className?: string;
}

const LkrLoading: React.FC<LkrLoadingProps> = ({
  size = 191,
  color = "#000000",
  duration = 2000,
  className = "",
}) => {
  const [animationPhase, setAnimationPhase] = useState<
    "drawing" | "filling" | "exiting"
  >("drawing");
  const [progress, setProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Break down the SVG path into separate paths for each letter
  const letterPaths = {
    L: "M3.5918 62C2.71289 62 2.04492 61.7715 1.58789 61.3145C1.13086 60.8223 0.902344 60.2949 0.902344 59.7324C0.902344 59.1699 1.11328 58.6602 1.53516 58.2031C1.99219 57.7109 2.66016 57.4648 3.53906 57.4648H17.7246V4.7832H5.75391C4.875 4.7832 4.22461 4.55469 3.80273 4.09766C3.38086 3.64062 3.16992 3.13086 3.16992 2.56836C3.16992 1.9707 3.38086 1.44336 3.80273 0.986328C4.25977 0.494141 4.92773 0.248047 5.80664 0.248047H30.75C31.6641 0.248047 32.332 0.494141 32.7539 0.986328C33.2109 1.44336 33.4395 1.9707 33.4395 2.56836C33.4395 3.13086 33.2109 3.64062 32.7539 4.09766C32.332 4.55469 31.6816 4.7832 30.8027 4.7832H22.7871V57.4648H46.8867C47.4844 57.3945 47.9766 57.2539 48.3633 57.043C48.75 56.832 48.9785 56.3223 49.0488 55.5137L50.8418 40.959C50.9473 40.1855 51.2637 39.623 51.791 39.2715C52.3184 38.8848 52.8809 38.6914 53.4785 38.6914C54.1816 38.6914 54.7969 38.9199 55.3242 39.377C55.8867 39.7988 56.168 40.4316 56.168 41.2754L54.5859 58.5195C54.5156 59.5039 54.1465 60.3301 53.4785 60.998C52.8105 61.666 51.9141 62 50.7891 62H3.5918Z",
    K: "M66.8203 62C65.9414 62 65.2734 61.7715 64.8164 61.3145C64.3594 60.8223 64.1309 60.2949 64.1309 59.7324C64.1309 59.1699 64.3418 58.6602 64.7637 58.2031C65.2207 57.7109 65.8887 57.4648 66.7676 57.4648H75.1523V4.83594H66.7676C65.8887 4.83594 65.2207 4.60742 64.7637 4.15039C64.3418 3.6582 64.1309 3.13086 64.1309 2.56836C64.1309 1.9707 64.3594 1.44336 64.8164 0.986328C65.2734 0.494141 65.9414 0.248047 66.8203 0.248047H90.2871C91.166 0.248047 91.8164 0.494141 92.2383 0.986328C92.6953 1.47852 92.9238 2.02344 92.9238 2.62109C92.9238 3.18359 92.7129 3.69336 92.291 4.15039C91.9043 4.60742 91.2715 4.83594 90.3926 4.83594H80.2148V32.5742L110.59 5.15234C110.836 4.90625 110.959 4.73047 110.959 4.625C110.959 4.41406 110.625 4.30859 109.957 4.30859H105.264C104.385 4.30859 103.734 4.11523 103.312 3.72852C102.891 3.30664 102.68 2.84961 102.68 2.35742C102.68 1.83008 102.908 1.35547 103.365 0.933594C103.822 0.476562 104.473 0.248047 105.316 0.248047H124.406C125.285 0.248047 125.936 0.494141 126.357 0.986328C126.779 1.44336 126.99 1.9707 126.99 2.56836C126.99 3.13086 126.779 3.6582 126.357 4.15039C125.936 4.60742 125.303 4.83594 124.459 4.83594H117.182L94.084 26.3516L121.559 57.4648H128.783C129.627 57.4648 130.26 57.7109 130.682 58.2031C131.104 58.6602 131.314 59.1699 131.314 59.7324C131.314 60.2949 131.104 60.8223 130.682 61.3145C130.26 61.7715 129.609 62 128.73 62H106.688C105.809 62 105.141 61.7715 104.684 61.3145C104.262 60.8223 104.051 60.2949 104.051 59.7324C104.051 59.1699 104.262 58.6602 104.684 58.2031C105.105 57.7109 105.756 57.4648 106.635 57.4648H115.389L90.1816 29.252L80.4258 37.4785V57.4648H93.293C94.1719 57.4648 94.8223 57.7109 95.2441 58.2031C95.666 58.6602 95.877 59.1699 95.877 59.7324C95.877 60.2949 95.6484 60.8223 95.1914 61.3145C94.7695 61.7715 94.1191 62 93.2402 62H66.8203Z",
    R: "M138.803 62C137.924 62 137.256 61.7715 136.799 61.3145C136.342 60.8574 136.113 60.3652 136.113 59.8379C136.113 59.2754 136.324 58.7832 136.746 58.3613C137.203 57.9043 137.871 57.6758 138.75 57.6758H145.342V4.7832H140.227C139.348 4.7832 138.68 4.55469 138.223 4.09766C137.801 3.64062 137.59 3.13086 137.59 2.56836C137.59 1.9707 137.818 1.44336 138.275 0.986328C138.732 0.494141 139.4 0.248047 140.279 0.248047H157.154C162.252 0.248047 166.734 0.652344 170.602 1.46094C174.504 2.26953 177.545 3.86914 179.725 6.25977C181.904 8.65039 182.994 12.2363 182.994 17.0176C182.994 21.0605 181.869 24.2422 179.619 26.5625C177.369 28.8477 174.873 30.5 172.131 31.5195L182.889 57.6758H187.318C188.654 57.6758 189.551 57.9043 190.008 58.3613C190.465 58.7832 190.693 59.2578 190.693 59.7852C190.693 60.3477 190.447 60.8574 189.955 61.3145C189.463 61.7715 188.602 62 187.371 62H174.979C174.1 62 173.432 61.7715 172.975 61.3145C172.518 60.8574 172.289 60.3477 172.289 59.7852C172.289 59.2578 172.5 58.7832 172.922 58.3613C173.344 57.9043 173.994 57.6758 174.873 57.6758H177.562L168.07 32.6797C167.824 32.75 167.174 32.8555 166.119 32.9961C165.1 33.1016 163.975 33.207 162.744 33.3125C161.514 33.3828 160.477 33.418 159.633 33.418H150.404V57.6758H159.896C160.775 57.6758 161.426 57.9043 161.848 58.3613C162.27 58.7832 162.48 59.2754 162.48 59.8379C162.48 60.3652 162.27 60.8574 161.848 61.3145C161.426 61.7715 160.758 62 159.844 62H138.803ZM150.404 29.3574H156.047C160.406 29.3574 164.221 29.0938 167.49 28.5664C170.795 28.0039 173.361 26.8789 175.189 25.1914C177.018 23.4688 177.932 20.8672 177.932 17.3867C177.932 13.8008 177.229 11.1113 175.822 9.31836C174.416 7.49023 172.184 6.27734 169.125 5.67969C166.066 5.08203 162.059 4.7832 157.102 4.7832H150.404V29.3574Z",
  };

  // Main animation loop
  useEffect(() => {
    let animationId: number;
    let startTime: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;

      const elapsed = currentTime - startTime;
      const totalDuration = duration * 3; // Total time for all phases

      if (elapsed < duration) {
        // Drawing phase
        setAnimationPhase("drawing");
        setProgress(elapsed / duration);
      } else if (elapsed < duration * 2) {
        // Filling phase
        setAnimationPhase("filling");
        setProgress((elapsed - duration) / duration);
      } else if (elapsed < totalDuration) {
        // Exiting phase
        setAnimationPhase("exiting");
        setProgress((elapsed - duration * 2) / duration);
      } else {
        // Reset animation
        setAnimationPhase("drawing");
        setProgress(0);
        startTime = currentTime;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [duration]);

  const renderLetter = (letter: "L" | "K" | "R", index: number) => {
    const path = letterPaths[letter];
    const letterProgress = Math.max(
      0,
      Math.min(1, (progress - index * 0.2) * 3)
    );

    let strokeDasharray = "";
    let strokeDashoffset = "";
    let fillOpacity = 0;
    let strokeWidth = "1.5";
    let strokeOpacity = 1;
    let filter = `drop-shadow(0 0 ${2 + letterProgress * 3}px ${color})`;
    let fill = color;
    let stroke = color;

    // Neon animation style
    if (animationPhase === "drawing") {
      strokeDasharray = "1000";
      strokeDashoffset = `${1000 - letterProgress * 1000}`;
      fillOpacity = 0;
      strokeOpacity = letterProgress;
    } else if (animationPhase === "filling") {
      strokeDasharray = "1000";
      strokeDashoffset = "0";
      fillOpacity = letterProgress;
      strokeOpacity = 1;
    } else {
      strokeDasharray = "1000";
      strokeDashoffset = `${letterProgress * 1000}`;
      fillOpacity = 1 - letterProgress;
      strokeOpacity = 1 - letterProgress;
    }

    return (
      <g key={letter}>
        <path
          d={path}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeOpacity={strokeOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter,
            transition: "all 0.1s ease-out",
          }}
        />
      </g>
    );
  };

  const scale = size / 191; // Original SVG width is 191
  const height = 62 * scale;

  return (
    <div
      className={`lkr-loading ${className}`}
      style={{
        display: "inline-block",
        width: size,
        height: height,
        position: "relative",
      }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={height}
        viewBox="0 0 191 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {renderLetter("L", 0)}
        {renderLetter("K", 1)}
        {renderLetter("R", 2)}
      </svg>
    </div>
  );
};

export default LkrLoading;
