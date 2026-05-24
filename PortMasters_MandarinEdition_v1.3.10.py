import tkinter as tk
from tkinter import messagebox, ttk
import random
import json
import os
import math
import sys
import threading

# ─────────────────────────────────────────────────────────────────────────────
# 自定义按钮组件 (支持特效回调)
# ─────────────────────────────────────────────────────────────────────────────
class CustomButton(tk.Frame):
    """自定义按钮组件，确保跨平台视觉一致性，修复macOS背景色渲染问题，支持动态文字大小与点击特效。"""
    def __init__(self, parent, text="", command=None, font=None, bg="#424242", fg="white",
                 relief=tk.RAISED, borderwidth=2, padx=15, pady=10, state=tk.NORMAL,
                 cursor="hand2", wraplength=0, juice_callback=None, **kwargs):
        kwargs.pop('width', None)
        kwargs.pop('height', None)
        super().__init__(parent, bg=bg, bd=borderwidth, relief=relief,
                         cursor=cursor if state == tk.NORMAL else "arrow", **kwargs)
        self.command = command
        self.state = state
        self.base_bg = bg
        self.fg = fg
        self.disabled_bg = "#888888"
        self.disabled_fg = "#CCCCCC"
        self.juice_callback = juice_callback
        self.hover_bg = self._adjust_color(self.base_bg, 1.2)
        
        self.label = tk.Label(self, text=text, font=font, bg=self.base_bg, fg=self.fg,
                              padx=padx, pady=pady, wraplength=wraplength, justify=tk.CENTER)
        self.label.pack(fill=tk.BOTH, expand=True)
        
        self._clicking = False
        self._bind_events()
        self._apply_state()

    def _adjust_color(self, hex_color, factor):
        try:
            hex_color = hex_color.lstrip('#')
            r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
            r = min(255, int(r * factor))
            g = min(255, int(g * factor))
            b = min(255, int(b * factor))
            return f"#{r:02x}{g:02x}{b:02x}"
        except:
            return hex_color

    def _bind_events(self):
        for widget in (self, self.label):
            widget.bind("<Enter>", self.on_enter)
            widget.bind("<Leave>", self.on_leave)
            widget.bind("<Button-1>", self.on_click)
            widget.bind("<ButtonRelease-1>", self.on_release)

    def _unbind_events(self):
        for widget in (self, self.label):
            widget.unbind("<Enter>")
            widget.unbind("<Leave>")
            widget.unbind("<Button-1>")
            widget.unbind("<ButtonRelease-1>")

    def on_enter(self, event):
        if self.state == tk.NORMAL:
            super().config(bg=self.hover_bg)
            self.label.config(bg=self.hover_bg)

    def on_leave(self, event):
        if self.state == tk.NORMAL:
            super().config(bg=self.base_bg)
            self.label.config(bg=self.base_bg)
            self._clicking = False
            super().config(relief=tk.RAISED)

    def on_click(self, event):
        if self.state == tk.NORMAL:
            super().config(relief=tk.SUNKEN)
            self._clicking = True

    def on_release(self, event):
        if self.state == tk.NORMAL and self._clicking:
            self._clicking = False
            super().config(relief=tk.RAISED)
            if self.juice_callback:
                try:
                    cx = self.winfo_rootx() + self.winfo_width() // 2
                    cy = self.winfo_rooty() + self.winfo_height() // 2
                    self.juice_callback(cx, cy)
                except Exception:
                    pass
            if self.command:
                self.command()

    def _apply_state(self):
        if self.state == tk.DISABLED:
            super().config(bg=self.disabled_bg, cursor="arrow", relief=tk.RAISED)
            self.label.config(bg=self.disabled_bg, fg=self.disabled_fg)
            self._unbind_events()
        else:
            super().config(bg=self.base_bg, cursor="hand2", relief=tk.RAISED)
            self.label.config(bg=self.base_bg, fg=self.fg)
            self._bind_events()

    def config(self, **kwargs):
        if "text" in kwargs:
            self.label.config(text=kwargs.pop("text"))
        if "state" in kwargs:
            self.state = kwargs.pop("state")
            self._apply_state()
        if "bg" in kwargs:
            self.base_bg = kwargs.pop("bg")
            self.hover_bg = self._adjust_color(self.base_bg, 1.2)
            if self.state == tk.NORMAL:
                super().config(bg=self.base_bg)
                self.label.config(bg=self.base_bg)
        if "command" in kwargs:
            self.command = kwargs.pop("command")
        if "juice_callback" in kwargs:
            self.juice_callback = kwargs.pop("juice_callback")
        if kwargs:
            super().config(**kwargs)

    def __getitem__(self, key):
        if key == "state":
            return self.state
        if key == "text":
            return self.label.cget("text")
        return super().__getitem__(key)

# ─────────────────────────────────────────────────────────────────────────────
# 自适应标题标签
# ─────────────────────────────────────────────────────────────────────────────
class WrappedTitleLabel(tk.Label):
    """一个Label子类，动态调整wraplength以匹配实际渲染宽度，确保贸易订单窗口中的卡片标题自然换行。"""
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.bind("<Configure>", self._on_configure)

    def _on_configure(self, event):
        self.config(wraplength=max(1, event.width - 20))

# ─────────────────────────────────────────────────────────────────────────────
# 福缘管理器 (加权随机池)
# ─────────────────────────────────────────────────────────────────────────────
class BoonManager:
    def __init__(self, game_state_provider):
        self.game_state_provider = game_state_provider
        self.boons = [
            {
                "id": "silk_wind", "name": "丝路顺风", "icon": "🌬️",
                "desc": "本回合运输丝绸及成品时，运费减半。",
                "modifiers": {"transport_silk_discount": 0.5},
                "weight_func": lambda gs: 2.5 if gs["inventory"].get("丝绸", 0) > 2 or len(gs["master_weavers"]) > 0 else 0.8
            },
            {
                "id": "favorable_tides", "name": "顺风顺水", "icon": "🌊",
                "desc": "本回合基础运费减少4金币。",
                "modifiers": {"transport_flat_discount": 4},
                "weight_func": lambda gs: 1.5
            },
            {
                "id": "merchant_charm", "name": "商贾魅力", "icon": "✨",
                "desc": "本回合港口采购所有商品享85折优惠。",
                "modifiers": {"purchase_discount": 0.15},
                "weight_func": lambda gs: 2.0 if gs["money"] > 40 else 0.5
            },
            {
                "id": "artisan_inspiration", "name": "匠人灵感", "icon": "🔨",
                "desc": "本回合所有工人每回合额外多生产1件商品。",
                "modifiers": {"worker_bonus_production": 1},
                "weight_func": lambda gs: 3.0 if (len(gs["weavers"]) + len(gs["master_weavers"]) + len(gs["sachet_makers"])) > 0 else 0.0
            },
            {
                "id": "emergency_loan", "name": "紧急钱庄", "icon": "💰",
                "desc": "立即获得40金币周转资金。",
                "modifiers": {"instant_gold": 40},
                "weight_func": lambda gs: 4.0 if gs["money"] < 30 else 0.2
            },
            {
                "id": "tax_shelter", "name": "免税令", "icon": "📜",
                "desc": "本回合结算所得税率降至5%。",
                "modifiers": {"income_tax_override": 0.05},
                "weight_func": lambda gs: 1.5
            },
            {
                "id": "hemp_monopoly", "name": "麻布专营", "icon": "🧶",
                "desc": "本回合麻布采购单价降低2金币。",
                "modifiers": {"hemp_price_reduction": 2},
                "weight_func": lambda gs: 2.0 if gs["inventory"].get("麻布", 0) < 5 or len(gs["weavers"]) > 0 else 1.0
            },
            {
                "id": "master_apprentice", "name": "学徒传承", "icon": "🎓",
                "desc": "本回合雇佣工匠工资减半。",
                "modifiers": {"hire_discount": 0.5},
                "weight_func": lambda gs: 1.5
            }
        ]

    def get_draft_choices(self, count=3):
        gs = self.game_state_provider()
        weighted_boons = []
        for boon in self.boons:
            weight = boon["weight_func"](gs)
            if weight > 0:
                weighted_boons.append((boon, weight))
        
        choices = []
        available = list(weighted_boons)
        for _ in range(count):
            if not available: break
            total_w = sum(w for _, w in available)
            r = random.uniform(0, total_w)
            current = 0
            for i, (boon, w) in enumerate(available):
                current += w
                if current >= r:
                    choices.append(boon)
                    available.pop(i)
                    break
        return choices

# ─────────────────────────────────────────────────────────────────────────────
# 船只模块 (协同引擎)
# ─────────────────────────────────────────────────────────────────────────────
class ShipModule:
    def __init__(self):
        self.id = "base"
        self.name = "基础模块"
        self.icon = "📦"
        self.desc = "没有任何作用。"

    def on_purchase(self, game, card): pass
    def on_order_complete(self, game, order, reward, transport_cost): return reward, transport_cost
    def modify_transport_cost(self, game, cost, items, has_silk): return cost
    def modify_vat(self, game, vat): return vat
    def modify_income_tax(self, game, tax): return tax
    def modify_production(self, game, worker_type, amount): return amount
    def modify_wages(self, game, worker_type, wage): return wage
    def modify_purchase_cost(self, game, cost, card): return cost
    def on_equip(self, game): pass
    def on_unequip(self, game): pass

class SmugglersHold(ShipModule):
    def __init__(self):
        self.id = "smugglers_hold"
        self.name = "走私暗舱"
        self.icon = "🏴‍☠️"
        self.desc = "采购成本-15%。所得税+20%。"
    def modify_purchase_cost(self, game, cost, card): return int(cost * 0.85)
    def modify_income_tax(self, game, tax): return int(tax * 1.2)

class BulkHaulerRigging(ShipModule):
    def __init__(self):
        self.id = "bulk_hauler"
        self.name = "散货索具"
        self.icon = "🏗️"
        self.desc = "每件货物运费-1。船只升级费用+15金币。"
    def modify_transport_cost(self, game, cost, items, has_silk): return max(0, cost - items)
    def on_equip(self, game): game.ship_upgrade_penalty += 15
    def on_unequip(self, game): game.ship_upgrade_penalty -= 15

class ArtisansWorkshop(ShipModule):
    def __init__(self):
        self.id = "artisans_workshop"
        self.name = "工匠工坊"
        self.icon = "🛠️"
        self.desc = "工人产量+1。工资+20%。"
    def modify_production(self, game, worker_type, amount): return amount + 1
    def modify_wages(self, game, worker_type, wage): return int(wage * 1.2)

class TaxEvasionLedger(ShipModule):
    def __init__(self):
        self.id = "tax_evasion"
        self.name = "避税账本"
        self.icon = "📕"
        self.desc = "所得税与增值税减半。15%概率在订单完成时罚款20金币(稽查)。"
    def modify_vat(self, game, vat): return int(vat * 0.5)
    def modify_income_tax(self, game, tax): return int(tax * 0.5)
    def on_order_complete(self, game, order, reward, transport_cost):
        if random.random() < 0.15:
            game.money -= 20
            game.log_message("🚨 稽查！避税账本触发，损失20金币！")
        return reward, transport_cost

class SilkRoadMonopoly(ShipModule):
    def __init__(self):
        self.id = "silk_monopoly"
        self.name = "丝路垄断"
        self.icon = "👘"
        self.desc = "丝绸运费为0。丝绸产品订单报酬+20%。"
    def modify_transport_cost(self, game, cost, items, has_silk):
        if has_silk: return 0
        return cost
    def on_order_complete(self, game, order, reward, transport_cost):
        has_silk = any(r["type"] in ["丝绸", "绫罗绸缎", "香囊", "布衣"] for r in order["resources"])
        if has_silk:
            reward = int(reward * 1.2)
            game.log_message("👘 丝路垄断：报酬+20%！")
        return reward, transport_cost

class BrokersNetwork(ShipModule):
    def __init__(self):
        self.id = "brokers_network"
        self.name = "牙行网络"
        self.icon = "🕵️"
        self.desc = "情报花费2金币。每次购买揭示2条密语。"
    def on_equip(self, game): game.intel_cost = 2
    def on_unequip(self, game): game.intel_cost = 5

class SalvageCrane(ShipModule):
    def __init__(self):
        self.id = "salvage_crane"
        self.name = "打捞起重机"
        self.icon = "♻️"
        self.desc = "30%概率在订单完成时退还运费。"
    def on_order_complete(self, game, order, reward, transport_cost):
        if random.random() < 0.30:
            game.money += transport_cost
            game.log_message(f"♻️ 打捞起重机：退还了{transport_cost}金币运费！")
            transport_cost = 0
        return reward, transport_cost

class OverdriveEngine(ShipModule):
    def __init__(self):
        self.id = "overdrive_engine"
        self.name = "超载引擎"
        self.icon = "⚙️"
        self.desc = "运费-5金币。维护费+10金币。"
    def modify_transport_cost(self, game, cost, items, has_silk): return max(0, cost - 5)
    def on_equip(self, game): game.maintenance_penalty += 10
    def on_unequip(self, game): game.maintenance_penalty -= 10

# ─────────────────────────────────────────────────────────────────────────────
# 主游戏类
# ─────────────────────────────────────────────────────────────────────────────
class PortMasters:
    """PortMasters – 海上丝绸之路贸易大亨，生产级GUI布局。"""
    
    # ── 布局常量 ──────────────────────────────────────────────────
    PAD_SM = 4
    PAD_MD = 8
    PAD_LG = 16
    PAD_XL = 24
    FONT_TITLE = ("Microsoft YaHei", 22, "bold")
    FONT_SUBTITLE = ("Microsoft YaHei", 14)
    FONT_BODY = ("Microsoft YaHei", 11)
    FONT_BODY_BOLD = ("Microsoft YaHei", 11, "bold")
    FONT_SMALL = ("Microsoft YaHei", 9)
    FONT_SMALL_BOLD = ("Microsoft YaHei", 9, "bold")
    FONT_BUTTON = ("Microsoft YaHei", 11, "bold")
    FONT_HERO = ("Microsoft YaHei", 28, "bold")
    FONT_CARD_TITLE = ("Microsoft YaHei", 14, "bold")
    FONT_STAT = ("Microsoft YaHei", 12, "bold")

    def __init__(self):
        self.window = tk.Tk()
        self.window.title("PortMasters - 海上丝绸之路贸易大亨")
        self.window.geometry("1600x950")
        self.window.minsize(1400, 850)
        
        self.colors = {
            "bg_light": "#E6F2FF", "bg_dark": "#1A3C8C", "accent_blue": "#2E5AA7",
            "accent_gold": "#FFD700", "accent_red": "#FF6B6B", "accent_green": "#4CAF50",
            "text_dark": "#1A237E", "text_light": "#FFFFFF", "button_primary": "#2E5AA7",
            "button_success": "#4CAF50", "button_warning": "#FF9800", "button_danger": "#FF5252",
            "button_dark_grey": "#424242", "hemp": "#8B7355", "silk": "#DC143C", "tea": "#228B22",
            "linen_clothes": "#D2691E", "cotton_clothes": "#4169E1", "silk_brocade": "#8B008B",
            "sachet": "#FF1493", "worker_bg": "#FFF8DC", "card_bg": "#F0F8FF",
            "card_header": "#E6F2FF", "separator": "#2E5AA7",
        }
        self.BUTTON_FONT = self.FONT_BUTTON
        self.window.configure(bg=self.colors["bg_light"])

        # ── 游戏状态 ──────────────────────────────────────────────
        self.inventory = {
            "麻布": 8, "丝绸": 5, "茶叶": 3,
            "麻衣": 0, "布衣": 0, "绫罗绸缎": 0, "香囊": 0
        }
        self.money = 100
        self.score = 0
        self.current_round = 1
        self.max_rounds = 8
        self.total_revenue = 0
        self.total_costs = 0
        self.material_costs = 0
        self.worker_wages = 0
        self.maintenance_costs = 0
        self.vat_paid = 0
        self.income_tax_paid = 0
        self.round_revenue = 0
        self.round_costs = 0
        
        self.weavers = []
        self.master_weavers = []
        self.sachet_makers = []
        self.WEAVER_WAGE = 8
        self.MASTER_WEAVER_WAGE = 12
        self.SACHET_MAKER_WAGE = 20
        
        self.RECIPES = {
            "麻衣": {"materials": {"麻布": 2}, "value": 15, "worker_type": "weaver"},
            "布衣": {"materials": {"麻布": 2, "丝绸": 1}, "value": 35, "worker_type": "weaver"},
            "绫罗绸缎": {"materials": {"丝绸": 3}, "value": 60, "worker_type": "master"},
            "香囊": {"materials": {"丝绸": 1, "茶叶": 2}, "value": 80, "worker_type": "sachet_maker"}
        }
        
        self.fixed_cost = 15
        self.resource_types = ["麻布", "丝绸", "茶叶"]
        self.product_types = ["麻衣", "布衣", "绫罗绸缎", "香囊"]
        self.resource_colors = {
            "麻布": self.colors["hemp"], "丝绸": self.colors["silk"], "茶叶": self.colors["tea"],
            "麻衣": self.colors["linen_clothes"], "布衣": self.colors["cotton_clothes"],
            "绫罗绸缎": self.colors["silk_brocade"], "香囊": self.colors["sachet"]
        }
        self.resource_icons = {
            "麻布": "🧶", "丝绸": "👘", "茶叶": "🍵",
            "麻衣": "👔", "布衣": "👕", "绫罗绸缎": "👗", "香囊": "🌸"
        }
        
        self.ports = ["泉州港", "广州港", "宁波港", "扬州港", "杭州港"]
        self.commodities = {
            "麻布": {"港口": ["泉州港", "宁波港"], "基础价格": (3, 6)},
            "丝绸": {"港口": ["杭州港", "扬州港"], "基础价格": (6, 10)},
            "茶叶": {"港口": ["广州港", "泉州港"], "基础价格": (10, 14)}
        }
        self.product_prices = {
            "麻衣": (30, 42), "布衣": (50, 65),
            "绫罗绸缎": (70, 90), "香囊": (95, 120)
        }
        self.resource_probabilities = {"麻布": 0.4, "丝绸": 0.35, "茶叶": 0.25}
        
        self.ship_level = 0
        self.ship_upgrade_cost = [15, 25, 40]
        self.ship_upgrade_penalty = 0
        self.maintenance_penalty = 0
        
        self.phase = 0
        self.resource_cards = []
        self.customer_cards = []
        self.purchased_cards = set()
        self.completed_orders = set()
        self.purchase_count = 0
        self.order_count = 0
        self.game_over = False
        
        self.purchase_buttons = []
        self.order_buttons = []
        
        self.save_file = "portmasters_save.json"
        
        # ── 福缘与修正状态 ────────────────────────────────────────
        self.modifier_flags = {}
        self.boon_manager = BoonManager(self.get_game_state_for_boons)
        
        # ── 船只模块状态 ──────────────────────────────────────────
        self.module_classes = [
            SmugglersHold, BulkHaulerRigging, ArtisansWorkshop,
            TaxEvasionLedger, SilkRoadMonopoly, BrokersNetwork,
            SalvageCrane, OverdriveEngine
        ]
        self.equipped_modules = []
        
        # 🔮 情报系统：牙行密语属性
        self.phase2_demand_tags = []
        self.revealed_intel = []
        self.intel_cost = 5
        self._intel_order_used = False
        self.rumor_window = None
        
        self.setup_styles()
        self.create_widgets()
        self.setup_keyboard_shortcuts()
        
        if os.path.exists(self.save_file):
            if messagebox.askyesno("读取存档", "检测到上次的存档，是否继续游戏？"):
                self.load_game()
                return
        self.show_welcome()

    def get_game_state_for_boons(self):
        return {
            "money": self.money, "inventory": self.inventory,
            "weavers": self.weavers, "master_weavers": self.master_weavers,
            "sachet_makers": self.sachet_makers, "ship_level": self.ship_level,
            "revealed_intel": self.revealed_intel
        }

    def apply_modifiers(self, modifiers):
        self.modifier_flags = modifiers
        if "instant_gold" in modifiers:
            self.money += modifiers["instant_gold"]
            self.log_message(f"💰 福缘生效：立刻获得 {modifiers['instant_gold']} 金币！")
            self.update_display()

    # ── 视觉特效 (Juice) ──────────────────────────────────────────
    def trigger_juice(self, root_x, root_y):
        def _play():
            try:
                import winsound
                winsound.Beep(150, 90)
                winsound.Beep(1200, 200)
            except Exception:
                pass
        threading.Thread(target=_play, daemon=True).start()
        self.shake_window()
        self.trigger_particle_burst(root_x, root_y)

    def shake_window(self):
        try:
            geo = self.window.geometry().split('+')
            if len(geo) >= 3:
                x, y = int(geo[1]), int(geo[2])
            else:
                x, y = 100, 100
            w, h = geo[0].split('x')
            steps = [(-4, -4), (4, 4), (-2, 2), (2, -2), (0, 0)]
            for i, (dx, dy) in enumerate(steps):
                self.window.after(i * 30, lambda nx=x+dx, ny=y+dy, w=w, h=h: 
                                  self.window.geometry(f"{w}x{h}+{nx}+{ny}"))
        except Exception:
            pass

    def trigger_particle_burst(self, root_x, root_y):
        wx = self.window.winfo_rootx()
        wy = self.window.winfo_rooty()
        x = root_x - wx
        y = root_y - wy
        
        canvas = tk.Canvas(self.window, highlightthickness=0, bg=self.colors["bg_light"])
        canvas.place(x=0, y=0, relwidth=1, relheight=1)
        canvas.bind("<Button-1>", lambda e: canvas.destroy())
        
        particles = []
        colors = ["#FFD700", "#FFA500", "#4CAF50", "#2E5AA7", "#FFFFFF", "#E6F2FF"]
        for _ in range(35):
            px = x + random.randint(-10, 10)
            py = y + random.randint(-10, 10)
            r = random.randint(5, 15)
            color = random.choice(colors)
            p = canvas.create_oval(px-r, py-r, px+r, py+r, fill=color, outline="")
            particles.append((p, px, py, r, random.uniform(-8, 8), random.uniform(-10, -2)))
            
        sparkles = ["✨", "⭐", "💫", "🪙", "🎋"]
        texts = []
        for _ in range(5):
            sx = x + random.randint(-40, 40)
            sy = y + random.randint(-40, 40)
            t = canvas.create_text(sx, sy, text=random.choice(sparkles), font=("Microsoft YaHei", random.randint(16, 24)))
            texts.append((t, sx, sy, random.uniform(-3, 3), random.uniform(-5, -1)))
            
        def animate(step=0):
            if step > 15:
                try: canvas.destroy()
                except: pass
                return
            for p, px, py, r, vx, vy in particles:
                nx = px + vx * step
                ny = py + vy * step + 1.5 * step
                nr = max(0, r - step * 0.6)
                try: canvas.coords(p, nx-nr, ny-nr, nx+nr, ny+nr)
                except: pass
            for t, sx, sy, vx, vy in texts:
                nx = sx + vx * step
                ny = sy + vy * step
                try: canvas.coords(t, nx, ny)
                except: pass
            try:
                self.window.after(25, lambda: animate(step+1))
            except:
                pass
                
        animate()

    # ── 快捷键 ────────────────────────────────────────────────────
    def setup_keyboard_shortcuts(self):
        self.window.bind('<Control-s>', lambda e: self.save_game())
        self.window.bind('<Control-n>', lambda e: self.next_phase())
        self.window.bind('<Control-r>', lambda e: self.restart_game())
        self.window.bind('<Control-h>', lambda e: self.show_worker_management())
        self.window.bind('<F1>', lambda e: self.show_instructions())

    # ── 存档 / 读档 ───────────────────────────────────────────────
    def save_game(self):
        game_data = {
            "inventory": self.inventory, "money": self.money, "score": self.score,
            "current_round": self.current_round, "ship_level": self.ship_level,
            "phase": self.phase, "purchase_count": self.purchase_count,
            "order_count": self.order_count,
            "purchased_cards": list(self.purchased_cards),
            "completed_orders": list(self.completed_orders),
            "resource_cards": self.resource_cards, "customer_cards": self.customer_cards,
            "weavers": self.weavers, "master_weavers": self.master_weavers,
            "sachet_makers": self.sachet_makers,
            "total_revenue": self.total_revenue, "total_costs": self.total_costs,
            "material_costs": self.material_costs, "worker_wages": self.worker_wages,
            "maintenance_costs": self.maintenance_costs,
            "vat_paid": self.vat_paid, "income_tax_paid": self.income_tax_paid,
            "phase2_demand_tags": self.phase2_demand_tags,
            "revealed_intel": self.revealed_intel,
            "equipped_modules": [m.id for m in self.equipped_modules],
            "ship_upgrade_penalty": self.ship_upgrade_penalty,
            "maintenance_penalty": self.maintenance_penalty
        }
        try:
            with open(self.save_file, "w", encoding="utf-8") as f:
                json.dump(game_data, f, ensure_ascii=False, indent=2)
            self.log_message("💾 游戏已保存！")
            messagebox.showinfo("保存成功", "游戏进度已保存！")
        except Exception as e:
            self.log_message(f"❌ 保存失败: {str(e)}")
            messagebox.showerror("保存失败", f"无法保存游戏: {str(e)}")

    def load_game(self):
        try:
            with open(self.save_file, "r", encoding="utf-8") as f:
                game_data = json.load(f)
            self.inventory = game_data["inventory"]
            self.money = game_data["money"]
            self.score = game_data["score"]
            self.current_round = game_data["current_round"]
            self.ship_level = game_data["ship_level"]
            self.phase = game_data["phase"]
            self.purchase_count = game_data["purchase_count"]
            self.order_count = game_data["order_count"]
            self.purchased_cards = set(game_data["purchased_cards"])
            self.completed_orders = set(game_data["completed_orders"])
            self.resource_cards = game_data["resource_cards"]
            self.customer_cards = game_data["customer_cards"]
            self.weavers = game_data.get("weavers", [])
            self.master_weavers = game_data.get("master_weavers", [])
            self.sachet_makers = game_data.get("sachet_makers", [])
            self.total_revenue = game_data.get("total_revenue", 0)
            self.total_costs = game_data.get("total_costs", 0)
            self.material_costs = game_data.get("material_costs", 0)
            self.worker_wages = game_data.get("worker_wages", 0)
            self.maintenance_costs = game_data.get("maintenance_costs", 0)
            self.vat_paid = game_data.get("vat_paid", 0)
            self.income_tax_paid = game_data.get("income_tax_paid", 0)
            self.modifier_flags = {}
            self.phase2_demand_tags = game_data.get("phase2_demand_tags", [])
            self.revealed_intel = game_data.get("revealed_intel", [])
            self._intel_order_used = False
            self.rumor_window = None
            
            self.ship_upgrade_penalty = 0
            self.maintenance_penalty = 0
            self.equipped_modules = []
            for mid in game_data.get("equipped_modules", []):
                for cls in self.module_classes:
                    if cls().id == mid:
                        inst = cls()
                        self.equipped_modules.append(inst)
                        inst.on_equip(self)
                        break
                        
            self.log_message("📂 存档已加载！")
            self.update_display()
            if self.phase == 0:
                self.show_welcome()
            elif self.phase == 1:
                self.start_phase1()
            elif self.phase == 2:
                self.start_phase2()
            elif self.phase == 3:
                self.start_phase3()
            elif self.phase == 4:
                self.start_phase4()
            elif self.phase == 5:
                self.start_boon_drafting()
            else:
                self.show_worker_management()
        except Exception as e:
            self.log_message(f"❌ 加载存档失败: {str(e)}")
            messagebox.showerror("加载失败", "无法读取存档，开始新游戏。")
            self.show_welcome()

    def delete_save(self):
        if os.path.exists(self.save_file):
            os.remove(self.save_file)
            self.log_message("🗑️ 存档已删除")

    # ── 费用计算 (注入修正) ───────────────────────────────────────
    def calculate_transport_cost(self, total_items, has_silk=False):
        base_cost = total_items * 2
        discount = self.ship_level * 5
        if "transport_flat_discount" in self.modifier_flags:
            discount += self.modifier_flags["transport_flat_discount"]
        final_cost = max(5, base_cost - discount)
        if has_silk and "transport_silk_discount" in self.modifier_flags:
            final_cost = max(5, int(final_cost * self.modifier_flags["transport_silk_discount"]))
        for m in self.equipped_modules:
            final_cost = m.modify_transport_cost(self, final_cost, total_items, has_silk)
        return max(0, final_cost)

    def show_transport_cost_detail(self, total_items, has_silk=False):
        base_cost = total_items * 2
        discount = self.ship_level * 5
        if "transport_flat_discount" in self.modifier_flags:
            discount += self.modifier_flags["transport_flat_discount"]
        final_cost = max(5, base_cost - discount)
        if has_silk and "transport_silk_discount" in self.modifier_flags:
            final_cost = max(5, int(final_cost * self.modifier_flags["transport_silk_discount"]))
        for m in self.equipped_modules:
            final_cost = m.modify_transport_cost(self, final_cost, total_items, has_silk)
        final_cost = max(0, final_cost)
        return {
            "total_items": total_items, "base_cost": base_cost,
            "discount": discount, "final_cost": final_cost,
            "formula": f"max(0, ({total_items} × 2) - {discount} + 模块) = {final_cost}"
        }

    def calculate_vat(self, product, selling_price):
        recipe = self.RECIPES[product]
        material_cost = 0
        for material, amount in recipe["materials"].items():
            avg_price = sum(self.commodities[material]["基础价格"]) / 2
            material_cost += avg_price * amount
        worker_cost = 0
        if recipe["worker_type"] == "weaver": worker_cost = self.WEAVER_WAGE
        elif recipe["worker_type"] == "master": worker_cost = self.MASTER_WEAVER_WAGE
        elif recipe["worker_type"] == "sachet_maker": worker_cost = self.SACHET_MAKER_WAGE
        
        taxable_amount = selling_price - material_cost - worker_cost
        if taxable_amount > 0:
            vat = math.floor(taxable_amount * 0.05)
            for m in self.equipped_modules:
                vat = m.modify_vat(self, vat)
            self.log_message(f"🧮 增值税计算: 5% × ({selling_price} - {material_cost:.1f}(材料) - {worker_cost}(工资)) = {vat}金币")
            return vat
        return 0

    def calculate_income_tax(self, pre_tax_profit):
        rate = self.modifier_flags.get("income_tax_override", 0.1)
        if pre_tax_profit > 0:
            tax = math.floor(pre_tax_profit * rate)
            for m in self.equipped_modules:
                tax = m.modify_income_tax(self, tax)
            return tax
        return 0

    # ── 工人管理 ──────────────────────────────────────────────────
    def get_hire_cost(self, worker_type):
        if worker_type == "weaver": wage = self.WEAVER_WAGE
        elif worker_type == "master": wage = self.MASTER_WEAVER_WAGE
        elif worker_type == "sachet_maker": wage = self.SACHET_MAKER_WAGE
        else: return 0
        if "hire_discount" in self.modifier_flags:
            wage = int(wage * (1 - self.modifier_flags["hire_discount"]))
        return wage

    def hire_worker(self, worker_type):
        wage = self.get_hire_cost(worker_type)
        if self.money >= wage:
            if worker_type == "weaver":
                self.weavers.append({'task': None, 'progress': 0, 'produced_count': 0, 'is_skilled': False})
                self.log_message(f"👩‍🔧 雇佣了一名织女！工资: {wage}金币/回合")
            elif worker_type == "master":
                self.master_weavers.append({'task': None, 'progress': 0, 'produced_count': 0, 'is_skilled': False})
                self.log_message(f"👩‍🎨 雇佣了一名纺织大师！工资: {wage}金币/回合")
            elif worker_type == "sachet_maker":
                self.sachet_makers.append({'task': None, 'progress': 0, 'produced_count': 0, 'is_skilled': False})
                self.log_message(f"🌸 雇佣了一名香囊师！工资: {wage}金币/回合")
            self.worker_wages += wage
            self.update_display()
            return True
        self.log_message("❌ 资金不足，无法雇佣工人！")
        return False

    def fire_worker(self, worker_type, index):
        if worker_type == "weaver":
            worker_list, wage, worker_name = self.weavers, self.WEAVER_WAGE, "织女"
        elif worker_type == "master":
            worker_list, wage, worker_name = self.master_weavers, self.MASTER_WEAVER_WAGE, "纺织大师"
        elif worker_type == "sachet_maker":
            worker_list, wage, worker_name = self.sachet_makers, self.SACHET_MAKER_WAGE, "香囊师"
        else: return False
        
        if index < 0 or index >= len(worker_list):
            self.log_message("❌ 无效的工人编号！")
            return False
            
        if self.money >= wage:
            self.money -= wage
            worker = worker_list.pop(index)
            self.log_message(f"💔 解雇了一名{worker_name}，支付遣散费: {wage}金币")
            if worker['task']: self.log_message(f"  该工人原本正在制作: {worker['task']}")
            self.update_display()
            return True
        else:
            self.log_message(f"❌ 资金不足，无法支付{worker_name}的遣散费: {wage}金币")
            return False

    def assign_worker_task(self, worker_list, worker_type, task):
        for worker in worker_list:
            if worker['task'] is None:
                recipe = self.RECIPES[task]
                can_produce = True
                for material, amount in recipe["materials"].items():
                    if self.inventory.get(material, 0) < amount:
                        can_produce = False
                        break
                if can_produce:
                    for material, amount in recipe["materials"].items():
                        self.inventory[material] -= amount
                        self.material_costs += amount * (sum(self.commodities[material]["基础价格"]) / 2)
                    worker['task'] = task
                    worker['progress'] = 0
                    material_list = [f"{self.resource_icons[m]}{m}×{a}" for m, a in recipe["materials"].items()]
                    self.log_message(f"📋 为工人分配任务：生产{self.resource_icons[task]}{task}（原料：{' + '.join(material_list)}）")
                    self.update_display()
                    return True
                else:
                    self.log_message(f"❌ 材料不足，无法生产{task}！")
                    return False
        self.log_message("❌ 所有工人都已分配任务！")
        return False

    def process_production(self):
        bonus = self.modifier_flags.get("worker_bonus_production", 0)
        for weaver in self.weavers:
            if weaver['task']:
                base_prod = 2 if weaver.get('is_skilled', False) else 1
                amount = base_prod + bonus
                for m in self.equipped_modules:
                    amount = m.modify_production(self, "weaver", amount)
                product = weaver['task']
                self.inventory[product] = self.inventory.get(product, 0) + amount
                weaver['produced_count'] = weaver.get('produced_count', 0) + amount
                if amount > base_prod:
                    self.log_message(f"✅ 织女(熟练)完成了 {amount} 件{self.resource_icons[product]}{product}的制作！（加成）")
                elif weaver.get('is_skilled', False):
                    self.log_message(f"✅ 织女(熟练)完成了2件{self.resource_icons[product]}{product}的制作！")
                else:
                    self.log_message(f"✅ 织女完成了{self.resource_icons[product]}{product}的制作！")
                if weaver.get('produced_count', 0) >= 2:
                    weaver['is_skilled'] = True
                    self.log_message("⭐ 织女经验提升！现在每回合可生产2件产品！")
                weaver['task'] = None
                weaver['progress'] = 0
                
        for master in self.master_weavers:
            if master['task']:
                base_prod = 2 if master.get('is_skilled', False) else 1
                amount = base_prod + bonus
                for m in self.equipped_modules:
                    amount = m.modify_production(self, "master", amount)
                product = master['task']
                self.inventory[product] = self.inventory.get(product, 0) + amount
                master['produced_count'] = master.get('produced_count', 0) + amount
                if amount > base_prod:
                    self.log_message(f"✅ 纺织大师(熟练)完成了 {amount} 件{self.resource_icons[product]}{product}的制作！（加成）")
                elif master.get('is_skilled', False):
                    self.log_message(f"✅ 纺织大师(熟练)完成了2件{self.resource_icons[product]}{product}的制作！")
                else:
                    self.log_message(f"✅ 纺织大师完成了{self.resource_icons[product]}{product}的制作！")
                if master.get('produced_count', 0) >= 2:
                    master['is_skilled'] = True
                    self.log_message("⭐ 纺织大师经验提升！现在每回合可生产2件产品！")
                master['task'] = None
                master['progress'] = 0
                
        for maker in self.sachet_makers:
            if maker['task']:
                base_prod = 2 if maker.get('is_skilled', False) else 1
                amount = base_prod + bonus
                for m in self.equipped_modules:
                    amount = m.modify_production(self, "sachet_maker", amount)
                product = maker['task']
                self.inventory[product] = self.inventory.get(product, 0) + amount
                maker['produced_count'] = maker.get('produced_count', 0) + amount
                if amount > base_prod:
                    self.log_message(f"✅ 香囊师(熟练)完成了 {amount} 件{self.resource_icons[product]}{product}的制作！（加成）")
                elif maker.get('is_skilled', False):
                    self.log_message(f"✅ 香囊师(熟练)完成了2件{self.resource_icons[product]}{product}的制作！")
                else:
                    self.log_message(f"✅ 香囊师完成了{self.resource_icons[product]}{product}的制作！")
                if maker.get('produced_count', 0) >= 2:
                    maker['is_skilled'] = True
                    self.log_message("⭐ 香囊师经验提升！现在每回合可生产2件产品！")
                maker['task'] = None
                maker['progress'] = 0

    def pay_worker_wages(self):
        total_paid = 0
        weaver_wages = 0
        for weaver in self.weavers:
            base_wage = self.WEAVER_WAGE
            if weaver.get('double_production_this_round', False):
                base_wage = int(base_wage * 1.5)
                self.log_message(f"💪 织女高效产出(2件)，工资提升至{base_wage}金币")
            for m in self.equipped_modules:
                base_wage = m.modify_wages(self, "weaver", base_wage)
            weaver_wages += base_wage
            
        master_wages = 0
        for master in self.master_weavers:
            base_wage = self.MASTER_WEAVER_WAGE
            if master.get('double_production_this_round', False):
                base_wage = int(base_wage * 1.5)
                self.log_message(f"💪 纺织大师高效产出(2件)，工资提升至{base_wage}金币")
            for m in self.equipped_modules:
                base_wage = m.modify_wages(self, "master", base_wage)
            master_wages += base_wage
            
        maker_wages = 0
        for maker in self.sachet_makers:
            base_wage = self.SACHET_MAKER_WAGE
            if maker.get('double_production_this_round', False):
                base_wage = int(base_wage * 1.5)
                self.log_message(f"💪 香囊师高效产出(2件)，工资提升至{base_wage}金币")
            for m in self.equipped_modules:
                base_wage = m.modify_wages(self, "sachet_maker", base_wage)
            maker_wages += base_wage
            
        total_wages = weaver_wages + master_wages + maker_wages
        if total_wages == 0: return True
        
        if self.money >= total_wages:
            self.money -= total_wages
            total_paid = total_wages
            self.worker_wages += total_wages
            self.round_costs += total_wages
            if weaver_wages > 0: self.log_message(f"💰 支付了{len(self.weavers)}名织女的工资：{weaver_wages}金币")
            if master_wages > 0: self.log_message(f"💰 支付了{len(self.master_weavers)}名纺织大师的工资：{master_wages}金币")
            if maker_wages > 0: self.log_message(f"💰 支付了{len(self.sachet_makers)}名香囊师的工资：{maker_wages}金币")
            self._clear_wage_markers()
            self.update_display()
            return True
        else:
            self.log_message(f"⚠️ 资金不足！应付工资: {total_wages}金币，当前资金: {self.money}金币")
            self.log_message("💥 无法支付工人工资，工匠们罢工离去...")
            self.log_message("💥 商队信誉崩塌，被迫破产！")
            return "bankruptcy"

    def _clear_wage_markers(self):
        for worker in self.weavers + self.master_weavers + self.sachet_makers:
            if 'double_production_this_round' in worker:
                del worker['double_production_this_round']

    # ── 🔮 情报系统：订单生成与约束注入 ─────────────────────────
    def _generate_phase2_demand_tags(self, count=5):
        tags = []
        all_items = self.resource_types + self.product_types
        for _ in range(count):
            tag = random.choice(all_items)
            if tag not in tags:
                tags.append(tag)
        return tags

    def purchase_intel(self):
        if not self.phase2_demand_tags:
            self.log_message("🔮 牙行已无更多密语...")
            if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
                self._populate_rumor_list()
            return
        if self.money < self.intel_cost:
            self.log_message(f"❌ 需要{self.intel_cost}金币才能购买消息")
            if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
                self._populate_rumor_list()
            return
            
        rumors_to_buy = 2 if any(m.id == 'brokers_network' for m in self.equipped_modules) else 1
        for _ in range(rumors_to_buy):
            if not self.phase2_demand_tags: break
            revealed_item = random.choice(self.phase2_demand_tags)
            self.phase2_demand_tags.remove(revealed_item)
            port = random.choice(self.ports)
            self.revealed_intel.append({"item": revealed_item, "port": port})
            self.log_message(f"🗣️ 牙行密语：'来自{port}的消息：对{revealed_item}的需求量很大！'")
            self.money -= self.intel_cost
            
        self.update_display()
        if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
            self._populate_rumor_list()

    def generate_raw_material_order(self, resource_filter=None):
        num_resources = random.randint(1, 3)
        resources = []
        available_resources = self.resource_types.copy()
        demand_port = random.choice(self.ports)
        total_items = 0
        
        if resource_filter and resource_filter in self.resource_types:
            required = random.randint(2, 5)
            total_items += required
            resources.append({"type": resource_filter, "required": required})
        else:
            for _ in range(num_resources):
                if not available_resources: break
                resource = random.choice(available_resources)
                available_resources.remove(resource)
                required = random.randint(2, 5)
                total_items += required
                resources.append({"type": resource, "required": required})
                
        base_reward = sum(r["required"] * 5 for r in resources)
        reward = base_reward + random.randint(10, 25)
        return {"demand_port": demand_port, "resources": resources, "reward": reward,
                "total_items": total_items, "is_product_order": False}

    def generate_product_order(self, product_filter=None):
        if product_filter and product_filter in self.product_types:
            product = product_filter
        else:
            product = random.choice(self.product_types)
        required = random.randint(1, 3)
        demand_port = random.choice(self.ports)
        base_price = random.randint(*self.product_prices[product])
        reward = base_price * required
        return {"demand_port": demand_port,
                "resources": [{"type": product, "required": required}],
                "reward": reward, "total_items": required, "is_product_order": True}

    def generate_mixed_order(self):
        if self.revealed_intel and not self._intel_order_used:
            intel_data = random.choice(self.revealed_intel)
            tag = intel_data["item"]
            self._intel_order_used = True
            if tag in self.resource_types:
                return self.generate_raw_material_order(resource_filter=tag)
            elif tag in self.product_types:
                return self.generate_product_order(product_filter=tag)
                
        if random.random() < 0.5 or not self.product_types:
            return self.generate_raw_material_order()
        else:
            return self.generate_product_order()

    def generate_mixed_resource_card(self):
        if random.random() < 0.3:
            return self.generate_product_purchase_card()
            
        num_resources = random.randint(1, 3)
        resources = []
        available_resources = list(self.resource_probabilities.keys())
        probabilities = list(self.resource_probabilities.values())
        port = random.choice(self.ports)
        
        for _ in range(num_resources):
            if not available_resources: break
            resource = random.choices(available_resources, weights=probabilities)[0]
            idx = available_resources.index(resource)
            available_resources.pop(idx)
            probabilities.pop(idx)
            
            quantity = random.randint(1, 3)
            price_range = self.commodities[resource]["基础价格"]
            base_price = random.randint(price_range[0], price_range[1])
            price = base_price - 1 if port in self.commodities[resource]["港口"] else base_price + 1
            resources.append({"type": resource, "quantity": quantity, "price": price})
            
        total_cost = sum(r["quantity"] * r["price"] for r in resources)
        return {"port": port, "resources": resources, "total_cost": total_cost, "is_product_card": False}

    def generate_product_purchase_card(self):
        product = random.choice(self.product_types)
        quantity = random.randint(1, 2)
        port = random.choice(self.ports)
        recipe = self.RECIPES[product]
        
        material_cost = 0
        material_details = []
        for material, amount in recipe["materials"].items():
            avg_price = sum(self.commodities[material]["基础价格"]) / 2
            material_cost += avg_price * amount
            material_details.append(f"{material}×{amount}")
            
        markup = random.uniform(1.4, 1.8)
        unit_price = math.floor(material_cost * markup)
        min_price, max_price = self.product_prices[product]
        unit_price = max(min_price, min(unit_price, max_price))
        total_cost = unit_price * quantity
        
        resources = [{"type": product, "quantity": quantity, "price": unit_price,
                      "material_cost": material_cost,
                      "material_details": " + ".join(material_details)}]
        return {"port": port, "resources": resources, "total_cost": total_cost, "is_product_card": True}

    # ── 采购修正辅助 ──────────────────────────────────────────────
    def get_card_final_cost(self, card):
        final_cost = card["total_cost"]
        if "purchase_discount" in self.modifier_flags:
            final_cost = int(final_cost * (1 - self.modifier_flags["purchase_discount"]))
        if "hemp_price_reduction" in self.modifier_flags:
            for r in card["resources"]:
                if r["type"] == "麻布":
                    final_cost -= r["quantity"] * self.modifier_flags["hemp_price_reduction"]
        return max(0, final_cost)

    # ── 采购 / 交易执行 ──────────────────────────────────────────
    def purchase_card_specific(self, card):
        if card["id"] in self.purchased_cards:
            return
            
        final_cost = self.get_card_final_cost(card)
        for m in self.equipped_modules:
            final_cost = m.modify_purchase_cost(self, final_cost, card)
        final_cost = max(0, final_cost)
        
        if self.money >= final_cost:
            self.money -= final_cost
            self.round_costs += final_cost
            self.total_costs += final_cost
            for resource_info in card["resources"]:
                self.inventory[resource_info["type"]] += resource_info["quantity"]
            self.purchased_cards.add(card["id"])
            self.purchase_count += 1
            
            if card.get("is_product_card"):
                for r in card["resources"]:
                    self.log_message(
                        f"🛒 在{card['port']}采购成品: {self.resource_icons.get(r['type'])}{r['type']}×{r['quantity']}"
                        f"(@{r['price']}💰/个, 原料成本{r.get('material_cost', '?')}💰)，总花费{final_cost}金币")
                self.log_message("   💡 提示：该成品出售时需缴纳增值税")
            else:
                resources_text = " + ".join(
                    f"{self.resource_icons.get(r['type'])}{r['type']}×{r['quantity']}({r['price']}💰/个)"
                    for r in card["resources"])
                self.log_message(f"🛒 在{card['port']}采购: {resources_text}，总花费{final_cost}金币")
                if final_cost < card["total_cost"]:
                    self.log_message(f"   ✨ 折扣生效！节省了 {card['total_cost'] - final_cost} 金币")
                    
            self.update_display()
            self.update_purchase_buttons()
            self.log_message(f"📊 已采购 {self.purchase_count} 批货物")
        else:
            self.log_message(f"❌ 资金不足！需要{final_cost}金币，当前{self.money}金币")

    def complete_order(self, order):
        if order["id"] in self.completed_orders:
            return
            
        for resource_info in order["resources"]:
            if self.inventory.get(resource_info["type"], 0) < resource_info["required"]:
                self.log_message(f"❌ 库存不足！需要{resource_info['type']}×{resource_info['required']}")
                return
                
        has_silk = any(r["type"] in ["丝绸", "绫罗绸缎", "香囊", "布衣"] for r in order["resources"])
        transport_cost = self.calculate_transport_cost(order["total_items"], has_silk)
        transport_detail = self.show_transport_cost_detail(order["total_items"], has_silk)
        
        for resource_info in order["resources"]:
            self.inventory[resource_info["type"]] -= resource_info["required"]
            
        reward = order["reward"]
        is_product = order.get("is_product_order", False)
        if is_product:
            product = order["resources"][0]["type"]
            vat = self.calculate_vat(product, reward / order["resources"][0]["required"])
            total_vat = vat * order["resources"][0]["required"]
            actual_reward = reward - total_vat
            self.vat_paid += total_vat
            self.log_message(f"🧾 成品销售增值税: {total_vat}金币")
        else:
            actual_reward = reward
            total_vat = 0
            
        self.money -= transport_cost
        self.round_costs += transport_cost
        self.total_costs += transport_cost
        original_transport_cost = transport_cost
        
        for m in self.equipped_modules:
            actual_reward, transport_cost = m.on_order_complete(self, order, actual_reward, transport_cost)
            
        if transport_cost != original_transport_cost:
            diff = original_transport_cost - transport_cost
            self.money += diff
            self.round_costs -= diff
            self.total_costs -= diff
            
        self.money += actual_reward
        self.round_revenue += actual_reward
        self.total_revenue += actual_reward
        self.score += int(actual_reward - transport_cost)
        self.completed_orders.add(order["id"])
        self.order_count += 1
        
        resources_text = " + ".join(
            f"{self.resource_icons.get(r['type'])}{r['type']}×{r['required']}" for r in order["resources"])
        net_profit = actual_reward - transport_cost
        
        self.log_message(f"📦 完成{order['demand_port']}的订单: {resources_text}")
        self.log_message(f"   📦 材料总数: {transport_detail['total_items']} × 2 = {transport_detail['base_cost']}金币")
        self.log_message(f"   🚢 运输折扣: -{transport_detail['discount']}金币")
        self.log_message(f"   ⚓ 最终运费: {transport_detail['final_cost']}金币")
        self.log_message(
            f"   💰 报酬: {actual_reward}金币 - ⚓ 运费: {transport_cost}金币 = 📊 净利润: {net_profit}金币")
            
        self.update_display()
        self.update_order_buttons()
        self.log_message(f"📊 已完成 {self.order_count} 笔交易")

    def pay_fixed_cost(self):
        cost = self.fixed_cost + self.maintenance_penalty
        if self.money >= cost:
            self.money -= cost
            self.maintenance_costs += cost
            self.round_costs += cost
            self.total_costs += cost
            self.log_message(f"💸 支付了船只维护费: {cost}金币")
            self.update_display()
            self.start_phase4()
        else:
            self.force_pay_cost()

    def force_pay_cost(self):
        cost = self.fixed_cost + self.maintenance_penalty
        if self.money > 0:
            paid = min(self.money, cost)
            self.money -= paid
            self.maintenance_costs += paid
            self.round_costs += paid
            self.total_costs += paid
            self.log_message(f"⚠️ 强制支付了 {paid}金币（需要 {cost}金币）")
            self.update_display()
            if self.money <= 0:
                self.log_message("⚠️ 资金耗尽！无法继续航行...")
                self.show_bankruptcy_screen()
            else:
                self.start_phase4()
        else:
            self.log_message("💸 无资金可支付")
            self.show_bankruptcy_screen()

    def end_round(self):
        self.log_message(f"\n📊=== 第{self.current_round}航程结算 ===")
        self.log_message(f"💰 本航程总收入: {self.round_revenue}金币")
        total_round_costs = self.round_costs + self.maintenance_costs + self.worker_wages
        self.log_message(f"💸 本航程总成本: {total_round_costs}金币")
        self.log_message(f"   🔧 维护费: {self.maintenance_costs}金币")
        self.log_message(f"   📦 材料费: {self.material_costs}金币")
        self.log_message(f"   👥 工人工资: {self.worker_wages}金币")
        
        pre_tax_profit = self.round_revenue - total_round_costs
        self.log_message(f"📈 税前净利润: {pre_tax_profit}金币")
        
        income_tax = self.calculate_income_tax(pre_tax_profit)
        if income_tax > 0:
            self.money -= income_tax
            self.income_tax_paid += income_tax
            tax_rate = self.modifier_flags.get('income_tax_override', 0.1) * 100
            self.log_message(f"🏛️ 缴纳所得税（{tax_rate:.0f}%）: {income_tax}金币")
        else:
            self.log_message("🏛️ 无盈利，无需缴纳所得税")
            
        if self.vat_paid > 0:
            self.log_message(f"🧾 本航程已缴增值税: {self.vat_paid}金币")
            
        self.modifier_flags = {}
        self.phase2_demand_tags = []
        self.revealed_intel = []
        self._intel_order_used = False
        if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
            self.rumor_window.destroy()
            self.rumor_window = None
            
        self.round_revenue = 0
        self.round_costs = 0
        self.maintenance_costs = 0
        self.material_costs = 0
        self.worker_wages = 0
        
        self.current_round += 1
        if self.current_round > self.max_rounds:
            self.end_game()
        else:
            self.log_message(f"\n🔄=== 第{self.current_round}航程准备开始 ===")
            self.phase = 0
            self.purchase_count = 0
            self.order_count = 0
            self.resource_cards = []
            self.customer_cards = []
            self.purchased_cards.clear()
            self.completed_orders.clear()
            self.update_display()
            self.start_boon_drafting()
            self.update_button_states()

    # ── 辅助：工匠管理中的库存行 ──────────────────────────────────
    def create_inventory_row(self, parent, item):
        color = self.resource_colors.get(item, "black")
        icon = self.resource_icons.get(item, "")
        frame = tk.Frame(parent, bg=self.colors["card_bg"])
        frame.pack(fill=tk.X, padx=20, pady=2)
        tk.Label(frame, text=icon, font=self.FONT_BODY_BOLD, bg=self.colors["card_bg"]).pack(side=tk.LEFT, padx=(0, 5))
        tk.Label(frame, text=item, font=self.FONT_BODY, bg=self.colors["card_bg"],
                 fg=color, width=12, anchor="w").pack(side=tk.LEFT)
        tk.Label(frame, text=str(self.inventory.get(item, 0)), font=self.FONT_BODY_BOLD,
                 bg=self.colors["card_bg"], fg=color, width=5).pack(side=tk.RIGHT)

    # ── 🔮 情报系统：牙行密语板 Toplevel 窗口 ───────────────────
    def show_rumor_board(self):
        if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
            self.rumor_window.lift()
            return
            
        self.rumor_window = tk.Toplevel(self.window)
        self.rumor_window.title("🗣️ 牙行密语板")
        self.rumor_window.geometry("500x400")
        self.rumor_window.transient(self.window)
        self.rumor_window.grab_set()
        self.rumor_window.configure(bg=self.colors["bg_light"])
        
        tk.Label(self.rumor_window, text="🗣️ 牙行密语板", font=self.FONT_HERO,
                 bg=self.colors["bg_light"], fg=self.colors["bg_dark"]).pack(pady=10)
        tk.Label(self.rumor_window, text="花费金币以探听下一阶段的货物需求！",
                 font=self.FONT_SUBTITLE, bg=self.colors["bg_light"], fg=self.colors["accent_blue"]).pack(pady=(0, 10))
                 
        CustomButton(self.rumor_window, text=f"🔮 购买消息 ({self.intel_cost}💰)",
                     font=self.BUTTON_FONT, bg=self.colors["accent_gold"],
                     fg=self.colors["text_dark"], relief=tk.RAISED, borderwidth=2,
                     padx=20, pady=10, juice_callback=self.trigger_juice,
                     command=self.purchase_intel).pack(pady=10)
                     
        list_frame = tk.Frame(self.rumor_window, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=2)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        canvas = tk.Canvas(list_frame, highlightthickness=0, bg=self.colors["card_bg"])
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=canvas.yview)
        self.rumor_list_frame = tk.Frame(canvas, bg=self.colors["card_bg"])
        self.rumor_list_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        
        window_id = canvas.create_window((0, 0), window=self.rumor_list_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        def on_mousewheel(event):
            if not canvas.winfo_exists():
                return
            if sys.platform == 'darwin':
                delta = -1 * event.delta
            else:
                delta = int(-1 * (event.delta / 120))
            canvas.yview_scroll(delta, "units")

        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

        self._populate_rumor_list()
        
        CustomButton(self.rumor_window, text="关闭面板", font=self.BUTTON_FONT,
                     bg=self.colors["button_dark_grey"], fg="white",
                     padx=20, pady=10, command=self.rumor_window.destroy).pack(pady=10)

    def _populate_rumor_list(self):
        if not hasattr(self, 'rumor_list_frame'): return
        for widget in self.rumor_list_frame.winfo_children():
            widget.destroy()
            
        if self.revealed_intel:
            tk.Label(self.rumor_list_frame, text="📜 已探听消息：",
                     font=self.FONT_SMALL_BOLD, bg=self.colors["card_bg"],
                     fg=self.colors["accent_blue"]).pack(anchor=tk.W, padx=10, pady=(5, 2))
            for intel in self.revealed_intel:
                label = tk.Label(self.rumor_list_frame,
                                 text=f"• 🗣️ '{intel['port']} 急需 {intel['item']}'",
                                 font=self.FONT_SMALL, bg=self.colors["card_bg"],
                                 fg=self.colors["text_dark"], anchor=tk.W, justify=tk.LEFT)
                label.pack(anchor=tk.W, padx=25, pady=2)
        else:
            tk.Label(self.rumor_list_frame, text="  ✨ 尚未探听任何消息... 花费金币聆听牙行的密语吧。",
                     font=self.FONT_SMALL, bg=self.colors["card_bg"],
                     fg="#888888", anchor=tk.W, justify=tk.LEFT).pack(anchor=tk.W, padx=10, pady=20)
                     
        if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
            self.rumor_list_frame.update_idletasks()
            canvas = self.rumor_list_frame.master
            canvas.configure(scrollregion=canvas.bbox("all"))

    # ── 福缘抽取阶段 ──────────────────────────────────────────────
    def start_boon_drafting(self):
        self.phase = 5
        self.clear_phase_content()
        self.log_message("\n🧭=== 航海家的罗盘 ===")
        self.log_message("选择一项福缘，扭转本航程的规则...")
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True, padx=self.PAD_LG, pady=self.PAD_LG)
        
        tk.Label(main_container, text="🧭 航海家的罗盘", font=self.FONT_HERO,
                 bg=self.colors["bg_light"], fg=self.colors["accent_gold"]).pack(pady=(20, 5))
        tk.Label(main_container, text="抽取福缘，契合您的贸易策略",
                 font=self.FONT_SUBTITLE, bg=self.colors["bg_light"], fg=self.colors["text_dark"]).pack(pady=(0, 20))
                 
        boons = self.boon_manager.get_draft_choices(3)
        cards_frame = tk.Frame(main_container, bg=self.colors["bg_light"])
        cards_frame.pack(fill=tk.BOTH, expand=True)
        
        for i in range(3):
            cards_frame.columnconfigure(i, weight=1, uniform="boon_col")
            
        for i, boon in enumerate(boons):
            self.create_boon_card(cards_frame, boon, 0, i)
            
        self.update_button_states()

    def create_boon_card(self, parent, boon, row, col):
        card = tk.Frame(parent, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=3, padx=20, pady=20)
        card.grid(row=row, column=col, padx=15, pady=15, sticky="nsew")
        
        tk.Label(card, text=boon["icon"], font=("Microsoft YaHei", 40), bg=self.colors["card_bg"]).pack(pady=(10, 5))
        tk.Label(card, text=boon["name"], font=self.FONT_CARD_TITLE, bg=self.colors["card_bg"],
                 fg=self.colors["bg_dark"]).pack(pady=5)
        tk.Label(card, text=boon["desc"], font=self.FONT_BODY, bg=self.colors["card_bg"],
                 fg=self.colors["text_dark"], wraplength=250, justify=tk.CENTER).pack(pady=10, fill=tk.X, expand=True)
                 
        btn = CustomButton(card, text="🔒 锁定福缘", font=self.BUTTON_FONT,
                           bg=self.colors["accent_gold"], fg=self.colors["text_dark"],
                           relief=tk.RAISED, borderwidth=2, padx=20, pady=15,
                           juice_callback=self.trigger_juice,
                           command=lambda b=boon: self.select_boon(b))
        btn.pack(fill=tk.X, pady=(10, 0))

    def select_boon(self, boon):
        self.log_message(f"🧭 福缘已选定：{boon['icon']} {boon['name']}")
        self.apply_modifiers(boon["modifiers"])
        self.show_welcome()

    # ── 工匠管理界面 ──────────────────────────────────────────────
    def show_worker_management(self, in_phase=False):
        self.clear_phase_content()
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True, padx=self.PAD_LG, pady=self.PAD_LG)
        
        canvas = tk.Canvas(main_container, highlightthickness=0, bg=self.colors["bg_light"])
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_light"])
        
        scrollable_frame.bind("<Configure>",
                              lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
                              
        window_id = canvas.create_window((0, 0), window=scrollable_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.bind_mousewheel(canvas)
        
        title_frame = tk.Frame(scrollable_frame, bg=self.colors["bg_light"])
        title_frame.pack(fill=tk.X, pady=self.PAD_XL)
        
        tk.Label(title_frame, text="👥 工匠管理", font=self.FONT_HERO,
                 bg=self.colors["bg_light"], fg=self.colors["bg_dark"]).pack(pady=(0, 10))
                 
        funds_text = (f"💰 当前资金: {self.money}金币 | 📦 查看下方库存"
                      if not in_phase else f"💰 当前资金: {self.money}金币")
        tk.Label(title_frame, text=funds_text, font=self.FONT_SUBTITLE,
                 bg=self.colors["bg_light"], fg=self.colors["accent_blue"]).pack()
                 
        inv_frame = tk.Frame(scrollable_frame, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=2)
        inv_frame.pack(fill=tk.X, padx=50, pady=self.PAD_MD)
        
        tk.Label(inv_frame, text="📦 当前库存", font=self.FONT_CARD_TITLE,
                 bg=self.colors["card_bg"], fg=self.colors["bg_dark"]).pack(pady=10)
                 
        materials_frame = tk.Frame(inv_frame, bg=self.colors["card_bg"])
        materials_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(materials_frame, text="原材料:", font=self.FONT_BODY_BOLD,
                 bg=self.colors["card_bg"], fg=self.colors["accent_blue"]).pack(anchor=tk.W)
        for resource in self.resource_types:
            self.create_inventory_row(materials_frame, resource)
            
        products_frame = tk.Frame(inv_frame, bg=self.colors["card_bg"])
        products_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(products_frame, text="成品:", font=self.FONT_BODY_BOLD,
                 bg=self.colors["card_bg"], fg=self.colors["accent_blue"]).pack(anchor=tk.W)
        for product in self.product_types:
            self.create_inventory_row(products_frame, product)
            
        tk.Frame(scrollable_frame, height=2, bg=self.colors["separator"]).pack(fill=tk.X, padx=50, pady=self.PAD_LG)
        
        hire_frame = tk.Frame(scrollable_frame, bg=self.colors["worker_bg"], relief=tk.RAISED, borderwidth=2)
        hire_frame.pack(fill=tk.X, padx=50, pady=self.PAD_MD)
        
        tk.Label(hire_frame, text="🔨 雇佣工匠", font=("Microsoft YaHei", 18, "bold"),
                 bg=self.colors["worker_bg"], fg=self.colors["bg_dark"]).pack(pady=10)
                 
        workers_info = [
            ("👩‍🔧 织女", f"制作：麻衣(2麻布) 或 布衣(2麻布+1丝绸)\n工资：{self.WEAVER_WAGE}金币/回合"),
            ("👩‍🎨 纺织大师", f"制作：麻衣、布衣 或 绫罗绸缎(3丝绸)\n工资：{self.MASTER_WEAVER_WAGE}金币/回合"),
            ("🌸 香囊师", f"制作：香囊(1丝绸+2茶叶)\n工资：{self.SACHET_MAKER_WAGE}金币/回合")
        ]
        for title, desc in workers_info:
            info_frame = tk.Frame(hire_frame, bg=self.colors["worker_bg"])
            info_frame.pack(fill=tk.X, padx=20, pady=5)
            tk.Label(info_frame, text=title, font=self.FONT_BODY_BOLD,
                     bg=self.colors["worker_bg"], fg=self.colors["text_dark"]).pack(anchor=tk.W)
            tk.Label(info_frame, text=desc, font=self.FONT_SMALL,
                     bg=self.colors["worker_bg"], fg="#666666", justify=tk.LEFT).pack(anchor=tk.W, padx=20)
                     
        hire_buttons_frame = tk.Frame(hire_frame, bg=self.colors["worker_bg"])
        hire_buttons_frame.pack(pady=15)
        
        refresh_func = self.show_worker_management_in_phase if in_phase else self.show_worker_management
        weaver_cost = self.get_hire_cost("weaver")
        master_cost = self.get_hire_cost("master")
        maker_cost = self.get_hire_cost("sachet_maker")
        
        CustomButton(hire_buttons_frame, text=f"👩‍🔧 雇佣织女 ({weaver_cost}💰)",
                     font=self.BUTTON_FONT, bg=self.colors["button_success"], fg="white",
                     relief=tk.RAISED, borderwidth=2, padx=20, pady=15,
                     command=lambda: [self.hire_worker("weaver"), refresh_func()]).pack(side=tk.LEFT, padx=10)
        CustomButton(hire_buttons_frame, text=f"👩‍🎨 雇佣纺织大师 ({master_cost}💰)",
                     font=self.BUTTON_FONT, bg=self.colors["button_primary"], fg="white",
                     relief=tk.RAISED, borderwidth=2, padx=20, pady=15,
                     command=lambda: [self.hire_worker("master"), refresh_func()]).pack(side=tk.LEFT, padx=10)
        CustomButton(hire_buttons_frame, text=f"🌸 雇佣香囊师 ({maker_cost}💰)",
                     font=self.BUTTON_FONT, bg=self.colors["button_warning"], fg="white",
                     relief=tk.RAISED, borderwidth=2, padx=20, pady=15,
                     command=lambda: [self.hire_worker("sachet_maker"), refresh_func()]).pack(side=tk.LEFT, padx=10)
                     
        if self.weavers or self.master_weavers or self.sachet_makers:
            status_frame = tk.Frame(scrollable_frame, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=2)
            status_frame.pack(fill=tk.X, padx=50, pady=self.PAD_MD)
            
            tk.Label(status_frame, text="👥 工匠状态与任务分配", font=("Microsoft YaHei", 18, "bold"),
                     bg=self.colors["card_bg"], fg=self.colors["bg_dark"]).pack(pady=10)
                     
            if self.weavers:
                tk.Label(status_frame, text=f"👩‍🔧 织女: {len(self.weavers)}人",
                         font=self.FONT_STAT, bg=self.colors["card_bg"],
                         fg=self.colors["accent_blue"]).pack(anchor=tk.W, padx=20, pady=5)
                for i, weaver in enumerate(self.weavers):
                    worker_frame = tk.Frame(status_frame, bg=self.colors["card_bg"])
                    worker_frame.pack(fill=tk.X, padx=20, pady=5)
                    if weaver['task']:
                        skill_text = "(熟练)" if weaver.get('is_skilled', False) else ""
                        task_text = f"正在制作: {weaver['task']}{skill_text}"
                    else:
                        skill_text = " ⭐熟练工" if weaver.get('is_skilled', False) else ""
                        task_text = f"空闲{skill_text}"
                    tk.Label(worker_frame, text=f"  织女{i + 1}: {task_text}",
                             font=self.FONT_BODY, bg=self.colors["card_bg"],
                             fg=self.colors["text_dark"]).pack(side=tk.LEFT, padx=(0, 10))
                    if in_phase and weaver['task'] is None:
                        CustomButton(worker_frame, text=f"解雇 ({self.WEAVER_WAGE}💰)",
                                     font=self.BUTTON_FONT, bg=self.colors["button_danger"], fg="white",
                                     padx=10, pady=5,
                                     command=lambda idx=i: [self.fire_worker("weaver", idx),
                                                            self.show_worker_management_in_phase()]).pack(
                                                            side=tk.RIGHT, padx=5)
                task_frame = tk.Frame(status_frame, bg=self.colors["card_bg"])
                task_frame.pack(pady=10)
                CustomButton(task_frame, text="制作麻衣 (需2麻布)",
                             font=self.BUTTON_FONT, bg=self.colors["button_success"], fg="white",
                             padx=15, pady=10,
                             command=lambda: [self.assign_worker_task(self.weavers, "weaver", "麻衣"),
                                              refresh_func()]).pack(side=tk.LEFT, padx=5)
                CustomButton(task_frame, text="制作布衣 (需2麻布+1丝绸)",
                             font=self.BUTTON_FONT, bg=self.colors["button_success"], fg="white",
                             padx=15, pady=10,
                             command=lambda: [self.assign_worker_task(self.weavers, "weaver", "布衣"),
                                              refresh_func()]).pack(side=tk.LEFT, padx=5)
                                              
            if self.master_weavers:
                tk.Label(status_frame, text=f"👩‍🎨 纺织大师: {len(self.master_weavers)}人",
                         font=self.FONT_STAT, bg=self.colors["card_bg"],
                         fg=self.colors["accent_blue"]).pack(anchor=tk.W, padx=20, pady=10)
                for i, master in enumerate(self.master_weavers):
                    worker_frame = tk.Frame(status_frame, bg=self.colors["card_bg"])
                    worker_frame.pack(fill=tk.X, padx=20, pady=5)
                    if master['task']:
                        skill_text = "(熟练)" if master.get('is_skilled', False) else ""
                        task_text = f"正在制作: {master['task']}{skill_text}"
                    else:
                        skill_text = " ⭐熟练工" if master.get('is_skilled', False) else ""
                        task_text = f"空闲{skill_text}"
                    tk.Label(worker_frame, text=f"  大师{i + 1}: {task_text}",
                             font=self.FONT_BODY, bg=self.colors["card_bg"],
                             fg=self.colors["text_dark"]).pack(side=tk.LEFT, padx=(0, 10))
                    if in_phase and master['task'] is None:
                        CustomButton(worker_frame, text=f"解雇 ({self.MASTER_WEAVER_WAGE}💰)",
                                     font=self.BUTTON_FONT, bg=self.colors["button_danger"], fg="white",
                                     padx=10, pady=5,
                                     command=lambda idx=i: [self.fire_worker("master", idx),
                                                            self.show_worker_management_in_phase()]).pack(
                                                            side=tk.RIGHT, padx=5)
                task_frame = tk.Frame(status_frame, bg=self.colors["card_bg"])
                task_frame.pack(pady=10)
                for task in ["麻衣", "布衣", "绫罗绸缎"]:
                    recipe = self.RECIPES[task]
                    materials = [f"{a}{m}" for m, a in recipe["materials"].items()]
                    CustomButton(task_frame, text=f"制作{task} (需{'+'.join(materials)})",
                                 font=self.BUTTON_FONT, bg=self.colors["button_primary"], fg="white",
                                 padx=15, pady=10,
                                 command=lambda t=task: [self.assign_worker_task(self.master_weavers, "master", t),
                                                          refresh_func()]).pack(side=tk.LEFT, padx=5)
                                                          
            if self.sachet_makers:
                tk.Label(status_frame, text=f"🌸 香囊师: {len(self.sachet_makers)}人",
                         font=self.FONT_STAT, bg=self.colors["card_bg"],
                         fg=self.colors["accent_blue"]).pack(anchor=tk.W, padx=20, pady=10)
                for i, maker in enumerate(self.sachet_makers):
                    worker_frame = tk.Frame(status_frame, bg=self.colors["card_bg"])
                    worker_frame.pack(fill=tk.X, padx=20, pady=5)
                    task_text = f"正在制作: {maker['task']}" if maker['task'] else "空闲"
                    tk.Label(worker_frame, text=f"  香囊师{i + 1}: {task_text}",
                             font=self.FONT_BODY, bg=self.colors["card_bg"],
                             fg=self.colors["text_dark"]).pack(side=tk.LEFT, padx=(0, 10))
                    if in_phase and maker['task'] is None:
                        CustomButton(worker_frame, text=f"解雇 ({self.SACHET_MAKER_WAGE}💰)",
                                     font=self.BUTTON_FONT, bg=self.colors["button_danger"], fg="white",
                                     padx=10, pady=5,
                                     command=lambda idx=i: [self.fire_worker("sachet_maker", idx),
                                                            self.show_worker_management_in_phase()]).pack(
                                                            side=tk.RIGHT, padx=5)
                task_frame = tk.Frame(status_frame, bg=self.colors["card_bg"])
                task_frame.pack(pady=10)
                CustomButton(task_frame, text="制作香囊 (需1丝绸+2茶叶)",
                             font=self.BUTTON_FONT, bg=self.colors["button_warning"], fg="white",
                             padx=15, pady=10,
                             command=lambda: [self.assign_worker_task(self.sachet_makers, "sachet_maker", "香囊"),
                                              refresh_func()]).pack(side=tk.LEFT, padx=5)
                                              
        tk.Frame(scrollable_frame, height=2, bg=self.colors["separator"]).pack(fill=tk.X, padx=50, pady=self.PAD_LG)
        
        if in_phase:
            CustomButton(scrollable_frame, text="✅ 完成工匠管理，继续航行",
                         font=("Microsoft YaHei", 16, "bold"), bg=self.colors["button_primary"], fg="white",
                         relief=tk.RAISED, borderwidth=3, padx=30, pady=15,
                         command=self.start_phase2).pack(pady=10)
        else:
            CustomButton(scrollable_frame, text="🔙 返回主界面",
                         font=("Microsoft YaHei", 16, "bold"), bg=self.colors["button_primary"], fg="white",
                         relief=tk.RAISED, borderwidth=3, padx=30, pady=15,
                         command=self.show_welcome).pack(pady=10)
                         
        canvas.update_idletasks()
        canvas.config(scrollregion=canvas.bbox("all"))
        canvas.yview_moveto(0)

    def show_worker_management_in_phase(self):
        self.show_worker_management(in_phase=True)

    # ── 鼠标滚轮 ──────────────────────────────────────────────────
    def bind_mousewheel(self, canvas):
        def on_mousewheel(event):
            if not canvas.winfo_exists():
                return
            if sys.platform == 'darwin':
                delta = -1 * event.delta
            else:
                delta = int(-1 * (event.delta / 120))
            canvas.yview_scroll(delta, "units")
        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

    # ── 样式 ──────────────────────────────────────────────────────
    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("Title.TLabel", font=self.FONT_TITLE,
                        foreground=self.colors["text_dark"], background=self.colors["bg_light"])
        style.configure("Subtitle.TLabel", font=self.FONT_SUBTITLE,
                        foreground=self.colors["accent_blue"], background=self.colors["bg_light"])
        style.configure("DarkFrame.TLabelframe", background=self.colors["bg_light"],
                        foreground=self.colors["text_dark"])
        style.configure("DarkFrame.TLabelframe.Label", background=self.colors["bg_light"],
                        foreground=self.colors["accent_blue"])

    # ── 主界面构建 ────────────────────────────────────────────────
    def create_widgets(self):
        main_frame = ttk.Frame(self.window, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        main_frame.configure(style="DarkFrame.TLabelframe")
        
        title_frame = ttk.Frame(main_frame, style="DarkFrame.TLabelframe")
        title_frame.grid(row=0, column=0, columnspan=3, pady=(0, self.PAD_SM), sticky=(tk.W, tk.E))
        
        title_container = tk.Frame(title_frame, bg=self.colors["bg_dark"], padx=self.PAD_LG, pady=self.PAD_MD)
        title_container.pack(fill=tk.X)
        
        tk.Label(title_container, text="⚓ PortMasters 🚢",
                 font=("Microsoft YaHei", 22, "bold"),
                 bg=self.colors["bg_dark"], fg=self.colors["accent_gold"]).pack(side=tk.LEFT, padx=(0, 30))
        tk.Label(title_container, text="⚓ 航海贸易 | 🚢 船只升级 | 👥 工匠制作 | 🧾 税收系统",
                 font=self.FONT_SMALL, bg=self.colors["bg_dark"],
                 fg=self.colors["text_light"]).pack(side=tk.LEFT, padx=(0, 20))
        tk.Label(title_container,
                 text="快捷键: Ctrl+S保存 | Ctrl+N下一阶段 | Ctrl+H工匠管理 | Ctrl+R重新开始 | F1帮助",
                 font=("Microsoft YaHei", 8), bg=self.colors["bg_dark"], fg="#AAC4E8").pack(side=tk.RIGHT)
                 
        content_frame = ttk.Frame(main_frame, style="DarkFrame.TLabelframe")
        content_frame.grid(row=1, column=0, columnspan=3,
                           sticky=(tk.W, tk.E, tk.N, tk.S), pady=self.PAD_MD)
                           
        self.create_status_panel(content_frame)
        self.create_phase_panel(content_frame)
        self.create_control_panel(main_frame)
        self.create_log_panel(main_frame)
        
        self.window.columnconfigure(0, weight=1)
        self.window.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=0)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        main_frame.rowconfigure(3, weight=0)
        
        content_frame.columnconfigure(0, weight=0, minsize=280)
        content_frame.columnconfigure(1, weight=1)
        content_frame.rowconfigure(0, weight=1)

    def create_status_panel(self, parent):
        status_panel = ttk.LabelFrame(parent, text="📊 航海日志",
                                      padding="10", style="DarkFrame.TLabelframe")
        status_panel.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, self.PAD_MD))
        
        self.round_label = tk.Label(status_panel, text=f"🌊 第 1/8 航程",
                                    font=self.FONT_STAT, bg=self.colors["bg_light"],
                                    fg=self.colors["bg_dark"])
        self.round_label.grid(row=0, column=0, columnspan=2, pady=(0, self.PAD_SM), sticky=tk.W)
        
        self.money_label = tk.Label(status_panel, text="💰 资金: 100 金币",
                                    font=self.FONT_BODY_BOLD, bg=self.colors["bg_light"],
                                    fg=self.colors["accent_green"])
        self.money_label.grid(row=1, column=0, columnspan=2, pady=(0, self.PAD_SM), sticky=tk.W)
        
        self.score_label = tk.Label(status_panel, text="🏆 声望: 0",
                                    font=self.FONT_BODY, bg=self.colors["bg_light"],
                                    fg=self.colors["text_dark"])
        self.score_label.grid(row=2, column=0, columnspan=2, pady=(0, self.PAD_MD), sticky=tk.W)
        
        self.create_ship_panel(status_panel)
        self.create_inventory_panel(status_panel)
        
        status_panel.rowconfigure(4, weight=1)

    def create_ship_panel(self, parent):
        ship_frame = ttk.LabelFrame(parent, text="🚢 船只状态",
                                    padding=self.PAD_MD, style="DarkFrame.TLabelframe")
        ship_frame.grid(row=3, column=0, columnspan=2, pady=(0, self.PAD_MD), sticky=(tk.W, tk.E))
        
        self.ship_label = tk.Label(ship_frame, text="🚢 商船: 0级",
                                   font=self.FONT_BODY, bg=self.colors["bg_light"],
                                   fg=self.colors["text_dark"])
        self.ship_label.pack(anchor=tk.W, pady=2)
        
        self.transport_label = tk.Label(ship_frame, text="⚓ 运费: max(5, 材料数×2 - 0)金币",
                                        font=self.FONT_BODY, bg=self.colors["bg_light"],
                                        fg=self.colors["accent_red"])
        self.transport_label.pack(anchor=tk.W, pady=2)

    def create_inventory_panel(self, parent):
        inv_frame = ttk.LabelFrame(parent, text="📦 船舱货物",
                                   padding=self.PAD_SM, style="DarkFrame.TLabelframe")
        inv_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        canvas = tk.Canvas(inv_frame, height=200, highlightthickness=0, bg=self.colors["bg_light"])
        scrollbar = ttk.Scrollbar(inv_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_light"])
        
        scrollable_frame.bind("<Configure>",
                              lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
                              
        window_id = canvas.create_window((0, 0), window=scrollable_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        self.bind_mousewheel(canvas)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.inventory_labels = {}
        
        tk.Label(scrollable_frame, text="━━ 原材料 ━━", font=self.FONT_SMALL_BOLD,
                 bg=self.colors["bg_light"], fg=self.colors["accent_blue"]).pack(
                 anchor=tk.W, pady=(5, 2), padx=5)
        for resource in self.resource_types:
            self.create_inventory_item(scrollable_frame, resource)
            
        tk.Frame(scrollable_frame, height=1, bg=self.colors["separator"]).pack(fill=tk.X, pady=5, padx=5)
        
        tk.Label(scrollable_frame, text="━━ 成品 ━━", font=self.FONT_SMALL_BOLD,
                 bg=self.colors["bg_light"], fg=self.colors["accent_gold"]).pack(
                 anchor=tk.W, pady=(5, 2), padx=5)
        for product in self.product_types:
            self.create_inventory_item(scrollable_frame, product)
            
        if self.weavers or self.master_weavers or self.sachet_makers:
            tk.Frame(scrollable_frame, height=1, bg=self.colors["separator"]).pack(fill=tk.X, pady=5, padx=5)
            tk.Label(scrollable_frame, text="━━ 工匠 ━━", font=self.FONT_SMALL_BOLD,
                     bg=self.colors["bg_light"], fg=self.colors["accent_blue"]).pack(
                     anchor=tk.W, pady=(5, 2), padx=5)
            workers_info = [
                ("👩‍🔧 织女", len(self.weavers)),
                ("👩‍🎨 大师", len(self.master_weavers)),
                ("🌸 香囊师", len(self.sachet_makers))
            ]
            for name, count in workers_info:
                frame = tk.Frame(scrollable_frame, bg=self.colors["bg_light"])
                frame.pack(fill=tk.X, padx=10, pady=1)
                tk.Label(frame, text=name, font=self.FONT_SMALL,
                         bg=self.colors["bg_light"], fg=self.colors["text_dark"],
                         width=12, anchor="w").pack(side=tk.LEFT)
                tk.Label(frame, text=str(count), font=self.FONT_SMALL_BOLD,
                         bg=self.colors["bg_light"], fg=self.colors["accent_blue"],
                         width=4, anchor="e").pack(side=tk.RIGHT)

    def create_inventory_item(self, parent, item):
        color = self.resource_colors.get(item, "black")
        icon = self.resource_icons.get(item, "")
        frame = tk.Frame(parent, bg=self.colors["bg_light"])
        frame.pack(fill=tk.X, padx=10, pady=1)
        tk.Label(frame, text=icon, font=self.FONT_BODY,
                 bg=self.colors["bg_light"]).pack(side=tk.LEFT, padx=(0, 3))
        tk.Label(frame, text=item, font=self.FONT_SMALL,
                 bg=self.colors["bg_light"], fg=color,
                 width=10, anchor="w").pack(side=tk.LEFT)
        label_value = tk.Label(frame, text=str(self.inventory.get(item, 0)),
                               font=self.FONT_SMALL_BOLD, bg=self.colors["bg_light"],
                               fg=color, width=5, anchor="e")
        label_value.pack(side=tk.RIGHT, padx=(0, 5))
        self.inventory_labels[item] = label_value

    def create_phase_panel(self, parent):
        self.phase_frame = ttk.LabelFrame(parent, text="🌊 贸易阶段",
                                          padding=self.PAD_LG, style="DarkFrame.TLabelframe")
        self.phase_frame.grid(row=0, column=1, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.phase_content = ttk.Frame(self.phase_frame, style="DarkFrame.TLabelframe")
        self.phase_content.pack(fill=tk.BOTH, expand=True)

    def create_control_panel(self, parent):
        control_panel = ttk.Frame(parent, style="DarkFrame.TLabelframe")
        control_panel.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(self.PAD_MD, 0))
        
        control_container = tk.Frame(control_panel, bg=self.colors["bg_dark"], padx=self.PAD_MD, pady=self.PAD_SM)
        control_container.pack(fill=tk.X)
        
        row1_frame = tk.Frame(control_container, bg=self.colors["bg_dark"])
        row1_frame.pack(fill=tk.X, pady=3)
        
        self.start_btn = CustomButton(row1_frame, text="🚢 开始航行",
                                      font=self.BUTTON_FONT,
                                      bg=self.colors["button_primary"], fg="white",
                                      relief=tk.RAISED, borderwidth=2, padx=20, pady=10,
                                      cursor="hand2", command=self.show_worker_management)
        self.start_btn.pack(side=tk.LEFT, padx=2)
        
        self.next_btn = CustomButton(row1_frame, text="⏭️ 继续航行",
                                     font=self.BUTTON_FONT,
                                     bg=self.colors["button_primary"], fg="white",
                                     relief=tk.RAISED, borderwidth=2, padx=20, pady=10,
                                     cursor="hand2", state=tk.DISABLED, command=self.next_phase)
        self.next_btn.pack(side=tk.LEFT, padx=2)
        
        row2_frame = tk.Frame(control_container, bg=self.colors["bg_dark"])
        row2_frame.pack(fill=tk.X, pady=3)
        
        buttons = [
            ("📖 航海指南", self.show_instructions, self.colors["button_primary"]),
            ("💾 保存进度", self.save_game, self.colors["button_success"]),
            ("🔄 重新起航", self.restart_game, self.colors["button_primary"])
        ]
        for text, command, color in buttons:
            CustomButton(row2_frame, text=text, font=self.BUTTON_FONT,
                         bg=color, fg="white", relief=tk.RAISED, borderwidth=2,
                         padx=20, pady=10, cursor="hand2", command=command).pack(side=tk.LEFT, padx=2)

    def create_log_panel(self, parent):
        log_frame = ttk.LabelFrame(parent, text="📜 航行日志",
                                   padding=self.PAD_SM, style="DarkFrame.TLabelframe")
        log_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(self.PAD_SM, 0))
        
        log_container = ttk.Frame(log_frame, style="DarkFrame.TLabelframe")
        log_container.pack(fill=tk.BOTH, expand=True)
        
        self.log_text = tk.Text(log_container, height=5, font=("Microsoft YaHei", 9),
                                bg="#F8F9FA", fg=self.colors["text_dark"],
                                wrap=tk.WORD, borderwidth=1, relief=tk.SOLID)
        scrollbar = ttk.Scrollbar(log_container, orient="vertical", command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def log_message(self, message):
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)

    def clear_phase_content(self):
        for widget in self.phase_content.winfo_children():
            widget.destroy()
        self.purchase_buttons.clear()
        self.order_buttons.clear()

    def update_display(self):
        self.round_label.config(text=f"🌊 第 {self.current_round}/{self.max_rounds} 航程")
        self.money_label.config(text=f"💰 资金: {self.money} 金币")
        self.score_label.config(text=f"🏆 声望: {self.score}")
        discount = self.ship_level * 5
        self.ship_label.config(text=f"🚢 商船: {self.ship_level}级")
        self.transport_label.config(text=f"⚓ 运费: max(5, 材料数×2 - {discount})金币")
        for item, label in self.inventory_labels.items():
            label.config(text=str(self.inventory.get(item, 0)))

    # ── 欢迎界面 ──────────────────────────────────────────────────
    def show_welcome(self):
        self.phase = 0
        self.clear_phase_content()
        self.log_message("=" * 50)
        self.log_message("⚓ 欢迎来到PortMasters海上丝绸之路贸易大亨！")
        self.log_message("🚢 穿梭于各大港口之间，建立您的商业帝国！")
        self.log_message("👥 雇佣工匠，制作精美商品，获取更高利润！")
        self.log_message("=" * 50)
        
        welcome_frame = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        welcome_frame.pack(fill=tk.BOTH, expand=True, pady=30)
        
        tk.Label(welcome_frame, text="⚓ PortMasters 🚢",
                 font=self.FONT_HERO, bg=self.colors["bg_light"],
                 fg=self.colors["bg_dark"]).pack(pady=(20, 10))
        tk.Label(welcome_frame, text="🌊 航行八大航程，成为海上霸主！",
                 font=("Microsoft YaHei", 16), bg=self.colors["bg_light"],
                 fg=self.colors["accent_blue"]).pack(pady=(0, 30))
                 
        if os.path.exists(self.save_file):
            CustomButton(welcome_frame, text="📂 继续航行", font=self.BUTTON_FONT,
                         bg=self.colors["button_success"], fg="white",
                         relief=tk.RAISED, borderwidth=3, padx=30, pady=15,
                         cursor="hand2", command=self.load_game).pack(pady=10)
                         
        CustomButton(welcome_frame, text="🚢 扬帆起航", font=("Microsoft YaHei", 16, "bold"),
                     bg=self.colors["button_success"], fg="white",
                     relief=tk.RAISED, borderwidth=3, padx=30, pady=15,
                     cursor="hand2", command=self.start_phase1).pack(pady=20)
                     
        tips_frame = ttk.Frame(welcome_frame, style="DarkFrame.TLabelframe")
        tips_frame.pack(pady=20)
        tips = [
            "📦 初始货物：麻布×8，丝绸×5，茶叶×3",
            "💰 初始资金：100金币",
            "👥 可雇佣工匠制作高价值成品",
            "🧾 成品销售需缴纳增值税，航程结束缴纳所得税",
            "🚢 共8个航程，每航程4阶段：采购→交易→维护→升级",
            "⚓ 运输费：max(5, 材料数×2 - 船只等级×5)",
            "💾 按Ctrl+S保存游戏进度",
            "🎯 目标：积累财富，提升声望！",
            "🔮 新增：在第1阶段点击“牙行密语板”购买需求消息！",
            "🔧 新增：在第4阶段升级船只以解锁模块槽位，打造专属流派！",
            "🎨 界面优化：核心管理页面已采用居中块布局，视觉更聚焦！"
        ]
        for tip in tips:
            tk.Label(tips_frame, text=tip, font=self.FONT_BODY,
                     bg=self.colors["bg_light"], fg=self.colors["text_dark"]).pack(anchor=tk.W, pady=3)
                     
        self.update_button_states()

    def show_instructions(self):
        instructions = """
⚓ PortMasters - 游戏规则

🚢 游戏目标：
通过8个航程的海上贸易，积累最大财富和声望！

📦 货物系统：
原材料：麻布(3-6💰)、丝绸(6-10💰)、茶叶(10-14💰)
成品：麻衣(30-42💰)、布衣(50-65💰)、绫罗绸缎(70-90💰)、香囊(95-120💰)

👥 工匠系统：
• 织女（8金币/回合）：制作麻衣或布衣
• 纺织大师（12金币/回合）：制作麻衣、布衣或绫罗绸缎
• 香囊师（20金币/回合）：制作香囊

🧾 税收系统：
• 增值税：成品销售利润的5%
• 所得税：航程净利润的10%

🔮 牙行密语：
• 第1阶段：点击“牙行密语板”打开独立窗口
• 花费金币购买关于第2阶段需求的“密语”
• 探听到的消息将保证生成对应的保底订单

🔧 船只模块 (核心流派)：
• 第4阶段：升级商船以解锁“模块槽位”
• 抽取并安装强大的模块，创造独特的协同效应
• 随时替换模块，根据当前局势调整您的商业帝国！

🎨 界面与体验优化：
• 核心管理页面（工匠、船坞、维护等）已全面采用居中块布局
• 消除冗余留白，确保视觉层级一致，降低视觉疲劳

🌊 每航程4个阶段：
1. 港口采购 - 在各大港口购买原材料 (+ 牙行密语)
2. 贸易交易 - 完成原材料或成品订单
3. 船只维护 - 支付维护费 & 结算工匠生产
4. 船坞升级 - 升级商船并安装模块

⌨️ 快捷键：
• Ctrl+S：保存游戏
• Ctrl+N：进入下一阶段
• Ctrl+H：管理工匠
• Ctrl+R：重新开始
• F1：显示帮助

⚓ 祝您航行顺利，生意兴隆！
"""
        messagebox.showinfo("⚓ 航海指南", instructions)

    def start_phase1(self):
        self.phase = 1
        self.purchase_count = 0
        self.purchased_cards.clear()
        self.phase2_demand_tags = self._generate_phase2_demand_tags(count=5)
        self.revealed_intel = []
        self._intel_order_used = False
        self.rumor_window = None
        
        self.clear_phase_content()
        self.log_message(f"\n⚓=== 第{self.current_round}航程 - 阶段1: 港口采购 ===")
        self.log_message(f"💰 当前资金: {self.money}金币")
        
        self.resource_cards = []
        for i in range(5):
            card = self.generate_mixed_resource_card()
            card["id"] = i
            self.resource_cards.append(card)
            
        self.show_purchase_interface()
        self.update_button_states()

    def show_purchase_interface(self):
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True, padx=self.PAD_LG, pady=self.PAD_LG)
        
        header = tk.Frame(main_container, bg=self.colors["bg_light"])
        header.pack(fill=tk.X, anchor=tk.W, pady=(0, self.PAD_LG))
        
        tk.Label(header, text="⚓ 港口商品采购", font=self.FONT_TITLE,
                 bg=self.colors["bg_light"], fg=self.colors["bg_dark"]).pack(side=tk.LEFT, anchor=tk.W)
        CustomButton(header, text="🔮 牙行密语板", font=self.BUTTON_FONT,
                     bg=self.colors["accent_gold"], fg=self.colors["text_dark"],
                     relief=tk.RAISED, borderwidth=2, padx=15, pady=8,
                     command=self.show_rumor_board).pack(side=tk.RIGHT)
                     
        cards_container = tk.Frame(main_container, bg=self.colors["bg_light"])
        cards_container.pack(fill=tk.BOTH, expand=True)
        
        self.create_scrollable_cards(cards_container, self.resource_cards, self.create_purchase_card)
        self.create_phase_bottom_buttons(main_container, "✅ 完成采购，继续航行", self.complete_phase1)

    def start_phase2(self):
        self.phase = 2
        self.order_count = 0
        self.completed_orders.clear()
        self.clear_phase_content()
        self.log_message(f"\n🤝=== 第{self.current_round}航程 - 阶段2: 贸易交易 ===")
        
        self.customer_cards = []
        for i in range(5):
            order = self.generate_mixed_order()
            order["id"] = i
            self.customer_cards.append(order)
            
        self.show_orders_interface()
        self.update_button_states()

    def show_orders_interface(self):
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True, padx=self.PAD_LG, pady=self.PAD_LG)
        
        header = tk.Frame(main_container, bg=self.colors["bg_light"])
        header.pack(fill=tk.X, anchor=tk.W, pady=(0, self.PAD_LG))
        
        tk.Label(header, text="🤝 贸易订单", font=self.FONT_TITLE,
                 bg=self.colors["bg_light"], fg=self.colors["bg_dark"]).pack(anchor=tk.W)
                 
        cards_container = tk.Frame(main_container, bg=self.colors["bg_light"])
        cards_container.pack(fill=tk.BOTH, expand=True)
        
        self.create_scrollable_cards(cards_container, self.customer_cards, self.create_order_card)
        self.create_phase_bottom_buttons(main_container, "✅ 完成交易，继续航行", self.complete_phase2)

    def create_scrollable_cards(self, parent, cards, card_creator):
        canvas = tk.Canvas(parent, highlightthickness=0, bg=self.colors["bg_light"])
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_light"])
        
        scrollable_frame.bind("<Configure>",
                              lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
                              
        window_id = canvas.create_window((0, 0), window=scrollable_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=(0, 5))
        scrollbar.pack(side="right", fill="y")
        self.bind_mousewheel(canvas)
        
        grid_frame = tk.Frame(scrollable_frame, bg=self.colors["bg_light"])
        grid_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        for i in range(3):
            grid_frame.columnconfigure(i, weight=1, uniform="col", minsize=350)
            
        for i, card in enumerate(cards):
            row, col = self.get_card_grid_position(i, len(cards))
            card_creator(grid_frame, card, row, col)
            
        canvas.update_idletasks()
        canvas.config(scrollregion=canvas.bbox("all"))
        canvas.yview_moveto(0)

    def get_card_grid_position(self, index, total):
        if index < 3:
            return 0, index
        else:
            return 1, index - 3

    def create_purchase_card(self, parent, card, row, col):
        card_frame = tk.Frame(parent, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=2)
        card_frame.grid(row=row, column=col, padx=10, pady=10, sticky="nsew")
        
        port_frame = tk.Frame(card_frame, bg=self.colors["card_header"])
        port_frame.pack(fill=tk.X, padx=10, pady=self.PAD_MD)
        
        card_type = "成品" if card.get("is_product_card") else "原材料"
        tk.Label(port_frame, text=f"📍 {card['port']} [{card_type}]",
                 font=self.FONT_CARD_TITLE, bg=self.colors["card_header"],
                 fg=self.colors["bg_dark"]).pack(pady=5)
                 
        items_frame = tk.Frame(card_frame, bg=self.colors["card_bg"])
        items_frame.pack(fill=tk.X, padx=15, pady=10)
        
        for resource_info in card["resources"]:
            self.create_resource_info_row(items_frame, resource_info, font_size=11)
            if card.get("is_product_card") and "material_cost" in resource_info:
                cost_frame = tk.Frame(items_frame, bg=self.colors["card_bg"])
                cost_frame.pack(fill=tk.X, pady=2)
                tk.Label(cost_frame,
                         text=f"   📦 原料成本: {resource_info['material_cost']}金币 "
                              f"({resource_info['material_details']})",
                         font=self.FONT_SMALL, bg=self.colors["card_bg"],
                         fg="#888888").pack(anchor=tk.W)
                profit_margin = resource_info['price'] - resource_info['material_cost']
                tk.Label(cost_frame,
                         text=f"   💰 溢价: +{profit_margin}金币 "
                              f"({profit_margin / resource_info['material_cost'] * 100:.0f}%)",
                         font=self.FONT_SMALL, bg=self.colors["card_bg"],
                         fg=self.colors["accent_red"]).pack(anchor=tk.W)
                         
        final_cost = self.get_card_final_cost(card)
        for m in self.equipped_modules:
            final_cost = m.modify_purchase_cost(self, final_cost, card)
        final_cost = max(0, final_cost)
        
        total_frame = tk.Frame(card_frame, bg=self.colors["card_bg"])
        total_frame.pack(fill=tk.X, padx=15, pady=self.PAD_MD)
        
        cost_text = f"💰 总价: {final_cost}金币"
        if final_cost < card["total_cost"]:
            cost_text += f" (原价 {card['total_cost']})"
        tk.Label(total_frame, text=cost_text,
                 font=self.FONT_STAT, bg=self.colors["card_bg"],
                 fg=self.colors["accent_red"]).pack(anchor=tk.W)
                 
        is_purchased = card["id"] in self.purchased_cards
        can_afford = self.money >= final_cost and not is_purchased
        btn_text = "✅ 已采购" if is_purchased else f"🛒 采购 ({final_cost}💰)"
        btn_state = tk.DISABLED if is_purchased or not can_afford else tk.NORMAL
        btn_bg = self.colors["button_success"] if can_afford and not is_purchased else self.colors["button_dark_grey"]
        
        btn_frame = tk.Frame(card_frame, bg=self.colors["card_bg"])
        btn_frame.pack(fill=tk.X, padx=15, pady=(5, 12))
        
        btn = CustomButton(btn_frame, text=btn_text, font=self.BUTTON_FONT,
                           bg=btn_bg, fg="white", relief=tk.RAISED, borderwidth=1,
                           padx=15, pady=15, wraplength=280,
                           state=btn_state, command=lambda c=card: self.purchase_card_specific(c))
        btn.pack(fill=tk.X, expand=True)
        
        self.purchase_buttons.append({"button": btn, "card_id": card["id"], "card_ref": card})

    def create_order_card(self, parent, order, row, col):
        order_frame = tk.Frame(parent, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=2)
        order_frame.grid(row=row, column=col, padx=10, pady=10, sticky="nsew")
        
        port_frame = tk.Frame(order_frame, bg=self.colors["card_header"])
        port_frame.pack(fill=tk.X, padx=10, pady=self.PAD_MD)
        
        order_type = "成品需求" if order.get("is_product_order") else "原材料需求"
        WrappedTitleLabel(port_frame, text=f"📍 {order['demand_port']} {order_type}",
                          font=self.FONT_CARD_TITLE, bg=self.colors["card_header"],
                          fg=self.colors["bg_dark"], justify=tk.CENTER).pack(fill=tk.X, pady=5)
                 
        items_frame = tk.Frame(order_frame, bg=self.colors["card_bg"])
        items_frame.pack(fill=tk.X, padx=15, pady=10)
        
        for resource_info in order["resources"]:
            has_enough = self.inventory.get(resource_info["type"], 0) >= resource_info["required"]
            status_icon = "✅" if has_enough else "❌"
            item_frame = tk.Frame(items_frame, bg=self.colors["card_bg"])
            item_frame.pack(fill=tk.X, pady=4)
            tk.Label(item_frame, text=status_icon, font=self.FONT_BODY_BOLD,
                     bg=self.colors["card_bg"]).pack(side=tk.LEFT, padx=(0, self.PAD_MD))
            self.create_resource_info_row(item_frame, resource_info, show_inventory=True, font_size=11)
            
        has_silk = any(r["type"] in ["丝绸", "绫罗绸缎", "香囊", "布衣"] for r in order["resources"])
        transport_detail = self.show_transport_cost_detail(order["total_items"], has_silk)
        
        transport_frame = tk.Frame(order_frame, bg=self.colors["card_bg"])
        transport_frame.pack(fill=tk.X, padx=15, pady=5)
        tk.Label(transport_frame,
                 text=f"⚓ 运费: {transport_detail['base_cost']} - {transport_detail['discount']} "
                      f"= {transport_detail['final_cost']}金币",
                 font=self.FONT_BODY, bg=self.colors["card_bg"],
                 fg=self.colors["accent_red"]).pack(anchor=tk.W)
                 
        net_profit = order['reward'] - transport_detail['final_cost']
        total_vat = 0
        if order.get("is_product_order"):
            product = order["resources"][0]["type"]
            estimated_vat = self.calculate_vat(product, order['reward'] / order["resources"][0]["required"])
            total_vat = estimated_vat * order["resources"][0]["required"]
            net_profit -= total_vat
            
        finance_frame = tk.Frame(order_frame, bg=self.colors["card_bg"])
        finance_frame.pack(fill=tk.X, padx=15, pady=self.PAD_MD)
        
        finance_text = f"💰 报酬: {order['reward']}金币  📊 净利: {net_profit}金币"
        if order.get("is_product_order"):
            finance_text += f"\n🧾 预计增值税: {total_vat}金币"
        tk.Label(finance_frame, text=finance_text, font=self.FONT_BODY_BOLD,
                 bg=self.colors["card_bg"],
                 fg=self.colors["accent_green"] if net_profit > 0 else self.colors["accent_red"],
                 justify=tk.LEFT).pack(anchor=tk.W)
                 
        can_complete = all(self.inventory.get(r["type"], 0) >= r["required"] for r in order["resources"])
        is_completed = order["id"] in self.completed_orders
        btn_text = "✅ 已完成" if is_completed else f"🤝 交易 (净赚{net_profit}💰)"
        btn_state = tk.DISABLED if is_completed or not can_complete else tk.NORMAL
        btn_bg = self.colors["button_primary"] if can_complete and not is_completed else self.colors["button_dark_grey"]
        
        btn_frame = tk.Frame(order_frame, bg=self.colors["card_bg"])
        btn_frame.pack(fill=tk.X, padx=15, pady=(5, 12))
        
        btn = CustomButton(btn_frame, text=btn_text, font=self.BUTTON_FONT,
                           bg=btn_bg, fg="white", relief=tk.RAISED, borderwidth=1,
                           padx=15, pady=15, wraplength=280,
                           state=btn_state, command=lambda o=order: self.complete_order(o))
        btn.pack(fill=tk.X, expand=True)
        
        self.order_buttons.append({"button": btn, "order_id": order["id"], "net_profit": net_profit})

    def create_resource_info_row(self, parent, resource_info, show_inventory=False, font_size=10):
        resource = resource_info["type"]
        color = self.resource_colors.get(resource, "black")
        icon = self.resource_icons.get(resource, "")
        
        item_frame = tk.Frame(parent, bg=self.colors["card_bg"])
        item_frame.pack(fill=tk.X, pady=2)
        
        tk.Label(item_frame, text=icon, font=("Microsoft YaHei", font_size + 2),
                 bg=self.colors["card_bg"]).pack(side=tk.LEFT, padx=(0, 5))
        tk.Label(item_frame, text=resource, font=("Microsoft YaHei", font_size, "bold"),
                 bg=self.colors["card_bg"], fg=color, width=10).pack(side=tk.LEFT)
                 
        if "quantity" in resource_info:
            tk.Label(item_frame, text=f"×{resource_info['quantity']}",
                     font=("Microsoft YaHei", font_size), bg=self.colors["card_bg"]).pack(side=tk.LEFT, padx=5)
        if "price" in resource_info:
            tk.Label(item_frame, text=f"单价: {resource_info['price']}💰",
                     font=("Microsoft YaHei", font_size), bg=self.colors["card_bg"],
                     fg="#666").pack(side=tk.LEFT, padx=5)
        elif "required" in resource_info:
            tk.Label(item_frame, text=f"×{resource_info['required']}",
                     font=("Microsoft YaHei", font_size), bg=self.colors["card_bg"]).pack(side=tk.LEFT, padx=5)
                     
        if show_inventory:
            inv_color = "green" if self.inventory.get(resource, 0) >= resource_info.get("required", 0) else "red"
            tk.Label(item_frame, text=f"库存: {self.inventory.get(resource, 0)}",
                     font=("Microsoft YaHei", font_size - 1), bg=self.colors["card_bg"],
                     fg=inv_color).pack(side=tk.LEFT, padx=(5, 0))

    def create_phase_bottom_buttons(self, parent, text, command):
        bottom_frame = tk.Frame(parent, bg=self.colors["bg_light"])
        bottom_frame.pack(fill=tk.X, pady=(self.PAD_XL, 5))
        CustomButton(bottom_frame, text=text, font=self.BUTTON_FONT,
                     bg=self.colors["button_primary"], fg="white", relief=tk.RAISED,
                     borderwidth=2, padx=30, pady=15, command=command).pack(pady=5)

    def update_purchase_buttons(self):
        for btn_info in self.purchase_buttons:
            card_id = btn_info["card_id"]
            card = btn_info["card_ref"]
            button = btn_info["button"]
            
            is_purchased = card_id in self.purchased_cards
            final_cost = self.get_card_final_cost(card)
            for m in self.equipped_modules:
                final_cost = m.modify_purchase_cost(self, final_cost, card)
            final_cost = max(0, final_cost)
            
            can_afford = self.money >= final_cost and not is_purchased
            btn_text = "✅ 已采购" if is_purchased else f"🛒 采购 ({final_cost}💰)"
            btn_state = tk.DISABLED if is_purchased or not can_afford else tk.NORMAL
            btn_bg = self.colors["button_success"] if can_afford and not is_purchased else self.colors["button_dark_grey"]
            
            button.config(text=btn_text, state=btn_state, bg=btn_bg)

    def complete_phase1(self):
        if self.purchase_count == 0:
            self.log_message("⏭️ 跳过了采购阶段")
        else:
            self.log_message(f"✅ 采购结束，共采购 {self.purchase_count} 批货物")
        self.show_worker_management_in_phase()

    def update_order_buttons(self):
        for btn_info in self.order_buttons:
            order_id = btn_info["order_id"]
            net_profit = btn_info["net_profit"]
            button = btn_info["button"]
            
            is_completed = order_id in self.completed_orders
            can_complete = True
            for order in self.customer_cards:
                if order["id"] == order_id:
                    can_complete = all(
                        self.inventory.get(r["type"], 0) >= r["required"] for r in order["resources"])
                    break
                    
            btn_text = "✅ 已完成" if is_completed else f"🤝 交易 (净赚{net_profit}💰)"
            btn_state = tk.DISABLED if is_completed or not can_complete else tk.NORMAL
            btn_bg = self.colors["button_primary"] if can_complete and not is_completed else self.colors["button_dark_grey"]
            
            button.config(text=btn_text, state=btn_state, bg=btn_bg)

    def complete_phase2(self):
        if self.order_count == 0:
            self.log_message("⏭️ 跳过了交易阶段")
        else:
            self.log_message(f"✅ 交易结束，共完成 {self.order_count} 笔交易")
        self.start_phase3()

    def start_phase3(self):
        self.phase = 3
        self.clear_phase_content()
        
        self.log_message("\n👥=== 处理工人生产 ===")
        self.process_production()
        
        self.log_message("\n💰=== 支付工人工资 ===")
        wage_result = self.pay_worker_wages()
        if wage_result == "bankruptcy":
            self.log_message("⚠️ 因无法支付工人工资而破产！")
            self.show_bankruptcy_screen()
            return
        elif not wage_result:
            self.log_message("⚠️ 工资支付出现问题！")
            self.show_bankruptcy_screen()
            return
            
        self.log_message(f"\n🔧=== 第{self.current_round}航程 - 阶段3: 船只维护 ===")
        if self.money <= 0:
            self.log_message("⚠️ 资金为0，无法支付维护费！")
            self.show_bankruptcy_screen()
            return
            
        maintenance_frame = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        maintenance_frame.pack(fill=tk.BOTH, expand=True, pady=40)
        
        tk.Label(maintenance_frame, text="🔧 船只维护",
                 font=self.FONT_HERO, bg=self.colors["bg_light"],
                 fg=self.colors["bg_dark"]).pack(pady=20)
                 
        cost = self.fixed_cost + self.maintenance_penalty
        tk.Label(maintenance_frame, text=f"每月固定维护费用: {cost}金币",
                 font=("Microsoft YaHei", 18), bg=self.colors["bg_light"],
                 fg=self.colors["text_dark"]).pack(pady=10)
        tk.Label(maintenance_frame, text=f"当前资金: {self.money}金币",
                 font=("Microsoft YaHei", 16), bg=self.colors["bg_light"],
                 fg=self.colors["accent_green"]).pack(pady=15)
                 
        tk.Frame(maintenance_frame, height=2, bg=self.colors["separator"]).pack(
            fill=tk.X, padx=80, pady=self.PAD_XL)
            
        if self.money >= cost:
            btn_text = f"💸 支付 {cost}金币"
            btn_command = self.pay_fixed_cost
        else:
            btn_text = f"⚠️ 强制支付 ({self.money}/{cost}金币)"
            btn_command = self.force_pay_cost
            
        CustomButton(maintenance_frame, text=btn_text, font=("Microsoft YaHei", 16, "bold"),
                     bg=self.colors["button_warning"], fg="white", relief=tk.RAISED, borderwidth=3,
                     padx=30, pady=15, command=btn_command).pack(pady=20)
                     
        self.update_button_states()

    def show_bankruptcy_screen(self):
        self.game_over = True
        self.clear_phase_content()
        self.log_message("\n" + "=" * 50)
        self.log_message("💥 破产！")
        self.log_message("💰 资金耗尽，无法继续经营")
        self.log_message(f"🏆 最终声望: {self.score}")
        self.log_message(f"🌊 完成航程: {self.current_round - 1}/{self.max_rounds}")
        self.log_message("=" * 50)
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True)
        
        canvas = tk.Canvas(main_container, highlightthickness=0, bg=self.colors["bg_light"])
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_light"])
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        
        window_id = canvas.create_window((0, 0), window=scrollable_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.bind_mousewheel(canvas)
        
        bankruptcy_frame = ttk.Frame(scrollable_frame, style="DarkFrame.TLabelframe")
        bankruptcy_frame.pack(fill=tk.BOTH, expand=True, pady=30)
        
        tk.Label(bankruptcy_frame, text="💥", font=("Microsoft YaHei", 80),
                 bg=self.colors["bg_light"], fg=self.colors["accent_red"]).pack(pady=15)
        tk.Label(bankruptcy_frame, text="船队破产！",
                 font=self.FONT_HERO, bg=self.colors["bg_light"],
                 fg=self.colors["accent_red"]).pack(pady=self.PAD_MD)
                 
        reason = ("资金耗尽，无法支付必要的运营费用"
                  if self.money <= 0 else "资金不足以支付维护费和工人工资")
        tk.Label(bankruptcy_frame, text=reason, font=self.FONT_SUBTITLE,
                 bg=self.colors["bg_light"], fg=self.colors["text_dark"]).pack(pady=self.PAD_MD)
                 
        tk.Frame(bankruptcy_frame, height=3, bg=self.colors["accent_red"]).pack(
            fill=tk.X, padx=100, pady=20)
            
        stats_frame = tk.Frame(bankruptcy_frame, bg=self.colors["bg_light"])
        stats_frame.pack(pady=15)
        
        stats = [
            ("🌊 完成航程:", f"{self.current_round - 1}/{self.max_rounds}"),
            ("💰 最终资金:", f"{self.money}金币"),
            ("🏆 最终声望:", f"{self.score}"),
            ("🚢 船只等级:", f"{self.ship_level}级"),
            ("👥 工匠团队:",
             f"织女:{len(self.weavers)} 大师:{len(self.master_weavers)} 香囊师:{len(self.sachet_makers)}"),
            ("🧾 累计缴税:", f"{self.vat_paid + self.income_tax_paid}金币")
        ]
        for label_text, value_text in stats:
            stat_frame = tk.Frame(stats_frame, bg=self.colors["bg_light"])
            stat_frame.pack(fill=tk.X, pady=6)
            tk.Label(stat_frame, text=label_text, font=self.FONT_BODY,
                     bg=self.colors["bg_light"], fg=self.colors["text_dark"]).pack(side=tk.LEFT)
            tk.Label(stat_frame, text=value_text, font=self.FONT_BODY_BOLD,
                     bg=self.colors["bg_light"], fg=self.colors["accent_blue"]).pack(side=tk.RIGHT)
                     
        tk.Frame(bankruptcy_frame, height=2, bg=self.colors["separator"]).pack(
            fill=tk.X, padx=100, pady=20)
            
        buttons_frame = tk.Frame(bankruptcy_frame, bg=self.colors["bg_light"])
        buttons_frame.pack(pady=10)
        
        CustomButton(buttons_frame, text="🔄 重新起航", font=("Microsoft YaHei", 16, "bold"),
                     bg=self.colors["button_primary"], fg="white",
                     relief=tk.RAISED, borderwidth=3, padx=25, pady=15,
                     cursor="hand2", command=self.restart_game).pack(side=tk.LEFT, padx=10)
        CustomButton(buttons_frame, text="💡 贸易策略", font=("Microsoft YaHei", 14, "bold"),
                     bg=self.colors["button_warning"], fg="white",
                     relief=tk.RAISED, borderwidth=2, padx=25, pady=15,
                     cursor="hand2", command=self.show_bankruptcy_tips).pack(side=tk.LEFT, padx=10)
                     
        self.update_button_states()

    def show_bankruptcy_tips(self):
        tips = """
⚓ 避免破产的贸易策略：

💰 资金管理：
1. 确保始终有足够备用金支付所有费用
2. 维护费 + 工人工资是每回合固定支出
3. 计算总支出后再决定采购量

👥 工匠管理：
1. 织女工资: {}金币/回合
2. 纺织大师工资: {}金币/回合
3. 香囊师工资: {}金币/回合
4. 量力而行，不要雇佣过多工人

🔮 牙行密语策略：
1. 如果资金充裕，尽早购买消息
2. 囤积探听到的货物，保证第2阶段利润
3. 平衡购买消息与其他投资的资金分配

🛒 采购策略：
1. 预留维护费+工资后再采购
2. 选择性价比高的商品组合
3. 优先购买港口特产 + 探听到的消息货物

🤝 交易策略：
1. 优先完成利润高的订单
2. 注意运输成本对利润的影响
3. 成品订单利润高但需缴增值税

⚠️ 风险控制：
1. 计算每回合固定支出：维护费 + 工人工资
2. 确保资金始终 > 固定支出
3. 不要过度扩张导致资金链断裂

💾 使用Ctrl+S保存游戏进度！
""".format(self.WEAVER_WAGE, self.MASTER_WEAVER_WAGE, self.SACHET_MAKER_WAGE)
        messagebox.showinfo("💡 贸易策略建议", tips)

    def start_phase4(self):
        self.phase = 4
        self.clear_phase_content()
        self.log_message(f"\n🚢=== 第{self.current_round}航程 - 阶段4: 船坞与模块 ===")
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True)
        
        canvas = tk.Canvas(main_container, highlightthickness=0, bg=self.colors["bg_light"])
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_light"])
        
        scrollable_frame.bind("<Configure>",
                              lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
                              
        window_id = canvas.create_window((0, 0), window=scrollable_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=(5, 0))
        scrollbar.pack(side="right", fill="y")
        self.bind_mousewheel(canvas)
        
        tk.Label(scrollable_frame, text="🚢 船坞与模块安装",
                 font=self.FONT_HERO, bg=self.colors["bg_light"],
                 fg=self.colors["bg_dark"]).pack(pady=self.PAD_XL)
                 
        tk.Frame(scrollable_frame, height=3, bg=self.colors["separator"]).pack(
            fill=tk.X, padx=80, pady=(0, self.PAD_XL))
            
        current_card = tk.Frame(scrollable_frame, bg=self.colors["card_header"],
                                relief=tk.RAISED, borderwidth=3, padx=30, pady=20)
        current_card.pack(fill=tk.X, padx=50, pady=10)
        
        tk.Label(current_card, text=f"🚢 船只等级: {self.ship_level} | ⚓ 运费折扣: {self.ship_level * 5} 金币",
                 font=("Microsoft YaHei", 16, "bold"), bg=self.colors["card_header"], fg=self.colors["bg_dark"]).pack()
        tk.Label(current_card, text=f"🔌 模块槽位: {len(self.equipped_modules)} / {self.ship_level}",
                 font=("Microsoft YaHei", 14), bg=self.colors["card_header"], fg=self.colors["accent_blue"]).pack(pady=5)
                 
        if self.equipped_modules:
            modules_frame = tk.Frame(current_card, bg=self.colors["card_header"])
            modules_frame.pack(fill=tk.X, pady=10)
            for m in self.equipped_modules:
                tk.Label(modules_frame, text=f"{m.icon} {m.name}: {m.desc}",
                         font=self.FONT_SMALL, bg=self.colors["card_header"], fg=self.colors["text_dark"]).pack(anchor=tk.W, pady=2)
        else:
            tk.Label(current_card, text="尚未安装任何模块。升级船只以解锁槽位！",
                     font=self.FONT_SMALL, bg=self.colors["card_header"], fg="#666").pack(pady=5)
                     
        actions_frame = tk.Frame(scrollable_frame, bg=self.colors["bg_light"])
        actions_frame.pack(pady=20, fill=tk.X, padx=50)
        
        if self.ship_level < 3:
            upgrade_cost = self.ship_upgrade_cost[self.ship_level] + self.ship_upgrade_penalty
            can_upgrade = self.money >= upgrade_cost
            CustomButton(actions_frame, text=f"⚓ 升级船只 (至{self.ship_level+1}级)\n花费: {upgrade_cost} 金币 | +1 槽位, +5 折扣",
                         font=self.BUTTON_FONT, bg=self.colors["button_primary"] if can_upgrade else self.colors["button_dark_grey"],
                         fg="white", padx=20, pady=15, state=tk.NORMAL if can_upgrade else tk.DISABLED,
                         command=self.upgrade_ship).pack(pady=5, fill=tk.X)
                         
        can_draft = self.ship_level > 0
        draft_text = "🔧 抽取并安装模块"
        if len(self.equipped_modules) >= self.ship_level and self.ship_level > 0:
            draft_text = "🔄 抽取并替换模块 (槽位已满)"
        CustomButton(actions_frame, text=draft_text, font=self.BUTTON_FONT,
                     bg=self.colors["accent_gold"] if can_draft else self.colors["button_dark_grey"],
                     fg=self.colors["text_dark"] if can_draft else "white",
                     padx=20, pady=15, state=tk.NORMAL if can_draft else tk.DISABLED,
                     command=self.start_module_drafting).pack(pady=5, fill=tk.X)
                     
        CustomButton(actions_frame, text="⏭️ 继续航行", font=self.BUTTON_FONT,
                     bg=self.colors["button_success"], fg="white", padx=30, pady=15,
                     command=self.skip_upgrade).pack(pady=15, fill=tk.X)
                     
        canvas.update_idletasks()
        canvas.config(scrollregion=canvas.bbox("all"))
        canvas.yview_moveto(0)
        self.update_button_states()

    def upgrade_ship(self):
        if self.ship_level >= 3: return
        upgrade_cost = self.ship_upgrade_cost[self.ship_level] + self.ship_upgrade_penalty
        if self.money >= upgrade_cost:
            self.money -= upgrade_cost
            self.ship_level += 1
            self.log_message(f"🎉 商船升级到 {self.ship_level}级！+1模块槽位，+5运费折扣")
            self.update_display()
            self.start_phase4()
        else:
            messagebox.showerror("资金不足", f"需要 {upgrade_cost} 金币")

    def get_module_draft_choices(self, count=3):
        available = [cls for cls in self.module_classes if cls().id not in [eq.id for eq in self.equipped_modules]]
        if len(available) < count:
            available = self.module_classes
        return [cls() for cls in random.sample(available, min(count, len(available)))]

    def start_module_drafting(self):
        self.clear_phase_content()
        self.draft_choices = self.get_module_draft_choices(3)
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True, padx=self.PAD_LG, pady=self.PAD_LG)
        
        tk.Label(main_container, text="🔧 模块抽取", font=self.FONT_HERO,
                 bg=self.colors["bg_light"], fg=self.colors["accent_gold"]).pack(pady=(20, 5))
        tk.Label(main_container, text="选择要安装或替换的船只模块。",
                 font=self.FONT_SUBTITLE, bg=self.colors["bg_light"], fg=self.colors["text_dark"]).pack(pady=(0, 20))
                 
        cards_frame = tk.Frame(main_container, bg=self.colors["bg_light"])
        cards_frame.pack(fill=tk.BOTH, expand=True)
        
        for i in range(3):
            cards_frame.columnconfigure(i, weight=1, uniform="mod_col")
            
        for i, mod in enumerate(self.draft_choices):
            self.create_module_card(cards_frame, mod, 0, i)
            
        CustomButton(main_container, text="⬅️ 返回船坞", font=self.BUTTON_FONT,
                     bg=self.colors["button_dark_grey"], fg="white", padx=20, pady=10,
                     command=self.start_phase4).pack(pady=20)

    def create_module_card(self, parent, mod, row, col):
        card = tk.Frame(parent, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=3, padx=20, pady=20)
        card.grid(row=row, column=col, padx=15, pady=15, sticky="nsew")
        
        tk.Label(card, text=mod.icon, font=("Microsoft YaHei", 40), bg=self.colors["card_bg"]).pack(pady=(10, 5))
        tk.Label(card, text=mod.name, font=self.FONT_CARD_TITLE, bg=self.colors["card_bg"],
                 fg=self.colors["bg_dark"]).pack(pady=5)
        tk.Label(card, text=mod.desc, font=self.FONT_BODY, bg=self.colors["card_bg"],
                 fg=self.colors["text_dark"], wraplength=250, justify=tk.CENTER).pack(pady=10, fill=tk.X, expand=True)
                 
        btn_text = "✅ 安装" if len(self.equipped_modules) < self.ship_level else "🔄 替换"
        btn = CustomButton(card, text=btn_text, font=self.BUTTON_FONT,
                           bg=self.colors["accent_gold"], fg=self.colors["text_dark"],
                           relief=tk.RAISED, borderwidth=2, padx=20, pady=15,
                           juice_callback=self.trigger_juice,
                           command=lambda m=mod: self.handle_module_selection(m))
        btn.pack(fill=tk.X, pady=(10, 0))

    def handle_module_selection(self, mod):
        if len(self.equipped_modules) < self.ship_level:
            self.equip_module(mod)
        else:
            self.show_swap_ui(mod)

    def show_swap_ui(self, new_module):
        self.clear_phase_content()
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True, padx=self.PAD_LG, pady=self.PAD_LG)
        
        tk.Label(main_container, text="🔄 选择要替换的模块", font=self.FONT_HERO,
                 bg=self.colors["bg_light"], fg=self.colors["accent_red"]).pack(pady=(20, 5))
        tk.Label(main_container, text=f"新模块: {new_module.icon} {new_module.name} - {new_module.desc}",
                 font=self.FONT_SUBTITLE, bg=self.colors["bg_light"], fg=self.colors["text_dark"]).pack(pady=(0, 20))
                 
        list_frame = tk.Frame(main_container, bg=self.colors["card_bg"], relief=tk.RAISED, borderwidth=2)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=50, pady=10)
        
        for i, eq_mod in enumerate(self.equipped_modules):
            row = tk.Frame(list_frame, bg=self.colors["card_bg"])
            row.pack(fill=tk.X, padx=20, pady=10)
            tk.Label(row, text=f"{eq_mod.icon} {eq_mod.name}", font=self.FONT_CARD_TITLE,
                     bg=self.colors["card_bg"], fg=self.colors["bg_dark"]).pack(side=tk.LEFT)
            tk.Label(row, text=eq_mod.desc, font=self.FONT_SMALL,
                     bg=self.colors["card_bg"], fg="#666").pack(side=tk.LEFT, padx=10)
            CustomButton(row, text="🗑️ 替换", font=self.BUTTON_FONT, bg=self.colors["button_danger"], fg="white",
                         padx=15, pady=5, command=lambda m=new_module, idx=i: self.equip_module(m, swap_index=idx)).pack(side=tk.RIGHT)
                         
        CustomButton(main_container, text="⬅️ 返回抽取", font=self.BUTTON_FONT,
                     bg=self.colors["button_dark_grey"], fg="white", padx=20, pady=10,
                     command=self.start_module_drafting).pack(pady=20)

    def equip_module(self, module_instance, swap_index=None):
        if swap_index is not None:
            old_module = self.equipped_modules[swap_index]
            old_module.on_unequip(self)
            self.equipped_modules[swap_index] = module_instance
            self.log_message(f"🔄 将 {old_module.name} 替换为 {module_instance.name}！")
        else:
            if len(self.equipped_modules) < self.ship_level:
                self.equipped_modules.append(module_instance)
                self.log_message(f"✅ 安装了 {module_instance.name}！")
            else:
                self.log_message("❌ 没有空槽位！必须替换。")
                return
                
        module_instance.on_equip(self)
        self.update_display()
        self.start_phase4()

    def skip_upgrade(self):
        self.log_message("⏭️ 跳过船坞操作")
        self.end_round()

    def end_game(self):
        self.log_message("\n" + "=" * 50)
        self.log_message("🎮 PortMasters - 游戏结束!")
        self.log_message(f"💰 最终资金: {self.money}金币")
        self.log_message(f"🏆 最终声望: {self.score}")
        self.log_message(f"🧾 累计缴税: {self.vat_paid + self.income_tax_paid}金币")
        self.log_message(
            f"👥 工匠团队: 织女{len(self.weavers)} 大师{len(self.master_weavers)} 香囊师{len(self.sachet_makers)}")
            
        if self.score >= 300:
            rating = "👑 丝绸之路霸主"
        elif self.score >= 200:
            rating = "🏆 海上贸易大亨"
        elif self.score >= 100:
            rating = "⭐ 成功商人"
        elif self.score >= 50:
            rating = "👍 合格商人"
        else:
            rating = "🌊 新手商人"
        self.log_message(f"📈 评级: {rating}")
        self.log_message("=" * 50)
        
        self.clear_phase_content()
        
        main_container = ttk.Frame(self.phase_content, style="DarkFrame.TLabelframe")
        main_container.pack(fill=tk.BOTH, expand=True)
        
        canvas = tk.Canvas(main_container, highlightthickness=0, bg=self.colors["bg_light"])
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.colors["bg_light"])
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        
        window_id = canvas.create_window((0, 0), window=scrollable_frame, anchor="n")
        canvas.bind("<Configure>", lambda event, wid=window_id: canvas.itemconfig(wid, width=event.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.bind_mousewheel(canvas)
        
        result_frame = ttk.Frame(scrollable_frame, style="DarkFrame.TLabelframe")
        result_frame.pack(fill=tk.BOTH, expand=True, pady=40)
        
        tk.Label(result_frame, text="🎮 游戏结束!",
                 font=self.FONT_HERO, bg=self.colors["bg_light"],
                 fg=self.colors["bg_dark"]).pack(pady=20)
        tk.Label(result_frame, text=f"🏆 最终声望: {self.score}",
                 font=("Microsoft YaHei", 22, "bold"),
                 bg=self.colors["bg_light"], fg=self.colors["accent_blue"]).pack(pady=10)
        tk.Label(result_frame, text=f"💰 最终资金: {self.money}金币",
                 font=("Microsoft YaHei", 20), bg=self.colors["bg_light"],
                 fg=self.colors["accent_green"]).pack(pady=10)
        tk.Label(result_frame, text=f"📈 商人评级: {rating}",
                 font=("Microsoft YaHei", 20), bg=self.colors["bg_light"],
                 fg=self.colors["accent_gold"]).pack(pady=20)
                 
        CustomButton(result_frame, text="🔄 重新起航", font=("Microsoft YaHei", 18, "bold"),
                     bg=self.colors["button_primary"], fg="white", relief=tk.RAISED,
                     borderwidth=3, padx=30, pady=15,
                     command=self.restart_game).pack(pady=self.PAD_XL)
                     
        self.delete_save()
        self.update_button_states()

    def restart_game(self):
        if messagebox.askyesno("重新起航", "确定要重新开始海上丝绸之路贸易之旅吗？"):
            self.inventory = {"麻布": 8, "丝绸": 5, "茶叶": 3,
                              "麻衣": 0, "布衣": 0, "绫罗绸缎": 0, "香囊": 0}
            self.money = 100
            self.score = 0
            self.current_round = 1
            self.ship_level = 0
            self.ship_upgrade_penalty = 0
            self.maintenance_penalty = 0
            self.equipped_modules = []
            self.phase = 0
            self.game_over = False
            self.purchase_count = 0
            self.order_count = 0
            self.resource_cards = []
            self.customer_cards = []
            self.purchased_cards.clear()
            self.completed_orders.clear()
            self.weavers = []
            self.master_weavers = []
            self.sachet_makers = []
            self.total_revenue = 0
            self.total_costs = 0
            self.material_costs = 0
            self.worker_wages = 0
            self.maintenance_costs = 0
            self.vat_paid = 0
            self.income_tax_paid = 0
            self.round_revenue = 0
            self.round_costs = 0
            self.modifier_flags = {}
            self.phase2_demand_tags = []
            self.revealed_intel = []
            self._intel_order_used = False
            if hasattr(self, 'rumor_window') and self.rumor_window and self.rumor_window.winfo_exists():
                self.rumor_window.destroy()
                self.rumor_window = None
                
            self.log_text.delete(1.0, tk.END)
            self.update_display()
            self.show_welcome()
            self.delete_save()

    def update_button_states(self):
        if self.game_over:
            self.start_btn.config(state=tk.DISABLED, text="⚠️ 游戏结束")
            self.next_btn.config(state=tk.DISABLED, text="⏭️ 继续航行")
            return
            
        if self.phase == 0:
            self.start_btn.config(state=tk.NORMAL, text=f"🚢 开始第{self.current_round}航程")
            self.next_btn.config(state=tk.DISABLED, text="⏭️ 继续航行")
        elif self.phase in [1, 2]:
            self.start_btn.config(state=tk.DISABLED, text="🚢 航行中...")
            self.next_btn.config(state=tk.NORMAL, text="⏭️ 继续航行")
        elif self.phase in [3, 4]:
            self.start_btn.config(state=tk.DISABLED, text="🚢 航行中...")
            self.next_btn.config(state=tk.NORMAL, text="⏭️ 继续航行")
        elif self.phase == 5:
            self.start_btn.config(state=tk.DISABLED, text="🧭 抽取福缘中...")
            self.next_btn.config(state=tk.DISABLED, text="⏭️ 继续航行")

    def next_phase(self):
        phase_actions = {
            1: self.complete_phase1,
            2: self.complete_phase2,
            3: (self.pay_fixed_cost if self.money >= (self.fixed_cost + self.maintenance_penalty) else self.force_pay_cost),
            4: self.skip_upgrade
        }
        action = phase_actions.get(self.phase)
        if action:
            action()

    def run(self):
        self.window.mainloop()

if __name__ == "__main__": PortMasters().run()