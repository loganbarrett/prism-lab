/* Study configuration for Musical Tinder. Edit this file; no build step.
 *
 * collect.enabled false : plain game. No consent screen, nothing recorded or sent; the player can download their own CSV.
 * collect.enabled true  : consent screen first. If the player agrees, results are sent to the lab as they go.
 *                         With no endpoint set, nothing is sent and the page says so; the player can still download a CSV.
 *
 * The page is public, so everything in this file is public too. The token only blocks casual spam (see apps_script/README.md).
 */
window.MT_CONFIG = {
  study: 'Musical Tinder',

  collect: {
    enabled: true,
    endpoint: 'https://script.google.com/macros/s/AKfycbz4N1lNOggsgVBnKWWfmGaOf4bDqq1d9ZnOnUnAJofvIf99LbldYIYo3So8X59YAjWojg/exec',      // Web app URL of your deployed Apps Script, e.g. 'https://script.google.com/macros/s/AKfy.../exec'
    token: 'wYCoNsHBRkPe98FsGcjmlyUwxWv2vsmxjgr3Ryxi_vk',         // the same TOKEN you put in apps_script/Code.gs
  },

  // Background questions, asked once right after the player agrees to take part (never to "just play" players).
  // Every question is optional. The answers are saved with the data: one `demo_<id>` column per question in the
  // swipes CSV, and a "demographics" block in the session JSON. Edit, add or remove questions freely, but keep
  // consent.html in step with what you ask. `id` becomes the column name (letters, digits, underscore).
  //   type: 'select' (choose one of `options`), 'number' (optional min/max) or 'text'
  demographics: {
    enabled: true,
    title: 'A little about you',
    intro: 'These questions help us understand how music taste varies between people. All of them are optional. Your answers are saved anonymously with your results.',
    questions: [
      {id: 'age', label: 'Your age in years', type: 'number', min: 18, max: 110},
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

  // People under 18. The player is asked their age on the start page, before consent.
  //   enabled false : under-18s cannot take part in the study (they can still "just play"; nothing is saved).
  //   mode 'separate' : they can take part with a parent or guardian's agreement; their files go to the Drive folder
  //                     "Under_18" (adults go to "Adults"), their participant ID carries U18, and every row has
  //                     age_group = under18, so they are easy to leave out of analysis.
  //   mode 'noCollect': they play, but nothing is recorded or sent (the simplest option to get approved).
  //   minAge          : under this age nothing is collected even in 'separate' mode (e.g. 13).
  //   keepQuestions   : which background questions minors are asked (null = all). Age always comes from the start page.
  // Collecting data from children needs IRB approval of the wording below and of the parent/guardian process.
  minors: {
    enabled: true,
    mode: 'separate',
    minAge: 0,
    consentFile: 'consent_minor.html',
    consentVersion: 'MT-Minor-Consent-IRB20261103-2026-11-26',
    participantPrefix: 'MT_U18_',
    keepQuestions: ['gender', 'music_training', 'music_making', 'listening_hours', 'device'],
  },

  consentFile: 'consent.html',

  // Written into every data file. While this contains the word DRAFT the start page shows a "draft consent" warning,
  // so a test build cannot quietly go live. Change it (and the consent text) together once the IRB approves.
  consentVersion: 'MT-Consent-IRB20261103-2026-11-26',

  // Participant IDs look like MT_7K3QZ9AB. Adding ?p=123 to the page address uses MT_123 instead
  // (handy for Prolific, a class, or when you hand out numbers yourself).
  participantPrefix: 'MT_',
};
