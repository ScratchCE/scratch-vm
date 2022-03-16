const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Clone = require('../../util/clone');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const MathUtil = require('../../util/math-util');
const Timer = require('../../util/timer');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PHRpdGxlPm11c2ljLWJsb2NrLWljb248L3RpdGxlPjxkZWZzPjxwYXRoIGQ9Ik0zMi4xOCAyNS44NzRDMzIuNjM2IDI4LjE1NyAzMC41MTIgMzAgMjcuNDMzIDMwYy0zLjA3IDAtNS45MjMtMS44NDMtNi4zNzItNC4xMjYtLjQ1OC0yLjI4NSAxLjY2NS00LjEzNiA0Ljc0My00LjEzNi42NDcgMCAxLjI4My4wODQgMS44OS4yMzQuMzM4LjA4Ni42MzcuMTguOTM4LjMwMi44Ny0uMDItLjEwNC0yLjI5NC0xLjgzNS0xMi4yMy0yLjEzNC0xMi4zMDIgMy4wNi0xLjg3IDguNzY4LTIuNzUyIDUuNzA4LS44ODUuMDc2IDQuODItMy42NSAzLjg0NC0zLjcyNC0uOTg3LTQuNjUtNy4xNTMuMjYzIDE0LjczOHptLTE2Ljk5OCA1Ljk5QzE1LjYzIDM0LjE0OCAxMy41MDcgMzYgMTAuNDQgMzZjLTMuMDcgMC01LjkyMi0xLjg1Mi02LjM4LTQuMTM2LS40NDgtMi4yODQgMS42NzQtNC4xMzUgNC43NS00LjEzNSAxLjAwMyAwIDEuOTc1LjE5NiAyLjg1NS41NDMuODIyLS4wNTUtLjE1LTIuMzc3LTEuODYyLTEyLjIyOC0yLjEzMy0xMi4zMDMgMy4wNi0xLjg3IDguNzY0LTIuNzUzIDUuNzA2LS44OTQuMDc2IDQuODItMy42NDggMy44MzQtMy43MjQtLjk4Ny00LjY1LTcuMTUyLjI2MiAxNC43Mzh6IiBpZD0iYSIvPjwvZGVmcz48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjx1c2UgZmlsbD0iI0ZGRiIgeGxpbms6aHJlZj0iI2EiLz48cGF0aCBzdHJva2Utb3BhY2l0eT0iLjEiIHN0cm9rZT0iIzAwMCIgZD0iTTI4LjQ1NiAyMS42NzVjLS4wMS0uMzEyLS4wODctLjgyNS0uMjU2LTEuNzAyLS4wOTYtLjQ5NS0uNjEyLTMuMDIyLS43NTMtMy43My0uMzk1LTEuOTgtLjc2LTMuOTItMS4xNDItNi4xMTMtLjczMi00LjIyMy0uNjkzLTYuMDUuMzQ0LTYuNTI3LjUtLjIzIDEuMDYtLjA4IDEuODQuMzUuNDE0LjIyNyAyLjE4MiAxLjM2NSAyLjA3IDEuMjk2IDEuOTk0IDEuMjQyIDMuNDY0IDEuNzc0IDQuOTMgMS41NDggMS41MjYtLjIzNyAyLjUwNC0uMDYgMi44NzYuNjE4LjM0OC42MzUuMDE1IDEuNDE2LS43MyAyLjE4LTEuNDcyIDEuNTE2LTMuOTc1IDIuNTE0LTUuODQ4IDIuMDIzLS44MjItLjIyLTEuMjM4LS40NjUtMi4zOC0xLjI2N2wtLjA5NS0uMDY2Yy4wNDcuNTkzLjI2NCAxLjc0LjcxNyAzLjgwMy4yOTQgMS4zMzYgMi4wOCA5LjE4NyAyLjYzNyAxMS42NzRsLjAwMi4wMTJjLjUyOCAyLjYzNy0xLjg3MyA0LjcyNC01LjIzNiA0LjcyNC0zLjI5IDAtNi4zNjMtMS45ODgtNi44NjItNC41MjgtLjUzLTIuNjQgMS44NzMtNC43MzQgNS4yMzMtNC43MzQuNjcyIDAgMS4zNDcuMDg1IDIuMDE0LjI1LjIyNy4wNTcuNDM2LjExOC42MzYuMTg3em0tMTYuOTk2IDUuOTljLS4wMS0uMzE4LS4wOS0uODM4LS4yNjYtMS43MzctLjA5LS40Ni0uNTk1LTIuOTM3LS43NTMtMy43MjctLjM5LTEuOTYtLjc1LTMuODktMS4xMy02LjA3LS43MzItNC4yMjMtLjY5Mi02LjA1LjM0NC02LjUyNi41MDItLjIzIDEuMDYtLjA4MiAxLjg0LjM1LjQxNS4yMjcgMi4xODIgMS4zNjQgMi4wNyAxLjI5NSAxLjk5MyAxLjI0MiAzLjQ2MiAxLjc3NCA0LjkyNiAxLjU0OCAxLjUyNS0uMjQgMi41MDQtLjA2NCAyLjg3Ni42MTQuMzQ4LjYzNS4wMTUgMS40MTUtLjcyOCAyLjE4LTEuNDc0IDEuNTE3LTMuOTc3IDIuNTEzLTUuODQ3IDIuMDE3LS44Mi0uMjItMS4yMzYtLjQ2NC0yLjM3OC0xLjI2N2wtLjA5NS0uMDY1Yy4wNDcuNTkzLjI2NCAxLjc0LjcxNyAzLjgwMi4yOTQgMS4zMzcgMi4wNzggOS4xOSAyLjYzNiAxMS42NzVsLjAwMy4wMTNjLjUxNyAyLjYzOC0xLjg4NCA0LjczMi01LjIzNCA0LjczMi0zLjI4NyAwLTYuMzYtMS45OTMtNi44Ny00LjU0LS41Mi0yLjY0IDEuODg0LTQuNzMgNS4yNC00LjczLjkwNSAwIDEuODAzLjE1IDIuNjUuNDM2eiIvPjwvZz48L3N2Zz4=';

/**
 * Icon svg to be displayed in the category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2LjA5IDEyLjkzN2MuMjI4IDEuMTQxLS44MzMgMi4wNjMtMi4zNzMgMi4wNjMtMS41MzUgMC0yLjk2Mi0uOTIyLTMuMTg2LTIuMDYzLS4yMy0xLjE0Mi44MzMtMi4wNjggMi4zNzItMi4wNjguMzIzIDAgLjY0MS4wNDIuOTQ1LjExN2EzLjUgMy41IDAgMCAxIC40NjguMTUxYy40MzUtLjAxLS4wNTItMS4xNDctLjkxNy02LjExNC0xLjA2Ny02LjE1MiAxLjUzLS45MzUgNC4zODQtMS4zNzcgMi44NTQtLjQ0Mi4wMzggMi40MS0xLjgyNSAxLjkyMi0xLjg2Mi0uNDkzLTIuMzI1LTMuNTc3LjEzMiA3LjM3ek03LjQ2IDguNTYzYy0xLjg2Mi0uNDkzLTIuMzI1LTMuNTc2LjEzIDcuMzdDNy44MTYgMTcuMDczIDYuNzU0IDE4IDUuMjIgMThjLTEuNTM1IDAtMi45NjEtLjkyNi0zLjE5LTIuMDY4LS4yMjQtMS4xNDIuODM3LTIuMDY3IDIuMzc1LTIuMDY3LjUwMSAwIC45ODcuMDk4IDEuNDI3LjI3Mi40MTItLjAyOC0uMDc0LTEuMTg5LS45My02LjExNEMzLjgzNCAxLjg3IDYuNDMgNy4wODcgOS4yODIgNi42NDZjMi44NTQtLjQ0Ny4wMzggMi40MS0xLjgyMyAxLjkxN3oiIGZpbGw9IiM1NzVFNzUiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==';

/**
 * Enum for case parameter values.
 * @readonly
 * @enum {string}
 */
const CaseParam = {
    LOWERCASE: 'lowercase',
    UPPERCASE: 'uppercase',
    MIXEDCASE: 'mixedcase',
    TITLECASE: 'titlecase'
};

/**
 * Class for text handling blocks in Scratch CE
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3StringsBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }
	
	_initCaseMenu () {
		return [
            {
                text: formatMessage({
                    id: 'strings.lowercase',
                    default: 'lowercase',
                    description: 'label for lowercase option in the text extension'
                }),
                value: CaseParam.LOWERCASE
            },
            {
                text: formatMessage({
                    id: 'strings.uppercase',
                    default: 'UPPERCASE',
                    description: 'label for uppercase option in the text extension'
                }),
                value: CaseParam.UPPERCASE
            },
			{
                text: formatMessage({
                    id: 'strings.titlecase',
                    default: 'Title Case',
                    description: 'label for title case option in the text extension'
                }),
                value: CaseParam.TITLECASE
            },
			{
                text: formatMessage({
                    id: 'strings.mixed case',
                    default: 'MiXeD CaSe',
                    description: 'label for mixed case option in the text extension'
                }),
                value: CaseParam.MIXEDCASE
            }
        ];
	}
	
    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'text',
            name: formatMessage({
                id: 'strings.categoryName',
                default: 'Text',
                description: 'Label for the Text extension category'
            }),
            // menuIconURI: menuIconURI,
            // blockIconURI: blockIconURI,
			
            blocks: [
				// Some block IDs are lowercase or snake_case for compatibility
				{
					opcode: 'letters_of',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.lettersOf',
                        default: 'letters [LETTER1] to [LETTER2] of [STRING]',
                        description: 'block'
                    }),
					arguments: {
                        LETTER1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        },
						LETTER2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 4
                        },
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple"
                        }
                    }
				},
				{
					opcode: 'split',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.split',
                        default: 'item [ITEM] of [STRING] split by [SPLIT]',
                        description: 'block'
                    }),
					arguments: {
                        ITEM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        },
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple"
                        },
						SPLIT: {
                            type: ArgumentType.STRING,
                            defaultValue: "p"
                        }
                    }
				},
				{
					opcode: 'count',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.count',
                        default: 'count number of [SUBSTRING]s in [STRING]',
                        description: 'block'
                    }),
					arguments: {
                        SUBSTRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "p"
                        },
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple"
                        }
                    }
				},
				{
					opcode: 'indexof',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.indexof',
                        default: 'index of [SUBSTRING] in [STRING]',
                        description: 'block'
                    }),
					arguments: {
                        SUBSTRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "p"
                        },
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple"
                        }
                    }
				},
				
				'---',
				
				{
					opcode: 'replace',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.replace',
                        default: 'replace [SUBSTRING] in [STRING] with [REPLACE]',
                        description: 'block'
                    }),
					arguments: {
                        SUBSTRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "world"
                        },
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello world!"
                        },
						REPLACE: {
                            type: ArgumentType.STRING,
                            defaultValue: "fellow Scratchers"
                        }
                    }
				},
				{
					opcode: 'repeat',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.repeat',
                        default: 'repeat [STRING] [REPEAT] times',
                        description: 'block'
                    }),
					arguments: {
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple "
                        },
						REPEAT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        }
                    }
				},
				
				'---',
				
				{
					opcode: 'unicodeof',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.unicodeOf',
                        default: 'Unicode of [STRING]',
                        description: 'block'
                    }),
					arguments: {
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "A"
                        }
                    }
				},
				{
					opcode: 'unicodefrom',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.unicodeFrom',
                        default: 'Unicode [NUM] as letter',
                        description: 'block'
                    }),
					arguments: {
						NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 65
                        }
                    }
				},
				
				'---',
				
				{
					opcode: 'identical',
					blockType: BlockType.BOOLEAN,
					text: formatMessage({
                        id: 'strings.identical',
                        default: 'is [OPERAND1] identical to [OPERAND2]?',
                        description: 'block'
                    }),
					arguments: {
						OPERAND1: {
                            type: ArgumentType.STRING,
                            defaultValue: "A"
                        },
						OPERAND2: {
                            type: ArgumentType.STRING,
                            defaultValue: "a"
                        }
                    }
				},
				
				'---',
				
				{
					opcode: 'isCase',
					blockType: BlockType.BOOLEAN,
					text: formatMessage({
                        id: 'strings.iscase',
                        default: 'is [STRING] [TEXTCASE]?',
                        description: 'block'
                    }),
					arguments: {
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple"
                        },
						TEXTCASE: {
                            type: ArgumentType.STRING,
							menu: 'textCase',
                            defaultValue: CaseParam.LOWERCASE
                        }
                    }
				},
				{
					opcode: 'toCase',
					blockType: BlockType.REPORTER,
					text: formatMessage({
                        id: 'strings.tocase',
                        default: 'convert [STRING] to [TEXTCASE]',
                        description: 'block'
                    }),
					arguments: {
						STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple"
                        },
						TEXTCASE: {
                            type: ArgumentType.STRING,
							menu: 'textCase',
                            defaultValue: CaseParam.UPPERCASE
                        }
                    }
				}
            ],
            menus: {
                textCase: {
                    acceptReporters: true,
                    items: this._initCaseMenu()
                }
            }
        };
    }
		
	identical (args, util) {
		// Purposefully no casting, because
		// types ARE differentiated in this block
		return args.OPERAND1 === args.OPERAND2
	}
	
	unicodeof (args, util) {
		const chars = Array.from(Cast.toString(args.STRING));
		return chars.map((char) => {return char.charCodeAt(0)}).join(" ");
	}
	
	unicodefrom (args, util) {
		return String.fromCharCode(Cast.toNumber(args.NUM));
	}
	
	letters_of (args, util) {
		args.STRING = Cast.toString(args.STRING);
		args.LETTER1 = Cast.toNumber(args.LETTER1);
		args.LETTER2 = Cast.toNumber(args.LETTER2);
		return args.STRING.substring(args.LETTER1 - 1, args.LETTER2);
	}
	
	count (args, util) {
		//.toLowerCase() for case insensitivity
		args.STRING = Cast.toString(args.STRING).toLowerCase();
		args.SUBSTRING = Cast.toString(args.SUBSTRING).toLowerCase();
		
		return args.STRING.split(args.SUBSTRING).length - 1;
	}
	
	split (args, util) {
		// .toLowerCase() for case insensitivity
		args.STRING = Cast.toString(args.STRING).toLowerCase();
		args.SPLIT = Cast.toString(args.SPLIT).toLowerCase();
				
		const split = args.STRING.split(args.SPLIT);
		args.ITEM = Cast.toListIndex(args.ITEM, split.length, false);
		
		if (args.ITEM === Cast.LIST_INVALID) {
			return '';
		}
		return split[args.ITEM - 1];
		
	}
	
	replace (args, util) {
		args.STRING = Cast.toString(args.STRING);
		args.SUBSTRING = Cast.toString(args.SUBSTRING);
		
		args.REPLACE = Cast.toString(args.REPLACE);
		
		return args.STRING.replaceAll(args.SUBSTRING, args.REPLACE);
	}
	
	indexof (args, util) {
		// .toLowerCase() for case insensitivity
		args.STRING = Cast.toString(args.STRING).toLowerCase();
		args.SUBSTRING = Cast.toString(args.SUBSTRING).toLowerCase();
		
		// Since both arguments are casted to strings beforehand,
		// we dpm't have to worry about type differences
		// like in the item number of in list block.
		const found = args.STRING.indexOf(args.SUBSTRING);
		
		// indexOf returns -1 when no matches are found
		return found === -1 ? 0 : found + 1;
	}
	
	repeat (args, util) {
		args.STRING = Cast.toString(args.STRING);
		args.REPEAT = Cast.toNumber(args.REPEAT);
		return args.STRING.repeat(args.REPEAT);
	}
	
	isCase (args, util) {
		const string = Cast.toString(args.STRING);
		const textCase = Cast.toString(args.TEXTCASE);
		switch (textCase) {
			case CaseParam.LOWERCASE:
				return string.toLowerCase() === string;
			break;
			case CaseParam.UPPERCASE:
				return string.toUpperCase() === string;
			break;
			case CaseParam.MIXEDCASE:
				return (!(
					string.toUpperCase() === string ||
					string.toLowerCase() === string
				));
			break;
			case CaseParam.TITLECASE:
				return !(/\b[a-zéáűőúöüóí]/g).test(string);
			break;
			default: return string;
		}
	}
	
	toCase (args, util) {
		const string = Cast.toString(args.STRING);
		const textCase = Cast.toString(args.TEXTCASE);
		switch (textCase) {
			case CaseParam.LOWERCASE:
				return string.toLowerCase();
			break;
			case CaseParam.UPPERCASE:
				return string.toUpperCase();
			break;
			case CaseParam.MIXEDCASE:
				const chars = Array.from(string);
				const finalChars = [];
				for (let i in chars) {
					const character = chars[i];
					if (i % 2 == 0) {
						finalChars.push(character.toUpperCase());
					} else {
						finalChars.push(character.toLowerCase());
					}
				}
				return finalChars.join("");
			break;
			case CaseParam.TITLECASE:
				return string.split(/\b/g).map((str) => {
					let chars = Array.from(str);
					if (chars.length < 1) return "";
					chars[0] = chars[0].toUpperCase();
					return chars.join("");
				}).join("");
			break;
			default: return string;
		}
	}
}

module.exports = Scratch3StringsBlocks;
