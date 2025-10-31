import React, { createContext, useContext, useState } from "react"
import { useBoolean } from "usehooks-ts"
import { useBlendContext } from "../Context"

type TToggle = false | "queries" | "joins" | "sql" | "blend"

interface IBlendButtonContext {
    toggle: TToggle
    setToggle: React.Dispatch<React.SetStateAction<TToggle>>
    invalid_joins: IQueryJoin[]
    invalid_joins_text: string
    disabled: boolean
}

const BlendButtonContext = createContext<IBlendButtonContext>({} as any)


export const useBlendButtonContext = () => {
    const ctx = useContext(BlendButtonContext)
    if (!ctx) throw new Error("useBlendButtonContext must be used within a BlendButtonProvider")
    return ctx
}

const BlendButtonProvider = ({ children }: { children: React.ReactNode }) => {
    const [toggle, setToggle] = useState<TToggle>(false)
    const loading = useBoolean(false)
    const { validateJoins, queries } = useBlendContext()
    const can_blend = queries.length > 1;
    const invalid_joins = validateJoins();
    const invalid_joins_text =
        invalid_joins.length > 0
            ? `Invalid joins: ${invalid_joins.map((j) => j.to_query_id).join(", ")}`
            : "";
    const disabled = !can_blend || loading.value || invalid_joins.length > 0;
    return <BlendButtonContext.Provider
        value={{
            toggle,
            setToggle,
            invalid_joins,
            invalid_joins_text,
            disabled
        }}
    >
        {children}
    </BlendButtonContext.Provider>

}

export default BlendButtonProvider;
