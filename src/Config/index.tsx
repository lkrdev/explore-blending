import {
  Box,
  Button,
  FieldCheckbox,
  FieldText,
  Form,
  Label,
  SpaceVertical,
  Text,
} from "@looker/components";
import { IDBConnection } from "@looker/sdk";
import { orderBy } from "lodash";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useCore40SDK, useExtensionContext } from "../Main";

const StyledSpaceVertical = styled(SpaceVertical)`
  border-left: 1px solid ${({ theme }) => theme.colors.key};
`;

const ConfigForm: React.FC = () => {
  const [connections, setConnections] = useState<IDBConnection[]>([]);
  const extension = useExtensionContext();
  const sdk = useCore40SDK();
  const [formData, setFormData] = useState<
    Partial<ConfigFormData> | undefined
  >();

  const handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => {
      return { ...prev, [name]: checked };
    });
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const new_value = {
        [name]: value,
      } as Partial<ConfigFormData>;
      if (!prev) {
        return new_value;
      } else {
        return {
          ...prev,
          ...new_value,
        };
      }
    });
  };

  useEffect(() => {
    const getContext = async () => {
      await extension.extensionSDK.refreshContextData();
      const contextData = await extension.extensionSDK.getContextData();

      setFormData(contextData || {});
      const connections = await sdk.ok(sdk.all_connections());
      setConnections(orderBy(connections, "name"));
    };
    getContext();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await extension.extensionSDK.saveContextData(formData);
    await extension.extensionSDK.refreshContextData();
  };
  if (!formData) {
    return <Box p="large">Loading...</Box>;
  } else {
    return (
      <Box p="large" maxWidth="400px">
        <Form onSubmit={handleSubmit}>
          <SpaceVertical gap="small">
            <FieldCheckbox
              name="lookml"
              label="Use LookML"
              checked={formData.lookml || false}
              onChange={handleCheckChange}
            />
            <FieldText
              name="repoName"
              label="Repository Name for Blends"
              required
              value={formData.repoName || ""}
              onChange={handleChange}
              disabled={!formData.lookml}
            />
            <FieldText
              name="projectName"
              label="Blend Project Name"
              required
              value={formData.projectName || ""}
              onChange={handleChange}
              disabled={!formData.lookml}
            />
            <Label>Connection Model Mapping</Label>
            <StyledSpaceVertical gap="small" pl="small">
              {connections.map((connection) => {
                const found =
                  formData.connection_model_mapping?.[connection.name || ""];
                return (
                  <FieldText
                    key={connection.name}
                    label={connection.name}
                    required
                    value={found?.model_name || ""}
                    onChange={(e) => {
                      const new_value = e.target.value;
                      setFormData({
                        ...formData,
                        // @ts-ignore
                        connection_model_mapping: {
                          ...formData.connection_model_mapping,
                          [connection.name || ""]: {
                            connection_name: connection.name || "",
                            model_name: new_value,
                          },
                        },
                      });
                    }}
                    disabled={!formData.lookml}
                  />
                );
              })}
            </StyledSpaceVertical>
            <FieldText
              name="includes"
              label="Includes to put in the LookML file"
              value={formData.includes || ""}
              onChange={handleChange}
            />
            <FieldCheckbox
              name="accessGrants"
              label="Use Access Grants"
              checked={formData.accessGrants || false}
              onChange={handleCheckChange}
              disabled={!formData.lookml}
            />
            <FieldText
              prefix={"extenion"}
              name="userAttribute"
              label="Access Grant User Attribute"
              required
              value={formData.userAttribute || ""}
              onChange={handleChange}
              disabled={!(formData.lookml && formData.accessGrants)}
            />
            <Text>
              Required User Attributes:
              <pre style={{ fontSize: "10px", whiteSpace: "pre-wrap" }}>
                {extension.extensionSDK
                  .createSecretKeyTag("webhook_secret")
                  .replace(/[{}]/g, "")}
                {"\n"}
                {extension.extensionSDK
                  .createSecretKeyTag("personal_access_token")
                  .replace(/[{}]/g, "")}
                {"\n"}
                {formData.accessGrants && (
                  <>
                    {extension.extensionSDK
                      .createSecretKeyTag("client_id")
                      .replace(/[{}]/g, "")}
                    {"\n"}
                    {extension.extensionSDK
                      .createSecretKeyTag("client_secret")
                      .replace(/[{}]/g, "")}
                    {"\n"}
                  </>
                )}
              </pre>
            </Text>
            <FieldText
              name="override_api"
              label="Override API"
              value={formData.override_api || ""}
              onChange={handleChange}
            />
            <Button type="submit">Save Configuration</Button>
          </SpaceVertical>
        </Form>
        <SpaceVertical gap="small"></SpaceVertical>
      </Box>
    );
  }
};

export default ConfigForm;
