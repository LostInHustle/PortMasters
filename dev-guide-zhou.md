# ⛽️ Zhou’s Git Quick Guide  
**周的 Git 快速指南**

---

## 1. Start in Your Project Folder  
**进入你的项目文件夹**  
```bash
cd your-project-folder
```
- **English:** Go inside the folder where your code lives.  
- **中文:** 进入你代码所在的文件夹。  

---

## 2. Check What Changed  
**查看修改了什么**  
```bash
git status
```
- **English:** Shows which files you edited.  
- **中文:** 显示你修改了哪些文件。  

---

## 3. Save Your Changes (Commit)  
**保存修改（提交）**  
```bash
git add .
git commit -m "Write a short note about what you changed"
```
- **English:** “add” prepares files, “commit” saves them with a message.  
- **中文:** “add” 是准备文件，“commit” 是保存并写一条说明。  

---

## 4. Upload to GitHub (Push)  
**上传到 GitHub（推送）**  
```bash
git push
```
- **English:** Sends your saved changes to GitHub.  
- **中文:** 把你保存的修改上传到 GitHub。  

---

## 5. Get Updates (Pull)  
**获取最新更新（拉取）**  
```bash
git pull
```
- **English:** Downloads the newest changes from GitHub.  
- **中文:** 从 GitHub 下载最新的修改。  

---

## 6. Simple Example  
**简单示例**  
You fix a bug in `main.py`:  
```bash
git add main.py
git commit -m "Fix bug in main.py"
git push
```
- **English:** Now GitHub has your fixed version.  
- **中文:** 现在 GitHub 上就有你修好的版本了。  

---

## 7. Beginner Tips  
**新手提示**  
- **English:** Always write a short commit message (like “add login button”).  
- **中文:** 每次提交都写一句简短说明（比如“添加登录按钮”）。  
- **English:** Don’t worry if you make mistakes — Git lets you go back.  
- **中文:** 不要怕出错 —— Git 可以让你回到之前的版本。  
- **English:** Practice with small changes first.  
- **中文:** 先从小修改开始练习。