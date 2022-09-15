/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const persistence = require('./persistence'); //Todo lo que se cargue en la sesión, lo va a cargar en s3 bucket o dynamoDB
const interceptors = require('./interceptors');
const logic = require('./logic');
//Esta variable solicita los permsisos para crear recordatorios 
const REMINDERS_PERMISSION = ['alexa::alerts:reminders:skill:readwrite'];

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('WELCOME_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const NumberCharactersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NumberCharactersIntent';
    },
    async handle(handlerInput) {
        const url = "https://rickandmortyapi.com/api/character"
        let speakOutput = "No se cargaron los datos";
        await logic.getRemoteData(url)
          .then((response) => {
            const data = JSON.parse(response);
            speakOutput = handlerInput.t('NC_MSG', {NC: data.results.length.toString()})
          })

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const StateCharacterIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StateCharacterIntent';
    },
    async handle(handlerInput) {
        const {intent} = handlerInput.requestEnvelope.request;
        const characterId = intent.slots.character.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const characterName = intent.slots.character.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        //const characterValue = intent.slots.character.value;


        const url = `https://rickandmortyapi.com/api/character/${characterId}`
        let speakOutput = "No se cargaron los datos";
        await logic.getRemoteData(url)
          .then((response) => {
            const data = JSON.parse(response);
            const SC = logic.translate(data.status.toString());            
            speakOutput = handlerInput.t('SC_MSG', {NameC: characterName, SC: SC})
          })

        return handlerInput.responseBuilder
            //.speak(characterId + " " + characterName + " " + characterValue)
            .speak(speakOutput)   
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CharacterIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterIntent';
    },
    async handle(handlerInput) {
        const {intent} = handlerInput.requestEnvelope.request;
        const characterId = intent.slots.character.resolutions.resolutionsPerAuthority[0].values[0].value.id;

        const url = `https://rickandmortyapi.com/api/character/${characterId}`
        let speakOutput = "No se cargaron los datos";
        await logic.getRemoteData(url)
          .then((response) => {
            const data = JSON.parse(response);
            speakOutput = handlerInput.t('CH_MSH', {NameC: data.name.toString(), gender: data.gender.toString(), specie: data.species.toString(), origin: data.origin.name.toString(), location: data.location.name.toString()})
          })

        return handlerInput.responseBuilder
            .speak(speakOutput)   
            .reprompt(speakOutput)
            .getResponse();
    }
};

const PlanDateIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlanDateIntent';
    },
    async handle(handlerInput) {
        const {intent} = handlerInput.requestEnvelope.request;
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        
        const characterName = intent.slots.character.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const date = intent.slots.date.value;
        
        let speechText;
        //Intentemos crear un recordatorio a través de la API de Reminders
        //Es necesario tener el permiso habilitado desde el desarrollo de Alexa Developer Console. Dirigiendose a (Build -> Tools -> Permissions -> Reminders)
        //Si no habilita este permiso desde desaroolo obtendrá una SessionEndedRequest con un ERROR de tipo INVALID_RESPONSE
        try {
            const {permissions} = requestEnvelope.context.System.user;
            if(!permissions)
                throw { statusCode: 401, message: 'No permissions available' }; //Como no hay permisos, entonces no inicializamos la API
            const reminderServiceClient = serviceClientFactory.getReminderManagementServiceClient();
            //Crear estrcutura de recordatorio
            const reminder = logic.createReminderData(date, "Despierta! despierta! Hoy tienes una cita campeón", requestEnvelope.request.locale); 
            const reminderResponse = await reminderServiceClient.createReminder(reminder); //La respuesta incluirá un "token de alerta" que puede usar para referirse a este recordatorio
            //Guardar ID de recordatorio en atributos de sesión
            speechText = "Para el " + date + " tines una cita con " + characterName;
        } catch (error) {
            console.log(JSON.stringify(error));
            switch (error.statusCode) {
                case 401: //El usuario tiene que habilitar los permisos para los recordatorios, adjuntemos una tarjeta de permisos a la respuesta
                    handlerInput.responseBuilder.withAskForPermissionsConsentCard(REMINDERS_PERMISSION);
                    speechText = handlerInput.t('MISSING_PERMISSION_MSG')
                    break;
                case 403: //Los dispositivos como el simulador no admiten la gestión de recordatorios
                    speechText = handlerInput.t('UNSUPPORTED_DEVICE_MSG');
                    break;
                default:
                    speechText = handlerInput.t('REMINDER_ERROR_MSG');
            }
        }
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('CS_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = handlerInput.t('FALLB_MSG');

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = handlerInput.t('ERROR_MSG');
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NumberCharactersIntentHandler,
        StateCharacterIntentHandler,
        CharacterIntentHandler,
        PlanDateIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        interceptors.LocalisationRequestInterceptor,
        interceptors.LoggingRequestInterceptor,
        interceptors.LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
        interceptors.LoggingResponseInterceptor,
        interceptors.SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistence.getPersistenceAdapter())
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();