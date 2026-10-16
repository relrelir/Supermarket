# 🛒 רשימת קניות משפחתית

רשימה אחת לכל המשפחה, מסונכרנת בזמן אמת בין כל הטלפונים.

## מה יש באפליקציה
- **משפחה משותפת** – יוצרים משפחה, מקבלים קוד בן 6 תווים ושולחים לבני המשפחה (בוואטסאפ, בלחיצה).
- **הוספה מכל מכשיר** – כל פריט שמישהו מוסיף מופיע מיד אצל כולם. אפשר לכתוב `ביצים 2` והכמות נקלטת לבד.
- **מיון לפי מחלקות** – ירקות, חלב, מאפים, בשר, מזווה, קפואים, שתייה, ניקיון, פארם. המחלקה מנוחשת אוטומטית ואפשר לתקן (והתיקון נזכר).
- **כמות והערה** לכל פריט (למשל "3%", "בלי גלוטן").
- **מצב קנייה** – אותיות גדולות, הקשה על פריט מעבירה אותו ל"בעגלה", פס התקדמות, והמסך לא נכבה. "סיימתי קנייה" מנקה את מה שנקנה ומשאיר את מה שלא נמצא.
- **פריטים חוזרים** – כל פריט נזכר. פריטים שנקנו 3 פעמים ומעלה, או שסומנו ⭐ כ"קבועים", נבחרים אוטומטית ליצירת רשימה חדשה בלחיצה אחת.
- **השלמה אוטומטית** בזמן ההקלדה מתוך הפריטים הזכורים.
- **כמה רשימות** – סופר, פארם, שוק וכו'.
- **עובד בלי קליטה** – השינויים נשמרים בטלפון ומסתנכרנים כשחוזרת הקליטה.

## התקנה – פעם אחת (כ-10 דקות)

### 1. פרויקט Firebase (השרת החינמי שמסנכרן בין הטלפונים)
1. נכנסים ל-[console.firebase.google.com](https://console.firebase.google.com) עם חשבון גוגל ← **Create a project** (שם כלשהו, אפשר לכבות Analytics).
2. בתפריט: **Build → Authentication → Get started** ← לשונית **Sign-in method** ← מפעילים **Anonymous**.
3. בתפריט: **Build → Firestore Database → Create database** ← בוחרים מיקום (למשל `eur3`) ← **Start in production mode**.
4. בתוך Firestore ← לשונית **Rules** ← מוחקים הכל ומדביקים את התוכן של הקובץ [`firestore.rules`](firestore.rules) ← **Publish**.
5. ⚙️ **Project settings** ← למטה **Your apps** ← לוחצים על אייקון הווב `</>` ← שם כלשהו ← **Register app**. יופיעו ערכים כמו `apiKey`, `projectId` וכו' – משאירים את הדף פתוח.

### 2. הזנת הפרטים ב-GitHub
בריפו: **Settings → Secrets and variables → Actions → New repository secret**, ומוסיפים 6 סודות:

| שם הסוד | הערך מ-Firebase |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> הערכים האלה לא באמת סודיים (הם מוטמעים באפליקציה). מה שמגן על הנתונים הם כללי האבטחה משלב 1.4.

### 3. גרסת ווב (לאייפון / למחשב)
**Settings → Pages → Source: GitHub Actions**. אחרי ה-push הבא, האפליקציה תהיה זמינה בכתובת
`https://relrelir.github.io/Supermarket/` – בטלפון פותחים בדפדפן ← "הוספה למסך הבית".

### 4. הורדת האפליקציה לאנדרואיד
- **Actions → Build Android APK** ← מריצים מחדש (**Re-run all jobs**) כדי שהבנייה תכלול את הסודות.
- כשהענף הוא ברירת המחדל של הריפו, כל בנייה מתפרסמת גם ב-**Releases**. קישור קבוע לגרסה האחרונה:
  `https://github.com/relrelir/Supermarket/releases/latest/download/shopping-list.apk`
- אחרת: נכנסים להרצה ב-Actions ← למטה **Artifacts** ← `shopping-list-apk` (מתקבל ZIP, בתוכו ה-APK).
- בטלפון: פותחים את הקובץ ← מאשרים "התקנה ממקורות לא ידועים" ← התקנה.
- גרסאות חדשות מותקנות כעדכון מעל הקיימת, בלי לאבד נתונים.

## שימוש
1. בטלפון הראשון: **משפחה חדשה** ← השם שלכם ושם המשפחה.
2. **⚙️ הגדרות ← שליחת הזמנה** ← שולחים לבני המשפחה.
3. בני המשפחה מתקינים, בוחרים **הצטרפות בקוד** ומזינים את הקוד (או לוחצים על הקישור).

## פיתוח
```bash
npm install
cp .env.example .env.local     # ממלאים ערכי Firebase, או VITE_USE_EMULATORS=true
npm run emulators              # שרת Firebase מקומי (דורש firebase-tools ו-Java)
npm run dev
npm test
```
מבנה: `src/screens` – המסכים, `src/data` – הגישה ל-Firestore, `src/categories.ts` – המחלקות ומילון הניחוש, `firestore.rules` – כללי האבטחה, `android/` – פרויקט Capacitor.

**חתימה:** מפתח החתימה `android/app/app.keystore` שמור בריפו כדי שכל בנייה תוכל לעדכן את האפליקציה המותקנת. זה מספיק להתקנה בתוך המשפחה; לפני פרסום ב-Google Play יש להחליף למפתח פרטי.
