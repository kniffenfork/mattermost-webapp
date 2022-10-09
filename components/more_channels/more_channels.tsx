// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';

import {ActionResult} from 'mattermost-redux/types/actions';
import {Channel, ChannelMembership, ChannelStats} from '@mattermost/types/channels';
import Permissions from 'mattermost-redux/constants/permissions';

import {RelationOneToOne} from '@mattermost/types/utilities';

import NewChannelModal from 'components/new_channel_modal/new_channel_modal';
import SearchableChannelList from 'components/searchable_channel_list.jsx';
import TeamPermissionGate from 'components/permissions_gates/team_permission_gate';
import GenericModal from 'components/generic_modal';
import LoadingScreen from 'components/loading_screen';

import {ModalData} from 'types/actions';

import BrowserStore from 'stores/browser_store';

import {browserHistory} from 'utils/browser_history';
import {ModalIdentifiers, StoragePrefixes} from 'utils/constants';
import {getRelativeChannelURL} from 'utils/url';

import './more_channels.scss';

const CHANNELS_CHUNK_SIZE = 50;
const CHANNELS_PER_PAGE = 50;
const SEARCH_TIMEOUT_MILLISECONDS = 100;

type Actions = {
    getChannels: (teamId: string, page: number, perPage: number) => void;
    getArchivedChannels: (teamId: string, page: number, channelsPerPage: number) => void;
    joinChannel: (currentUserId: string, teamId: string, channelId: string) => Promise<ActionResult>;
    searchMoreChannels: (term: string, shouldShowArchivedChannels: boolean, shouldHideJoinedChannels: boolean) => Promise<ActionResult>;
    openModal: <P>(modalData: ModalData<P>) => void;
    closeModal: (modalId: string) => void;
    getChannelStats: (channelId: string) => void;
}

export type Props = {
    channels: Channel[];
    archivedChannels: Channel[];
    currentUserId: string;
    teamId: string;
    teamName: string;
    channelsRequestStarted?: boolean;
    canShowArchivedChannels?: boolean;
    morePublicChannelsModalType?: string;
    myChannelMemberships: RelationOneToOne<Channel, ChannelMembership>;
    allChannelStats: RelationOneToOne<Channel, ChannelStats>;
    actions: Actions;
}

type State = {
    shouldShowArchivedChannels: boolean;
    search: boolean;
    searchedChannels: Channel[];
    serverError: React.ReactNode | string;
    searching: boolean;
    searchTerm: string;
    loading: boolean;
    shouldHideJoinedChannels: boolean;
}

export default class MoreChannels extends React.PureComponent<Props, State> {
    public searchTimeoutId: number;

    constructor(props: Props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            shouldShowArchivedChannels: this.props.morePublicChannelsModalType === 'private',
            search: false,
            searchedChannels: [],
            serverError: null,
            searching: false,
            searchTerm: '',
            loading: true,
            shouldHideJoinedChannels: BrowserStore.getItem(StoragePrefixes.HIDE_JOINED_CHANNELS, 'false') === 'true',
        };
    }

    async componentDidMount() {
        await this.props.actions.getChannels(this.props.teamId, 0, CHANNELS_CHUNK_SIZE * 2);
        if (this.props.canShowArchivedChannels) {
            await this.props.actions.getArchivedChannels(this.props.teamId, 0, CHANNELS_CHUNK_SIZE * 2);
        }
        await this.props.channels.forEach((channel) => this.props.actions.getChannelStats(channel.id));
        this.loadComplete();
    }

    loadComplete = () => {
        this.setState({loading: false});
    }

    handleNewChannel = () => {
        this.handleExit();
        this.props.actions.openModal({
            modalId: ModalIdentifiers.NEW_CHANNEL_MODAL,
            dialogType: NewChannelModal,
        });
    }

    handleExit = () => {
        this.props.actions.closeModal(ModalIdentifiers.MORE_CHANNELS);
    }

    onChange = (force: boolean) => {
        if (this.state.search && !force) {
            return;
        }

        this.setState({
            searchedChannels: [],
            serverError: null,
        });
    }

    nextPage = (page: number) => {
        this.props.actions.getChannels(this.props.teamId, page + 1, CHANNELS_PER_PAGE);
    }

    handleJoin = async (channel: Channel, done: () => void) => {
        const {actions, currentUserId, teamId, teamName} = this.props;
        const result = await actions.joinChannel(currentUserId, teamId, channel.id);

        if (result.error) {
            this.setState({serverError: result.error.message});
        } else {
            browserHistory.push(getRelativeChannelURL(teamName, channel.name));
        }

        if (done) {
            done();
        }
    }

    search = (term: string) => {
        clearTimeout(this.searchTimeoutId);

        if (term === '') {
            this.onChange(true);
            this.setState({search: false, searchedChannels: [], searching: false, searchTerm: term});
            this.searchTimeoutId = 0;
            return;
        }
        this.setState({search: true, searching: true, searchTerm: term});

        const searchTimeoutId = window.setTimeout(
            async () => {
                try {
                    const {data} = await this.props.actions.searchMoreChannels(term, this.state.shouldShowArchivedChannels, this.state.shouldHideJoinedChannels);
                    if (searchTimeoutId !== this.searchTimeoutId) {
                        return;
                    }

                    if (data) {
                        this.setSearchResults(data);
                    } else {
                        this.setState({searchedChannels: [], searching: false});
                    }
                } catch (ignoredErr) {
                    this.setState({searchedChannels: [], searching: false});
                }
            },
            SEARCH_TIMEOUT_MILLISECONDS,
        );

        this.searchTimeoutId = searchTimeoutId;
    }

    setSearchResults = (channels: Channel[]) => {
        this.setState({searchedChannels: this.state.shouldShowArchivedChannels ? channels.filter((c) => c.delete_at !== 0) : channels.filter((c) => c.delete_at === 0), searching: false});
    }

    toggleArchivedChannels = (shouldShowArchivedChannels: boolean) => {
        // search again when switching channels to update search results
        this.search(this.state.searchTerm);
        this.setState({shouldShowArchivedChannels});
    }

    isMemberOfChannel(channelId: string) {
        return this.props.myChannelMemberships.hasOwnProperty(channelId);
    }

    handleShowJoinedChannelsPreference = (shouldHideJoinedChannels: boolean) => {
        // search again when switching channels to update search results
        this.search(this.state.searchTerm);
        this.setState({shouldHideJoinedChannels});
    }

    render() {
        const {
            channels,
            archivedChannels,
            teamId,
            channelsRequestStarted,
        } = this.props;

        const {
            search,
            searchedChannels,
            serverError: serverErrorState,
            searching,
            shouldShowArchivedChannels,
            shouldHideJoinedChannels,
        } = this.state;

        let activeChannels;
        const otherChannelsWithoutJoined = channels.filter((channel) => !this.isMemberOfChannel(channel.id));
        const archivedChannelsWithoutJoined = archivedChannels.filter((channel) => !this.isMemberOfChannel(channel.id));

        if (shouldShowArchivedChannels && shouldHideJoinedChannels) {
            activeChannels = search ? searchedChannels : archivedChannelsWithoutJoined;
        } else if (shouldShowArchivedChannels && !shouldHideJoinedChannels) {
            activeChannels = search ? searchedChannels : archivedChannels;
        } else if (!shouldShowArchivedChannels && shouldHideJoinedChannels) {
            activeChannels = search ? searchedChannels : otherChannelsWithoutJoined;
        } else {
            activeChannels = search ? searchedChannels : channels;
        }

        let serverError;
        if (serverErrorState) {
            serverError =
                <div className='form-group has-error'><label className='control-label'>{serverErrorState}</label></div>;
        }

        const createNewChannelButton = (
            <TeamPermissionGate
                teamId={teamId}
                permissions={[Permissions.CREATE_PUBLIC_CHANNEL]}
            >
                <button
                    type='button'
                    className='btn outlineButton'
                    onClick={this.handleNewChannel}
                >
                    <FormattedMessage
                        id='more_channels.create'
                        defaultMessage='Create New Channel'
                    />
                </button>
            </TeamPermissionGate>
        );

        const createChannelHelpText = (
            <TeamPermissionGate
                teamId={teamId}
                permissions={[Permissions.CREATE_PUBLIC_CHANNEL, Permissions.CREATE_PRIVATE_CHANNEL]}
            >
                <p className='secondary-message'>
                    <FormattedMessage
                        id='more_channels.createClick'
                        defaultMessage="Click 'Create New Channel' to make a new one"
                    />
                </p>
            </TeamPermissionGate>
        );

        const body = this.state.loading ? <LoadingScreen/> : (
            <React.Fragment>
                <SearchableChannelList
                    channels={activeChannels}
                    channelsPerPage={CHANNELS_PER_PAGE}
                    nextPage={this.nextPage}
                    isSearch={search}
                    search={this.search}
                    handleJoin={this.handleJoin}
                    noResultsText={createChannelHelpText}
                    loading={search ? searching : channelsRequestStarted}
                    toggleArchivedChannels={this.toggleArchivedChannels}
                    shouldShowArchivedChannels={this.state.shouldShowArchivedChannels}
                    canShowArchivedChannels={this.props.canShowArchivedChannels}
                    myChannelMemberships={this.props.myChannelMemberships} // todo sinan refactor to receive it directly from index
                    allChannelStats={this.props.allChannelStats} // todo sinan refactor to receive it directly from index
                    closeModal={this.props.actions.closeModal} // todo sinan refactor to receive it directly from index
                    hideJoinedChannelsPreference={this.handleShowJoinedChannelsPreference}
                />
                {serverError}
            </React.Fragment>
        );

        const title = (
            <FormattedMessage
                id='more_channels.title'
                defaultMessage='Browse Channels'
            />
        );

        return (
            <GenericModal
                onExited={this.handleExit}
                compassDesign={true}
                id='moreChannelsModal'
                aria-labelledby='moreChannelsModalLabel'
                modalHeaderText={title}
                headerButton={createNewChannelButton}
            >
                {body}
            </GenericModal>
        );
    }
}
