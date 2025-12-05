export const getArtifactKey = (
    user_id: string,
    uuid: string,
    explore_ids: string[],
) => {
    return [user_id, uuid, 'explore_ids', explore_ids.join(',')].join('::');
};

export const searchArtifactKey = ({
    user_id,
    explore_ids,
    uuid,
}: {
    user_id?: string;
    explore_ids?: string[];
    uuid?: string;
}) => {
    const key = getArtifactKey(
        user_id?.length ? user_id : '*',
        uuid?.length ? uuid : '*',
        explore_ids?.length ? explore_ids : ['*'],
    );
    return key;
};
