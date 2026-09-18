export type GoalAreaId =
  | 'financial'
  | 'health'
  | 'fitness'
  | 'diet'
  | 'relationships'
  | 'education'
  | 'faith'
  | 'craft'
  | 'other'

export type ItemKind = 'do' | 'stop'

export interface GoalQuestion {
  id: string
  kind: ItemKind
  prompt: string
  /** Short chips the user can tap to add as items. */
  examples?: string[]
}

export interface GoalArea {
  id: GoalAreaId
  title: string
  destinationPrompt: string
  questions: GoalQuestion[]
}

export const GOAL_AREAS: GoalArea[] = [
  {
    id: 'financial',
    title: 'Financial',
    destinationPrompt:
      'Where would you like to be financially in 100 days? Be specific — income, savings, debt, business.',
    questions: [
      {
        id: 'financial-business',
        kind: 'do',
        prompt: 'What can you do every day that helps your business?',
      },
      {
        id: 'financial-investments',
        kind: 'do',
        prompt: 'What can you do that strengthens your investments or money knowledge?',
      },
      {
        id: 'financial-skills',
        kind: 'do',
        prompt: 'What work skills can you practice or improve daily?',
      },
      {
        id: 'financial-marketing',
        kind: 'do',
        prompt: 'What can you do for marketing, sales, or entrepreneurship?',
      },
      {
        id: 'financial-savings',
        kind: 'do',
        prompt: 'How can you add to your savings or cut waste?',
      },
      {
        id: 'financial-stop',
        kind: 'stop',
        prompt:
          'What spending or money habits work against that destination? Write things to stop doing.',
      },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    destinationPrompt:
      'Where would you like your health to be in 100 days? Energy, sleep, stress, recovery — name it.',
    questions: [
      {
        id: 'health-sleep',
        kind: 'do',
        prompt: 'What would improve your sleep?',
      },
      {
        id: 'health-stress',
        kind: 'do',
        prompt: 'What reduces stress or protects your mental health?',
      },
      {
        id: 'health-checkups',
        kind: 'do',
        prompt: 'What checkups, care, or recovery habits should you keep?',
      },
      {
        id: 'health-stop',
        kind: 'stop',
        prompt: 'What is actively hurting your health that you need to stop?',
      },
    ],
  },
  {
    id: 'fitness',
    title: 'Fitness',
    destinationPrompt:
      'Where would you like your fitness to be in 100 days? Strength, stamina, consistency — pick a clear finish line.',
    questions: [
      {
        id: 'fitness-cardio',
        kind: 'do',
        prompt: 'What running, walking, or cardio will you do?',
        examples: [
          'Walk a mile',
          'Run a mile',
          'Walk for 20 minutes',
          'Run for 20 minutes',
        ],
      },
      {
        id: 'fitness-strength',
        kind: 'do',
        prompt: 'What strength work will you do?',
        examples: [
          'Do 20 push-ups',
          'Do 50 bodyweight squats',
          'Lift weights for 30 minutes',
        ],
      },
      {
        id: 'fitness-gym',
        kind: 'do',
        prompt: 'Gym, home practice, or movement you will show up for?',
        examples: [
          'Go to the gym',
          'Go to the gym 3 times a week',
          'Stretch for 10 minutes',
        ],
      },
      {
        id: 'fitness-stop',
        kind: 'stop',
        prompt: 'What keeps you from moving — skipping workouts, all-day sitting — that you will stop?',
      },
    ],
  },
  {
    id: 'diet',
    title: 'Diet',
    destinationPrompt:
      'Where would you like your diet to be in 100 days? How you eat, drink, and fuel yourself.',
    questions: [
      {
        id: 'diet-add',
        kind: 'do',
        prompt: 'What will you add to how you eat?',
        examples: [
          'Eat a serving of vegetables with lunch',
          'Drink a full glass of water before coffee',
          'Eat protein with every meal',
        ],
      },
      {
        id: 'diet-how',
        kind: 'do',
        prompt: 'How will you eat — meal prep, portions, timing?',
        examples: [
          'Prep tomorrow\'s lunch tonight',
          'No food after 8pm',
        ],
      },
      {
        id: 'diet-water',
        kind: 'do',
        prompt: 'What will you drink more of — water, or less of something else?',
        examples: [
          'Drink 8 glasses of water',
          'No soda',
        ],
      },
      {
        id: 'diet-stop',
        kind: 'stop',
        prompt: 'What foods, drinks, or eating patterns will you stop?',
      },
    ],
  },
  {
    id: 'relationships',
    title: 'Relationships',
    destinationPrompt:
      'Where would you like your relationships to be in 100 days? Partner, family, friends — who and how.',
    questions: [
      {
        id: 'relationships-partner',
        kind: 'do',
        prompt: 'What can you do for your partner or closest person?',
      },
      {
        id: 'relationships-family',
        kind: 'do',
        prompt: 'What can you do for family?',
      },
      {
        id: 'relationships-friends',
        kind: 'do',
        prompt: 'What can you do for friends?',
      },
      {
        id: 'relationships-show-up',
        kind: 'do',
        prompt: 'How will you show up — call, write, spend time, help?',
      },
      {
        id: 'relationships-stop',
        kind: 'stop',
        prompt:
          'What neglect, distraction, or habits damage connection that you will stop?',
      },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    destinationPrompt:
      'Where would you like to be in learning in 100 days? Skills, reading, courses, practice.',
    questions: [
      {
        id: 'education-skills',
        kind: 'do',
        prompt: 'What skills will you practice?',
      },
      {
        id: 'education-reading',
        kind: 'do',
        prompt: 'What will you read or study?',
        examples: ['Read 10 pages', 'Read for 20 minutes'],
      },
      {
        id: 'education-courses',
        kind: 'do',
        prompt: 'What courses, lessons, or deliberate practice will you keep?',
      },
      {
        id: 'education-stop',
        kind: 'stop',
        prompt: 'What steals your learning time that you will stop?',
      },
    ],
  },
  {
    id: 'faith',
    title: 'Relationship with God',
    destinationPrompt:
      'Where would you like your relationship with God to be in 100 days?',
    questions: [
      {
        id: 'faith-prayer',
        kind: 'do',
        prompt: 'What will you do for prayer?',
        examples: ['Pray for 10 minutes', 'Pray first thing in the morning'],
      },
      {
        id: 'faith-scripture',
        kind: 'do',
        prompt: 'What will you do for scripture or study?',
        examples: ['Read a chapter of scripture', 'Study scripture for 15 minutes'],
      },
      {
        id: 'faith-community',
        kind: 'do',
        prompt: 'What about church, community, or fellowship?',
      },
      {
        id: 'faith-service',
        kind: 'do',
        prompt: 'How will you serve?',
      },
      {
        id: 'faith-stop',
        kind: 'stop',
        prompt: 'What crowds that out that you will stop?',
      },
    ],
  },
  {
    id: 'craft',
    title: 'Craft and art',
    destinationPrompt:
      'Where would you like your craft or art to be in 100 days? Practice, making, sharing the work.',
    questions: [
      {
        id: 'craft-practice',
        kind: 'do',
        prompt: 'What practice will you keep?',
      },
      {
        id: 'craft-making',
        kind: 'do',
        prompt: 'What will you make or create?',
      },
      {
        id: 'craft-share',
        kind: 'do',
        prompt: 'How will you share the work — publish, perform, show someone?',
      },
      {
        id: 'craft-stop',
        kind: 'stop',
        prompt: 'What keeps you from the craft that you will stop?',
      },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    destinationPrompt:
      'Anything else you want to be true in 100 days that did not fit above?',
    questions: [
      {
        id: 'other-do',
        kind: 'do',
        prompt: 'What else will you do every day — or often — to get there?',
      },
      {
        id: 'other-stop',
        kind: 'stop',
        prompt: 'What else will you stop doing?',
      },
    ],
  },
]

export const GOAL_AREA_IDS = GOAL_AREAS.map(a => a.id)

export function getGoalArea(id: string): GoalArea | undefined {
  return GOAL_AREAS.find(a => a.id === id)
}

export function goalAreaTitle(id: string | null | undefined): string {
  if (!id) return 'Other'
  return getGoalArea(id)?.title ?? 'Other'
}
