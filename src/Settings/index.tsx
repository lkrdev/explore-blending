import {
  Box,
  Button,
  ButtonGroup,
  ButtonItem,
  ButtonOutline,
  CodeBlock,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  FieldCheckbox,
  FieldText,
  IconButton,
  Label,
  Space,
  SpaceVertical,
  Span,
} from "@looker/components";
import { Settings as SettingsApplications } from "@styled-icons/material";
import { Formik } from "formik";
import React from "react";
import styled from "styled-components";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import useExtensionSdk from "../hooks/useExtensionSdk";
import { ConfigData, useSettings } from "../SettingsContext";
import { getConnectionModel } from "../utils";

const StyledSpaceVertical = styled(SpaceVertical)`
  border-left: 1px solid ${({ theme }) => theme.colors.key};
`;

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { user, is_admin } = useAppContext();
  const extension = useExtensionSdk();
  const {
    config,
    connections,
    loading,
    saveConfig,
    getUserCommitComment,
    checkCurrentUserCanUpdateSettings,
  } = useSettings();

  if (loading || !config) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose}>
        <DialogContent>
          <Box p="large">Loading...</Box>
        </DialogContent>
      </Dialog>
    );
  }

  const initialValues: ConfigData = {
    lookml: config.lookml || false,
    repo_name: config.repo_name || "",
    project_name: config.project_name || "",
    includes: config.includes || "",
    access_grants: config.access_grants || false,
    user_attribute: config.user_attribute || "",
    user_commit_comment: config.user_commit_comment || [],
    override_api: config.override_api || "",
    connection_model_mapping: config.connection_model_mapping || {},
    restrict_settings: config.restrict_settings || false,
    settings_group_ids: config.settings_group_ids || [],
  };

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      await saveConfig(values);
      onClose();
    } catch (error) {
      console.error("Error saving configuration:", error);
    }
  };

  const handleValidate = async (values: typeof initialValues) => {
    let errors: Partial<{ [key in keyof ConfigData]: string }> = {};
    if (values.restrict_settings) {
      if (!is_admin) {
        const check = checkCurrentUserCanUpdateSettings(
          values.settings_group_ids || []
        );
        if (!check) {
          errors.settings_group_ids = `Unable to update restrict settings as your user is not in the Group IDs and is not an admin. Your current group IDS are ${user?.group_ids?.join(
            ", "
          )}`;
        }
      }
    }
    return errors;
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width="600px" height="80vh">
      <DialogHeader>
        <Span fontSize="large" fontWeight="semiBold">
          Configuration Settings
        </Span>
      </DialogHeader>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validate={handleValidate}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({
          values,
          setFieldValue,
          handleSubmit: formikHandleSubmit,
          isSubmitting,
          errors,
        }) => {
          const show_lookml_settings = Boolean(values.lookml);
          return (
            <>
              <DialogContent>
                <SpaceVertical gap="xsmall">
                  <FieldCheckbox
                    name="restrict_settings"
                    label="Restrict Settings Access"
                    checked={values.restrict_settings}
                    onChange={(e) =>
                      setFieldValue("restrict_settings", e.target.checked)
                    }
                  />
                  {values.restrict_settings && (
                    <FieldText
                      name="settings_group_ids"
                      label="Allowed Group IDs (comma-separated)"
                      value={values.settings_group_ids?.join(", ") ?? ""}
                      onChange={(e) => {
                        const groupIds = e.target.value
                          .split(",")
                          .map((id) => id.trim())
                          .filter((id) => id.length > 0);
                        setFieldValue("settings_group_ids", groupIds);
                      }}
                      placeholder="e.g., 1, 2, 3"
                    />
                  )}
                  <Span fontSize="small" color="text2">
                    When enabled, only users in the specified groups can access
                    these settings.
                  </Span>
                  <Span fontSize="small" color="critical">
                    {errors.settings_group_ids ? errors.settings_group_ids : ""}
                  </Span>
                  <FieldCheckbox
                    name="lookml"
                    label="Use LookML"
                    checked={values.lookml}
                    onChange={(e) => setFieldValue("lookml", e.target.checked)}
                  />

                  {show_lookml_settings && (
                    <>
                      <FieldText
                        name="repo_name"
                        label="Repository Name for Blends"
                        required
                        value={values.repo_name}
                        onChange={(e) =>
                          setFieldValue("repo_name", e.target.value)
                        }
                        disabled={!values.lookml}
                      />
                      <FieldText
                        name="project_name"
                        label="Blend Project Name"
                        required
                        value={values.project_name}
                        onChange={(e) =>
                          setFieldValue("project_name", e.target.value)
                        }
                      />
                      <Label>Connection Model Mapping</Label>
                      <StyledSpaceVertical gap="small" pl="small">
                        {connections.map((connection) => {
                          const conn_name = connection.name || "";
                          const model_name = getConnectionModel(
                            conn_name,
                            values.connection_model_mapping
                          );
                          return (
                            <FieldText
                              key={conn_name}
                              label={conn_name}
                              required
                              value={model_name}
                              onChange={(e) => {
                                const new_value = e.target.value;
                                setFieldValue("connection_model_mapping", {
                                  ...values.connection_model_mapping,
                                  [conn_name]: {
                                    connection_name: conn_name,
                                    model_name: new_value,
                                  },
                                });
                              }}
                            />
                          );
                        })}
                      </StyledSpaceVertical>
                      <FieldText
                        name="includes"
                        label="Includes to put in the LookML file"
                        value={values.includes}
                        onChange={(e) =>
                          setFieldValue("includes", e.target.value)
                        }
                      />
                      <FieldCheckbox
                        name="access_grants"
                        label="Use Access Grants"
                        checked={values.access_grants}
                        onChange={(e) =>
                          setFieldValue("access_grants", e.target.checked)
                        }
                      />
                      <FieldText
                        prefix={"extension"}
                        name="user_attribute"
                        label="Access Grant User Attribute"
                        required
                        value={values.user_attribute}
                        onChange={(e) =>
                          setFieldValue("user_attribute", e.target.value)
                        }
                      />
                      <SpaceVertical gap="xxsmall">
                        <Label>User Commit Comment</Label>
                        <ButtonGroup
                          value={values.user_commit_comment}
                          onChange={(values: string[]) => {
                            setFieldValue(
                              "user_commit_comment",
                              values as ConfigFormData["user_commit_comment"]
                            );
                          }}
                        >
                          <ButtonItem value="display_name">
                            Display Name
                          </ButtonItem>
                          <ButtonItem value="email">Email</ButtonItem>
                          <ButtonItem value="id">ID</ButtonItem>
                        </ButtonGroup>
                        {values.user_commit_comment &&
                        values.user_commit_comment.length > 0 ? (
                          <CodeBlock border="none">
                            {getUserCommitComment(
                              user,
                              values.user_commit_comment
                            )}
                          </CodeBlock>
                        ) : (
                          ""
                        )}
                      </SpaceVertical>
                      <Span>
                        Required User Attributes:
                        <pre
                          style={{ fontSize: "10px", whiteSpace: "pre-wrap" }}
                        >
                          {extension
                            .createSecretKeyTag("webhook_secret")
                            .replace(/[{}]/g, "")}
                          {"\n"}
                          {extension
                            .createSecretKeyTag("personal_access_token")
                            .replace(/[{}]/g, "")}
                          {"\n"}
                          {values.access_grants && (
                            <>
                              {extension
                                .createSecretKeyTag("client_id")
                                .replace(/[{}]/g, "")}
                              {"\n"}
                              {extension
                                .createSecretKeyTag("client_secret")
                                .replace(/[{}]/g, "")}
                              {"\n"}
                            </>
                          )}
                        </pre>
                      </Span>
                      <FieldText
                        name="override_api"
                        label="Override API"
                        value={values.override_api}
                        onChange={(e) =>
                          setFieldValue("override_api", e.target.value)
                        }
                      />
                    </>
                  )}
                </SpaceVertical>
              </DialogContent>
              <DialogFooter>
                <Space between justify="end">
                  <Button
                    onClick={() => formikHandleSubmit()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Configuration"}
                  </Button>
                </Space>
              </DialogFooter>
            </>
          );
        }}
      </Formik>
    </Dialog>
  );
};

// Example component that shows how to use the ConfigForm modal
const SettingsButton: React.FC = () => {
  const openModal = useBoolean(false);
  const { can_update_settings } = useSettings();
  if (!can_update_settings) return null;
  // Check if current user can access settings

  return (
    <>
      <ButtonOutline onClick={openModal.setTrue}>Settings</ButtonOutline>
      <Settings isOpen={openModal.value} onClose={openModal.setFalse} />
    </>
  );
};

export const SettingsIconButton: React.FC = () => {
  const openModal = useBoolean(false);
  const { can_update_settings } = useSettings();
  if (!can_update_settings) return null;
  return (
    <>
      <IconButton
        icon={<SettingsApplications />}
        onClick={openModal.setTrue}
        label="Settings"
      />
      <Settings isOpen={openModal.value} onClose={openModal.setFalse} />
    </>
  );
};

export default SettingsButton;
