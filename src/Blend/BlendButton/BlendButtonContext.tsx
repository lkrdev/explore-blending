import { set } from 'lodash';
import React, { createContext, useContext, useState } from 'react';
import { useBoolean } from 'usehooks-ts';
import { getRandomPrefix } from '../../utils/funPhrases';
import { STATUS_MESSAGES } from '../../utils/getBlend';
import { useBlendContext } from '../Context';

export type TToggle = false | 'queries' | 'joins' | 'sql' | 'lookml';

interface IBlendButtonContext {
    toggle: TToggle;
    setToggle: React.Dispatch<React.SetStateAction<TToggle>>;
    invalid_joins: IQueryJoin[];
    invalid_joins_text: string;
    disabled: boolean;
    loading: ReturnType<typeof useBoolean>;
    status: { key: string; message: string; done: boolean }[];
    addStatus: (status: keyof typeof STATUS_MESSAGES, done?: boolean) => void;
    resetStatus: () => void;
    error: string | undefined;
    setError: React.Dispatch<React.SetStateAction<string | undefined>>;
    success: boolean;
    setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

const BlendButtonContext = createContext<IBlendButtonContext>({} as any);

export const useBlendButtonContext = () => {
    const ctx = useContext(BlendButtonContext);
    if (!ctx)
        throw new Error(
            'useBlendButtonContext must be used within a BlendButtonProvider',
        );
    return ctx;
};

const BlendButtonProvider = ({ children }: { children: React.ReactNode }) => {
    const [toggle, setToggle] = useState<TToggle>(false);
    const loading = useBoolean(false);
    const { validateJoins, queries } = useBlendContext();
    const [status, setStatus] = useState<
        { key: string; message: string; done: boolean }[]
    >([]);
    const [error, setError] = useState<string | undefined>();
    const [success, setSuccess] = useState<boolean>(false);

    const addStatus = (
        statusKey: keyof typeof STATUS_MESSAGES,
        done: boolean = false,
    ) => {
        setStatus((p) => {
            const new_p = [...p];
            const index = new_p.findIndex((s) => s.key === statusKey);
            if (index > -1) {
                set(new_p, index, {
                    ...new_p[index],
                    done,
                });
            } else {
                new_p.push({
                    key: statusKey,
                    message: `${getRandomPrefix()} ${
                        STATUS_MESSAGES[statusKey]
                    }`,
                    done,
                });
            }
            return new_p;
        });
    };

    const resetStatus = () => {
        setStatus([]);
    };

    const can_blend = queries.length > 1;
    const invalid_joins = validateJoins();
    const invalid_joins_text =
        invalid_joins.length > 0
            ? `Invalid joins: ${invalid_joins
                  .map((j) => j.to_query_id)
                  .join(', ')}`
            : '';
    const disabled = !can_blend || loading.value || invalid_joins.length > 0;
    return (
        <BlendButtonContext.Provider
            value={{
                toggle,
                setToggle,
                invalid_joins,
                invalid_joins_text,
                disabled,
                loading,
                status,
                addStatus,
                resetStatus,
                error,
                setError,
                success,
                setSuccess,
            }}
        >
            {children}
        </BlendButtonContext.Provider>
    );
};

export default BlendButtonProvider;
