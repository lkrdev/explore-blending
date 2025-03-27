import { IDashboard, IQuery as IQuerySDK } from "@looker/sdk";
import React, { createContext, useContext, useState } from "react";

interface IBlendedContext {
  selected_dashboard: IDashboard | undefined;
  setSelectedDashboard: (dashboard: IDashboard) => void;
  query: IQuerySDK | undefined;
  setQuery: (query: IQuerySDK) => void;
}

export const BlendedContext = createContext<IBlendedContext | undefined>(
  undefined
);

export const useBlendedContext = () => {
  const context = useContext(BlendedContext);
  if (!context) {
    throw new Error(
      "useBlendedContext must be used within a BlendedContextProvider"
    );
  }
  return context;
};

export const BlendedContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Add state and functions here
  const [selected_dashboard, setSelectedDashboard] = useState<
    IDashboard | undefined
  >(undefined);
  const [query, setQuery] = useState<IQuerySDK | undefined>(undefined);
  return (
    <BlendedContext.Provider
      value={{
        selected_dashboard,
        setSelectedDashboard,
        query,
        setQuery,
      }}
    >
      {children}
    </BlendedContext.Provider>
  );
};
