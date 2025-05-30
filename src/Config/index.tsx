import {
  Box,
  Button,
  ButtonGroup,
  ButtonItem,
  CodeBlock,
  FieldCheckbox,
  FieldText,
  Form,
  Label,
  SpaceVertical,
  Text,
} from "@looker/components";
import { IDBConnection } from "@looker/sdk";
import { set } from "lodash";
import orderBy from "lodash/orderBy";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useAppContext } from "../AppContext";
import { useCore40SDK, useExtensionContext } from "../Main";
import { getConnectionModel, getUserCommitComment } from "../utils";

const StyledSpaceVertical = styled(SpaceVertical)`
  border-left: 1px solid ${({ theme }) => theme.colors.key};
`;

const ConfigForm: React.FC = () => {
  const [connections, setConnections] = useState<IDBConnection[]>([]);
  const { user } = useAppContext();
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
    let form_with_defaults = { ...formData };
    connections.forEach((connection) => {
      const conn_name = connection.name || "";
      set(form_with_defaults, "connection_model_mapping." + conn_name, {
        connection_name: conn_name,
        model_name: getConnectionModel(
          conn_name,
          form_with_defaults.connection_model_mapping
        ),
      });
    });
    e.preventDefault();
    e.stopPropagation();
    await extension.extensionSDK.saveContextData(form_with_defaults);
    await extension.extensionSDK.refreshContextData();
    setFormData(form_with_defaults);
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
                const conn_name = connection.name || "";
                const model_name = getConnectionModel(
                  conn_name,
                  formData.connection_model_mapping
                );
                return (
                  <FieldText
                    key={conn_name}
                    label={conn_name}
                    required
                    value={model_name}
                    onChange={(e) => {
                      const new_value = e.target.value;
                      setFormData({
                        ...formData,
                        // @ts-ignore
                        connection_model_mapping: {
                          ...formData.connection_model_mapping,
                          [conn_name]: {
                            connection_name: conn_name,
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
            <SpaceVertical gap="xxsmall">
              <Label>User Commit Comment</Label>
              <ButtonGroup
                value={formData.user_commit_comment}
                onChange={(values: string[]) => {
                  setFormData({
                    ...formData,
                    user_commit_comment:
                      values as ConfigFormData["user_commit_comment"],
                  });
                }}
              >
                <ButtonItem value="display_name">Display Name</ButtonItem>
                <ButtonItem value="email">Email</ButtonItem>
                <ButtonItem value="id">ID</ButtonItem>
              </ButtonGroup>
              {formData.user_commit_comment &&
              formData.user_commit_comment.length > 0 ? (
                <CodeBlock border="none">
                  {getUserCommitComment(user, formData.user_commit_comment)}
                </CodeBlock>
              ) : (
                ""
              )}
            </SpaceVertical>
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
