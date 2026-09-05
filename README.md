# Mandala Point Counter & Live BGA Assistant 🎴

A tool and Chrome Extension to track scores, cards, and calculate live draw probabilities while playing **Mandala** on [BoardGameArena.com](https://boardgamearena.com).

---

## Features

✨ **Chrome Extension (Live HUD on BoardGameArena)**: Automatically reads the live game log as moves happen in real time without manual copy-pasting!  
🎯 **18-Card Counter & Drawing Probabilities**: Tracks all 18 cards per color (108 total in deck), displaying remaining cards and real-time next-draw chances.  
🕵️ **Opponent Mystery Card Odds**: Computes probability odds of what the opponent's 2 hidden starting cup cards contain.  
📊 **Real-time Scoring & River Ordering**: Automatically arranges rivers in acquisition order (1 → 6 value) and calculates exact scores.  
🧾 **Stand-alone Web App & Log Parser**: Use standalone in `index.html` or paste game logs anytime.  
💾 **Auto-save**: Preserves your state across browser sessions.  

---

## 🚀 How to Install the Chrome Extension

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the `Mandala-helper` folder:
   ```
   /home/jayadevhaddadi/GitHub/Mandala-helper
   ```
5. Open or refresh any active Mandala table on [BoardGameArena.com](https://boardgamearena.com).
6. The **Mandala Helper HUD** will appear on the right side of your screen with live scoring, rivers, and card probabilities!

---

## 🎴 Standalone Web App

You can also run the standalone web application directly:

```bash
# Open index.html in your browser
xdg-open index.html
```

- **Parse Log**: Click **Parse Log**, paste the BGA match log, and click **Process Log**.
- **Card Tracker**: View the live card counts (out of 18) and draw probabilities on the right panel.

---

## 📐 Scoring Rules & Math

- **River Scoring**: $1\text{st color} \times 1\text{ pt}, 2\text{nd color} \times 2\text{ pts}, \dots, 6\text{th color} \times 6\text{ pts}$.
- **Deck Accounting**: 6 colors × 18 cards each = 108 cards.
- **Next Draw Probability**:
  $$P(\text{Draw } C) = \frac{\text{Remaining Cards of Color } C}{\text{Total Unseen Cards in Deck \& Hands}} \times 100\%$$
- **Opponent Hidden Cards Estimation**: Calculates marginal odds of opponent holding at least 1 card of each color in their 2 secret cup cards based on remaining unseen cards.

---

## License

MIT License.
