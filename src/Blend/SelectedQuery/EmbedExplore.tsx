import type { LookerEmbedExplore } from "@looker/embed-sdk";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import React, { useCallback } from "react";
import { EmbedContainer } from "../../components/EmbedContainer";
import { useExtensionContext } from "../../Main";

const EmbedExplore: React.FC<{
  initial_query_id: string;
  explore_id: string;
}> = ({ initial_query_id, explore_id }) => {
  const [explore, setExplore] = React.useState<LookerEmbedExplore>();
  const extensionContext = useExtensionContext();

  const setupExplore = (explore: LookerEmbedExplore) => {
    setExplore(explore);
  };
  const updateQid = (qid: string) => {
    if (explore) {
      explore.updateQueryId(qid);
    }
  };
  const embedCtrRef = useCallback((el) => {
    const hostUrl = extensionContext?.extensionSDK?.lookerHostData?.hostUrl;
    console.log({ initial_query_id, explore_id, hostUrl, el });
    if (el && hostUrl) {
      LookerEmbedSDK.init(hostUrl);
      LookerEmbedSDK.createExploreWithId(explore_id)
        .appendTo(el)
        .withParams({
          qid: initial_query_id,
          _theme: JSON.stringify({
            show_explore_title: false,
            show_explore_actions_button: false,
            show_dashboard_menu: false,
            background_color: "#FFFFFF",
          }),
        })
        .on("page:changed", console.log)
        .build()
        .connect()
        .then(setupExplore)
        .catch((error: Error) => {
          console.error("Connection error", error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EmbedContainer ref={embedCtrRef} />
    </>
  );
};

export default EmbedExplore;
