export const truthQuestions = [
  "What's your biggest fantasy?",
  "Have you ever had a crush on a friend's partner?",
  "What's the most embarrassing thing you've done on a date?",
  "What's a secret you've never told anyone?",
  "What's your guilty pleasure?",
  "Have you ever lied to get out of a date?",
  "What's your biggest turn-on?",
  "What's the craziest thing you've done for love?",
  "Have you ever been caught doing something naughty?",
  "What's your most romantic memory?",
];

export const dareActions = [
  "Send a flirty selfie right now",
  "Do your best sexy dance for 30 seconds",
  "Whisper something sweet into the camera",
  "Strike your most confident pose",
  "Blow a kiss to the camera",
  "Share a secret talent",
  "Give your best compliment",
  "Do an impression of someone famous",
  "Show off your favorite outfit",
  "Tell a joke and make me laugh",
];

export function getRandomTruth(): string {
  return truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
}

export function getRandomDare(): string {
  return dareActions[Math.floor(Math.random() * dareActions.length)];
}
