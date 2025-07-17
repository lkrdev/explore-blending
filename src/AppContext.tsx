import {
  ILookmlModel,
  ILookmlModelExplore,
  ILookmlModelExploreField,
  IUser,
} from "@looker/sdk";
import get from "lodash/get";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import useSdk from "./hooks/useSdk";

// Empty interface to start with - add your state types here
interface IAppContext {
  models: ILookmlModel[];
  getExploreFields: (
    explore_id: string
  ) => Promise<{ [key: string]: IExploreField }>;
  getExploreField: (explore_id: string, field_id: string) => IExploreField;
  user: IUser | undefined;
  connections: { [key: string]: string };
  is_admin: boolean;
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
  // Add your state management here using useState or useReducer
  const [models, setModels] = useState<ILookmlModel[]>([]);
  const [explore_fields, setExploreFields] = useState<{
    [key: string]: { [key: string]: IExploreField };
  }>({});

  const [connections, setConnections] = useState<{
    [key: string]: string;
  }>({});

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
      let new_fields: { [key: string]: IExploreField } = {};

      // adding try/catch around both sdk.lookml_model_explore calls to prevent
      // the full-screen crash caused by 404s or missing explores.
      let explore;
      try {
        const required_fields =
          "name,label,label_short,view_label,category,type";
        explore = await sdk.ok(
          sdk.lookml_model_explore({
            lookml_model_name: explore_id.split("::")[0],
            explore_name: explore_id.split("::")[1],
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
      setConnections((p) => ({
        ...p,
        [explore_id]: explore.connection_name || "",
      }));
      setExploreFields((p) => ({ ...p, [explore_id]: new_fields }));
      return new_fields;
    } else {
      return Promise.resolve(explore_fields[explore_id]);
    }
  };

  const getExploreField = (explore_id: string, field_id: string) => {
    return get(explore_fields, [explore_id, field_id]);
  };

  const getExplores = async () => {
    const models = await sdk.ok(sdk.all_lookml_models({}));
    if (models?.length) {
      setModels(models);
      const promises = models.reduce((acc, model) => {
        const first_explore = model.explores?.[0];
        if (first_explore && model.name && first_explore.name) {
          // adding try/catch around both sdk.lookml_model_explore calls to prevent
          // the full-screen crash caused by 404s or missing explores.
          acc.push(
            sdk
              .ok(
                sdk.lookml_model_explore({
                  lookml_model_name: model.name,
                  explore_name: first_explore.name,
                  fields: "connection_name",
                })
              )
              .catch((err) => {
                console.warn(
                  `Failed to fetch explore for model: ${model.name}, explore: ${first_explore.name}`,
                  err
                );
                return {} as ILookmlModelExplore;
              })
          );
        } else {
          acc.push(Promise.resolve({} as ILookmlModelExplore));
        }
        return acc;
      }, [] as Promise<ILookmlModelExplore>[]);
      const connections = await Promise.all(promises);
      const new_explore_connections: { [key: string]: string } = {};
      connections.forEach((c, i) => {
        const model = models[i];
        model.explores?.forEach((e) => {
          const explore_id = `${model.name}::${e.name}`;
          new_explore_connections[explore_id] = c.connection_name || "";
        });
      });
      setConnections(new_explore_connections);
    }
  };

  return (
    <AppContext.Provider
      value={{
        models,
        getExploreFields,
        getExploreField,
        user: me?.data,
        connections,
        is_admin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
