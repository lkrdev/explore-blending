import snakeCase from "lodash/snakeCase";

export const getDefaultConnectionModel = (conn_name: string) => {
  return `blend_${snakeCase(conn_name)}`;
};

export const getConnectionModel = (
  conn_name: string,
  connnection_config_mapping: ConfigFormData["connection_model_mapping"]
) => {
  const found = connnection_config_mapping?.[conn_name];
  if (found?.model_name && found.model_name.length) {
    return found.model_name;
  } else {
    return getDefaultConnectionModel(conn_name);
  }
};
