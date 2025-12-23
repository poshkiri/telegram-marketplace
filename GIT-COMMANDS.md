# Команды для Git Bash (mingw64)

## Обновление кода на GitHub и Railway

### 1. Откройте Git Bash

### 2. Перейдите в папку проекта:
```bash
cd /c/Users/Светлана/Desktop/cursor/telegram-marketplace
```

### 3. Проверьте статус изменений:
```bash
git status
```

### 4. Добавьте все изменения:
```bash
git add .
```

### 5. Создайте коммит:
```bash
git commit -m "Fix: исправлена ошибка парсинга Markdown и локализация"
```

### 6. Отправьте на GitHub:
```bash
git push origin main
```

Если ваша ветка называется `master`:
```bash
git push origin master
```

---

## После push:

Railway автоматически обнаружит изменения и обновит бота (обычно 1-2 минуты).

Проверьте в Railway:
1. Откройте https://railway.app
2. Выберите проект
3. Перейдите в "Deployments"
4. Дождитесь завершения деплоя

---

## Если нужно проверить подключение к GitHub:

```bash
git remote -v
```

Должно показать:
```
origin  https://github.com/poshkiri/telegram-marketplace.git (fetch)
origin  https://github.com/poshkiri/telegram-marketplace.git (push)
```

---

## Если нужно добавить удаленный репозиторий:

```bash
git remote add origin https://github.com/poshkiri/telegram-marketplace.git
```

