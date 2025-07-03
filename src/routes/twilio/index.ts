import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables.
const { OPENAI_API_KEY } = process.env;

const SYSTEM_MESSAGE = `
# Personality and tone
You are a helpful and bubbly virtual assistant who interviews seniors (older adults) who are interested in the GrandPals program. 

## Task
- You are here to welcome new older adults to the program and perform a short onboarding call to find out if the GrandPals Program is a good fit for them.
- The older adults you are interviewing are hoping to become mentors in a program that would place them with elementary age students in a classroom setting.
- You are trying to get a sense of if they are the right fit for that environment, based on their background, comfortability with children, and mental state.

## Tone
Always stay positive, and try to keep it light.

## Interview Questions to start with
- How did you hear about GrandPals?
- What excites you about becoming a GrandPal? 

# Context
- Business name: GrandPals
- Volunteer role: GrandPal
- Orientation: An in-person weekly series consisting of three individual sessions
- Program: The intergenerational sessions consisting of 8 individual themed sessions, starting with a "meet and greet" and ending with a "celebration" 
`;


// These seniors are hoping to become mentors in a program that would place them with elementary age students in a classroom setting.
// You are trying to get a sense of if they are the right fit for that environment, based on their background, comfortability with children, and mental state.
// Start by explaining the overview of the GrandPals Program: their next steps will be to complete a Vulnerable Sector Check, attend in-person orientation (orientation consists of 3 sessions of one and a half hours in length), and then sign up for an in-person GrandPals program (the GrandPals program brings together a group or cohort of GrandPals/seniors and a group or cohort of elementary age students in weekly intergenerational sessions. The GrandPals Program session series starts with the first session being a "Meet & Greet", followed by themed sessions, and the final session is a celebration.)
// Always stay positive, and try to keep it light.

const VOICE = 'alloy';

const baseURL = 'https://cow-frank-freely.ngrok.app'

// Show AI response elapsed timing calculations
const SHOW_TIMING_MATH = false;

// List of Event Types to log to the console. See the OpenAI Realtime API Documentation: https://platform.openai.com/docs/api-reference/realtime
const LOG_EVENT_TYPES = [
    'error',
    'response.content.done',
    'rate_limits.updated',
    'response.done',
    'response.audio_transcript.done',
    'conversation.item.input_audio_transcription.completed',
    'input_audio_buffer.committed',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.speech_started',
    'session.created'
];


const twilio: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.get('/media-stream', { websocket: true }, (connection, req) => {

        console.log('Client connected');

        // Connection-specific state
        let streamSid: null | string = null;
        let userId: null | string = null;
        let firstName: null | string = null;
        let lastName: null | string = null;
        let latestMediaTimestamp = 0;
        let lastAssistantItem: null | string = null;
        let markQueue: string[] = [];
        let responseStartTimestampTwilio: null | number = null;
        const transcription: any[] = []
        const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1"
            }
        });

        // Control initial session with OpenAI
        const initializeSession = () => {
            const sessionUpdate = {
                type: 'session.update',
                session: {
                    turn_detection: { type: 'server_vad' },
                    input_audio_format: 'g711_ulaw',
                    input_audio_transcription: {
                        model: 'whisper-1'
                    },
                    output_audio_format: 'g711_ulaw',
                    voice: VOICE,
                    instructions: SYSTEM_MESSAGE,
                    modalities: ["text", "audio"],
                    temperature: 0.8,
                }
            };

            console.log('Sending session update:', JSON.stringify(sessionUpdate));
            openAiWs.send(JSON.stringify(sessionUpdate));

            // Uncomment the following line to have AI speak first:
            sendInitialConversationItem();
        };

        // Send initial conversation item if AI talks first
        const sendInitialConversationItem = () => {
            const initialConversationItem = {
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: `Greet the user with "Hello there! I am the GrandPals virtual assistant calling for ${firstName}."  Wait for the user to confirm their name is ${firstName} and after they confirm, ask them "Would you mind if I take a few minutes and ask you some questions about your interest in becoming a GrandPal?"`
                        }
                    ]
                }
            };

            if (SHOW_TIMING_MATH) console.log('Sending initial conversation item:', JSON.stringify(initialConversationItem));
            openAiWs.send(JSON.stringify(initialConversationItem));
            openAiWs.send(JSON.stringify({ type: 'response.create' }));
        };

        // Handle interruption when the caller's speech starts
        const handleSpeechStartedEvent = () => {
            if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
                const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
                if (SHOW_TIMING_MATH) console.log(`Calculating elapsed time for truncation: ${latestMediaTimestamp} - ${responseStartTimestampTwilio} = ${elapsedTime}ms`);

                if (lastAssistantItem) {
                    const truncateEvent = {
                        type: 'conversation.item.truncate',
                        item_id: lastAssistantItem,
                        content_index: 0,
                        audio_end_ms: elapsedTime
                    };
                    if (SHOW_TIMING_MATH) console.log('Sending truncation event:', JSON.stringify(truncateEvent));
                    openAiWs.send(JSON.stringify(truncateEvent));
                }

                connection.send(JSON.stringify({
                    event: 'clear',
                    streamSid: streamSid
                }));

                // Reset
                markQueue = [];
                lastAssistantItem = null;
                responseStartTimestampTwilio = null;
            }
        };

        // Send mark messages to Media Streams so we know if and when AI response playback is finished
        const sendMark = (connection: WebSocket.WebSocket, streamSid: string) => {
            if (streamSid) {
                const markEvent = {
                    event: 'mark',
                    streamSid: streamSid,
                    mark: { name: 'responsePart' }
                };
                connection.send(JSON.stringify(markEvent));
                markQueue.push('responsePart');
            }
        };

        // Open event for OpenAI WebSocket
        openAiWs.on('open', () => {
            console.log('Connected to the OpenAI Realtime API');
            setTimeout(initializeSession, 100);
        });

        // Listen for messages from the OpenAI WebSocket (and send to Twilio if necessary)
        openAiWs.on('message', (data: string) => {
            try {
                const response = JSON.parse(data);

                if (LOG_EVENT_TYPES.includes(response.type)) {
                    console.log(`Received event: ${response.type}`, JSON.stringify(response, null, 2));
                }

                if (response.type === 'response.audio.delta' && response.delta) {
                    const audioDelta = {
                        event: 'media',
                        streamSid: streamSid,
                        media: { payload: response.delta }
                    };
                    connection.send(JSON.stringify(audioDelta));

                    // First delta from a new response starts the elapsed time counter
                    if (!responseStartTimestampTwilio) {
                        responseStartTimestampTwilio = latestMediaTimestamp;
                        if (SHOW_TIMING_MATH) console.log(`Setting start timestamp for new response: ${responseStartTimestampTwilio}ms`);
                    }

                    if (response.item_id) {
                        lastAssistantItem = response.item_id;
                    }

                    sendMark(connection, String(streamSid));
                }

                if (response.type === 'input_audio_buffer.speech_started') {
                    handleSpeechStartedEvent();
                }

                if (response.type === 'conversation.item.input_audio_transcription.completed') {
                    transcription.push({
                        name: 'GrandPal',
                        said: response.transcript
                    })
                }
                if (response.type === 'response.audio_transcript.done') {
                    transcription.push({
                        name: 'AI',
                        said: response.transcript
                    })
                }

            } catch (error) {
                console.error('Error processing OpenAI message:', error, 'Raw message:', data);
            }
        });

        // Handle incoming messages from Twilio
        connection.on('message', (message: string) => {
            try {
                const data = JSON.parse(message);

                switch (data.event) {
                    case 'media':
                        latestMediaTimestamp = data.media.timestamp;
                        if (SHOW_TIMING_MATH) console.log(`Received media message with timestamp: ${latestMediaTimestamp}ms`);
                        if (openAiWs.readyState === WebSocket.OPEN) {
                            const audioAppend = {
                                type: 'input_audio_buffer.append',
                                audio: data.media.payload
                            };
                            openAiWs.send(JSON.stringify(audioAppend));
                        }
                        break;
                    case 'start':
                        streamSid = data.start.streamSid;
                        userId = data.start.customParameters.userId;
                        firstName = data.start.customParameters.firstName;
                        lastName = data.start.customParameters.lastName;
                        console.log('Incoming stream has started', streamSid, userId, firstName, lastName);


                        if (!streamSid) {
                            connection.close(1000, 'UNAUTHORIZED')
                        }

                        fetch(`${baseURL}/api/twilio/interview`, {
                            method: 'POST',
                            body: JSON.stringify({
                                userId,
                                _action: 'CALL_STARTED',
                            })
                        });
                        // Reset start and media timestamp on a new stream
                        responseStartTimestampTwilio = null;
                        latestMediaTimestamp = 0;
                        break;
                    case 'mark':
                        if (markQueue.length > 0) {
                            markQueue.shift();
                        }
                        break;
                    default:
                        console.log('Received non-media event:', data.event);
                        break;
                }
            } catch (error) {
                console.error('Error parsing message:', error, 'Message:', message);
            }
        });

        // Handle connection close
        connection.on('close', () => {
            if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
            console.log('Client disconnected.');
        });

        // Handle WebSocket close and errors
        openAiWs.on('close', () => {
            console.log('Disconnected from the OpenAI Realtime API');
            console.log(transcription)
            fetch(`${baseURL}/api/twilio/interview`, {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    _action: 'CALL_COMPLETE',
                    transcription
                })
            });

        });

        openAiWs.on('error', (error) => {
            console.error('Error in the OpenAI WebSocket:', error);
        });
    });
};

export default twilio;