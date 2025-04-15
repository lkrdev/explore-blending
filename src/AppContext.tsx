import {
  ILookmlModel,
  ILookmlModelExplore,
  ILookmlModelExploreField,
  IUser,
} from "@looker/sdk";
import get from "lodash/get";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useExtensionContext } from "./Main";
import { Looker40SDK } from '@looker/sdk'; // Import SDK type

// Empty interface to start with - add your state types here
interface IAppContext {
  models: ILookmlModel[];
  getExploreFields: (
    explore_id: string
  ) => Promise<{ [key: string]: IExploreField }>;
  getExploreField: (explore_id: string, field_id: string) => IExploreField;
  user: IUser | undefined;
  connections: { [key: string]: string };
  sdk: Looker40SDK;
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
  const [user, setUser] = useState<IUser | undefined>(undefined);
  // { [explore_id]: connection_name }
  const [connections, setConnections] = useState<{
    [key: string]: string;
  }>({});
  const extensionSdk = useExtensionContext();
  const sdk = extensionSdk.core40SDK;

  useEffect(() => {
    getExplores();
    getUser();
  }, []);

  const getUser = async () => {
    const user = await sdk.ok(sdk.me());
    setUser(user);
  };

  const getExploreFields = async (explore_id: string) => {
    if (explore_id) {
      let new_fields: { [key: string]: IExploreField } = {};
      /* const explore = await sdk.ok(
        sdk.lookml_model_explore({
          lookml_model_name: explore_id.split("::")[0],
          explore_name: explore_id.split("::")[1],
          fields:
            "connection_name,fields(dimensions(name,label,category),measures(name,label,category))",
        })
      ); */

      // adding try/catch around both sdk.lookml_model_explore calls to prevent
      // the full-screen crash caused by 404s or missing explores.
      let explore;
      try {
        explore = await sdk.ok(
          sdk.lookml_model_explore({
            lookml_model_name: explore_id.split("::")[0],
            explore_name: explore_id.split("::")[1],
            fields:
              "connection_name,fields(dimensions(name,label,category),measures(name,label,category))",
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
            type: (f.category || "dimension") as "dimension" | "measure",
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
          /* acc.push(
            sdk.ok(
              sdk.lookml_model_explore({
                lookml_model_name: model.name,
                explore_name: first_explore.name,
                fields: "connection_name",
              })
            )
          ); */

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
        user,
        connections,
        sdk: sdk,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
