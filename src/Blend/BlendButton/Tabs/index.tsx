import { Tab2, Tabs2 } from '@looker/components';
import React from 'react';
import { useSettings } from '../../../SettingsContext';
import { TToggle, useBlendButtonContext } from '../BlendButtonContext';
import Joins from './Joins';
import Lookml from './Lookml';
import Queries from './Queries';
import Sql from './Sql';

type TabListType = Exclude<TToggle, false>;

const TABS: {
    id: TabListType;
    label: string;
    component: React.ReactNode;
}[] = [
    { id: 'queries', label: 'Queries', component: <Queries /> },
    { id: 'joins', label: 'Joins', component: <Joins /> },
    { id: 'sql', label: 'SQL', component: <Sql /> },
    { id: 'lookml', label: 'LookML', component: <Lookml /> },
];

export const SelectedTabComponent: Record<TabListType, React.ReactNode> =
    TABS.reduce(
        (acc, tab) => ({
            ...acc,
            [tab.id]: tab.component,
        }),
        {} as Record<TabListType, React.ReactNode>
    );

const TabsComponent = () => {
    const { toggle, setToggle } = useBlendButtonContext();
    const { config } = useSettings();

    const handleTabChange = (tabId: string) => {
        const validToggle: TToggle = (tabId as TToggle) || false;
        setToggle(validToggle);
    };

    return (
        <Tabs2 onTabChange={handleTabChange} tabId={toggle ? toggle : 'blend'}>
            {TABS.filter((tab) =>
                tab.id === 'lookml' ? config?.lookml : true
            ).map((tab) => (
                <Tab2 key={tab.id} id={tab.id as string} label={tab.label} />
            ))}
        </Tabs2>
    );
};

export default TabsComponent;
