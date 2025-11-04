import { Heading, SpaceVertical } from '@looker/components';
import React from 'react';
import useJoinFields from '../hooks/useJoinFields';
import { useBlendContext } from './Context';
import JoinRow from './SelectedQuery/JoinRow';
import JoinTypeSelect from './SelectedQuery/JoinTypeSelect';
import { getExploreLabelFromFieldWithIndex } from '../utils/explore_label';

interface IAllJoins {}

const AllJoins = ({}: IAllJoins) => {
    const { queries, joins, updateJoin, updateJoinType } = useBlendContext();
    return (
        <SpaceVertical>
            {queries.slice(1).map((query, i) => {
                const join = joins[query.uuid];
                const { to_fields, from_fields } = useJoinFields(query);
                return (
                    <SpaceVertical key={query.uuid}>
                        <Heading as="h3">
                            {getExploreLabelFromFieldWithIndex(query, i + 1)}
                        </Heading>
                        <JoinTypeSelect
                            current={join.type}
                            updateJoinType={(t) =>
                                updateJoinType(join.to_query_id, t)
                            }
                        />
                        {join.joins.map((j, index) => (
                            <JoinRow
                                key={j.uuid}
                                join={j}
                                index={index}
                                is_last={index === join.joins.length - 1}
                                query={query} // Assumes selectedQuery is not null here
                                to_fields={to_fields} // Pass potentially empty fields if timeout occurred
                                from_fields={from_fields} // Pass potentially empty fields if timeout occurred
                                join_type={join.type}
                                join_length={join.joins.length}
                            />
                        ))}
                    </SpaceVertical>
                );
            })}
        </SpaceVertical>
    );
};

export default AllJoins;
