// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useState, MouseEvent, KeyboardEvent, useEffect, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import MuiMenuList from '@mui/material/MenuList';
import {PopoverOrigin} from '@mui/material/Popover';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getIsMobileView} from 'selectors/views/browser';
import {isAnyModalOpen} from 'selectors/views/modals';

import {openModal, closeModal} from 'actions/views/modals';

import {A11yClassNames} from 'utils/constants';

import CompassDesignProvider from 'components/compass_design_provider';
import GenericModal from 'components/generic_modal';

import {MuiMenuStyled} from './menu_styled';
import {MenuItem, Props as MenuItemProps} from './menu_item';

interface Props {
    id: MenuItemProps['id'];
    leadingElement?: MenuItemProps['leadingElement'];
    labels: MenuItemProps['labels'];
    trailingElements?: MenuItemProps['trailingElements'];
    isDestructive?: MenuItemProps['isDestructive'];

    // Menu props
    menuId: string;
    menuAriaLabel?: string;
    forceOpenOnLeft?: boolean; // Most of the times this is not needed, since submenu position is calculated and placed

    children: ReactNode;

}

export function SubMenu({id, leadingElement, labels, trailingElements, isDestructive, menuId, menuAriaLabel, forceOpenOnLeft, children, ...rest}: Props) {
    const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
    const isSubMenuOpen = Boolean(anchorElement);

    const isMobileView = useSelector(getIsMobileView);

    const anyModalOpen = useSelector(isAnyModalOpen);

    const dispatch = useDispatch();

    function handleSubMenuOpen(event: MouseEvent<HTMLLIElement>) {
        event.preventDefault();

        if (isMobileView) {
            dispatch(openModal<SubMenuModalProps>({
                modalId: menuId,
                dialogType: SubMenuModal,
                dialogProps: {
                    menuId,
                    menuAriaLabel,
                    children,
                },
            }));
        } else {
            setAnchorElement(event.currentTarget);
        }
    }

    function handleSubMenuClose(event: MouseEvent<HTMLLIElement>) {
        event.preventDefault();
        setAnchorElement(null);
    }

    // This handleKeyDown is on the menu item which opens the submenu
    function handleSubMenuParentItemKeyDown(event: KeyboardEvent<HTMLLIElement>) {
        if (event.key === 'ArrowRight' || event.key === 'Enter') {
            event.preventDefault();
            setAnchorElement(event.currentTarget);
        }
    }

    function handleSubMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // Stop the event from propagating upwards since that causes navigation to move by 2 items at a time
            event.stopPropagation();
        } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
            event.preventDefault();
            setAnchorElement(null);
        }
    }

    useEffect(() => {
        if (anyModalOpen && !isMobileView) {
            setAnchorElement(null);
        }
    }, [anyModalOpen, isMobileView]);

    const originOfAnchorAndTransform = useMemo(() => getOriginOfAnchorAndTransform(forceOpenOnLeft, anchorElement), [anchorElement]);

    const hasSubmenuItems = Boolean(children);
    if (!hasSubmenuItems) {
        return null;
    }

    const passedInTriggerButtonProps = {
        id,
        'aria-controls': menuId,
        'aria-haspopup': true,
        'aria-expanded': isSubMenuOpen,
        disableRipple: true,
        leadingElement,
        labels,
        trailingElements,
        isDestructive,
        onClick: handleSubMenuOpen,
    };

    if (isMobileView) {
        return (<MenuItem {...passedInTriggerButtonProps}/>);
    }

    return (
        <MenuItem
            {...passedInTriggerButtonProps}
            {...rest} // pass through other props which might be coming in from the material-ui
            onMouseEnter={handleSubMenuOpen}
            onMouseLeave={handleSubMenuClose}
            onKeyDown={handleSubMenuParentItemKeyDown}
        >
            <MuiMenuStyled
                id={menuId}
                anchorEl={anchorElement}
                open={isSubMenuOpen}
                aria-label={menuAriaLabel}
                className={A11yClassNames.POPUP}
                asSubMenu={true}
                anchorOrigin={originOfAnchorAndTransform.anchorOrigin}
                transformOrigin={originOfAnchorAndTransform.transformOrigin}
                sx={{pointerEvents: 'none'}} // disables the menu background wrapper for accessing submenu
            >
                <MuiMenuList
                    component='ul'
                    aria-hidden={true}
                    sx={{
                        pointerEvents: 'auto', // reset pointer events to default from here on
                        paddingTop: 0,
                        paddingBottom: 0,
                    }}
                    onKeyDown={handleSubMenuKeyDown}
                >
                    {children}
                </MuiMenuList>
            </MuiMenuStyled>
        </MenuItem>
    );
}

interface SubMenuModalProps {
    menuId: Props['menuId'];
    menuAriaLabel?: Props['menuAriaLabel'];
    children: Props['children'];
}

function SubMenuModal(props: SubMenuModalProps) {
    const dispatch = useDispatch();

    const theme = useSelector(getTheme);

    function handleModalClose() {
        dispatch(closeModal(props.menuId));
    }

    return (
        <CompassDesignProvider theme={theme}>
            <GenericModal
                id={props.menuId}
                ariaLabel={props.menuAriaLabel}
                onExited={handleModalClose}
                backdrop={true}
                className='menuModal'
            >
                <MuiMenuList
                    aria-hidden={true}
                    onClick={handleModalClose}
                >
                    {props.children}
                </MuiMenuList>
            </GenericModal>
        </CompassDesignProvider>
    );
}

const openAtLeft = {
    anchorOrigin: {
        vertical: 'top',
        horizontal: 'left',
    } as PopoverOrigin,
    transformOrigin: {
        vertical: 'top',
        horizontal: 'right',
    } as PopoverOrigin,
};

const openAtRight = {
    anchorOrigin: {
        vertical: 'top',
        horizontal: 'right',
    } as PopoverOrigin,
    transformOrigin: {
        vertical: 'top',
        horizontal: 'left',
    } as PopoverOrigin,
};

function getOriginOfAnchorAndTransform(forceOpenOnLeft = false, anchorElement: HTMLElement | null): {anchorOrigin: PopoverOrigin; transformOrigin: PopoverOrigin} {
    if (!anchorElement) {
        return openAtRight;
    }

    if (forceOpenOnLeft) {
        return openAtLeft;
    }

    if (window && window.innerWidth) {
        const windowWidth = window.innerWidth;
        const anchorElementLeft = anchorElement?.getBoundingClientRect()?.left ?? 0;
        const anchorElementRight = anchorElement?.getBoundingClientRect()?.right ?? 0;

        const leftSpace = anchorElementLeft;
        const rightSpace = windowWidth - anchorElementRight;

        if (rightSpace < leftSpace) {
            return openAtLeft;
        }

        return openAtRight;
    }

    return openAtRight;
}
