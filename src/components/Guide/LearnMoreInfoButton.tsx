import { Dialog, DialogContent, DialogHeader, Icon } from "@looker/components";
import { Info } from "@styled-icons/material";
import React from "react";
import { useBoolean } from "usehooks-ts";
import Guide from ".";

const LearnMoreInfoButton = () => {
  const open = useBoolean(false);

  return (
    <>
      <Icon
        icon={<Info />}
        size="medium"
        style={{ cursor: "pointer" }}
        onClick={open.toggle}
      />
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

export default LearnMoreInfoButton;
