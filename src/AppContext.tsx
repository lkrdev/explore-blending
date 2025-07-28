import { ILookmlModelExploreField, IUser } from "@looker/sdk";
import get from "lodash/get";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import { useBoolean } from "usehooks-ts";
import useExtensionSdk from "./hooks/useExtensionSdk";
import useSdk from "./hooks/useSdk";

interface ILookerExplore {
  name: string;
  label: string;
  hidden: boolean;
}

export interface ILookerModel {
  name: string;
  label: string;
  explores: ILookerExplore[];
}

type Model = string;
type Connection = string;
export type ModelConnections = {
  [key: Model]: Connection;
};
export type ModelConnectionCache = {
  values: { [key: Connection]: Model[] };
  expires_at: string;
};

// Empty interface to start with - add your state types here
interface IAppContext {
  models: ILookerModel[];
  getExploreFields: (
    explore_id: string
  ) => Promise<{ [key: string]: IExploreField }>;
  getExploreField: (explore_id: string, field_id: string) => IExploreField;
  user: IUser | undefined;
  is_admin: boolean;
  updateModelConnections: (model: string, connection: string) => void;
  model_connections: ModelConnections;
  getModelConnection: (
    explore_id: string,
    update?: boolean
  ) => Promise<string | undefined>;
  getModelConnectionPromise: (explore_id: string) => Promise<{
    connection: string;
    model: string;
    explore: string;
    explore_id: string;
  }>;
  ready: boolean;
  status: string[];
  setModelConnections: React.Dispatch<React.SetStateAction<ModelConnections>>;
}

// Create the context
export const AppContext = createContext<IAppContext | undefined>(undefined);

// Custom hook for using the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};

// Context Provider component
export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const ready = useBoolean(false);
  const [status, setStatus] = useState<string[]>([]);
  const extension = useExtensionSdk();
  // Add your state management here using useState or useReducer
  const [models, setModels] = useState<ILookerModel[]>([]);
  const [explore_fields, setExploreFields] = useState<{
    [key: string]: { [key: string]: IExploreField };
  }>({});

  const [model_connections, setModelConnections] = useState<ModelConnections>(
    {}
  );

  const updateModelConnections = (model: Model, connection: Connection) => {
    let new_connections: ModelConnections = {
      [model]: connection,
    };
    new_connections[model] = connection;
  };

  useEffect(() => {
    if (Object.keys(model_connections).length > 0) {
      cacheModelConnections(model_connections);
    }
  }, [model_connections]);

  const sdk = useSdk();

  useEffect(() => {
    getExplores();
  }, []);

  const me = useSWR("me", () => sdk.ok(sdk.me()));

  const is_admin = useMemo(() => {
    return Boolean(me?.data?.role_ids?.includes("2"));
  }, [me]);

  const getExploreFields = async (explore_id: string) => {
    if (explore_id) {
      const [model_name, explore_name] = explore_id.split("::");
      let new_fields: { [key: string]: IExploreField } = {};

      // adding try/catch around both sdk.lookml_model_explore calls to prevent
      // the full-screen crash caused by 404s or missing explores.
      let explore;
      try {
        const required_fields =
          "name,label,label_short,view_label,category,type";
        explore = await sdk.ok(
          sdk.lookml_model_explore({
            lookml_model_name: model_name,
            explore_name: explore_name,
            fields: `connection_name,fields(dimensions(${required_fields}),measures(${required_fields}))`,
          })
        );
      } catch (error) {
        console.warn("Failed to fetch explore fields for:", explore_id, error);
        return {};
      }

      ["dimensions", "measures"].forEach((type) => {
        const fields: ILookmlModelExploreField[] = get(
          explore,
          ["fields", type],
          []
        ) as ILookmlModelExploreField[];
        fields.forEach((f) => {
          new_fields[f.name || ""] = {
            explore_id,
            id: f.name || "",
            label: f.label || "",
            label_short: f.label_short || "",
            view_label: f.view_label || "",
            type: (f.category || "dimension") as "dimension" | "measure",
            lookml_type: f.type || "",
          };
        });
      });
      updateModelConnections(model_name, explore.connection_name || "");
      setExploreFields((p) => ({ ...p, [explore_id]: new_fields }));
      return new_fields;
    } else {
      return Promise.resolve(explore_fields[explore_id]);
    }
  };

  const getExploreField = (explore_id: string, field_id: string) => {
    return get(explore_fields, [explore_id, field_id]);
  };

  const cacheModelConnections = (m_connections: ModelConnections) => {
    const connections = Object.entries(m_connections).reduce(
      (acc, [model, connection]) => {
        if (acc[connection]) {
          acc[connection].push(model);
        } else {
          acc[connection] = [model];
        }
        return acc;
      },
      {} as ModelConnectionCache["values"]
    );
    const jsonString = JSON.stringify({
      values: connections,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(), // 8 hours
    });
    extension.localStorageSetItem("model_connections:0.0.2", jsonString);
  };

  const loadCachedModelConnections: () => Promise<{
    refresh: boolean;
    model_count: number;
  }> = async () => {
    let refresh = true;
    let model_count = 0;
    const cached_connections = await extension.localStorageGetItem(
      "model_connections:0.0.2"
    );
    if (cached_connections) {
      const { values: connections, expires_at }: ModelConnectionCache =
        JSON.parse(cached_connections);
      const model_connections = Object.entries(connections).reduce(
        (acc, [connection, models]) => {
          models.forEach((model: Model) => {
            acc[model] = connection;
          });
          return acc;
        },
        {} as ModelConnections
      );
      setModelConnections((p) => ({ ...p, ...model_connections }));
      // refresh if the cache is expired
      refresh = new Date(expires_at) < new Date() ? true : false;
      model_count = Object.keys(model_connections).length;
    }
    return { refresh, model_count };
  };

  const cacheModels = (models: ILookerModel[]) => {
    // Option 1: Minimized JSON (shorter property names)
    const minimized = models.map((model) => [
      model.name,
      model.label,
      model.explores?.map((e) => [e.name, e.label, e.hidden]),
    ]);

    // Option 2: Base64 encoded for even more compression
    const jsonString = JSON.stringify(minimized);
    extension.localStorageSetItem("models:0.0.2", jsonString);
  };

  const loadCachedModels = async () => {
    const cached_models = await extension.localStorageGetItem("models:0.0.2");
    let model_count = 0;
    let explore_count = 0;
    if (cached_models) {
      const minimized = JSON.parse(cached_models);
      const models = minimized.reduce((acc: ILookerModel[], m: any) => {
        const model: ILookerModel = {
          name: m[0],
          label: m[1],
          explores: (m[2] || []).map((e: any) => ({
            name: e[0],
            label: e[1],
            hidden: e[2],
          })),
        };
        model_count++;
        explore_count += model.explores.length;
        acc.push(model);
        return acc;
      }, [] as ILookerModel[]);
      setModels(models);
    }
    return {
      model_count,
      explore_count,
    };
  };

  const getExplores = async () => {
    let models_finished = false;
    let connections_finished = false;
    setStatus((p) => [...p, "Getting Explores"]);
    const cached_count = await loadCachedModels();
    if (cached_count.model_count) {
      setStatus((p) => [
        ...p,
        `Loaded ${cached_count.explore_count.toLocaleString()} explores from cache`,
      ]);
      models_finished = true;
    }
    const cached_model_connections = await loadCachedModelConnections();
    if (cached_model_connections?.model_count) {
      setStatus((p) => [
        ...p,
        `Loaded ${cached_model_connections.model_count.toLocaleString()} model connections from cache`,
      ]);
      connections_finished = true;
    }
    if (connections_finished && models_finished) {
      setStatus((p) => [
        ...p,
        "Done loading models, explores, and connections",
      ]);
      ready.setTrue();
    }
    const models = (await sdk.ok(
      sdk.all_lookml_models({
        fields: "name,label,explores(name,label,hidden)",
      })
    )) as ILookerModel[];
    if (!models_finished) {
      setStatus((p) => [
        ...p,
        `Loaded ${models.reduce(
          (acc, m) => acc + m.explores.length,
          0
        )} explores from the server`,
      ]);
      models_finished = true;
    }
    if (models?.length) {
      cacheModels(models);
      setModels(models);
      if (cached_model_connections.refresh) {
        if (!connections_finished) {
          setStatus((p) => [
            ...p,
            `Loading ${models.length.toLocaleString()} model connections from the server`,
          ]);
        }
        const all_model_connections = await Promise.all(
          models.map(async (model) => {
            let retrieved_model = false;
            while (model.explores.length > 0 && !retrieved_model) {
              const first_explore = model.explores.shift();
              try {
                const connection = await getModelConnectionPromise(
                  `${model.name}::${first_explore?.name}`
                );
                if (connection) {
                  retrieved_model = true;
                  return connection;
                }
              } catch (error) {
                console.error(
                  `Failed to get model connection for ${model.name}::${first_explore?.name}`,
                  error
                );
              }
            }
            if (!retrieved_model) {
              return Promise.resolve(null);
            }
          })
        );
        const mc = all_model_connections.reduce((acc, m) => {
          if (m) {
            acc[m.model] = m.connection;
          }
          return acc;
        }, {} as ModelConnections);
        setModelConnections((p) => ({ ...p, ...mc }));
        setStatus((p) => [
          ...p,
          `Loaded ${Object.keys(mc).length} model connections from the server`,
        ]);
      }
      setStatus((p) => {
        if (
          p[p.length - 1] === "Done loading models, explores, and connections"
        ) {
          return p;
        }
        return [...p, "Done loading models, explores, and connections"];
      });
    }
    ready.setTrue();
  };

  const getModelConnectionPromise = async (
    explore_id: string
  ): Promise<{
    connection: string;
    model: string;
    explore: string;
    explore_id: string;
  }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const [model, explore] = explore_id.split("::");
        const connection = (await getModelConnection(explore_id)) || "";
        return resolve({ connection, model, explore, explore_id });
      } catch (error) {
        return reject(error);
      }
    });
  };

  const getModelConnection = async (explore_id: string, update?: boolean) => {
    if (!explore_id) {
      return;
    }
    const [model, explore] = explore_id.split("::");
    const connection = get(model_connections, [model]);
    if (connection) {
      return connection;
    } else {
      const model_explore = await sdk.ok(
        sdk.lookml_model_explore({
          lookml_model_name: model || "",
          explore_name: explore || "",
        })
      );
      if (model_explore.connection_name) {
        if (update) {
          updateModelConnections(model, model_explore.connection_name || "");
        }

        return model_explore.connection_name || "";
      } else {
        console.error(
          `Failed to get model connection for ${explore_id}`,
          model_explore
        );
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        models,
        getExploreFields,
        getExploreField,
        user: me?.data,
        is_admin,
        updateModelConnections,
        model_connections,
        getModelConnection,
        getModelConnectionPromise,
        ready: ready.value,
        status,
        setModelConnections,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
