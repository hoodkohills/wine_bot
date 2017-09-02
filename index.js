'use strict';

const todayMenuBeverageType = {
        'rulanda':{'size': ['short', 'small', 'medium', 'large']},
        'chai':{'size': ['small', 'short']}
};

// --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message, responseCard) {
	return {
		sessionAttributes,
		dialogAction: {
			type: 'ElicitSlot',
			intentName,
			slots,
			slotToElicit,
			message,
			responseCard,
		},
	};
}

function confirmIntent(sessionAttributes, intentName, slots, message, responseCard) {
	return {
		sessionAttributes,
		dialogAction: {
			type: 'ConfirmIntent',
			intentName,
			slots,
			message,
			responseCard,
		},
	};
}

function close(sessionAttributes, fulfillmentState, message, responseCard) {
	return {
		sessionAttributes,
		dialogAction: {
			type: 'Close',
			fulfillmentState,
			message,
			responseCard,
		},
	};
}

function delegate(sessionAttributes, slots) {
	return {
		sessionAttributes,
		dialogAction: {
			type: 'Delegate',
			slots,
		},
	};
}



// ---------------- Helper Functions --------------------------------------------------

// build a message for Lex responses
function buildMessage(messageContent) {
    return {
		contentType: 'PlainText',
		content: messageContent,
    };
}

// Build a responseCard with a title, subtitle, and an optional set of options which should be displayed as buttons.
function buildResponseCard(title, subTitle, options) {
    let buttons = null;
    if (options !== null) {
        buttons = [];
        for (let i = 0; i < Math.min(5, options.length); i++) {
            buttons.push(options[i]);
        }
    }
    return {
        contentType: 'application/vnd.amazonaws.card.generic',
        version: 1,
        genericAttachments: [{
            title,
            subTitle,
            buttons,
        }],
    };
}

function buildResponseOptions(optionsArray = Array){
    var responseOptions = [];
    for(var i=0; i<optionsArray.length; i++){
        var temp = {
            "text": optionsArray[i],
            "value": optionsArray[i]
        }
        responseOptions.push(temp);
    }
    return responseOptions;
}

function keyExists(key, search) {
    if (!search || (search.constructor !== Array && search.constructor !== Object)) {
        return false;
    }
    for (var i = 0; i < search.length; i++) {
        if (search[i] === key) {
            return true;
        }
    }
    return key in search;
}

// --------------- Functions that control the skill's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering a beverage.
 * (we only support ordering a mocha for now)
 */
function orderBeverage(intentRequest, callback) {

	const outputSessionAttributes = intentRequest.sessionAttributes;
	const source = intentRequest.invocationSource;

	if (source === 'DialogCodeHook') {

		// perform validation on the slot values we have
		const slots = intentRequest.currentIntent.slots;

		const wineBeverageType_test = (slots.wineBeverageType_test ? slots.wineBeverageType_test : null);
		const wineBeverageSize = (slots.wineBeverageSize ? slots.wineBeverageSize : null);
		const wineBeverageTemp = (slots.wineBeverageTemp ? slots.wineBeverageTemp : null);

        
        if(! (wineBeverageType_test && (keyExists(wineBeverageType_test, todayMenuBeverageType)))){
            var menuItem = buildResponseOptions(Object.keys(todayMenuBeverageType));
            
            callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name, slots, 'wineBeverageType_test', 
			    buildMessage('Sorry, but we can only do a mocha or a chai. What kind of beverage would you like?'), 
			    buildResponseCard("Menu", "Today's Menu", menuItem)));
		}

		if (!(wineBeverageSize && wineBeverageSize.match(/short|tall|grande|venti|small|medium|large/) && keyExists(wineBeverageSize, todayMenuBeverageType[wineBeverageType_test].size))) {
		    if(wineBeverageSize){
		        var sizeOfItem = buildResponseOptions(todayMenuBeverageType[wineBeverageType_test].size);
            
			    callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name, slots, 'wineBeverageSize',
			        buildMessage('Sorry, but we don\'t have this size; consider a small.  What size?'),
			        buildResponseCard(`${wineBeverageType_test}`, "available sizes", sizeOfItem)
			    ));
		    }else{
		        callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name, slots, 'wineBeverageSize'));
		    }
		}

		// let's say we need to know temperature
		if (!(wineBeverageTemp && wineBeverageTemp.match(/kids|hot|iced/))) {
			callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name, slots, 'wineBeverageTemp'));
		}

		// if we've come this far, then we simply defer to Lex
		callback(delegate(outputSessionAttributes, slots));
		return;
	}

	callback(close(outputSessionAttributes, 'Fulfilled', {
		contentType: 'PlainText',
		content: `Vyborne!  Tvoje vino (tedy ${intentRequest.currentIntent.slots.typ_vina}) je uz na ceste. Diky! Tvoje Boneeta.`
	}));
}

// --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {

	console.log(`dispatch userId=${intentRequest.userId}, intent=${intentRequest.currentIntent.name}`);

	const name = intentRequest.currentIntent.name;

	// dispatch to the intent handlers
	if (name.startsWith('wineOrderBeverageIntent_test')) {
		return orderBeverage(intentRequest, callback);
	}
	throw new Error(`Intent with name ${name} not supported`);
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {

	console.log(JSON.stringify(event));

	try {
		console.log(`event.bot.name=${event.bot.name}`);

		// fail if this function is for a different bot
		if(! event.bot.name.startsWith('Boneeta')) {
		     callback('Invalid Bot Name');
		}
		dispatch(event, (response) => callback(null, response));
	} catch (err) {
		callback(err);
	}
};
