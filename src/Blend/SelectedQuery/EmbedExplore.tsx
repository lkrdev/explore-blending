import type { LookerEmbedExplore } from "@looker/embed-sdk";
import { LookerEmbedSDK } from "@looker/embed-sdk";
import React, { useCallback, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import { EmbedContainer } from "../../components/EmbedContainer";
import { useExtensionContext } from "../../Main";
import { useBlendContext } from "../Context";
const EmbedExplore: React.FC<{
  initial_query_id: string;
  explore_id: string;
  uuid: string;
  explore_label: string;
  doneLoading?: () => void;
  startLoading?: () => void;
}> = ({
  initial_query_id,
  explore_id,
  uuid,
  explore_label,
  doneLoading,
  startLoading,
}) => {
  const { updateQuery } = useBlendContext();
  const [explore, setExplore] = React.useState<LookerEmbedExplore>();
  const [debouncedQueryId, setDebouncedQueryId] = useDebounceValue(
    initial_query_id,
    1000
  );
  const extensionContext = useExtensionContext();
  const sdk = extensionContext?.core40SDK;
  const hostUrl = extensionContext?.extensionSDK?.lookerHostData?.hostUrl;

  const setupExplore = (explore: LookerEmbedExplore) => {
    setExplore(explore);
  };

  useEffect(() => {
    getQueryMetadata(debouncedQueryId || "");
  }, [debouncedQueryId]);

  const getQueryMetadata = async (qid: string) => {
    const metadata = await sdk?.ok(sdk?.query(qid));
    let newQuery: IQuery = {
      uuid,
      query_id: qid,
      explore: {
        id: explore_id,
        label: explore_label,
      },
      fields: [],
    };
    if (metadata.fields?.length) {
      newQuery.fields = metadata.fields.map((field) => ({
        id: field,
        label: field,
        type: "dimension",
      }));
    }

    updateQuery(newQuery);
  };

  const onPageChanged = async (event: any) => {
    const url = new URL(event.page.absoluteUrl);
    const qid = url.searchParams.get("qid");
    setDebouncedQueryId(qid || "");
  };
  const embedCtrRef = useCallback((el) => {
    if (el && hostUrl) {
      startLoading?.();
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
