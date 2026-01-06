# Mandala Point Counter 🎴

A web-based tool to help count points while playing the board game **Mandala** on [BoardGameArena.com](https://boardgamearena.com).

## About Mandala

Mandala is a two-player card game featuring 6 colors (Red, Green, Blue, Yellow, Purple, Orange), with each color having cards numbered 1-9. Players collect cards and score points based on the unique cards they gather in their mountain (scoring pile).

### Scoring Rules

- For each color, you score points equal to the **number of unique cards** you have in that color
- Your total score is the sum of points from all six colors
- Example: If you have 3 red cards, 5 blue cards, and 2 yellow cards, your score is 3 + 5 + 2 = 10 points

## Features

✨ **Easy Card Tracking**: Simple +/- buttons to track cards for each color  
📊 **Real-time Scoring**: Automatically calculates and displays scores  
💾 **Auto-save**: Your game progress is saved automatically in your browser  
🎯 **Clean Interface**: Intuitive design for easy use during gameplay  
📱 **Responsive**: Works on desktop, tablet, and mobile devices  

## How to Use

### Getting Started

1. **Open the Tool**: Simply open `index.html` in your web browser
2. **Enter Player Names**: (Optional) Enter custom names for each player
3. **Track Cards**: As players collect cards in their mountains, click the **+** button next to the corresponding color
4. **View Scores**: Scores are automatically calculated and displayed for each player

### During Gameplay

- **Add a Card**: Click the **+** button next to a color when a player collects a card
- **Remove a Card**: Click the **−** button if you made a mistake
- **Reset Game**: Click the **Reset Game** button to start over
- **Help**: Click the **How to Use** button for in-app instructions

### Tips

- Track cards as they enter each player's mountain (scoring pile)
- The tool prevents you from exceeding 9 cards per color (the maximum in the game)
- Your progress is automatically saved, so you can close and reopen the tool without losing data
- Use this tool alongside your game on BoardGameArena.com for accurate scoring

## Installation

No installation required! This is a standalone web application.

### Local Use

1. Clone this repository:
   ```bash
   git clone https://github.com/JayadevHaddadi/Mandala-helper.git
   cd Mandala-helper
   ```

2. Open `index.html` in your web browser:
   ```bash
   # On macOS
   open index.html
   
   # On Linux
   xdg-open index.html
   
   # On Windows
   start index.html
   ```

### Online Use

You can also host this on any web server or use GitHub Pages:

1. Go to your repository settings
2. Enable GitHub Pages
3. Select the main branch as the source
4. Access your tool at `https://yourusername.github.io/Mandala-helper/`

## Technical Details

- **Pure HTML/CSS/JavaScript**: No dependencies or build process required
- **LocalStorage**: Game state is saved in browser's localStorage
- **Responsive Design**: CSS Grid and Flexbox for modern, responsive layout
- **Accessible**: Semantic HTML and clear visual design

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Game designed by Trevor Benjamin and Brett J. Gilbert
- Published by Lookout Games
- Available to play on [BoardGameArena.com](https://boardgamearena.com)

---

**Enjoy your Mandala games with easier point tracking!** 🎴✨
