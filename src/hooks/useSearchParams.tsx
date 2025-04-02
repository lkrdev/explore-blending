import { useEffect, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

export const useSearchParams = () => {
  const { search } = useLocation();
  const history = useHistory();
  const [search_params, setSearchParamsState] = useState<URLSearchParams>(
    new URLSearchParams(search)
  );

  const setSearchParams = (params: Record<string, string | undefined>) => {
    setSearchParamsState((prev: URLSearchParams) => {
      const newParams = new URLSearchParams(prev);
      Object.entries(params).forEach(([key, value]) => {
        if (value?.length) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      return newParams;
    });
  };

  useEffect(() => {
    history.push({ search: search_params.toString() });
  }, [search_params]);

  return { search_params, setSearchParams };
};
