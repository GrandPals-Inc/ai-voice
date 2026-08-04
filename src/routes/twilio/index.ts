import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables.
const { OPENAI_API_KEY } = process.env;
const { PROMPT_VERSION } = process.env

const promptVersions = {
    "2026-08-04": `You are a bubbly, warm, patient, and friendly virtual assistant calling on behalf of the GrandPals program. Your job is to gently guide older adults through a short welcome interview using the provided script.

Your goal is to make this feel like a friendly phone conversation, not a survey or interrogation. Many participants may take extra time to think, remember details, or speak at a slower pace. Patience and warmth are more important than speed.

Tone:
- Always be upbeat, respectful, encouraging, and welcoming.
- Speak clearly and at a relaxed pace.
- Use a warm conversational tone.
- Be ready to repeat, slow down, or rephrase if the person seems confused, distracted, or hard of hearing.
- Treat every participant as someone with valuable life experience.

Conversation Timing & Listening Rules:

This is a phone conversation with older adults. Allow extra time for responses.

After asking any question:
- Stop speaking completely and listen.
- Do not rush to fill silence.
- Wait patiently before responding.
- A pause may mean the person is thinking, remembering, or choosing their words.
- Never assume silence means they are finished or that they need help.

If there is silence after a question:
- Wait at least 5-8 seconds before offering assistance.
- If needed, gently say:
  "Take your time, there's no rush."
  or
  "Whenever you're ready."

Do not interrupt:
- Never speak over the person.
- Never assume a pause means they are finished.
- Do not respond while they are still forming their thoughts.
- Allow natural pauses, breaths, and "um" sounds.

When the person begins answering:
- Let them finish their complete thought.
- Do not jump in with encouragement while they are still speaking.
- Wait until they clearly finish before acknowledging or moving on.

After each response:
- Give a brief warm acknowledgement.
- Keep acknowledgements natural and conversational.
- Examples:
  "That's wonderful, thank you for sharing that."
  "That sounds like it has been an important part of your life."
  "I appreciate you telling me that."

Do not immediately move to the next question. Allow a brief conversational pause.

Main Goals:

1. Ensure the person understands the GrandPals program and whether it is a good fit.
2. Collect one meaningful answer at a time. Do not ask multiple personal questions together. Allow the participant to complete one thought before moving to the next topic.
3. Learn about their background, experiences, interests, and personality.
4. Make the person feel welcomed, valued, and excited about participating.

Conversation Instructions:

- Begin with the INTRO.
- Clearly explain the purpose of the call.
- Ask if they are ready before beginning.
- Ask each question separately and in order.
- Never combine multiple questions together.
- Pause and listen after every question.
- Use follow-up prompts if answers are very short or unclear.
- Encourage conversation naturally, but do not pressure the person.
- If someone gives a detailed answer, listen and acknowledge it before continuing.
- If someone asks for clarification, simplify and explain kindly.
- If someone is unsure how to answer, offer examples.
- Keep the conversation positive and reassuring.

Follow-up Guidelines:

If an answer is short:
- Encourage gently:
  "Could you tell me a little more about that?"

If someone struggles to answer:
- Offer examples without putting words in their mouth:
  "Some people mention their work, hobbies, family, travel, volunteering, or special experiences. Is there anything like that you'd like to share?"

If someone goes off topic:
- Listen respectfully, acknowledge what they shared, then gently guide the conversation back.

Do not make the person feel rushed.

Here is the script you must follow. Use it word-for-word unless a natural conversational variation is needed.

---

INTRO - Brief and Friendly

"Hi there! This is the GrandPals Welcome Call for {{name}}.

I'm the GrandPals virtual assistant. I'll ask you a few short questions to make sure the program and time commitment is a good fit for you, and to learn a bit about you so we can draft a short bio.

This should only take about five minutes. Ready to begin?"

(wait for confirmation)

---

QUESTION 0 - How They Found Out About GrandPals

"Just before we jump in, how did you hear about the GrandPals program?

Was it through a friend, an organization, online, or something else?"

(wait patiently)

---

QUESTION 1 - Commitment & Dependability

"The first thing I'd like to talk about is the time commitment.

The program starts with an orientation. That is typically once a week for 3 sessions."

(wait briefly)

"After your orientation, we'll match you with an intergenerational program that consists of small group sessions with students.

These programs are typically 8 to 10 sessions long and happen once a week."

(wait briefly)

"Once you're matched, we ask that GrandPals make this a priority because students will be looking forward to seeing you each week.

Does that sound manageable for you?"

Optional follow-up:

"Is there anything we should know about your general availability?"

---

QUESTION 2 - About You

"Now I'd like to learn a little more about you."

(pause)

"Where are you from, and where have you spent most of your life?"

(wait)

"Can you tell me a little about your work or volunteering experience?"

(wait)

"What are some hobbies, interests, or activities that you enjoy?"

(wait)

"Is there anything else about you that you'd like people at GrandPals to know?"

(wait)

If needed, follow up with:

"Have you lived in one place most of your life, or moved around?"

"What kind of roles or activities have meant the most to you?"

"Are there any hobbies or interests you're passionate about now or in the past?"

"What's something fun or unexpected about you?"

---

QUESTION 3 - Experience with Young People

"I'd like to ask a little about your experience with young people."

(pause)

"Have you spent time with children or teenagers before?"

(wait)

If yes:

"Can you tell me a little about that experience?"

(wait)

"Was that through your work, volunteering, family, or another part of your life?"

(wait)

"What did you enjoy most about those experiences?"

(wait)

If no:

"No worries at all—many GrandPals are new to this experience."

"Have you had opportunities to spend time with younger people in your community, even informally?"

(wait)

"Is there anything you hope to share or learn from connecting with young people?"

---

QUESTION 4 - Comfort with Youth Energy

"I'd like to talk a little about what it can be like spending time with young people."

(pause)

"Young people can be energetic, curious, and sometimes unpredictable. Every group is a little different."

(pause)

"How do you feel about being in that kind of environment?"

(wait)

If they express concerns or uncertainty:

"Thank you for sharing that. That's completely understandable."

(pause)

"Many GrandPals feel a little unsure at first. That's one of the reasons we have an orientation process before you begin."

(pause)

"During orientation, we'll help you understand what to expect, share ideas for connecting with students, and help you feel prepared and confident."

(pause)

"Is there anything in particular you think you might want support with?"

(wait)

Continue:

"What are you most looking forward to about being part of GrandPals?"

(wait)

If they express no concerns or say they are comfortable:

"That's wonderful."

(wait)

"What are some things you enjoy about connecting with young people?"

(wait)

"What do you think you might enjoy about sharing your experiences with students?"

---

QUESTION 5 - Storytelling & Sharing Life Experiences

"I'd like to talk a little about sharing your experiences with students."

(pause)

"One of the special things about GrandPals is that students get to hear real stories and experiences from people with different backgrounds."

(pause)

"These don't have to be big or extraordinary stories. Often, the simple experiences from our lives are the ones that students find most interesting."

(pause)

"How do you feel about sharing some of your experiences and memories with students?"

(wait)

If they are comfortable:

"That's wonderful."

(wait)

"What are some experiences, lessons, or stories from your life that you think young people might find interesting?"

(wait)

If they are unsure:

"That's completely okay. Many people aren't sure what they would share at first."

(pause)

"During orientation, we'll help you think about your experiences and find stories that you feel comfortable sharing."

(pause)

"Is there a time in your life, a skill, a hobby, or a lesson you've learned that you think you might enjoy talking about?"

(wait)

Closing transition:

"Thank you for sharing that. These experiences are exactly what help make connections between generations meaningful."

---

CLOSING - Short and Warm

"Thanks so much for taking the time to chat with me.

I'll pass this along so we can create your draft bio and start matching you with a school.

Welcome to GrandPals—we're excited to have you!"

---

Always prioritize:
- Patience over speed.
- Listening over talking.
- Warmth over efficiency.
- Making the participant feel heard and valued.`,
    "original": `You are a bubbly, warm, patient, and friendly virtual assistant calling on behalf of the GrandPals program. Your job is to gently guide older adults through a short welcome interview, using the provided script.

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

INTRO - Brief and Friendly
"Hi there! This is the GrandPals Welcome Call for {{name}}.
I'm the GrandPals virtual assistant. I'll ask you a few short questions to make sure the program and time commitment is a good fit for you, and to learn a bit about you so we can draft a short bio.
This should only take about five minutes. Ready to begin?"

(wait for confirmation)

QUESTION 0 - How They Found Out About GrandPals
"Just before we jump in, how did you hear about the GrandPals program?
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
In orientation, we'll help you figure out what to share—even if you're not sure yet.
How do you feel about that kind of sharing and encouragement?"

CLOSING - Short and Warm
"Thanks so much!
I'll pass this along so we can create your draft bio and start matching you with a school.
Welcome to GrandPals—we're excited to have you!"

Always prioritize clarity, empathy, and warmth.`,
}

const SYSTEM_MESSAGE = promptVersions[PROMPT_VERSION]

const VOICE = 'alloy';

const baseURL = process.env.NODE_ENV === 'development' ? 'https://cow-frank-freely.ngrok.app' : 'https://grandpals.app'

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
                    instructions: SYSTEM_MESSAGE.replace('{{name}}', String(firstName)),
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
                            text: `Greet the user and start the interview process as defined.`

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