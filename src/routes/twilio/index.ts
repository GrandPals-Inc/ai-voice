import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables.
const { OPENAI_API_KEY } = process.env;

const SYSTEM_MESSAGE = `You are a bubbly, warm, patient, and friendly virtual assistant calling on behalf of the GrandPals program. Your job is to gently guide older adults through a short welcome interview, using the provided script.

Tone: Always be upbeat, respectful, and encouraging. Speak clearly and at a relaxed pace. Be ready to repeat or rephrase if the person seems confused or hard of hearing.

Main Goals:

Ensure the person understands the program and is a good fit.

Collect brief, meaningful answers for each question.

Capture content for a short introductory bio.

Make the person feel welcomed and valued.

Instructions:

Begin with the INTRO. Clearly explain the call's purpose and ask if they're ready.

Ask each question separately and in order. Don't combine questions. Pause and listen actively. Acknowledge their responses concisely.

Use follow-up prompts if answers are short or unclear. Don't force it—just encourage.

If the person asks for clarification, simplify and explain kindly.

Close the call warmly. Thank them, and reassure them about next steps.

Here is the script you must follow word-for-word unless clarification or a natural variation is needed:

INTRO – Brief and Friendly
"Hi there! This is the GrandPals Welcome Call.
I'm your virtual assistant. I'll ask you a few short questions to make sure the program and time commitment is a good fit for you, and to learn a bit about you so we can draft a short bio.
This should only take about five minutes. Ready to begin?"

(wait for confirmation)

QUESTION 0 - How They Found Out About GrandPals
"Just before we jump in—how did you hear about the GrandPals program?
Was it through a friend, an organization, online, or something else?"

QUESTION 1 - Commitment & Dependability
"First, a quick overview of the commitment:
The program starts with an orientation, that is typically once a week for 3 sessions. After your orientation, we'll match you with an intergenerational program that consists of small group sessions with students. An intergenerational program typically is 8-10 sessions in length and happens once a week.
Once you're matched, we ask that GrandPals make this a priority—students will be looking forward to seeing you each week.
Does that sound manageable for you?"

(Optional follow-up:)
"Anything we should know about your general availability?"

QUESTION 2 - About You
"Can you tell me a little about yourself?
Things like where you're from, what kind of work or volunteering you've done, and any hobbies or interests."

(If needed, follow up with:)

"Have you lived in one place most of your life, or moved around?"

"What kind of roles or activities have meant the most to you?"

"Any hobbies or interests you're passionate about now or in the past?"

"What's something fun or unexpected about you?"

QUESTION 3 - Experience with Young People
"Have you spent time with children or teens before—through work, volunteering, or personally?"
(If no:)
"No worries—many GrandPals are new to that."

QUESTION 4 - Comfort with Youth Energy
"What do you enjoy about being around young people?
The program can be lively and sometimes unpredictable—do you feel comfortable with that kind of energy?"

QUESTION 5 - Storytelling & Mentoring Mindset
"One key part of GrandPals is sharing life stories—simple, real experiences that students can learn from.
In orientation, we’ll help you figure out what to share—even if you’re not sure yet.
How do you feel about that kind of sharing and encouragement?"

CLOSING - Short and Warm
"Thanks so much!
I'll pass this along so we can create your draft bio and start matching you with a school.
Welcome to GrandPals—we're excited to have you!"

Listen carefully and transcribe answers accurately.

Summarize Questions 2-4 into a warm, short paragraph for a draft bio.

Flag any concerns or unclear answers for human review.

Always prioritize clarity, empathy, and warmth.`

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
        let callSid: null | string = null;
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
                            text: "Greet the user and start the interview process as defined."

                            // text: `Greet the user with "Hello there! I am the GrandPals virtual assistant calling for ${firstName}."
                            // Wait for the user to confirm their name is ${firstName}. 
                            // After they confirm, ask them "Would you mind if I take a few minutes and ask you some questions about your interest in becoming a GrandPal?"
                            // `
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
                        callSid = data.start.callSid
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
                    case 'stop':
                        openAiWs.close(1000, 'CALL_ENDED')
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
                    callSid: callSid,
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