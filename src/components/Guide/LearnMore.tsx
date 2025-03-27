import { Dialog, DialogContent, DialogHeader, Span } from "@looker/components";
import React from "react";
import { useBoolean } from "usehooks-ts";
import Guide from ".";

const LearnMore = () => {
  const open = useBoolean(false);

  return (
    <>
      <br />
      <Span
        style={{ cursor: "pointer", fontWeight: "bold" }}
        onClick={open.toggle}
      >
        Learn More
      </Span>
      {open.value && (
        <Dialog isOpen={open.value} onClose={open.toggle}>
          <DialogHeader p="small">
            <></>
          </DialogHeader>
          <DialogContent p="medium">
            <Guide />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default LearnMore;
