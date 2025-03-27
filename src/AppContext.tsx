import { ILookmlModel, ILookmlModelExploreField } from "@looker/sdk";
import get from "lodash/get";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useExtensionContext } from "./Main";

// Empty interface to start with - add your state types here
interface IAppContext {
  models: ILookmlModel[];
  getExploreFields: (
    explore_id: string
  ) => Promise<{ [key: string]: IExploreField }>;
  getExploreField: (explore_id: string, field_id: string) => IExploreField;
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
  const extensionSdk = useExtensionContext();
  const sdk = extensionSdk.core40SDK;

  useEffect(() => {
    getExplores();
  }, []);

  const getExploreFields = async (explore_id: string) => {
    if (explore_id) {
      let new_fields: { [key: string]: IExploreField } = {};
      const explore = await sdk.ok(
        sdk.lookml_model_explore(
          explore_id.split("::")[0],
          explore_id.split("::")[1],
          ""
        )
      );
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
            type: (f.type || "dimension") as "dimension" | "measure",
          };
        });
      });
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
    }
  };

  return (
    <AppContext.Provider
      value={{
        models,
        getExploreFields,
        getExploreField,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
