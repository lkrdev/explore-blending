import type { LookerEmbedExplore } from "@looker/embed-sdk";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import React, { useCallback, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import { EmbedContainer } from "../components/EmbedContainer";
import useExtensionSdk from "../hooks/useExtensionSdk";
import useSdk from "../hooks/useSdk";
import { useBlendedContext } from "./Context";
const EmbedExplore: React.FC<{
  explore_id: string;
  doneLoading?: () => void;
  startLoading?: () => void;
}> = ({ explore_id, doneLoading, startLoading }) => {
  const [explore, setExplore] = React.useState<LookerEmbedExplore>();
  const [debouncedQueryId, setDebouncedQueryId] = useDebounceValue<
    string | undefined
  >(undefined, 1000);
  const { setQuery } = useBlendedContext();
  const extension = useExtensionSdk();
  const sdk = useSdk();
  const hostUrl = extension?.lookerHostData?.hostUrl;

  const setupExplore = (explore: LookerEmbedExplore) => {
    setExplore(explore);
  };

  useEffect(() => {
    getQueryMetadata(debouncedQueryId || "");
  }, [debouncedQueryId]);

  const getQueryMetadata = async (qid: string) => {
    if (qid?.length) {
      const metadata = await sdk?.ok(sdk?.query(qid));

      setQuery(metadata);
    }
  };

  const onPageChanged = async (event: any) => {
    const url = new URL(event.page.absoluteUrl);
    const qid = url.searchParams.get("qid");
    setDebouncedQueryId(qid || "");
  };
  const embedCtrRef = useCallback((el) => {
    if (el && hostUrl) {
      startLoading?.();
      console.log({ hostUrl, explore_id });
      LookerEmbedSDK.init(hostUrl);
      LookerEmbedSDK.createExploreWithId(explore_id)
        .appendTo(el)
        .withParams({
          _theme: JSON.stringify({
            show_explore_title: false,
            show_explore_actions_button: false,
            show_dashboard_menu: false,
            background_color: "#FFFFFF",
          }),
        })
        .on("page:changed", onPageChanged)
        .on("explore:ready", () => {
          doneLoading?.();
        })
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
