/* Study configuration for Speech or Song?. Edit this file; no build step.
 *
 * Task settings (under `task`) default to one judgement per phrase. Set design: 'repeat' for the speech-to-song
 * paradigm (judge, then hear the phrase repeat and judge again).
 *
 * collect.enabled false : plain game. No consent screen, nothing recorded or sent; the player can download their own CSV.
 * collect.enabled true  : age + consent first. If the player agrees, results are sent to the lab as they go.
 *
 * This study currently shares the Musical Tinder receiver (same endpoint and token), so its files appear in the same
 * Drive folder, under Adults/SOS_... and Under_18/SOS_U18_.... Deploy a second copy of apps_script/Code.gs with its own
 * folder and token if you want the two studies' data kept apart; then change endpoint and token here.
 * The page is public, so everything in this file is public too.
 */
window.SOS_CONFIG = {
  study: 'Speech or Song?',

  // task: {design: 'single', practice: 2, perRound: 24, minDone: 12},   // defaults are in index.html

  collect: {
    enabled: true,
    endpoint: 'https://script.google.com/macros/s/AKfycbz4N1lNOggsgVBnKWWfmGaOf4bDqq1d9ZnOnUnAJofvIf99LbldYIYo3So8X59YAjWojg/exec',
    token: 'wYCoNsHBRkPe98FsGcjmlyUwxWv2vsmxjgr3Ryxi_vk',
  },

  // Background questions, asked once after the player agrees (never to "just play" players). All optional.
  // One `demo_<id>` column per question in the ratings CSV, plus a "demographics" block in the session JSON.
  demographics: {
    enabled: true,
    title: 'A little about you',
    intro: 'These questions help us understand how people hear speech and song. All of them are optional. Your answers are saved anonymously with your results.',
    questions: [
      {id: 'gender', label: 'Your gender', type: 'select',
       options: ['Woman', 'Man', 'Non-binary', 'Another identity', 'Prefer not to say']},
      {id: 'country', label: 'Country where you live', type: 'text', maxLength: 60},
      {id: 'language', label: 'Your first language (or languages)', type: 'text', maxLength: 60},
      {id: 'music_training', label: 'How many years of formal music lessons or training have you had (any instrument, including voice)?', type: 'select',
       options: ['None', 'Less than 1 year', '1 to 3 years', '4 to 7 years', '8 or more years']},
      {id: 'music_making', label: 'How often do you play an instrument, sing or make music?', type: 'select',
       options: ['Never', 'Rarely', 'Monthly', 'Weekly', 'Daily']},
      {id: 'listening_hours', label: 'On a typical day, how many hours do you listen to music?', type: 'select',
       options: ['Less than 1', '1 to 2', '2 to 4', 'More than 4']},
      {id: 'device', label: 'What are you listening on right now?', type: 'select',
       options: ['Headphones or earbuds', 'Computer or phone speakers', 'Other speakers', 'Not sure']},
      {id: 'hearing', label: 'Do you have any hearing difficulty that could affect how you hear music?', type: 'select',
       options: ['No', 'Yes, a little', 'Yes, quite a lot', 'Prefer not to say']},
    ],
  },

  // People under 18: see musical_tinder/config.js for what each setting does. Needs IRB approval of consent_minor.html.
  minors: {
    enabled: true,
    mode: 'separate',            // 'separate' (own folder) | 'noCollect' (play only)
    minAge: 0,
    consentFile: 'consent_minor.html',
    consentVersion: 'SOS-Minor-Consent-IRB20261103-2026-11-26',
    participantPrefix: 'SOS_U18_',
    keepQuestions: ['gender', 'music_training', 'music_making', 'listening_hours', 'device'],
  },

  consentFile: 'consent.html',
  // Written into every data file. While it contains DRAFT the start page shows a warning. Change it with the consent text.
  consentVersion: 'SOS-Consent-IRB20261103-2026-11-26',
  participantPrefix: 'SOS_',
};
