import { Box } from "@looker/components";
import React from "react";
import Markdown from "react-markdown";
import guide from "./guide.md";

const Guide = () => {
  return (
    <Box style={{ fontFamily: "monospace" }}>
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 style={{ fontSize: "2rem" }}>{children}</h1>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "4px solid #ccc",
                margin: "1em 0",
                padding: "0.5em 1em",
                backgroundColor: "#f9f9f9",
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {guide}
      </Markdown>
    </Box>
  );
};

export default Guide;
