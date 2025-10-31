import {
  Box,
  Button,
  ButtonGroup,
  ButtonItem,
  ButtonOutline,
  ButtonToggle,
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
import { ModelConnectionCache, useAppContext } from "../AppContext";
import useExtensionSdk from "../hooks/useExtensionSdk";
import { ConfigData, ConfigFormData, useSettings } from "../SettingsContext";
import { getConnectionModel } from "../utils";
import CachedModelConnectionPopover from "./CachedModelConnectionPopover";

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
    // @ts-expect-error - repoName and projectName are legacy fields
    repo_name: config.repo_name || config.repoName || "",
    // @ts-expect-error - repoName and projectName are legacy fields
    project_name: config.project_name || config.projectName || "",
    includes: config.includes || "",
    access_grants: config.access_grants || false,
    user_attribute: config.user_attribute || "",
    user_commit_comment: config.user_commit_comment || [],
    override_api: config.override_api || "",
    connection_model_mapping: config.connection_model_mapping || {},
    restrict_settings: config.restrict_settings || false,
    settings_group_ids: config.settings_group_ids || [],
    use_cached_model_explore_connections:
      config.use_cached_model_explore_connections || false,
    cached_model_connection_data:
      config.cached_model_connection_data || undefined,
    remove_branded_loading: config.remove_branded_loading || false,
    display_loading_status: config.display_loading_status || false,
    create_measures: config.create_measures || false,
    collapse_connection: config.collapse_connection || false,
    collapse_connection_name: config.collapse_connection_name || "",
    collapse_connection_model_name: config.collapse_connection_model_name || "",
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
    if (values.collapse_connection) {
      if (!values.collapse_connection_model_name?.length) {
        errors.collapse_connection_model_name =
          "Universal Connection Model Name is required";
      }
      if (!values.collapse_connection_name?.length) {
        errors.collapse_connection_name =
          "Universal Connection Name is required";
      } else if (
        connections!.find((c) => c.name === values.collapse_connection_name)
      ) {
        errors.collapse_connection_name = `Could not find connection ${values.collapse_connection_name}`;
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
                    When enabled, only users in the specified groups or admins
                    can access these settings.
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
                      <FieldCheckbox
                        name="create_measures"
                        label="Create Measures"
                        checked={values.create_measures}
                        onChange={(e) =>
                          setFieldValue("create_measures", e.target.checked)
                        }
                      />
                      {/* Single Connection Mode Toggle */}
                      <SpaceVertical gap="small">
                        <Label>Connection Mode</Label>
                        <ButtonToggle
                          value={
                            values.collapse_connection ? "single" : "multiple"
                          }
                          onChange={(selectedValue: string) => {
                            const isSingle = selectedValue === "single";
                            setFieldValue("collapse_connection", isSingle);
                          }}
                        >
                          <ButtonItem value="multiple">
                            Keep Original Connection
                          </ButtonItem>
                          <ButtonItem value="single">
                            Universal Connection
                          </ButtonItem>
                        </ButtonToggle>
                      </SpaceVertical>

                      {/* Conditional rendering based on collapse connection mode */}
                      {values.collapse_connection ? (
                        <>
                          <FieldText
                            name="collapse_connection_name"
                            label="Universal Connection Name"
                            required
                            value={values.collapse_connection_name || ""}
                            defaultValue={connections?.[0]?.name || ""}
                            onChange={(e) =>
                              setFieldValue(
                                "collapse_connection_name",
                                e.target.value
                              )
                            }
                            placeholder="Enter model name for the collapse connection setting"
                          />
                          <FieldText
                            name="collapse_connection_model_name"
                            label="Universal Connection Model Name"
                            required
                            value={values.collapse_connection_model_name || ""}
                            onChange={(e) =>
                              setFieldValue(
                                "collapse_connection_model_name",
                                e.target.value
                              )
                            }
                            placeholder="Enter model name for the all connections setting"
                          />
                        </>
                      ) : (
                        <>
                          <Label>Connection Model Mapping</Label>
                          <StyledSpaceVertical gap="small" pl="small">
                            {connections.map((connection) => {
                              const conn_name = connection.name || "";
                              const model_name = getConnectionModel(
                                conn_name,
                                values.connection_model_mapping,
                                values.collapse_connection,
                                values.collapse_connection_model_name
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
                        </>
                      )}
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
                      {Boolean(values.access_grants) && (
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
                      )}
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
                  <Space>
                    <FieldCheckbox
                      name="use_cached_model_explore_connections"
                      label="Use Cached Model Connection"
                      checked={values.use_cached_model_explore_connections}
                      onChange={(e) =>
                        setFieldValue(
                          "use_cached_model_explore_connections",
                          e.target.checked
                        )
                      }
                    />
                    {values.use_cached_model_explore_connections && (
                      <CachedModelConnectionPopover
                        cached_model_connection_data={
                          values.cached_model_connection_data
                        }
                        updateModelConnection={(model_connection) => {
                          const connections = Object.entries(
                            model_connection
                          ).reduce((acc, [model, connection]) => {
                            if (acc[connection]) {
                              acc[connection].push(model);
                            } else {
                              acc[connection] = [model];
                            }
                            return acc;
                          }, {} as ModelConnectionCache["values"]);
                          setFieldValue("cached_model_connection_data", {
                            values: connections,
                            expires_at: new Date(
                              Date.now() + 1000 * 60 * 60 * 24 * 365 * 10 // 10 years
                            ).toISOString(),
                          });
                        }}
                      />
                    )}
                  </Space>
                  <FieldCheckbox
                    name="remove_branded_loading"
                    label="Remove Branded Loading"
                    checked={values.remove_branded_loading}
                    onChange={(e) =>
                      setFieldValue(
                        "remove_branded_loading",
                        e.target.checked
                      )
                    }
                  />
                  <FieldCheckbox
                    name="display_loading_status"
                    label="Display Loading Status"
                    checked={values.display_loading_status}
                    onChange={(e) =>
                      setFieldValue(
                        "display_loading_status",
                        e.target.checked
                      )
                    }
                  />
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
