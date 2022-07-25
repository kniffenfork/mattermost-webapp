// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {AccountMultipleOutlineIcon, DotsVerticalIcon, TrashCanOutlineIcon} from '@mattermost/compass-icons/components';
import {Menu, Divider, IconButton, List, ListItem, ListItemButton, ListItemText, Typography} from '@mui/material';

// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';

import {Group, GroupPermissions} from '@mattermost/types/groups';

import NoResultsIndicator from 'components/no_results_indicator';
import {NoResultsVariant} from 'components/no_results_indicator/types';

import {ActionResult} from 'mattermost-redux/types/actions';
import {ModalData} from 'types/actions';
import {ModalIdentifiers} from 'utils/constants';
import ViewUserGroupModal from 'components/view_user_group_modal';
import ListItemIcon from '../../compass/list-item-icon/list-item-icon';
import MenuItem from '../../compass/menu-item/menu-item';
import LoadingScreen from '../../loading_screen';

export type Props = {
    groups: Group[];
    searchTerm: string;
    loading: boolean;
    groupPermissionsMap: Record<string, GroupPermissions>;
    onScroll: () => void;
    onExited: () => void;
    backButtonAction: () => void;
    actions: {
        archiveGroup: (groupId: string) => Promise<ActionResult>;
        openModal: <P>(modalData: ModalData<P>) => void;
    };
}

const UserGroupsList = React.forwardRef((props: Props, ref?: React.Ref<HTMLUListElement>) => {
    const {
        groups,
        searchTerm,
        loading,
        groupPermissionsMap,
        onScroll,
        backButtonAction,
        onExited,
        actions,
    } = props;

    const archiveGroup = useCallback(async (groupId: string) => {
        await actions.archiveGroup(groupId);
    }, [actions]);

    const goToViewGroupModal = useCallback((group: Group) => {
        actions.openModal({
            modalId: ModalIdentifiers.VIEW_USER_GROUP,
            dialogType: ViewUserGroupModal,
            dialogProps: {
                groupId: group.id,
                backButtonCallback: backButtonAction,
                backButtonAction: () => {
                    goToViewGroupModal(group);
                },
            },
        });
        onExited();
    }, [actions, backButtonAction, onExited]);

    if (loading) {
        return <LoadingScreen/>;
    }

    if (groups.length === 0 && !searchTerm) {
        return (
            <NoResultsIndicator
                variant={NoResultsVariant.UserGroups}
            />
        );
    }

    return (
        <List
            onScroll={onScroll}
            ref={ref}
        >
            {groups.map((group) => {
                const membersText = `${group.member_count} member${group.member_count > 1 ? 's' : ''}`;
                return (
                    <ListItemButton
                        key={group.id}
                        disableGutters={true}
                        dense={true}
                        onClick={() => {
                            goToViewGroupModal(group);
                        }}
                    >
                        <ListItem
                            secondaryAction={(
                                <GroupItemMenu
                                    group={group}
                                    viewGroup={goToViewGroupModal}
                                    archiveGroup={archiveGroup}
                                    groupPermissionsMap={groupPermissionsMap}
                                />
                            )}
                        >
                            <ListItemText
                                disableTypography={true}
                                sx={{
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <Typography variant={'body1'}>{group.display_name}</Typography>
                                <Typography variant={'body2'}>{`@${group.name}`}</Typography>
                                <Typography
                                    variant={'body2'}
                                    sx={{marginLeft: 'auto', fontSize: '1.2rem'}}
                                >
                                    {membersText}
                                </Typography>
                            </ListItemText>
                        </ListItem>
                    </ListItemButton>
                );
            })}
        </List>
    );
});

type GroupItemMenuProps = {
    group: Group;
    archiveGroup: (groupId: string) => void;
    viewGroup: (group: Group) => void;
    groupPermissionsMap: Props['groupPermissionsMap'];
}

const GroupItemMenu = ({group, viewGroup, archiveGroup, groupPermissionsMap}: GroupItemMenuProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const open = Boolean(anchorEl);

    const handleClose = () => setAnchorEl(null);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    return (
        <>
            <IconButton
                size='small'
                onClick={handleClick}
                aria-controls={open ? 'demo-customized-menu' : undefined}
                aria-haspopup='true'
                aria-expanded={open ? 'true' : undefined}
            >
                <DotsVerticalIcon
                    size={18}
                    color={'currentColor'}
                />
            </IconButton>
            <Menu
                anchorOrigin={{
                    horizontal: 'right',
                    vertical: 'bottom',
                }}
                transformOrigin={{
                    vertical: -4,
                    horizontal: 'right',
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'demo-customized-button',
                }}
            >
                <MenuItem onClick={() => viewGroup(group)}>
                    <ListItemIcon position={'start'}>
                        <AccountMultipleOutlineIcon
                            size={18}
                            color={'currentColor'}
                        />
                    </ListItemIcon>
                    {'View Group'}
                </MenuItem>
                {groupPermissionsMap[group.id].can_delete && (
                    <>
                        <Divider/>
                        <MenuItem
                            destructive={true}
                            onClick={() => {
                                archiveGroup(group.id);
                            }}
                        >
                            <ListItemIcon position={'start'}>
                                <TrashCanOutlineIcon
                                    size={18}
                                    color={'currentColor'}
                                />
                            </ListItemIcon>
                            {'Archive Group'}
                        </MenuItem>
                    </>
                )}
            </Menu>
        </>
    );
};

export default React.memo(UserGroupsList);
