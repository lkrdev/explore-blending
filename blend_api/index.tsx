import {
  Box,
  Button,
  FieldText,
  Form,
  SpaceVertical,
} from "@looker/components";
import React from "react";
import { useExtensionContext } from "../src/Main";

const ConfigForm: React.FC = () => {
  const extension = useExtensionContext();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      projectName: formData.get("projectName") as string,
      userAttribute: formData.get("userAttribute") as string,
      repoName: formData.get("repoName") as string,
      exploreLabel: formData.get("exploreLabel") as string,
    };
    await extension.extensionSDK.saveContextData(payload);
    await extension.extensionSDK.refreshContextData();
  };

  return (
    <Box p="large">
      <Form onSubmit={handleSubmit}>
        <SpaceVertical gap="small">
          <FieldText name="projectName" label="Project Name" required />
          <FieldText name="userAttribute" label="User Attribute" required />
          <FieldText name="repoName" label="Repository Name" required />
          <FieldText name="exploreLabel" label="Explore Label" required />
          <Button type="submit">Save Configuration</Button>
        </SpaceVertical>
      </Form>
      <SpaceVertical gap="small"></SpaceVertical>
    </Box>
  );
};

export default ConfigForm;
