const Cast = require('../util/cast');
const Clone = require('../util/clone');
const RenderedTarget = require('../sprites/rendered-target');
const uid = require('../util/uid');
const StageLayering = require('../engine/stage-layering');
const getMonitorIdForBlockWithArgs = require('../util/get-monitor-id');
const MathUtil = require('../util/math-util');

/**
 * @typedef {object} BubbleState - the bubble state associated with a particular target.
 * @property {Boolean} onSpriteRight - tracks whether the bubble is right or left of the sprite.
 * @property {?int} drawableId - the ID of the associated bubble Drawable, null if none.
 * @property {string} text - the text of the bubble.
 * @property {string} type - the type of the bubble, "say" or "think"
 * @property {?string} usageId - ID indicating the most recent usage of the say/think bubble.
 *      Used for comparison when determining whether to clear a say/think bubble.
 */

class Scratch3LooksBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this._onTargetChanged = this._onTargetChanged.bind(this);
        this._onResetBubbles = this._onResetBubbles.bind(this);
        this._onTargetWillExit = this._onTargetWillExit.bind(this);
        this._updateBubble = this._updateBubble.bind(this);

        // Reset all bubbles on start/stop
        this.runtime.on('PROJECT_STOP_ALL', this._onResetBubbles);
        this.runtime.on('targetWasRemoved', this._onTargetWillExit);

        // Enable other blocks to use bubbles like ask/answer
        this.runtime.on(Scratch3LooksBlocks.SAY_OR_THINK, this._updateBubble);
    }

    /**
     * The default bubble state, to be used when a target has no existing bubble state.
     * @type {BubbleState}
     */
    static get DEFAULT_BUBBLE_STATE () {
        return {
            drawableId: null,
            onSpriteRight: true,
            skinId: null,
            text: '',
            type: 'say',
            usageId: null
        };
    }

    /**
     * The key to load & store a target's bubble-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.looks';
    }

    /**
     * Event name for a text bubble being created or updated.
     * @const {string}
     */
    static get SAY_OR_THINK () {
        // There are currently many places in the codebase which explicitly refer to this event by the string 'SAY',
        // so keep this as the string 'SAY' for now rather than changing it to 'SAY_OR_THINK' and breaking things.
        return 'SAY';
    }

    /**
     * Limit for say bubble string.
     * @const {string}
     */
    static get SAY_BUBBLE_LIMIT () {
        return 330;
    }

    /**
     * Limit for ghost effect
     * @const {object}
     */
    static get EFFECT_GHOST_LIMIT (){
        return {min: 0, max: 100};
    }

    /**
     * Limit for brightness effect
     * @const {object}
     */
    static get EFFECT_BRIGHTNESS_LIMIT (){
        return {min: -100, max: 100};
    }

    /**
     * @param {Target} target - collect bubble state for this target. Probably, but not necessarily, a RenderedTarget.
     * @returns {BubbleState} the mutable bubble state associated with that target. This will be created if necessary.
     * @private
     */
    _getBubbleState (target) {
        let bubbleState = target.getCustomState(Scratch3LooksBlocks.STATE_KEY);
        if (!bubbleState) {
            bubbleState = Clone.simple(Scratch3LooksBlocks.DEFAULT_BUBBLE_STATE);
            target.setCustomState(Scratch3LooksBlocks.STATE_KEY, bubbleState);
        }
        return bubbleState;
    }

    /**
     * Handle a target which has moved.
     * @param {RenderedTarget} target - the target which has moved.
     * @private
     */
    _onTargetChanged (target) {
        const bubbleState = this._getBubbleState(target);
        if (bubbleState.drawableId) {
            this._positionBubble(target);
        }
    }

    /**
     * Handle a target which is exiting.
     * @param {RenderedTarget} target - the target.
     * @private
     */
    _onTargetWillExit (target) {
        const bubbleState = this._getBubbleState(target);
        if (bubbleState.drawableId && bubbleState.skinId) {
            this.runtime.renderer.destroyDrawable(bubbleState.drawableId, StageLayering.SPRITE_LAYER);
            this.runtime.renderer.destroySkin(bubbleState.skinId);
            bubbleState.drawableId = null;
            bubbleState.skinId = null;
            this.runtime.requestRedraw();
        }
        target.onTargetVisualChange = null;
    }

    /**
     * Handle project start/stop by clearing all visible bubbles.
     * @private
     */
    _onResetBubbles () {
        for (let n = 0; n < this.runtime.targets.length; n++) {
            const bubbleState = this._getBubbleState(this.runtime.targets[n]);
            bubbleState.text = '';
            this._onTargetWillExit(this.runtime.targets[n]);
        }
        clearTimeout(this._bubbleTimeout);
    }

    /**
     * Position the bubble of a target. If it doesn't fit on the specified side, flip and rerender.
     * @param {!Target} target Target whose bubble needs positioning.
     * @private
     */
    _positionBubble (target) {
        if (!target.visible) return;
        const bubbleState = this._getBubbleState(target);
        const [bubbleWidth, bubbleHeight] = this.runtime.renderer.getCurrentSkinSize(bubbleState.drawableId);
        let targetBounds;
        try {
            targetBounds = target.getBoundsForBubble();
        } catch (error_) {
            // Bounds calculation could fail (e.g. on empty costumes), in that case
            // use the x/y position of the target.
            targetBounds = {
                left: target.x,
                right: target.x,
                top: target.y,
                bottom: target.y
            };
        }
        const stageSize = this.runtime.renderer.getNativeSize();
        const stageBounds = {
            left: -stageSize[0] / 2,
            right: stageSize[0] / 2,
            top: stageSize[1] / 2,
            bottom: -stageSize[1] / 2
        };
        if (bubbleState.onSpriteRight && bubbleWidth + targetBounds.right > stageBounds.right &&
            (targetBounds.left - bubbleWidth > stageBounds.left)) { // Only flip if it would fit
            bubbleState.onSpriteRight = false;
            this._renderBubble(target);
        } else if (!bubbleState.onSpriteRight && targetBounds.left - bubbleWidth < stageBounds.left &&
            (bubbleWidth + targetBounds.right < stageBounds.right)) { // Only flip if it would fit
            bubbleState.onSpriteRight = true;
            this._renderBubble(target);
        } else {
            this.runtime.renderer.updateDrawablePosition(bubbleState.drawableId, [
                bubbleState.onSpriteRight ? (
                    Math.max(
                        stageBounds.left, // Bubble should not extend past left edge of stage
                        Math.min(stageBounds.right - bubbleWidth, targetBounds.right)
                    )
                ) : (
                    Math.min(
                        stageBounds.right - bubbleWidth, // Bubble should not extend past right edge of stage
                        Math.max(stageBounds.left, targetBounds.left - bubbleWidth)
                    )
                ),
                // Bubble should not extend past the top of the stage
                Math.min(stageBounds.top, targetBounds.bottom + bubbleHeight)
            ]);
            this.runtime.requestRedraw();
        }
    }

    /**
     * Create a visible bubble for a target. If a bubble exists for the target,
     * just set it to visible and update the type/text. Otherwise create a new
     * bubble and update the relevant custom state.
     * @param {!Target} target Target who needs a bubble.
     * @return {undefined} Early return if text is empty string.
     * @private
     */
    _renderBubble (target) { // used by compiler
        if (!this.runtime.renderer) return;

        const bubbleState = this._getBubbleState(target);
        const {type, text, onSpriteRight} = bubbleState;

        // Remove the bubble if target is not visible, or text is being set to blank.
        if (!target.visible || text === '') {
            this._onTargetWillExit(target);
            return;
        }

        if (bubbleState.skinId) {
            this.runtime.renderer.updateTextSkin(bubbleState.skinId, type, text, onSpriteRight, [0, 0]);
        } else {
            target.onTargetVisualChange = this._onTargetChanged;
            bubbleState.drawableId = this.runtime.renderer.createDrawable(StageLayering.SPRITE_LAYER);
            bubbleState.skinId = this.runtime.renderer.createTextSkin(type, text, bubbleState.onSpriteRight, [0, 0]);
            this.runtime.renderer.updateDrawableSkinId(bubbleState.drawableId, bubbleState.skinId);
        }

        this._positionBubble(target);
    }

    /**
     * Properly format text for a text bubble.
     * @param {string} text The text to be formatted
     * @return {string} The formatted text
     * @private
     */
    _formatBubbleText (text) {
        if (text === '') return text;

        // Non-integers should be rounded to 2 decimal places (no more, no less), unless they're small enough that
        // rounding would display them as 0.00. This matches 2.0's behavior:
        // https://github.com/LLK/scratch-flash/blob/2e4a402ceb205a042887f54b26eebe1c2e6da6c0/src/scratch/ScratchSprite.as#L579-L585
        if (typeof text === 'number' &&
            Math.abs(text) >= 0.01 && text % 1 !== 0) {
            text = text.toFixed(2);
        }

        // Limit the length of the string.
        text = String(text).substr(0, Scratch3LooksBlocks.SAY_BUBBLE_LIMIT);

        return text;
    }

    /**
     * The entry point for say/think blocks. Clears existing bubble if the text is empty.
     * Set the bubble custom state and then call _renderBubble.
     * @param {!Target} target Target that say/think blocks are being called on.
     * @param {!string} type Either "say" or "think"
     * @param {!string} text The text for the bubble, empty string clears the bubble.
     * @private
     */
    _updateBubble (target, type, text) {
        const bubbleState = this._getBubbleState(target);
        bubbleState.type = type;
        bubbleState.text = this._formatBubbleText(text);
        bubbleState.usageId = uid();
        this._renderBubble(target);
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            looks_say: this.say,
            looks_sayforsecs: this.sayforsecs,
            looks_think: this.think,
            looks_thinkforsecs: this.thinkforsecs,
            looks_show: this.show,
            looks_hide: this.hide,
            looks_hideallsprites: () => {}, // legacy no-op block
            looks_switchcostumeto: this.switchCostume,
            looks_switchbackdropto: this.switchBackdrop,
            looks_switchbackdroptoandwait: this.switchBackdropAndWait,
            looks_nextcostume: this.nextCostume,
            looks_nextbackdrop: this.nextBackdrop,
            looks_changeeffectby: this.changeEffect,
            looks_seteffectto: this.setEffect,
            looks_cleargraphiceffects: this.clearEffects,
            looks_changesizeby: this.changeSize,
            looks_setsizeto: this.setSize,
            looks_changestretchby: this.changeStretch,
            looks_setstretchto: this.setStretch,
            looks_gotofrontback: this.goToFrontBack,
            looks_goforwardbackwardlayers: this.goForwardBackwardLayers,
            looks_size: this.getSize,
            looks_costumenumbername: this.getCostumeNumberName,
            looks_backdropnumbername: this.getBackdropNumberName,
			looks_navcostume: this.navCostume,
			looks_navbackdrop: this.navBackdrop,
			looks_changecostumeby: this.changeCostume,
			looks_changebackdropby: this.changeBackdrop,
			looks_goontopof: this.goOnTopOf,
            looks_stretch: this.getStretch,
            looks_geteffect: this.getEffect
       };
    }

    getMonitored () {
        return {
            looks_size: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_size`
            },
            looks_costumenumbername: {
                isSpriteSpecific: true,
                getId: (targetId, fields) => getMonitorIdForBlockWithArgs(`${targetId}_costumenumbername`, fields)
            },
            looks_backdropnumbername: {
                getId: (_, fields) => getMonitorIdForBlockWithArgs('backdropnumbername', fields)
            },
			looks_stretch: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_stretch`
            }
        };
    }

    say (args, util) {
        // @TODO in 2.0 calling say/think resets the right/left bias of the bubble
        const message = args.MESSAGE;
        this._say(message, util.target);
    }
    _say (message, target) { // used by compiler
        this.runtime.emit(Scratch3LooksBlocks.SAY_OR_THINK, target, 'say', message);
    }

    sayforsecs (args, util) {
        this.say(args, util);
        const target = util.target;
        const usageId = this._getBubbleState(target).usageId;
        return new Promise(resolve => {
            this._bubbleTimeout = setTimeout(() => {
                this._bubbleTimeout = null;
                // Clear say bubble if it hasn't been changed and proceed.
                if (this._getBubbleState(target).usageId === usageId) {
                    this._updateBubble(target, 'say', '');
                }
                resolve();
            }, 1000 * args.SECS);
        });
    }

    think (args, util) {
        this.runtime.emit(Scratch3LooksBlocks.SAY_OR_THINK, util.target, 'think', args.MESSAGE);
    }

    thinkforsecs (args, util) {
        this.think(args, util);
        const target = util.target;
        const usageId = this._getBubbleState(target).usageId;
        return new Promise(resolve => {
            this._bubbleTimeout = setTimeout(() => {
                this._bubbleTimeout = null;
                // Clear think bubble if it hasn't been changed and proceed.
                if (this._getBubbleState(target).usageId === usageId) {
                    this._updateBubble(target, 'think', '');
                }
                resolve();
            }, 1000 * args.SECS);
        });
    }

    show (args, util) {
        util.target.setVisible(true);
        this._renderBubble(util.target);
    }

    hide (args, util) {
        util.target.setVisible(false);
        this._renderBubble(util.target);
    }

    /**
     * Utility function to set the costume of a target.
     * Matches the behavior of Scratch 2.0 for different types of arguments.
     * @param {!Target} target Target to set costume to.
     * @param {Any} requestedCostume Costume requested, e.g., 0, 'name', etc.
     * @param {boolean=} optZeroIndex Set to zero-index the requestedCostume.
     * @return {Array.<!Thread>} Any threads started by this switch.
     */
    _setCostume (target, requestedCostume, optZeroIndex) { // used by compiler
        if (typeof requestedCostume === 'number') {
            // Numbers should be treated as costume indices, always
            target.setCostume(optZeroIndex ? requestedCostume : requestedCostume - 1);
        } else {
            // Strings should be treated as costume names, where possible
            const costumeIndex = target.getCostumeIndexByName(requestedCostume.toString());

            if (costumeIndex !== -1) {
                target.setCostume(costumeIndex);
            } else if (requestedCostume === 'next costume') {
                target.setCostume(target.currentCostume + 1);
            } else if (requestedCostume === 'previous costume') {
                target.setCostume(target.currentCostume - 1);
			} else if (requestedCostume === 'random costume') {
                const numCostumes = target.getCostumes().length;
                if (numCostumes > 1) {
                    // Don't pick the current costume, so that the block
                    // will always have an observable effect.
                    const lowerBound = 0;
                    const upperBound = numCostumes - 1;
                    const costumeToExclude = target.currentCostume;

                    const nextCostume = MathUtil.inclusiveRandIntWithout(lowerBound, upperBound, costumeToExclude);

                    target.setCostume(nextCostume);
                }
            // Try to cast the string to a number (and treat it as a costume index)
            // Pure whitespace should not be treated as a number
            // Note: isNaN will cast the string to a number before checking if it's NaN
            } else if (!(isNaN(requestedCostume) || Cast.isWhiteSpace(requestedCostume))) {
                target.setCostume(optZeroIndex ? Number(requestedCostume) : Number(requestedCostume) - 1);
            }
        }

        // Per 2.0, 'switch costume' can't start threads even in the Stage.
        return [];
    }

    /**
     * Utility function to set the backdrop of a target.
     * Matches the behavior of Scratch 2.0 for different types of arguments.
     * @param {!Target} stage Target to set backdrop to.
     * @param {Any} requestedBackdrop Backdrop requested, e.g., 0, 'name', etc.
     * @param {boolean=} optZeroIndex Set to zero-index the requestedBackdrop.
     * @return {Array.<!Thread>} Any threads started by this switch.
     */
    _setBackdrop (stage, requestedBackdrop, optZeroIndex) { // used by compiler
        if (typeof requestedBackdrop === 'number') {
            // Numbers should be treated as backdrop indices, always
            stage.setCostume(optZeroIndex ? requestedBackdrop : requestedBackdrop - 1);
        } else {
            // Strings should be treated as backdrop names where possible
            const costumeIndex = stage.getCostumeIndexByName(requestedBackdrop.toString());

            if (costumeIndex !== -1) {
                stage.setCostume(costumeIndex);
            } else if (requestedBackdrop === 'next backdrop') {
                stage.setCostume(stage.currentCostume + 1);
            } else if (requestedBackdrop === 'previous backdrop') {
                stage.setCostume(stage.currentCostume - 1);
            } else if (requestedBackdrop === 'random backdrop') {
                const numCostumes = stage.getCostumes().length;
                if (numCostumes > 1) {
                    // Don't pick the current backdrop, so that the block
                    // will always have an observable effect.
                    const lowerBound = 0;
                    const upperBound = numCostumes - 1;
                    const costumeToExclude = stage.currentCostume;

                    const nextCostume = MathUtil.inclusiveRandIntWithout(lowerBound, upperBound, costumeToExclude);

                    stage.setCostume(nextCostume);
                }
            // Try to cast the string to a number (and treat it as a costume index)
            // Pure whitespace should not be treated as a number
            // Note: isNaN will cast the string to a number before checking if it's NaN
            } else if (!(isNaN(requestedBackdrop) || Cast.isWhiteSpace(requestedBackdrop))) {
                stage.setCostume(optZeroIndex ? Number(requestedBackdrop) : Number(requestedBackdrop) - 1);
            }
        }

        const newName = stage.getCostumes()[stage.currentCostume].name;
        return this.runtime.startHats('event_whenbackdropswitchesto', {
            BACKDROP: newName
        });
    }

    switchCostume (args, util) {
        this._setCostume(util.target, args.COSTUME); // used by compiler
    }

    nextCostume (args, util) {
        this._setCostume(
            util.target, util.target.currentCostume + 1, true
        );
    }
	
	navCostume (args, util) {
		const navTo = args.NAVIGATE;
		const target = util.target;
		
		if (navTo === 'NEXT') {
            target.setCostume(target.currentCostume + 1);
        } else if (navTo === 'PREVIOUS') {
            target.setCostume(target.currentCostume - 1);
		} else if (navTo === 'RANDOM') {
            const numCostumes = target.getCostumes().length;
            if (numCostumes > 1) {
                // Don't pick the current costume, so that the block
                // will always have an observable effect.
                const lowerBound = 0;
                const upperBound = numCostumes - 1;
                const costumeToExclude = target.currentCostume;

                const nextCostume = MathUtil.inclusiveRandIntWithout(lowerBound, upperBound, costumeToExclude);

                target.setCostume(nextCostume);
            }
        }
	}
	
	navBackdrop (args, util) {
		const navTo = args.NAVIGATE;
		const stage = this.runtime.getTargetForStage();
		
		if (navTo === 'NEXT') {
            stage.setCostume(stage.currentCostume + 1);
        } else if (navTo === 'PREVIOUS') {
            stage.setCostume(stage.currentCostume - 1);
		} else if (navTo === 'RANDOM') {
            const numCostumes = stage.getCostumes().length;
            if (numCostumes > 1) {
                // Don't pick the current backdrop, so that the block
                // will always have an observable effect.
                const lowerBound = 0;
                const upperBound = numCostumes - 1;
                const costumeToExclude = stage.currentCostume;

                const nextCostume = MathUtil.inclusiveRandIntWithout(lowerBound, upperBound, costumeToExclude);

                stage.setCostume(nextCostume);
            }
        }
	}
	
	changeCostume (args, util) {
        this._setCostume(
            util.target, util.target.currentCostume + Cast.toNumber(args.CHANGE), true
        );
    }
	
	changeBackdrop (args, util) {
		const stage = this.runtime.getTargetForStage();
        this._setBackdrop(
            stage, stage.currentCostume + Cast.toNumber(args.CHANGE), true
        );
    }

    switchBackdrop (args) {
        this._setBackdrop(this.runtime.getTargetForStage(), args.BACKDROP);
    }

    switchBackdropAndWait (args, util) {
        // Have we run before, starting threads?
        if (!util.stackFrame.startedThreads) {
            // No - switch the backdrop.
            util.stackFrame.startedThreads = (
                this._setBackdrop(
                    this.runtime.getTargetForStage(),
                    args.BACKDROP
                )
            );
            if (util.stackFrame.startedThreads.length === 0) {
                // Nothing was started.
                return;
            }
        }
        // We've run before; check if the wait is still going on.
        const instance = this;
        // Scratch 2 considers threads to be waiting if they are still in
        // runtime.threads. Threads that have run all their blocks, or are
        // marked done but still in runtime.threads are still considered to
        // be waiting.
        const waiting = util.stackFrame.startedThreads
            .some(thread => instance.runtime.threads.indexOf(thread) !== -1);
        if (waiting) {
            // If all threads are waiting for the next tick or later yield
            // for a tick as well. Otherwise yield until the next loop of
            // the threads.
            if (
                util.stackFrame.startedThreads
                    .every(thread => instance.runtime.isWaitingThread(thread))
            ) {
                util.yieldTick();
            } else {
                util.yield();
            }
        }
    }

    nextBackdrop () {
        const stage = this.runtime.getTargetForStage();
        this._setBackdrop(
            stage, stage.currentCostume + 1, true
        );
    }

    clampEffect (effect, value) { // used by compiler
        let clampedValue = value;
        switch (effect) {
        case 'ghost':
            clampedValue = MathUtil.clamp(value,
                Scratch3LooksBlocks.EFFECT_GHOST_LIMIT.min,
                Scratch3LooksBlocks.EFFECT_GHOST_LIMIT.max);
            break;
        case 'brightness':
            clampedValue = MathUtil.clamp(value,
                Scratch3LooksBlocks.EFFECT_BRIGHTNESS_LIMIT.min,
                Scratch3LooksBlocks.EFFECT_BRIGHTNESS_LIMIT.max);
            break;
        }
        return clampedValue;
    }

    changeEffect (args, util) {
        const effect = Cast.toString(args.EFFECT).toLowerCase();
        const change = Cast.toNumber(args.CHANGE);
        if (!util.target.effects.hasOwnProperty(effect)) return;
        let newValue = change + util.target.effects[effect];
        newValue = this.clampEffect(effect, newValue);
        util.target.setEffect(effect, newValue);
    }

    setEffect (args, util) {
        const effect = Cast.toString(args.EFFECT).toLowerCase();
        let value = Cast.toNumber(args.VALUE);
        value = this.clampEffect(effect, value);
        util.target.setEffect(effect, value);
    }

    clearEffects (args, util) {
        util.target.clearEffects();
    }

    changeSize (args, util) {
        const change = Cast.toNumber(args.CHANGE);
        util.target.setSize(util.target.size + change);
    }

    setSize (args, util) {
        const size = Cast.toNumber(args.SIZE);
        util.target.setSize(size);
    }

    goToFrontBack (args, util) {
        if (!util.target.isStage) {
            if (args.FRONT_BACK === 'front') {
                util.target.goToFront();
            } else {
                util.target.goToBack();
            }
        }
    }

    goForwardBackwardLayers (args, util) {
        if (!util.target.isStage) {
            if (args.FORWARD_BACKWARD === 'forward') {
                util.target.goForwardLayers(Cast.toNumber(args.NUM));
            } else {
                util.target.goBackwardLayers(Cast.toNumber(args.NUM));
            }
        }
    }

    getSize (args, util) {
        return Math.round(util.target.size);
    }

    getBackdropNumberName (args) {
        const stage = this.runtime.getTargetForStage();
        if (args.NUMBER_NAME === 'number') {
            return stage.currentCostume + 1;
        }
        // Else return name
        return stage.getCostumes()[stage.currentCostume].name;
    }

    getCostumeNumberName (args, util) {
        if (args.NUMBER_NAME === 'number') {
            return util.target.currentCostume + 1;
        }
        // Else return name
        return util.target.getCostumes()[util.target.currentCostume].name;
    }
	
	goOnTopOf (args, util) {
		const self = util.target;
		
		// Stage cannot switch layers
		if (self.isStage) return;
		
		args.SPRITE = Cast.toString(args.SPRITE);
		const target = this.runtime.getSpriteTargetByName(args.SPRITE);

		// Stage is always at the back
		if (args.SPRITE === "_stage_") {
			self.goToBack();
			return;
		}
				
		// If a sprite tries to go on top of itself with this block,
		// it functions like go foward 1 layers without this check,
		// even though users would expect doing that to do nothing.
		if (target === self) {
			return;
		}
		
		self.goBehindOther(target);
		self.goForwardLayers(1);
		// For some reason, going in front of a sprite right in front
		// of the current sprite places it in front of the next sprite
		// too. Running the block twice fixes this.
		self.goBehindOther(target);
		self.goForwardLayers(1);
	}
	
	changeStretch (args, util) {
        const change = Cast.toNumber(args.CHANGE);
        util.target.setStretch(util.target.stretch + change);
    }

    setStretch (args, util) {		
        const stretch = Cast.toNumber(args.STRETCH);
        util.target.setStretch(stretch);
    }
	
	getStretch (args, util) {
        return Math.round(util.target.stretch);
    }
	
	getEffect (args, util) {
		const effect = Cast.toString(args.EFFECT).toLowerCase();
		if (!util.target.effects.hasOwnProperty(effect)) return 0;
		return util.target.effects[effect];
	}
}

module.exports = Scratch3LooksBlocks;
