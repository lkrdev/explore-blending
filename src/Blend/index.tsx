import { Box, Flex, Heading, Space, Spinner } from "@looker/components";
import { uniq, uniqueId } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import LearnMoreInfoButton from "../components/Guide/LearnMoreInfoButton";
import { APP_NAME } from "../constants";
import { useSearchParams } from "../hooks/useSearchParams";
import { useCore40SDK } from "../Main";
import { BlendButton } from "./BlendButton";
import { BlendContextProvider, useBlendContext } from "./Context";
import NewExplore from "./NewExplore";
import NoQueries from "./NoQueries";
import { QueryList } from "./QueryList";
import SelectedQuery from "./SelectedQuery";
interface BlendProps {}

const Blend: React.FC<BlendProps> = () => {
  const { queries, selectedQuery } = useBlendContext();

  return (
    <Flex height="100%" width="100%" overflow="hidden">
      {/* Sidebar */}
      {queries.length > 0 && (
        <Flex
          width={300}
          p="large"
          style={{ borderRight: "1px solid #e1e1e1" }}
          flexDirection="column"
        >
          <Flex justifyContent="space-between">
            <Heading as="h3" mb="medium">
              {APP_NAME}
            </Heading>
            <LearnMoreInfoButton />
          </Flex>
          <Box flexGrow={1} height="100%" overflow="auto">
            <QueryList />
            <Space />
            <NewExplore />
          </Box>
          <Space />
          <BlendButton />
        </Flex>
      )}

      {/* Main Content */}
      <Box flex={1} height="100%" position="relative">
        {queries.length === 0 && <NoQueries />}
        {queries.length > 0 && Boolean(selectedQuery?.uuid) && (
          <SelectedQuery />
        )}
      </Box>
    </Flex>
  );
};

const BlendBase: React.FC = () => {
  const loading = useBoolean(true);
  const { search_params } = useSearchParams();
  const blend_data = search_params.get("b");
  const [hydratedBlendData, setHydratedBlendData] = useState<IBlendData>();
  const { models, getExploreFields, getExploreField } = useAppContext();
  const sdk = useCore40SDK();
  useEffect(() => {
    if (models.length > 0) {
      getBlendQueries();
    }
  }, [models]);

  const explores = useMemo(() => {
    return models.reduce((acc, model) => {
      model.explores?.forEach((explore) => {
        const explore_id = `${model.name}::${explore.name}`;
        acc[explore_id] = {
          id: explore_id,
          label: explore.label!,
        };
      });
      return acc;
    }, {} as { [key: string]: { id: string; label: string } });
  }, [models]);

  const getBlendQueries = async () => {
    if (!blend_data) {
      loading.setFalse();
      return;
    } else {
      const blend_data_json = JSON.parse(atob(blend_data)) as {
        queries: string[];
        joins: ITranslatedJoin[];
      };

      const query_promises = blend_data_json.queries.map(
        async (query_id: string) => {
          return sdk.ok(sdk.query(query_id));
        }
      );
      const query_responses = await Promise.all(query_promises);
      const explores_ids = uniq(
        query_responses.map((q) => `${q.model}::${q.view}`)
      );
      const _explore_fields = await Promise.all(
        explores_ids.map(getExploreFields)
      );
      const fields = _explore_fields.reduce((acc, explore_fields, i) => {
        const explore_id = explores_ids[i];
        acc[explore_id] = explore_fields;
        return acc;
      }, {} as { [key: string]: { [key: string]: IExploreField } });
      const queries = query_responses.reduce((acc, q) => {
        const explore_id = `${q.model}::${q.view}`;
        const explore = explores[explore_id];
        const query_fields = (q.fields || []).map((f) => fields[explore_id][f]);

        if (!explore) {
          console.error(`Explore ${explore_id} not found`);
          return acc;
        } else {
          acc.push({
            uuid: uniqueId("queryy"),
            query_id: q.client_id!,
            explore: {
              id: explore.id,
              label: explore.label,
            },
            fields: query_fields,
          });
        }
        return acc;
      }, [] as (IQuery | undefined)[]);
      const translated_joins: { [key: string]: IQueryJoin } = {};
      blend_data_json.joins.forEach((join, i) => {
        if (join) {
          const query = queries[i];
          if (!query) {
            console.error(`Query ${i} not found`);
          } else {
            translated_joins[query.uuid] = {
              to_query_id: query.uuid,
              type: join.type,
              joins: join.joins.map((j) => ({
                uuid: uniqueId("joinn"),
                from_query_id: queries[j.from_query_index]?.uuid || "",
                to_query_id: query.uuid,
                from_field: j.from_field,
                to_field: j.to_field,
              })),
            };
          }
        }
      });
      setHydratedBlendData({
        queries: queries.filter((q) => !!q),
        joins: translated_joins,
      });
      loading.setFalse();
    }
  };

  if (loading.value) {
    return <Spinner />;
  } else {
    return (
      <BlendContextProvider blend_data={hydratedBlendData}>
        <Blend />
      </BlendContextProvider>
    );
  }
};

export default BlendBase;
