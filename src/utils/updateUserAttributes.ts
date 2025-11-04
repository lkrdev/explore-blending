import { ExtensionSDK } from '@looker/extension-sdk';
import {
    API_URL,
    CLIENT_ID_USER_ATTRIBUTE,
    CLIENT_SECRET_USER_ATTRIBUTE,
} from '../constants';

interface IUpdateUserAttributes {
    extension: ExtensionSDK;
    user_attribute_name: string;
    override_api?: string;
}

export type TUpdateUserAttributes = (params: IUpdateUserAttributes) => Promise<
    | { success: false; error: string }
    | {
          success: boolean;
          number_of_users_updated?: number;
          number_of_users?: number;
          erroring_users?: {
              user_id: string;
              error: string;
              group_ua_value: string;
          }[];
      }
>;
export const updateUserAttributes: TUpdateUserAttributes = async ({
    extension,
    user_attribute_name,
    override_api,
}) => {
    const url = (override_api || API_URL) + '/update_user_attributes';
    const response = await extension.serverProxy(url, {
        method: 'POST',
        body: JSON.stringify({ user_attribute: user_attribute_name }),
        headers: {
            'Content-Type': 'application/json',
            'x-base-url': extension.lookerHostData?.hostOrigin || '',
            'x-client-id': extension.createSecretKeyTag(
                CLIENT_ID_USER_ATTRIBUTE
            ),
            'x-client-secret': extension.createSecretKeyTag(
                CLIENT_SECRET_USER_ATTRIBUTE
            ),
        },
    });
    const { ok, error, ...data } = await response.body;
    return { success: ok, ...data, error: error || undefined };
};
