# 🚢 PortMasters

> 🌍 **Bilingual Documentation** | [🇨🇳 Chinese Documentation](README_zh-CN.md)

---

## 📖 1. Overview

Welcome to **PortMasters**! Set sail during the Golden Age of exploration along the historic Maritime Silk Road. Manage resources, hire artisans to craft valuable goods, fulfill trade orders at bustling ports, and navigate economic challenges like taxes and maintenance costs. Your goal is to accumulate wealth and reputation across 8 voyages to become the ultimate trading mogul.

---

## 🛠️ 2. Running the Game

Version **v1.4.0** is a web game with two entry pages, English and Simplified Chinese, running on one shared engine.

Files:

- `PortMasters_Web_Edition/PortMasters_v1.4.0.html` (English)
- `PortMasters_Web_Edition/PortMasters_MandarinEdition_v1.4.0.html` (Simplified Chinese)

No build step and no dependencies. Double click either entry file to open it in any modern browser. The entry pages load their stylesheets and scripts from the `css/` and `js/` folders beside them, so keep the `PortMasters_Web_Edition` folder together when copying or moving it. Progress is saved in the browser's local storage. On first launch the game shows a short beginner tutorial with a step by step guide to your first voyage; press F1 at any time for the full rulebook.

### 🚀 Optional Local Server

Two small launcher scripts in the project root serve the game at a `localhost` address on port 8020 for players who prefer that over opening the files directly. They use only the Python standard library, so they run on any Python 3.8 or newer with nothing to install:

- `PortMasters_v1.4.0.py` opens the English edition.
- `PortMasters_MandarinEdition_v1.4.0.py` opens the Simplified Chinese edition.

```bash
python3 PortMasters_v1.4.0.py
```

The script starts a local web server for the `PortMasters_Web_Edition` folder, opens your default browser at `http://localhost:8020/`, and prints a ready message. The message also shows the address other devices on your network can use, so a phone or tablet on the same network can play too. macOS may ask once whether Python may accept incoming connections; choose Allow for network play, and prefer not to leave the server running on public networks. Press `Ctrl+C` in the terminal to stop the server. If port 8020 is already taken, pass a different port as an argument, for example `python3 PortMasters_v1.4.0.py 8021`.

### 🧱 Project Layout

```
PortMasters/
├── PortMasters_v1.4.0.py                    # English launcher for the local server
├── PortMasters_MandarinEdition_v1.4.0.py    # Simplified Chinese launcher
├── README.md, README_zh-CN.md               # this documentation, in both languages
├── tests/                                   # Node test suite (see section 7)
└── PortMasters_Web_Edition/
    ├── PortMasters_v1.4.0.html                  # English entry page
    ├── PortMasters_MandarinEdition_v1.4.0.html  # Simplified Chinese entry page
    ├── css/
    │   ├── tokens.css        # colour and sizing variables
    │   ├── base.css          # layout, panels, typography
    │   └── components.css    # buttons, cards, modals, effect animations
    └── js/
        ├── lang/
        │   ├── en.js         # English language pack
        │   └── zh.js         # Simplified Chinese language pack
        ├── core/
        │   ├── utils.js      # random helpers, escaping, logging
        │   ├── content.js    # neutral content tables, expanded per language
        │   ├── state.js      # initial state, save and load
        │   ├── economy.js    # costs, taxes, order and card generation
        │   ├── actions.js    # purchases, hiring, production, wages
        │   ├── effects.js    # sound, screen shake, particles
        │   └── phases.js     # the phase machine, boons, module drafting
        ├── ui/
        │   ├── render.js     # the four main panels
        │   ├── screens.js    # one renderer per phase
        │   └── modals.js     # guide, rumor board, tips, tutorial
        └── main.js           # boot, keyboard shortcuts, handler wiring
```

The two editions share every line of game logic and styling. A language pack supplies the strings, item names, and prose templates; the English and Chinese pages differ only in which pack they load and a few language specific style overrides.

---

## 🎮 3. Gameplay Mechanics

The game spans **8 Voyages**, each divided into **4 Phases**:

- **Phase 1, Port Purchase**: Buy raw materials or finished goods at ports, and optionally buy demand rumors from the Broker's Rumor Board.
- **Phase 2, Trade Transaction**: Fulfill customer orders for gold and reputation.
- **Phase 3, Maintenance & Wages**: Pay ship upkeep and artisan wages, and settle production.
- **Phase 4, Shipyard & Modules**: Upgrade your ship to lower freight costs and unlock module slots.
- Each voyage opens with a **boon draft** from the Navigator's Compass. Three offers are drawn from a weighted pool that reads your current situation, you lock in one, and its effect lasts the whole voyage: purchase or freight discounts, extra production, tax relief, instant gold, cheaper hires, and more.

### ⚓ Ship Upgrades & Modules

- Upgrading the ship (up to level 3) adds one module slot per level and raises the freight discount.
- **8 module types** exist: Smuggler's Hold, Bulk Hauler Rigging, Artisan's Workshop, Tax Evasion Ledger, Silk Road Monopoly, Broker's Network, Salvage Crane, and Overdrive Engine. Each bends a different rule of the economy to create synergies.
- Phase 4 offers a **draft batch of 3 modules**. You may install one, or swap one for an equipped module, as often as you like during the phase.
- **The draft batch may be changed exactly once per voyage.** Leaving the draft screen and returning shows the same batch; it never rerolls on its own. A button on the draft screen spends the single change, and is disabled afterwards until the next voyage.

### 📦 Resources

- **Raw Materials**
  - `Hemp`, base material for basic clothing.
  - `Silk`, premium fabric for luxury goods.
  - `Tea`, luxury beverage used in sachets.
- **Finished Goods**
  - `Linen Clothes`, simple clothing (crafted by Weaver).
  - `Cotton Clothes`, mid tier clothing (crafted by Weaver).
  - `Brocade`, high value fabric (crafted by Master Weaver).
  - `Sachet`, luxury fragrant pouch (crafted by Sachet Maker).

### 👷 Artisan System

- **Weavers**: Make Linen Clothes or Cotton Clothes. Wage: 8 Gold/Voyage.
- **Master Weavers**: Make Linen Clothes, Cotton Clothes, or Brocade. Wage: 12 Gold/Voyage.
- **Sachet Makers**: Make Sachets only. Wage: 20 Gold/Voyage.
- **Skilling Up**: Artisans gain efficiency after producing enough items, doubling output at a 50% higher wage. Hired artisans keep any hire discount from the active boon for their first wage payment.

### 💰 Taxes & Finance

- **VAT**: about 5% on Finished Goods profits.
- **Income Tax**: about 10% on voyage net profit.
- **Freight Costs**: based on item quantity, reduced by the ship level discount.  
  Formula: `max(5, Items×2 minus ShipLevel×5)`

---

## ⌨️ 4. Controls

### ⚡ Keyboard Shortcuts

- `Ctrl + S` saves the game.
- `Ctrl + N` advances to the next phase.
- `Ctrl + H` opens the artisan management interface during Phase 1.
- `Ctrl + R` restarts the game.
- `F1` opens the full instructions.

### 🖱️ Mouse Usage

- Click buttons to confirm actions (Buy, Trade, Upgrade).
- Scroll within panels to view inventory lists.
- The game opens the beginner tutorial automatically on first launch; it can be skipped and reopened from the welcome screen.

---

## 💡 5. Strategy Tips

1. **Balance Expenses**: Never spend all gold on purchases. Always reserve funds for wages and maintenance to avoid bankruptcy.
2. **Upgrade Early**: Ship upgrades significantly reduce long term shipping costs. Invest surplus gold early.
3. **Optimize Artisans**: Train artisans to "Skilled" status before dismissing them. Their doubled output maximizes ROI per voyage.
4. **Product Selection**: Finished goods yield higher profit margins than raw materials, but factor in the VAT.
5. **Module Discipline**: You get one batch change per voyage, so install or swap first, then decide whether the single reroll is worth it.
6. **Tax Planning**: Estimate potential Income Tax before accepting high reward orders.

---

## 🏁 6. Game End & Rankings

After **8 Voyages**, the game ends with a final evaluation based on **Reputation**:

- **Rep ≥ 300**: 👑 King of Silk Road
- **Rep ≥ 200**: 🏆 Maritime Tycoon
- **Rep ≥ 100**: ⭐ Successful Merchant
- **Rep ≥ 50**: 👍 Qualified Trader
- **Rep < 50**: 🌊 Novice Merchant

---

## 🧪 7. Tests

The project ships a dependency free test suite that runs on Node 16 or newer:

```bash
node tests/run.js
```

It covers unit checks of the economy formulas, a probe for every ship module and every boon that pins down the effect each one has on the engine, smoke checks that every page loads only files that exist and that the engine boots with a complete handler surface, verification checks that the figures on the screens match the money the engine actually moves and that no screen, log line, or entry page shows a dash character, and integration scenarios that replay full games in both languages and compare every rendered panel, log line, and game state against recordings taken from the pre refactor build. The recordings live in `tests/fixtures/` and can be recorded again with `node tests/run.js --update` after an intentional gameplay or UI change. See `tests/README.md` for the full details and the list of intentional differences between the old and new builds.

---

## 🛡️ 8. Troubleshooting

- **"Cannot Save Game"**: allow the site to store data if the browser asks, and check that local storage is not blocked in private browsing windows.
- **"Blank Page on Launch"**: make sure the `css/` and `js/` folders sit next to the entry HTML file, and open the page in a current browser.
- **"Old Progress Looks Different"**: saves written before v1.4.0 still load; item names and save keys are unchanged.
- **Launcher Says the Port Is in Use**: another program holds port 8020. Close it, or start the launcher with a free port, for example `python3 PortMasters_v1.4.0.py 8021`.
- **"Network Address Does Not Open"**: `localhost` works but the printed network address does not. On macOS, allow incoming connections for Python when the firewall prompts (System Settings, Network, Firewall), and make sure the server was started with the current launcher: instances started before v1.4.0's LAN support listen on `localhost` only and need a restart. Guest and public networks may block traffic between devices entirely.

---

## 🤝 9. Credits & License

- **Developer**: `Joe Zhou, Aaron Zhu`
- **Version**: `v1.4.0`
- **Language Support**: English & Simplified Chinese
- **License**: MIT License. Free to use, modify, and distribute for personal or commercial projects.

---

## 📌 Quick Reference

- **Launch**: open `PortMasters_Web_Edition/PortMasters_v1.4.0.html` in a browser, or run `python3 PortMasters_v1.4.0.py` for a local server on port 8020, reachable from other devices on the same network
- **Core Loop**: Buy ➔ Trade ➔ Pay Wages ➔ Upgrade
- **Top Sellers**: Sachets & Brocade (watch VAT!)
- **Save**: automatic prompt or `Ctrl+S`
- **Module Draft**: one batch change per voyage, navigation never rerolls
- **Bankruptcy Warning**: Salary > Gold = Game Over
- **Win Condition**: Complete 8 voyages, Rep ≥ 300

---

🌊 _Fair winds and following seas!_ 🚩
