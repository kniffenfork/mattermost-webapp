// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {ReactRenderer} from '@tiptap/react';
import {Mention} from '@tiptap/extension-mention';
import {SuggestionOptions} from '@tiptap/suggestion';
import {PluginKey} from 'prosemirror-state';

import SuggestionList, {SuggestionListProps, SuggestionListRef, SuggestionItem} from './suggestion-list';

const pluginName = 'emoji-suggestions';
const SuggestionPluginKey = new PluginKey(pluginName);

const suggestion: Omit<SuggestionOptions<SuggestionItem>, 'editor'> = {
    char: ':',

    pluginKey: SuggestionPluginKey,

    items: ({query}) => {
        return [
            'heart',
            'eyes',
            'smiley',
        ].
            filter((item) => item.toLowerCase().startsWith(query.toLowerCase())).
            map((name) => ({
                id: name.toLowerCase().replace(' ', '.'),
                label: name,
            })).
            slice(0, 10);
    },

    render: () => {
        let reactRenderer: ReactRenderer<SuggestionListRef>;
        let savedProps: SuggestionListProps;

        return {
            onStart: (props) => {
                savedProps = {
                    ...props,
                    visible: true,
                };
                reactRenderer = new ReactRenderer(SuggestionList, {
                    props: savedProps,
                    editor: props.editor,
                });
            },

            onUpdate(props) {
                savedProps = {...savedProps, ...props};
                reactRenderer.updateProps(savedProps);
            },

            onKeyDown(props) {
                if (props.event.key === 'Escape') {
                    savedProps = {...savedProps, visible: false};
                    reactRenderer.updateProps(savedProps);
                    return true;
                }
                return reactRenderer.ref?.onKeyDown(props) || false;
            },

            onExit() {
                reactRenderer.destroy();
            },
        };
    },
};

const EmojiSuggestions = Mention.extend({
    name: pluginName,
}).configure({
    HTMLAttributes: {
        class: 'emoji-suggestion',
    },
    renderLabel({options, node}) {
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
    },
    suggestion,
});

export default EmojiSuggestions;
