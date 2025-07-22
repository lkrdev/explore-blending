import { IDBConnection } from "@looker/sdk";
import { set } from "lodash";
import orderBy from "lodash/orderBy";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  checkCurrentUserCanUpdateSettings: (group_ids: string[]) => boolean;
  can_update_settings: boolean;
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
  const { user, is_admin } = useAppContext();
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

  // Computed property that provides defaulted boolean values
  const config_data_with_defaults = useMemo(
    () => ({
      ...config,
      restrict_settings: config?.restrict_settings ?? false,
      settings_group_ids: config?.settings_group_ids ?? [],
    }),
    [config]
  );

  const can_update_settings = useMemo(() => {
    if (!config?.restrict_settings) {
      return true;
    } else if (is_admin) {
      return true;
    } else {
      return checkCurrentUserCanUpdateSettings(
        config?.settings_group_ids || []
      );
    }
  }, [is_admin, user, config?.restrict_settings, config?.settings_group_ids]);

  const saveConfig = async (configData: Partial<ConfigFormData>) => {
    if (!can_update_settings) {
      throw new Error("User does not have permission to update settings");
    }
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

  const checkCurrentUserCanUpdateSettings = (group_ids: string[]) => {
    return intersection(group_ids, user?.group_ids || []).length > 0;
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  const value: SettingsContextType = {
    config: config_data_with_defaults,
    connections,
    loading,
    saveConfig,
    updateConfig,
    refreshConfig,
    getUserCommitComment: getUserCommitCommentHelper,
    checkCurrentUserCanUpdateSettings,
    can_update_settings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
