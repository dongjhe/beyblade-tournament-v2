# Cloud registration MVP

Firebase project: `beyblade-tournament-eeb50`; Firestore database: `(default)`.

1. In Firebase Console > Firestore Database > Rules, paste `firestore.rules` and **Publish**.
2. Authentication > Sign-in method > Anonymous must be enabled.
3. Run `npm install` (this adds the Firebase JS SDK) then `npm run build` / `npm start`.
4. Open the site in two browsers. Register in one and confirm both see the shared list.
5. The organizer can import cloud registrations into the **existing local tournament** once at least two names exist.

Security / limitations:
- Registration writes are restricted to each anonymous user's own document. Other users cannot overwrite or delete registrations.
- The current version does **not** cloud-sync matches, scores, tournament mode or registration open/close. Those remain local-only.
- The registration list is readable by any anonymously authenticated visitor. Do not collect private data.
- A browser identity can register once; clearing browser storage or using another device can create another identity. Duplicate-name checking is best effort, not server-enforced.
- 64-player limit is enforced in the client, not transactionally in Firestore.
- Do not deploy rules that permit anonymous writes to tournament scores or event settings.
- `events/main` is a temporary shared namespace; multi-event IDs and organizer login must be added before public production use.


## 編輯既有報名表

管理者登入後，前往「後台管理 → 已建立報名表 → 編輯報名表」。可修改名稱、日期、時間、地點、費用、備註、人數上限，以及「積分賽／淘汰賽」。儲存使用原本的 event 文件，不會產生新連結、刪除名單或重新開放報名。

- 已有 `public/schedule` 文件時，賽制與人數上限鎖定；其他資訊仍可修改。儲存時會再次透過 transaction 檢查，以處理編輯期間產生賽程或新增報名的情況。
- 人數上限不得少於當前 `registrationCount`。
- 僅管理者且為該賽事建立者可修改。

### 發布必要步驟

本專案 GitHub Actions 只部署網頁，不會部署 Firestore 規則。啟用編輯前，須在 Firebase Console → Firestore Database → 規則，貼上本 repo 的完整 `firestore.rules` 並發布；否則儲存會回傳 permission-denied。此規則只增加報名資訊欄位的受限編輯，不變更擁有者、報名人數、開放狀態或既有名單。
