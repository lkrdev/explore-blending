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
import { ExtensionContext } from "@looker/extension-sdk-react";
import React, { useContext, useEffect, useState } from "react";
import { Route, Switch } from "react-router-dom";
import Blend from "./Blend";
/**

 * A simple component that uses the Looker SDK through the extension sdk to display a customized hello message.
 */
const Main: React.FC<{
  route: string;
  routeState: any;
}> = ({ route, routeState }) => {
  const { core40SDK } = useContext(ExtensionContext);
  const [message, setMessage] = useState("");
  console.log({ route, routeState });

  useEffect(() => {
    const getMe = async () => {
      try {
        const me = await core40SDK.ok(core40SDK.me());
        setMessage(`Hello, ${me.display_name}`);
      } catch (error) {
        console.error(error);
        setMessage("An error occurred while getting information about me!");
      }
    };
    getMe();
  }, []);

  return (
    <ComponentsProvider>
      {/* @ts-ignore */}
      <Switch>
        {/* @ts-ignore */}
        <Route exact path="/"></Route>
        {/* @ts-ignore */}
        <Route path="/blend">
          <Blend />
        </Route>
      </Switch>
    </ComponentsProvider>
  );
};

export const useExtensionContext = () => {
  return useContext(ExtensionContext);
};

export default Main;
