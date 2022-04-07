// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {memo, useState, useCallback} from 'react';

import {Modal} from 'react-bootstrap';

import { InsightsTimeFrames } from 'utils/constants';
import {localizeMessage} from 'utils/utils';
import TimeFrameDropdown from '../time_frame_dropdown/time_frame_dropdown';

import './../../activity_and_insights.scss';
import './insights_modal.scss';

type Props = {
    onExited: () => void;
    widgetType: 'TOP_CHANNELS' | 'TOP_REACTIONS';
    title: string;
}

const InsightsModal = (props: Props) => {
    const [show, setShow] = useState(true);
    const [timeFrame, setTimeFrame] = useState({
        value: InsightsTimeFrames.INSIGHTS_7_DAYS,
        label: localizeMessage('insights.timeFrame.mediumRange', 'Last 7 days'),
    });

    const setTimeFrameValue = useCallback((value) => {
        setTimeFrame(value);
    }, []);

    const doHide = useCallback(() => {
        setShow(false);
    }, []);

    return (
        <Modal
            dialogClassName='a11y__modal insights-modal'
            show={show}
            onHide={doHide}
            onExited={props.onExited}
            aria-labelledby='insightsModalLabel'
            id='insightsModal'
        >
            <Modal.Header closeButton={true}>
                <Modal.Title
                    componentClass='h1'
                    id='insightsModalTitle'
                >
                    {props.title}
                </Modal.Title>
                <TimeFrameDropdown
                    timeFrame={timeFrame}
                    setTimeFrame={setTimeFrameValue}
                />
            </Modal.Header>
            <Modal.Body
                className='overflow--visible'
            >
                
            </Modal.Body>
        </Modal>
    );
};

export default memo(InsightsModal);
