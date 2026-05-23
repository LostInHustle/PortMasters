# 🚢 PortMasters

> 🌍 **Bilingual Documentation** | [🇨🇳 查看中文文档](README_zh-CN.md)

---

## 📖 1. Overview
Welcome to **PortMasters**! Set sail during the Golden Age of exploration along the historic Maritime Silk Road. Manage resources, hire artisans to craft valuable goods, fulfill trade orders at bustling ports, and navigate economic challenges like taxes and maintenance costs. Your goal is to accumulate wealth and reputation across 8 voyages to become the ultimate trading mogul.

---

## 🛠️ 2. Installation & Running

### ✅ Prerequisites
- **Python 3.8+** installed on your machine.
- **No external libraries required.** Uses standard `tkinter`, `json`, `random` modules.
- **OS:** Windows, macOS, or Linux.

### 🚀 Steps to Run
1. Download or clone the project folder.
2. Open your terminal or command prompt.
3. Navigate to the project directory.
4. Run the main script:
   ```bash
   python PortMasters.py
   ```
   *(Note: Replace `PortMasters.py` with your actual versioned filename if applicable.)*
5. Enjoy your voyage! 🌊

---

## 🎮 3. Gameplay Mechanics

The game spans **8 Voyages**, each divided into **4 Phases**.

| Phase | Description |
|:---|:---|
| **Phase 1** | **Port Purchase**: Buy raw materials or finished goods at ports. |
| **Phase 2** | **Trade Transaction**: Fulfill customer orders for gold & reputation. |
| **Phase 3** | **Maintenance & Wages**: Pay ship upkeep and worker salaries. |
| **Phase 4** | **Ship Upgrade**: Level up your ship to reduce future freight costs. |

### 📦 Resources
- **Raw Materials**
  - `Hemp` – Base material for basic clothing.
  - `Silk` – Premium fabric for high-end goods.
  - `Tea` – Luxury beverage used in sachets.
- **Finished Goods**
  - `Linen Clothes` – Simple clothing (crafted by Weaver).
  - `Cotton Clothes` – Mid-tier clothing (crafted by Weaver).
  - `Brocade` – High-value fabric (crafted by Master Weaver).
  - `Sachet` – Luxury fragrant pouch (crafted by Maker).

### 👷 Worker System
- **Weavers**: Craft Linen & Cotton clothes. Wage: 8 Gold/Round.
- **Master Weavers**: Craft Linen, Cotton & Brocade. Wage: 12 Gold/Round.
- **Sachet Makers**: Craft Sachets only. Wage: 20 Gold/Round.
- **Skilling Up**: Workers gain efficiency after producing enough items, temporarily doubling output at a higher wage.

### 💰 Taxes & Finance
- **VAT**: ~5% on Finished Goods profits.
- **Income Tax**: ~10% on voyage net profit.
- **Freight Costs**: Based on item quantity minus Ship Level discount.  
  Formula: `max(5, Items×2 - ShipLevel×5)`

---

## ⌨️ 4. Controls

### ⚡ Keyboard Shortcuts
| Key | Action |
|:---|:---|
| `Ctrl + S` | Save Game |
| `Ctrl + N` | Next Phase |
| `Ctrl + H` | Worker Management Interface |
| `Ctrl + R` | Restart Game |
| `F1` | Help Instructions |

### 🖱️ Mouse Usage
- Click buttons to confirm actions (Buy, Trade, Upgrade).
- Scroll within panels to view inventory lists.

---

## 💡 5. Strategy Tips
1. **Balance Expenses**: Never spend all gold on purchases. Always reserve funds for wages and maintenance to avoid bankruptcy.
2. **Upgrade Early**: Ship upgrades significantly reduce long-term shipping costs. Invest surplus gold early.
3. **Optimize Workers**: Train workers to "Skilled" status before dismissing them. Their doubled output maximizes ROI per round.
4. **Product Selection**: Finished goods yield higher profit margins than raw materials, but factor in the VAT.
5. **Tax Planning**: Estimate potential Income Tax before accepting high-reward orders.

---

## 🏁 6. Game End & Rankings

After **8 Voyages**, the game ends with a final evaluation based on **Reputation**.

| Reputation | Rank Title |
|:---|:---|
| **≥ 300** | 👑 King of the Silk Road |
| **≥ 200** | 🏆 Maritime Tycoon |
| **≥ 100** | ⭐ Successful Merchant |
| **≥ 50** | 👍 Qualified Trader |
| **< 50** | 🌊 Novice Merchant |

---

## 🛡️ 7. Troubleshooting
- **"Cannot Save Game"**: Ensure the project folder has write permissions. Check if antivirus software is blocking JSON file creation.
- **"Game Crashes on Launch"**: Verify Python version is 3.8+. Older OS versions may lack bundled `tkinter` components.
- **"Black Screen / UI Issues"**: Update your graphics driver or run with admin privileges if DPI scaling causes rendering issues.

---

## 🤝 8. Credits & License
- **Developer**: `Joe Zhou, Aaron Zhu`
- **Version**: `v1.3.4`
- **Language Support**: English & Simplified Chinese
- **License**: MIT License. Free to use, modify, and distribute for personal or commercial projects.

---

## 📌 Quick Reference
- **Launch**: `python PortMasters.py`
- **Core Loop**: Buy ➔ Trade ➔ Pay Wages ➔ Upgrade
- **Top Sellers**: Sachets & Brocade (watch VAT!)
- **Save**: Auto-prompt or `Ctrl+S`
- **Bankruptcy Warning**: Salary > Gold = Game Over
- **Win Condition**: Complete 8 voyages, Rep ≥ 300

---
🌊 *Fair winds and following seas!* 🚩
