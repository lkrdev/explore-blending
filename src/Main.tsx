// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ComponentsProvider } from "@looker/components";
import React, { useEffect, useRef } from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import useSWR from "swr";
import { useBoolean } from "usehooks-ts";
import Blend from "./Blend";
import Blended from "./Blended";
import LkrLoading from "./components/LkrLoading";
import useSdk from "./hooks/useSdk";
import { useSettings } from "./SettingsContext";
/**

 * A simple component that uses the Looker SDK through the extension sdk to display a customized hello message.
 */
const Main: React.FC<{
  route: string;
  routeState: any;
}> = ({ route, routeState }) => {
  const sdk = useSdk();
  const me = useSWR("me", () => sdk.ok(sdk.me()));
  const loading = useBoolean(true);
  const config = useSettings()?.config;
  const wait = useBoolean(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!(me.isLoading || config === undefined || wait.value)) {
      loading.setFalse();
    }
  }, [me, config, wait.value]);

  useEffect(() => {
    loadTimeoutRef.current = setTimeout(() => {
      wait.setFalse();
    }, 1000);
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  if (loading.value) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <LkrLoading duration={750} />
      </div>
    );
  } else {
    return (
      <ComponentsProvider>
        {/* @ts-ignore */}
        <Switch>
          {/* @ts-ignore */}
          <Route exact path="/">
            {/* @ts-ignore */}
            <Redirect to="/blend" />
          </Route>
          {/* @ts-ignore */}
          <Route exact path="/blend">
            <Blend />
          </Route>
          {/* @ts-ignore */}
          <Route path="/blended/:slug">
            <Blended />
          </Route>
        </Switch>
      </ComponentsProvider>
    );
  }
};

export default Main;
