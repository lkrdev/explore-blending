import { IDBConnection } from "@looker/sdk";
import { set } from "lodash";
import orderBy from "lodash/orderBy";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAppContext } from "./AppContext";
import useExtensionSdk from "./hooks/useExtensionSdk";
import useSdk from "./hooks/useSdk";
import { getConnectionModel, getUserCommitComment } from "./utils";

export interface ConfigData {
  project_name?: string;
  user_attribute?: string;
  repo_name?: string;
  lookml?: boolean;
  access_grants?: boolean;
  includes?: string;
  connection_model_mapping?: {
    [key: string]: { connection_name: string; model_name: string };
  };
  override_api?: string;
  user_commit_comment?: ("display_name" | "email" | "id")[];
  restrict_settings?: boolean;
  settings_group_ids?: string[];
}

interface ConfigFormData extends ConfigData {
  project_name: string;
  user_attribute: string;
  repo_name: string;
}

interface SettingsContextType {
  config: Partial<ConfigFormData> | undefined;
  connections: IDBConnection[];
  loading: boolean;
  saveConfig: (configData: Partial<ConfigFormData>) => Promise<void>;
  updateConfig: (updates: Partial<ConfigFormData>) => void;
  refreshConfig: () => Promise<void>;
  getUserCommitComment: (
    user: any,
    commentType: ("display_name" | "email" | "id")[]
  ) => string | undefined;
  canAccessSettings: (user: any) => boolean;
  getUserGroups: () => Promise<any[]>;
  checkCurrentUserCanUpdateSettings: (group_ids: string[]) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const intersection = (arr1: string[], arr2: string[]): string[] => {
  const set1 = new Set(arr1);
  return arr2.filter((item) => set1.has(item));
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [config, setConfig] = useState<Partial<ConfigFormData> | undefined>();
  const [connections, setConnections] = useState<IDBConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAppContext();
  const extension = useExtensionSdk();
  const sdk = useSdk();

  const refreshConfig = async () => {
    try {
      setLoading(true);
      await extension.refreshContextData();
      const contextData = await extension.getContextData();
      setConfig(contextData || {});

      const connectionsData = await sdk.ok(sdk.all_connections());
      setConnections(orderBy(connectionsData, "name"));
    } catch (error) {
      console.error("Error refreshing config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (configData: Partial<ConfigFormData>) => {
    try {
      let form_with_defaults = { ...configData };

      // Ensure all connections have model mappings
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

      await extension.saveContextData(form_with_defaults);
      await extension.refreshContextData();
      setConfig(form_with_defaults);
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  };

  const updateConfig = (updates: Partial<ConfigFormData>) => {
    setConfig((prev) => {
      if (!prev) {
        return updates;
      }
      return { ...prev, ...updates };
    });
  };

  const getUserCommitCommentHelper = (
    user: any,
    commentType: ("display_name" | "email" | "id")[]
  ) => {
    return getUserCommitComment(user, commentType);
  };

  const canAccessSettings = (user: any): boolean => {
    if (!config?.restrict_settings || !config?.settings_group_ids?.length) {
      return true;
    }

    if (!user?.group_ids?.length) {
      return false;
    }

    // Check if user belongs to any of the allowed groups
    return user.group_ids.some((groupId: string) =>
      config.settings_group_ids!.includes(groupId)
    );
  };

  const getUserGroups = async (): Promise<any[]> => {
    try {
      const groups = await sdk.ok(sdk.all_groups({}));
      return groups;
    } catch (error) {
      console.error("Error fetching user groups:", error);
      return [];
    }
  };

  const checkCurrentUserCanUpdateSettings = (group_ids: string[]) => {
    return intersection(group_ids, user?.group_ids || []).length > 0;
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const value: SettingsContextType = {
    config,
    connections,
    loading,
    saveConfig,
    updateConfig,
    refreshConfig,
    getUserCommitComment: getUserCommitCommentHelper,
    canAccessSettings,
    getUserGroups,
    checkCurrentUserCanUpdateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
