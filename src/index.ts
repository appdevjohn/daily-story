import path from 'path'
import express, { Request, Response } from 'express'
import { CronJob } from 'cron'
import OpenAI from 'openai'

type StoryContent = {
  title: string
  story: string
  questions: {
    question: string
    options: string[]
    correctAnswer: number
  }[]
}

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Configure OpenAI client to use local Ollama
const client = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // Ollama doesn't require a real API key
})
const generateStory = async (language: string, level: string): Promise<StoryContent> => {
  console.log(`Generating story for ${language} at ${level} level...`)
  try {
    const response = await client.chat.completions.create({
      model: 'llama3.1:8b',
      messages: [
        {
          role: 'user',
          content: `Write a fable-like story in ${language} at a ${level} language level. The story should be between 300 and 500 words long.

Then create a title for the story and three multiple-choice questions about the story to quiz the reader's comprehension.

You must respond with valid JSON in exactly this format:
{
  "title": "The story title in ${language}",
  "story": "The complete story text in ${language}",
  "questions": [
    {
      "question": "Question text in ${language}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    },
    {
      "question": "Question text in ${language}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1
    },
    {
      "question": "Question text in ${language}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 2
    }
  ]
}

The correctAnswer field should be the index (0-3) of the correct option.
Respond only with the JSON, no additional text.`,
        },
      ],
      response_format: { type: 'json_object' },
    })
    const content: string = response.choices[0]?.message?.content || '{}'
    return JSON.parse(content) as StoryContent
  } catch (error) {
    console.error('Error generating story:', error)
    return {} as StoryContent
  }
}

const job = CronJob.from({
  cronTime: '0 0 * * *', // Run at midnight every day
  onTick: async () => {
    const story = await generateStory('English', 'B1')
    console.log('Generated story:', story)
  },
  start: true,
  timeZone: 'America/Los_Angeles',
})

app.get('/:language/:level', async (req: Request, res: Response) => {
  const { language, level } = req.params
  const content = await generateStory(language, level)
  res.render('index', {
    title: content.title,
    story: content.story,
    questions: content.questions,
  })
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
