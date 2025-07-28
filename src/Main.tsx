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
import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import Blend from "./Blend";
import Blended from "./Blended";
/**

 * A simple component that uses the Looker SDK through the extension sdk to display a customized hello message.
 */
const Main: React.FC<{
  route: string;
  routeState: any;
}> = ({ route, routeState }) => {
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
};

export default Main;
