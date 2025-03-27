import { ILookmlModel } from "@looker/sdk";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useExtensionContext } from "./Main";

// Empty interface to start with - add your state types here
interface IAppContext {
  models: ILookmlModel[];
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
  const [explore_fields, setExploreFields] = useState<>([]);
  const extensionSdk = useExtensionContext();
  const sdk = extensionSdk.core40SDK;

  useEffect(() => {
    getExplores();
  }, []);

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
