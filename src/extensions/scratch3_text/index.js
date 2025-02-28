const formatMessage = require('format-message');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const MathUtil = require('../../util/math-util');
const Timer = require('../../util/timer');


/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMjcuODM0IDlhMyAzIDAgMDEyLjU0NiAxLjQxMmwuMDk3LjE2Ny4wNTQuMTEuMDUyLjExMi4wNDguMTEyIDYuMjIyIDE2YTMuMDAxIDMuMDAxIDAgMDEtMi4yNyA0LjA0MWwtLjE4LjAyNS0uMTE1LjAxMS0uMTE2LjAwNy0uMTE1LjAwM2gtMS44NTVhMyAzIDAgMDEtMi41NDUtMS40MTJsLS4wOTYtLjE2Ny0uMTA3LS4yMjItLjA0OC0uMTExTDI4Ljk4MyAyOGgtNC45M2wtLjQyMiAxLjA4N2EzLjAwMyAzLjAwMyAwIDAxLTIuNDEgMS44ODlsLS4xOTMuMDE4LS4xOTQuMDA2LTEuOTQtLjAwMi0uMDk2LjAwMkg3YTMgMyAwIDAxLTIuODctMy44NzJsLjA3Mi0uMjA5IDYuMTgzLTE2YTMuMDAxIDMuMDAxIDAgMDEyLjYwNC0xLjkxM0wxMy4xODQgOWwzLjkuMDAxLjA5OS0uMDAxIDMuOTI0LjAwMi4wOTUtLjAwMiAzLjkwNS4wMDIuMDk1LS4wMDJoMi42MzJ6IiBmaWxsLW9wYWNpdHk9Ii4xNSIgZmlsbD0iIzAwMCIvPjxwYXRoIGQ9Ik0yNS42NjMgMjFsLjgxNi0yLjA5OS44MTYgMi4wOTloLTEuNjMyem0xMC4yNTggNi4yNzVsLTYuMjIzLTE2LS4wNzUtLjE2OC0uMDg1LS4xNDVjLS4zODctLjYxMS0xLjAxOS0uOTYyLTEuNzAzLS45NjJoLTIuNjMzbC0uMDk2LjAwMi0uMDYyLS4wMDFMMjEuMjAyIDEwbC0uMDk2LjAwMi0uMDYyLS4wMDFMMTcuMTgzIDEwbC0uMDg2LjAwMkwxMy4xODQgMTBsLS4xNjUuMDA3YTIuMDAzIDIuMDAzIDAgMDAtMS43MDIgMS4yNzJsLTYuMTgyIDE2LS4wNTkuMTc1QTIgMiAwIDAwNyAzMGgxMS43OThsLjA4OC0uMDAyIDEuOTQ5LjAwMi4xNjMtLjAwNy4xNjEtLjAxOWEyIDIgMCAwMDEuNTM5LTEuMjQ5bC42Ny0xLjcyNWg2LjI5OWwuNjcyIDEuNzI2LjA3NC4xNjcuMDg2LjE0NWMuMzg3LjYxMSAxLjAxOC45NjIgMS43MDMuOTYyaDEuODU1bC4xNzQtLjAwOS4xNjQtLjAyNGMuOTc2LS4xODcgMS42NjItMS4wMDMgMS42NjItMS45NjcgMC0uMjQ4LS4wNDYtLjQ5NC0uMTM2LS43MjV6IiBmaWxsLW9wYWNpdHk9Ii4yNSIgZmlsbD0iIzAwMCIvPjxwYXRoIGQ9Ik0xMy4xODMgMTFoMy44MThhMSAxIDAgMDEuOTQxIDEuMzM4bC01Ljc0MiAxNmExIDEgMCAwMS0uOTQuNjYySDdhMSAxIDAgMDEtLjkzMy0xLjM2bDYuMTgzLTE2YTEgMSAwIDAxLjkzMy0uNjR6IiBmaWxsPSIjNEM5N0ZGIi8+PHBhdGggZD0iTTE3LjE4MyAxMUgyMWExIDEgMCAwMS45NDIgMS4zMzhsLTUuNzQyIDE2YTEgMSAwIDAxLS45NDEuNjYyaC00LjI2YTEgMSAwIDAxLS45MzItMS4zNmw2LjE4My0xNmExIDEgMCAwMS45MzMtLjY0eiIgZmlsbD0iI0NGNjNDRiIvPjxwYXRoIGQ9Ik0yMS4yMDIgMTFIMjVhMSAxIDAgMDEuOTMzIDEuMzYxbC02LjIwMyAxNmExIDEgMCAwMS0uOTMyLjYzOUgxNWExIDEgMCAwMS0uOTMzLTEuMzYxbDYuMjAzLTE2YTEgMSAwIDAxLjkzMi0uNjM5eiIgZmlsbD0iI0ZGQkYwMCIvPjxwYXRoIGQ9Ik0yNy44MzQgMTFhMSAxIDAgMDEuOTMyLjYzOGw2LjIyMiAxNkExIDEgMCAwMTM0LjA1NiAyOWgtMS44NTRhMSAxIDAgMDEtLjkzMi0uNjM4TDMwLjM1MSAyNmgtNy42NjZsLS45MTkgMi4zNjJhMSAxIDAgMDEtLjkzMi42MzhIMTguOThhMSAxIDAgMDEtLjkzMi0xLjM2Mmw2LjIyMi0xNmExIDEgMCAwMS45MzItLjYzOHptLTEuMzE2IDUuMTQzTDI0LjI0IDIyaDQuNTU2bC0yLjI3OC01Ljg1N3oiIGZpbGw9IiNGRkYiLz48L2c+PC9zdmc+';
const menuIconURI = blockIconURI;

const DefaultText = 'Welcome to my project!';
const DefaultAnimateText = 'Here we go!';

const SANS_SERIF_ID = 'Sans Serif';
const SERIF_ID = 'Serif';
const HANDWRITING_ID = 'Handwriting';
const MARKER_ID = 'Marker';
const CURLY_ID = 'Curly';
const PIXEL_ID = 'Pixel';
const RANDOM_ID = 'Random';

class Scratch3TextBlocks {
    constructor (runtime) {
        /**
        * The runtime instantiating this block package.
        * @type {Runtime}
        */
        this.runtime = runtime;
		
        this._onTargetWillExit = this._onTargetWillExit.bind(this);
        this.runtime.on('targetWasRemoved', this._onTargetWillExit);
        this._onTargetCreated = this._onTargetCreated.bind(this);
        this.runtime.on('targetWasCreated', this._onTargetCreated);
        this.runtime.on('PROJECT_STOP_ALL', this.stopAll.bind(this));
    }
    static get STATE_KEY () {
        return 'Scratch.text';
    }
    static get DEFAULT_TEXT_STATE () {
        return ({skinId: null, text: 'Welcome to my project!', font: 'Handwriting', color: 'hsla(225, 15%, 40%, 1', size: 24, maxWidth: 480, align: 'center', strokeWidth: 0, strokeColor: 'black', rainbow: false, visible: false, targetSize: null, fullText: null});
    }
    getInfo () {
        return {
            id: 'text',
            name: 'Animated Text',
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [{
                opcode: 'setText',
                text: formatMessage({
                    id: 'text.setText',
                    default: 'show text [TEXT]',
                    description: ''
                }),
                blockType: BlockType.COMMAND,
                arguments: {
                    TEXT: {
                        type: ArgumentType.STRING,
                        defaultValue: DefaultText
                    }
                }
            }, {
                opcode: 'animateText',
                text: formatMessage({
                    id: 'text.animateText',
                    default: '[ANIMATE] text [TEXT]',
                    description: ''
                }),
                blockType: BlockType.COMMAND,
                arguments: {
                    ANIMATE: {
                        type: ArgumentType.STRING,
                        menu: 'ANIMATE',
                        defaultValue: 'rainbow'
                    },
                    TEXT: {
                        type: ArgumentType.STRING,
                        defaultValue: DefaultAnimateText
                    }
                }
            }, {
                opcode: 'clearText',
                text: formatMessage({
                    id: 'text.clearText',
                    default: 'show sprite',
                    description: ''
                }),
                blockType: BlockType.COMMAND,
                arguments: {}
            }, '---', {
                opcode: 'setFont',
                text: formatMessage({
                    id: 'text.setFont',
                    default: 'set font to [FONT]',
                    description: ''
                }),
                blockType: BlockType.COMMAND,
                arguments: {
                    FONT: {
                        type: ArgumentType.STRING,
                        menu: 'FONT',
                        defaultValue: 'Pixel'
                    }
                }
            }, {
                opcode: 'setColor',
                text: formatMessage({
                    id: 'text.setColor',
                    default: 'set text color to [COLOR]',
                    description: ''
                }),
                blockType: BlockType.COMMAND,
                arguments: {
                    COLOR: {
                        type: ArgumentType.COLOR
                    }
                }
            }, // {
            //     opcode: 'setSize',
            //     text: formatMessage({
            //         id: 'text.setSize',
            //         default: 'set text size to [SIZE]',
            //         description: ''
            //     }),
            //     blockType: BlockType.COMMAND,
            //     arguments: {
            //         SIZE: {
            //             type: ArgumentType.NUMBER,
            //             defaultValue: 30
            //         }
            //     }
            // },
            {
                opcode: 'setWidth',
                text: formatMessage({
                    id: 'text.setWidth',
                    default: 'set width to [WIDTH] aligned [ALIGN]',
                    description: ''
                }),
                blockType: BlockType.COMMAND,
                arguments: {
                    WIDTH: {
                        type: ArgumentType.NUMBER,
                        defaultValue: 200
                    },
                    ALIGN: {
                        type: ArgumentType.STRING,
                        defaultValue: 'left',
                        menu: 'ALIGN'
                    }
                }
            } // {
                //     opcode: 'setAlign',
                //     text: formatMessage({
                //         id: 'text.setAlign',
                //         default: 'align text [ALIGN] width [WIDTH]',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         ALIGN: {
                //             type: ArgumentType.STRING,
                //             defaultValue: 'left',
                //             menu: 'ALIGN'
                //         },
                //         WIDTH: {
                //             type: ArgumentType.NUMBER,
                //             defaultValue: 200
                //         }
                //     }
                // },
                // {
                //     opcode: 'rainbow',
                //     text: formatMessage({
                //         id: 'text.rainbow',
                //         default: 'rainbow for [SECS] seconds',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         SECS: {
                //             type: ArgumentType.NUMBER,
                //             defaultValue: 1
                //         }
                //     }
                // }
                // '---',
                // {
                //     opcode: 'addText',
                //     text: formatMessage({
                //         id: 'text.addText',
                //         default: 'add text [TEXT]',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         TEXT: {
                //             type: ArgumentType.STRING,
                //             defaultValue: ' and more!'
                //         }
                //     }
                // },
                // {
                //     opcode: 'addLine',
                //     text: formatMessage({
                //         id: 'text.addLine',
                //         default: 'add line [TEXT]',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         TEXT: {
                //             type: ArgumentType.STRING,
                //             defaultValue: 'more lines!'
                //         }
                //     }
                // },
                // '---',
                // {
                //     opcode: 'setOutlineWidth',
                //     text: formatMessage({
                //         id: 'text.setOutlineWidth',
                //         default: 'set outline width to [WIDTH]',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         WIDTH: {
                //             type: ArgumentType.NUMBER,
                //             defaultValue: 1
                //         }
                //     }
                // },
                // {
                //     opcode: 'setOutlineColor',
                //     text: formatMessage({
                //         id: 'text.setOutlineColor',
                //         default: 'set outline color to [COLOR]',
                //         description: ''
                //     }),
                //     blockType: BlockType.COMMAND,
                //     arguments: {
                //         COLOR: {
                //             type: ArgumentType.COLOR
                //         }
                //     }
                // }
            ],
            menus: {
                FONT: {
                    items: [{
                        text: 'Sans Serif',
                        value: SANS_SERIF_ID
                    }, {
                        text: 'Serif',
                        value: SERIF_ID
                    }, {
                        text: 'Handwriting',
                        value: HANDWRITING_ID
                    }, {
                        text: 'Marker',
                        value: MARKER_ID
                    }, {
                        text: 'Curly',
                        value: CURLY_ID
                    }, {
                        text: 'Pixel',
                        value: PIXEL_ID
                    }, {
                        text: 'random font',
                        value: RANDOM_ID
                    }]
                },
                ALIGN: {
                    items: [{
                        text: 'left',
                        value: 'left'
                    }, {
                        text: 'center',
                        value: 'center'
                    }, {
                        text: 'right',
                        value: 'right'
                    }]
                },
                ANIMATE: {
                    items: [{
                        text: 'type',
                        value: 'type'
                    }, {
                        text: 'rainbow',
                        value: 'rainbow'
                    }, {
                        text: 'zoom',
                        value: 'zoom'
                    }]
                }
            }
        };
    }
    setText (args, util) {
        const textState = this._getTextState(util.target);

        textState.text = this._formatText(args.TEXT);
        textState.visible = true;
        textState.animating = false;

        this._renderText(util.target); // Yield until the next tick.


        return Promise.resolve();
    }
    clearText (args, util) {
        const target = util.target;

        const textState = this._getTextState(target);

        textState.visible = false; // Set state so that clones can know not to render text

        textState.animating = false;
        const costume = target.getCostumes()[target.currentCostume];
        this.runtime.renderer.updateDrawableSkinId(target.drawableID, costume.skinId); // Yield until the next tick.

        return Promise.resolve();
    }
    stopAll () {

        this.runtime.targets.forEach(target => {
            this.clearText({}, {
                target: target
            });
        });
    }
    addText (args, util) {
        const textState = this._getTextState(util.target);

        textState.text += this._formatText(args.TEXT);
        textState.visible = true;
        textState.animating = false;

        this._renderText(util.target); // Yield until the next tick.


        return Promise.resolve();
    }
    addLine (args, util) {
        const textState = this._getTextState(util.target);

        textState.text += '\n'.concat(this._formatText(args.TEXT));
        textState.visible = true;
        textState.animating = false;

        this._renderText(util.target); // Yield until the next tick.


        return Promise.resolve();
    }
    setFont (args, util) {
        const textState = this._getTextState(util.target);

        if (args.FONT === RANDOM_ID) {
            textState.font = this._randomFontOtherThan(textState.font);
        } else {
            textState.font = args.FONT;
        }

        this._renderText(util.target);
    }
    _randomFontOtherThan (currentFont) {
        const otherFonts = this.FONT_IDS.filter(id => id !== currentFont);
        return otherFonts[Math.floor(Math.random() * otherFonts.length)];
    }
    setColor (args, util) {
        const textState = this._getTextState(util.target);

        textState.color = args.COLOR;

        this._renderText(util.target);
    }
    setWidth (args, util) {
        const textState = this._getTextState(util.target);

        textState.maxWidth = Cast.toNumber(args.WIDTH);
        textState.align = args.ALIGN;

        this._renderText(util.target);
    }
    setSize (args, util) {
        const textState = this._getTextState(util.target);

        textState.size = Cast.toNumber(args.SIZE);

        this._renderText(util.target);
    }
    setAlign (args, util) {
        const textState = this._getTextState(util.target);

        textState.maxWidth = Cast.toNumber(args.WIDTH);
        textState.align = args.ALIGN;

        this._renderText(util.target);
    }
    setOutlineWidth (args, util) {
        const textState = this._getTextState(util.target);

        textState.strokeWidth = Cast.toNumber(args.WIDTH);

        this._renderText(util.target);
    }
    setOutlineColor (args, util) {
        const textState = this._getTextState(util.target);

        textState.strokeColor = args.COLOR;
        textState.visible = true;

        this._renderText(util.target);
    }
    _animateText (args, util) {

        const target = util.target;

        const textState = this._getTextState(target);

        if (textState.fullText !== null) return; // Let the running animation finish, do nothing
        // On "first tick", set the text and force animation flags on and render

        textState.fullText = this._formatText(args.TEXT);
        textState.text = textState.fullText[0]; // Start with first char visible

        textState.visible = true;
        textState.animating = true;

        this._renderText(target);

        this.runtime.requestRedraw();
        return new Promise(resolve => {
            var interval = setInterval(() => {
                if (textState.animating && textState.visible && textState.text !== textState.fullText) {
                    textState.text = textState.fullText.substring(0, textState.text.length + 1);
                } else {
                    // NB there is no need to update the .text state here, since it is at the end of the
                    // animation (when text == fullText), is being cancelled by force setting text,
                    // or is being cancelled by hitting the stop button which hides the text anyway.
                    textState.fullText = null;
                    clearInterval(interval);
                    resolve();
                }

                this._renderText(target);

                this.runtime.requestRedraw();
            }, 60
                /* ms, about 1 char every 2 frames */
            );
        });
    }
    _zoomText (args, util) {

        const target = util.target;

        const textState = this._getTextState(target);

        if (textState.targetSize !== null) return; // Let the running animation finish, do nothing

        const timer = new Timer();
        const durationMs = Cast.toNumber(args.SECS || 0.5) * 1000; // On "first tick", set the text and force animation flags on and render

        textState.text = this._formatText(args.TEXT);
        textState.visible = true;
        textState.animating = true;
        textState.targetSize = target.size;
        target.setSize(0);

        this._renderText(target);

        this.runtime.requestRedraw();
        timer.start();
        return new Promise(resolve => {
            var interval = setInterval(() => {
                const timeElapsed = timer.timeElapsed();

                if (textState.animating && textState.visible && timeElapsed < durationMs) {
                    target.setSize(textState.targetSize * timeElapsed / durationMs);
                } else {
                    target.setSize(textState.targetSize);
                    textState.targetSize = null;
                    clearInterval(interval);
                    resolve();
                }

                this._renderText(target);

                this.runtime.requestRedraw();
            }, this.runtime.currentStepTime);
        });
    }
    animateText (args, util) {
        switch (args.ANIMATE) {
        case 'rainbow':
            return this.rainbow(args, util);

        case 'type':
            return this._animateText(args, util);

        case 'zoom':
            return this._zoomText(args, util);
        }
    }
    rainbow (args, util) {
        const target = util.target;

        const textState = this._getTextState(target);

        if (textState.rainbow) return; // Let the running animation finish, do nothing

        const timer = new Timer();
        const durationMs = Cast.toNumber(args.SECS || 2) * 1000; // On "first tick", set the text and force animation flags on and render

        textState.text = this._formatText(args.TEXT);
        textState.visible = true;
        textState.animating = true;
        textState.rainbow = true;

        this._renderText(target);

        timer.start();
        return new Promise(resolve => {
            var interval = setInterval(() => {
                const timeElapsed = timer.timeElapsed();

                if (textState.animating && textState.visible && timeElapsed < durationMs) {
                    textState.rainbow = true;
                    target.setEffect('color', timeElapsed / -5);
                } else {
                    textState.rainbow = false;
                    target.setEffect('color', 0);
                    clearInterval(interval);
                    resolve();
                }

                this._renderText(target);
            }, this.runtime.currentStepTime);
        });
    }
    _getTextState (target) {
        let textState = target.getCustomState(Scratch3TextBlocks.STATE_KEY);

        if (!textState) {
            textState = Clone.simple(Scratch3TextBlocks.DEFAULT_TEXT_STATE);
            target.setCustomState(Scratch3TextBlocks.STATE_KEY, textState);
        }

        return textState;
    }
    _formatText (text) {
        if (text === '') return text; // Non-integers should be rounded to 2 decimal places (no more, no less), unless they're small enough that
        // rounding would display them as 0.00. This matches 2.0's behavior:
        // https://github.com/LLK/scratch-flash/blob/2e4a402ceb205a0428…7f54b26eebe1c2e6da6c0/src/scratch/ScratchSprite.as#L579-L585

        if (typeof text === 'number' && Math.abs(text) >= 0.01 && text % 1 !== 0) {
            text = text.toFixed(2);
        }

        text = Cast.toString(text);
        return text;
    }
    _renderText (target) {
        if (!this.runtime.renderer) return;

        const textState = this._getTextState(target);

        if (!textState.visible) return; // Resetting to costume is done in clear block, early return here is for clones

        textState.skinId = this.runtime.renderer.updateTextCostumeSkin(textState);
        this.runtime.renderer.updateDrawableSkinId(target.drawableID, textState.skinId);
    }
    _onTargetCreated (newTarget, sourceTarget) {
      

        if (sourceTarget) {
            const sourceTextState = sourceTarget.getCustomState(Scratch3TextBlocks.STATE_KEY);

            if (sourceTextState) {
                newTarget.setCustomState(Scratch3TextBlocks.STATE_KEY, Clone.simple(sourceTextState));
                const newTargetState = newTarget.getCustomState(Scratch3TextBlocks.STATE_KEY); // Note here that clones do not share skins with their original target. This is a subtle but important
                // departure from the rest of Scratch, where clones always stay in sync with the originals costume.
                // The "rule" is anything that can be done with the blocks is clone-specific, since that is where you make clones,
                // but anything outside of the blocks (costume/sounds) are shared.
                // For example, graphic effects are clone-specific, but changing the costume in the paint editor is shared.
                // Since you can change the text on the skin from the blocks, each clone needs its own skin.

                newTargetState.skinId = null; // Unset all of the animation flags

                newTargetState.rainbow = false;
                newTargetState.targetSize = null;
                newTargetState.fullText = null;
                newTargetState.animating = false; // Must wait until the drawable has been initialized, but before render. We can
                // wait for the first EVENT_TARGET_VISUAL_CHANGE for this.

                var onDrawableReady = () => {
                    this._renderText(newTarget);

                    newTarget.off('EVENT_TARGET_VISUAL_CHANGE', onDrawableReady);
                };

                newTarget.on('EVENT_TARGET_VISUAL_CHANGE', onDrawableReady);
            }
        }
    }
    _onTargetWillExit (target) {
        const textState = this._getTextState(target);

        if (textState.skinId) {
        // The drawable will get cleaned up by RenderedTarget#dispose, but that doesn't
        // automatically destroy attached skins (because they are usually shared between clones).
        // For text skins, however, all clones get their own, so we need to manually destroy them.
            this.runtime.renderer.destroySkin(textState.skinId);
            textState.skinId = null;
        }
    }
    get FONT_IDS () {
        return ['Sans Serif', 'Serif', 'Handwriting', 'Marker', 'Curly', 'Pixel'];
    }
    
    
}

module.exports = Scratch3TextBlocks;
